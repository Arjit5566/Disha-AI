import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const AnalyzeInput = z.object({
  resumeText: z.string().min(20).max(60_000),
  targetRole: z.string().min(2).max(120),
});

type Roadmap = { week: number; title: string; objectives: string[]; outcomes: string[] }[];
type Resource = { title: string; provider: string; url: string; skill: string };

export interface AnalysisResult {
  summary: string;
  extracted_skills: string[];
  missing_skills: string[];
  readiness_score: number;
  roadmap: Roadmap;
  resources: Resource[];
}

const SYS = `You are Disha AI, an expert career coach for tech roles.
You receive a candidate's resume text and a target role.

Return ONLY valid JSON matching this TypeScript shape (no markdown, no commentary):

{
  "summary": string,                       // 1-2 sentence resume summary
  "extracted_skills": string[],            // concrete skills found in the resume (max 25)
  "missing_skills": string[],              // important skills for the target role NOT in resume (max 12)
  "readiness_score": number,               // 0-100 readiness for target role
  "roadmap": [
    { "week": 1, "title": string, "objectives": string[], "outcomes": string[] },
    ... 4 to 6 weeks total
  ],
  "resources": [
    { "title": string, "provider": string, "url": string, "skill": string },
    ... 3 to 6 high-quality resources covering the missing skills
  ]
}

Be specific to the target role. Use real, well-known providers (Coursera, freeCodeCamp,
Kaggle, official docs, YouTube channels) with real URLs. Output strict JSON.`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; result: AnalysisResult }> => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;

    let parsed: AnalysisResult;

    try {
      if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
        // Use direct Google Gemini API call with the user's key
        const prompt = `Target role: ${data.targetRole}\n\n--- RESUME ---\n${data.resumeText}\n--- END RESUME ---\n\nReturn the JSON now.`;
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: SYS }] },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.4,
              },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API error (Status ${response.status}): ${errText}`);
        }

        const resData = await response.json();
        const responseText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
          throw new Error("Empty response received from Gemini API");
        }

        parsed = JSON.parse(stripFences(responseText)) as AnalysisResult;
      } else if (lovableKey) {
        // Fallback to Lovable AI Gateway if configured
        const gateway = createLovableAiGatewayProvider(lovableKey);
        const prompt = `Target role: ${data.targetRole}\n\n--- RESUME ---\n${data.resumeText}\n--- END RESUME ---\n\nReturn the JSON now.`;

        const { text } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYS,
          prompt,
          temperature: 0.4,
        });
        parsed = JSON.parse(stripFences(text)) as AnalysisResult;
      } else {
        throw new Error("AI is not configured. Please add GEMINI_API_KEY to your .env file.");
      }
    } catch (err: unknown) {
      console.warn("AI resume analysis failed, falling back to local rule-based simulation analysis:", err);
      parsed = getFallbackAnalysis(data.resumeText, data.targetRole);
    }

    // sanitize
    parsed.readiness_score = Math.max(0, Math.min(100, Math.round(parsed.readiness_score || 0)));
    parsed.extracted_skills = (parsed.extracted_skills || []).slice(0, 25);
    parsed.missing_skills = (parsed.missing_skills || []).slice(0, 12);
    parsed.roadmap = (parsed.roadmap || []).slice(0, 6);
    parsed.resources = (parsed.resources || []).slice(0, 8);
    parsed.summary = parsed.summary || "";

    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("analyses")
      .insert({
        user_id: userId,
        target_role: data.targetRole,
        resume_text: data.resumeText.slice(0, 20_000),
        extracted_skills: parsed.extracted_skills,
        missing_skills: parsed.missing_skills,
        readiness_score: parsed.readiness_score,
        roadmap: parsed.roadmap,
        resources: parsed.resources,
        summary: parsed.summary,
      })
      .select("id")
      .single();

    if (error || !inserted) throw new Error("Failed to save analysis: " + (error?.message ?? "unknown"));

    return { id: inserted.id, result: parsed };
  });

export const listMyAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("analyses")
      .select("id, target_role, readiness_score, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Not found");
    return row;
  });

export interface JobRecommendation {
  title: string;
  type: "job" | "internship";
  companyType: string;
  salary: string;
  matchScore: number;
  matchReason: string;
  searchUrl: string;
}

const JOB_SYS = `You are a Career Matchmaker for Naukri.com.
You will receive the user's target role and their matched skills from their resume analysis.

Return ONLY valid JSON matching this TypeScript shape:
{
  "recommendations": [
    {
      "title": string,           // Exact Job Title on Naukri (e.g., "Junior Data Analyst")
      "type": "job" | "internship",
      "companyType": string,     // Type of companies hiring for this (e.g., "MNCs, Startups")
      "salary": string,          // Realistic Indian salary string (e.g., "₹4L - ₹8L PA")
      "matchScore": number,      // 0-100 score of how well their skills match this specific role
      "matchReason": string,     // 1 short sentence why they fit this role
      "searchUrl": string        // A valid naukri search URL (e.g., "https://www.naukri.com/data-analyst-jobs")
    }
  ]
}

Provide exactly 3 "job" options and 2 "internship" options tailored to their skills.`;

export const getNaukriRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ recommendations: JobRecommendation[] }> => {
    // 1. Fetch analysis to get context
    const analysis = await getAnalysis({ data: { id: data.id } });
    
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;

    const prompt = `Target Role: ${analysis.target_role}\nExtracted Skills: ${(analysis.extracted_skills as string[]).join(", ")}\nReadiness Score: ${analysis.readiness_score}\n\nGenerate Naukri recommendations based on these skills. Return JSON.`;

    let parsed: { recommendations: JobRecommendation[] } = { recommendations: [] };

    try {
      if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: JOB_SYS }] },
              generationConfig: { responseMimeType: "application/json", temperature: 0.5 },
            }),
          }
        );
        if (!response.ok) throw new Error("Gemini API error");
        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) parsed = JSON.parse(stripFences(text));
      } else if (lovableKey) {
        const gateway = createLovableAiGatewayProvider(lovableKey);
        const { text } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: JOB_SYS,
          prompt,
          temperature: 0.5,
        });
        parsed = JSON.parse(stripFences(text));
      } else {
        throw new Error("No AI configured.");
      }
    } catch (e) {
      console.error("Job recommendation failed", e);
      // Fallback mock data if AI fails
      parsed = {
        recommendations: [
          { title: `${analysis.target_role}`, type: "job", companyType: "Top IT Companies", salary: "₹5L - ₹10L PA", matchScore: analysis.readiness_score as number, matchReason: "Direct match for your target role.", searchUrl: `https://www.naukri.com/${String(analysis.target_role).replace(/\s+/g, '-').toLowerCase()}-jobs` },
          { title: `Associate ${analysis.target_role}`, type: "job", companyType: "Mid-size Tech", salary: "₹3L - ₹6L PA", matchScore: Math.min(100, (analysis.readiness_score as number) + 10), matchReason: "Great entry-level position for your current skill set.", searchUrl: `https://www.naukri.com/associate-${String(analysis.target_role).replace(/\s+/g, '-').toLowerCase()}-jobs` },
          { title: `${analysis.target_role} Intern`, type: "internship", companyType: "Startups", salary: "₹15K - ₹30K /mo", matchScore: 95, matchReason: "Perfect for gaining hands-on experience.", searchUrl: `https://www.naukri.com/${String(analysis.target_role).replace(/\s+/g, '-').toLowerCase()}-internship-jobs` }
        ]
      };
    }
    
    return parsed;
  });

export interface AdzunaJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  redirectUrl: string;
  created: string;
  matchScore: number;
  matchReason: string;
  type: "job" | "internship";
}

async function fetchAdzunaJobsAndInternships(
  targetRole: string,
  userSkills: string[],
  country: string
): Promise<{ opportunities: AdzunaJob[]; isMock: boolean }> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const targetCountry = country.toLowerCase();

  // Local function to clean HTML tags from title/description
  const cleanHtml = (text: string): string => {
    if (!text) return "";
    return text.replace(/<\/?[^>]+(>|$)/g, "").trim();
  };

  // Local function to format salary based on country
  const formatSalary = (min?: number, max?: number, c: string = "in") => {
    if (!min && !max) return "Competitive Salary";
    
    const currency = c === "in" ? "₹" : c === "us" ? "$" : c === "gb" ? "£" : "$";
    
    const formatNum = (num: number) => {
      if (c === "in") {
        if (num >= 100000) {
          return `${(num / 100000).toFixed(1)}L`;
        }
        if (num >= 1000) {
          return `${(num / 1000).toFixed(0)}k`;
        }
      } else {
        if (num >= 1000) {
          return `${(num / 1000).toFixed(0)}k`;
        }
      }
      return num.toLocaleString();
    };

    const period = c === "in" && (min || 0) < 100000 ? "/mo" : " PA";
    
    if (min && max) {
      return `${currency}${formatNum(min)} - ${currency}${formatNum(max)}${period}`;
    }
    return `${currency}${formatNum(min || max!)}${period}`;
  };

  // Local function to calculate match score
  const calculateMatch = (title: string, description: string) => {
    const t = title.toLowerCase();
    const d = description.toLowerCase();
    
    const matched = userSkills.filter(skill => {
      const s = skill.toLowerCase();
      return t.includes(s) || d.includes(s);
    });
    
    let baseScore = 55;
    const targetKeywords = targetRole.toLowerCase().split(/\s+/);
    const keywordMatches = targetKeywords.filter(kw => kw.length > 2 && t.includes(kw));
    baseScore += (keywordMatches.length / Math.max(1, targetKeywords.length)) * 20;
    
    const score = Math.min(98, Math.round(baseScore + matched.length * 8));
    const reason = matched.length > 0
      ? `Matches your skill${matched.length > 1 ? "s" : ""}: ${matched.slice(0, 3).join(", ")}`
      : `Good alignment with your target role: ${targetRole}`;
      
    return { score, reason };
  };

  // If API credentials are not set, return mock data
  if (!appId || !appKey || appId === "your_adzuna_app_id" || appKey === "your_adzuna_app_key") {
    console.log("Adzuna API keys not set. Returning high-fidelity mock data.");
    return {
      opportunities: generateMockOpportunities(targetRole, userSkills, targetCountry, formatSalary),
      isMock: true
    };
  }

  try {
    // Fetch jobs
    const jobsUrl = `https://api.adzuna.com/v1/api/jobs/${targetCountry}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(targetRole)}&results_per_page=6&content-type=application/json`;
    // Fetch internships
    const internshipsUrl = `https://api.adzuna.com/v1/api/jobs/${targetCountry}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(targetRole + " internship")}&results_per_page=6&content-type=application/json`;

    const [jobsRes, internshipsRes] = await Promise.all([
      fetch(jobsUrl),
      fetch(internshipsUrl)
    ]);

    const jobsData = jobsRes.ok ? await jobsRes.json() : { results: [] };
    const internshipsData = internshipsRes.ok ? await internshipsRes.json() : { results: [] };

    const opportunities: AdzunaJob[] = [];

    // Process jobs
    if (jobsData.results) {
      for (const job of jobsData.results) {
        const title = cleanHtml(job.title);
        const desc = cleanHtml(job.description);
        const { score, reason } = calculateMatch(title, desc);
        opportunities.push({
          id: job.id || String(Math.random()),
          title,
          company: job.company?.display_name || "Confidential",
          location: job.location?.display_name || "Multiple Locations",
          salary: formatSalary(job.salary_min, job.salary_max, targetCountry),
          redirectUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title + " " + (job.company?.display_name || ""))}`,
          created: job.created || new Date().toISOString(),
          matchScore: score,
          matchReason: reason,
          type: "job"
        });
      }
    }

    // Process internships
    if (internshipsData.results) {
      for (const intern of internshipsData.results) {
        const title = cleanHtml(intern.title);
        const desc = cleanHtml(intern.description);
        const { score, reason } = calculateMatch(title, desc);
        opportunities.push({
          id: intern.id || String(Math.random()),
          title,
          company: intern.company?.display_name || "Confidential",
          location: intern.location?.display_name || "Multiple Locations",
          salary: formatSalary(intern.salary_min, intern.salary_max, targetCountry),
          redirectUrl: `https://www.indeed.com/jobs?q=${encodeURIComponent(title + " " + (intern.company?.display_name || ""))}`,
          created: intern.created || new Date().toISOString(),
          matchScore: score,
          matchReason: reason,
          type: "internship"
        });
      }
    }

    if (opportunities.length === 0) {
      return {
        opportunities: generateMockOpportunities(targetRole, userSkills, targetCountry, formatSalary),
        isMock: true
      };
    }

    opportunities.sort((a, b) => b.matchScore - a.matchScore);

    return {
      opportunities,
      isMock: false
    };
  } catch (err) {
    console.error("Failed to fetch jobs from Adzuna:", err);
    return {
      opportunities: generateMockOpportunities(targetRole, userSkills, targetCountry, formatSalary),
      isMock: true
    };
  }
}

export const getAdzunaOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      analysisId: z.string().uuid(),
      country: z.string().min(2).max(3).default("in"),
    }).parse(input)
  )
  .handler(async ({ data, context }): Promise<{ opportunities: AdzunaJob[]; isMock: boolean }> => {
    const { supabase } = context;
    
    // Fetch the analysis
    const { data: analysis, error } = await supabase
      .from("analyses")
      .select("target_role, extracted_skills")
      .eq("id", data.analysisId)
      .single();
      
    if (error || !analysis) {
      throw new Error(error?.message ?? "Analysis not found");
    }

    return fetchAdzunaJobsAndInternships(
      analysis.target_role,
      (analysis.extracted_skills as string[]) || [],
      data.country
    );
  });

export const getAdzunaOpportunitiesForRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      role: z.string(),
      skills: z.array(z.string()),
      country: z.string().min(2).max(3).default("in"),
    }).parse(input)
  )
  .handler(async ({ data }): Promise<{ opportunities: AdzunaJob[]; isMock: boolean }> => {
    return fetchAdzunaJobsAndInternships(data.role, data.skills, data.country);
  });

// Helper function to generate mock opportunities when keys are not configured or request fails
function generateMockOpportunities(
  targetRole: string,
  userSkills: string[],
  country: string,
  formatSalary: (min?: number, max?: number, c?: string) => string
): AdzunaJob[] {
  const isIn = country === "in";
  
  const companyPool = isIn 
    ? ["Tata Consultancy Services", "Infosys", "Wipro", "Razorpay", "Cred", "Swiggy", "Zomato", "Jio Platforms", "Flipkart"]
    : ["Google", "Meta", "Amazon", "Microsoft", "Stripe", "Netflix", "Atlassian", "Uber", "Airbnb"];
    
  const locations = isIn
    ? ["Bengaluru, Karnataka", "Mumbai, Maharashtra", "Hyderabad, Telangana", "Gurugram, Haryana", "Pune, Maharashtra", "Remote, India"]
    : ["San Francisco, CA", "Seattle, WA", "New York, NY", "Austin, TX", "London, UK", "Remote, US"];

  const opportunities: AdzunaJob[] = [];

  // Helper to get random item
  const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Generate 4 jobs
  const jobTitles = [
    `${targetRole}`,
    `Senior ${targetRole}`,
    `Associate ${targetRole}`,
    `Lead ${targetRole}`
  ];

  jobTitles.forEach((title, idx) => {
    const salaryMin = isIn ? 400000 + idx * 250000 : 70000 + idx * 25000;
    const salaryMax = isIn ? 800000 + idx * 350000 : 110000 + idx * 35000;
    
    // Customize match score
    let matchScore = 95 - idx * 7;
    let matchReason = "";
    if (userSkills.length > 0) {
      const skillsToShow = userSkills.slice(0, 2 + (idx % 2));
      matchReason = `Matches your skill${skillsToShow.length > 1 ? "s" : ""}: ${skillsToShow.join(", ")}`;
    } else {
      matchReason = `Good alignment with your target role of ${targetRole}`;
    }

    const comp = random(companyPool);
    opportunities.push({
      id: `mock-job-${idx}`,
      title,
      company: comp,
      location: random(locations),
      salary: formatSalary(salaryMin, salaryMax, country),
      redirectUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title + " " + comp)}`,
      created: new Date(Date.now() - idx * 24 * 60 * 60 * 1000).toISOString(),
      matchScore,
      matchReason,
      type: "job"
    });
  });

  // Generate 3 internships
  const internTitles = [
    `${targetRole} Intern`,
    `Graduate ${targetRole} Trainee`,
    `Summer Intern - ${targetRole}`
  ];

  internTitles.forEach((title, idx) => {
    const salaryMin = isIn ? 15000 + idx * 5000 : 2500 + idx * 500;
    const salaryMax = isIn ? 30000 + idx * 8000 : 4500 + idx * 800;
    
    let matchScore = 90 - idx * 5;
    let matchReason = "";
    if (userSkills.length > 0) {
      const skillsToShow = userSkills.slice(0, 2);
      matchReason = `Excellent chance to apply ${skillsToShow.join(" and ")}`;
    } else {
      matchReason = `Perfect gateway role for ${targetRole}`;
    }

    const comp = random(companyPool);
    opportunities.push({
      id: `mock-intern-${idx}`,
      title,
      company: comp,
      location: random(locations),
      salary: formatSalary(salaryMin, salaryMax, country),
      redirectUrl: `https://www.indeed.com/jobs?q=${encodeURIComponent(title + " " + comp)}`,
      created: new Date(Date.now() - (idx + 1) * 24 * 60 * 60 * 1000).toISOString(),
      matchScore,
      matchReason,
      type: "internship"
    });
  });

  return opportunities;
}

const CHATBOT_SYS = `You are Disha AI, a professional career coach and technical mentor. 
Your goal is to help candidates improve their career readiness, resumes, ATS formatting, coding skills, and interview preparation.
Provide structured, professional, and encouraging answers. Use markdown formatting such as lists and bold text where appropriate.`;

export const askChatbot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      message: z.string(),
      history: z.array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })
      ).optional(),
    }).parse(input)
  )
  .handler(async ({ data }): Promise<string> => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;

    // Map history to Gemini format (roles: user or model)
    const contents = [];
    if (data.history) {
      // Limit context to last 10 messages to save tokens/avoid latency
      const slice = data.history.slice(-10);
      for (const msg of slice) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: data.message }],
    });

    if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: CHATBOT_SYS }] },
              generationConfig: {
                temperature: 0.7,
              },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API error (Status ${response.status}): ${errText}`);
        }

        const resData = await response.json();
        const responseText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
          throw new Error("No text returned from Gemini API");
        }
        return responseText;
      } catch (err: unknown) {
        throw new Error("Gemini chatbot query failed: " + (err instanceof Error ? err.message : String(err)));
      }
    } else if (lovableKey) {
      const gateway = createLovableAiGatewayProvider(lovableKey);
      try {
        const prompt = `Conversation history:\n${(data.history || []).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')}\n\nUser: ${data.message}\nAssistant:`;
        const { text } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: CHATBOT_SYS,
          prompt,
          temperature: 0.7,
        });
        return text;
      } catch (err: unknown) {
        throw new Error("Lovable chatbot query failed: " + (err instanceof Error ? err.message : String(err)));
      }
    } else {
      throw new Error("No AI configuration found. Chatbot falling back to offline knowledge base.");
    }
  });

export interface RecommendedRole {
  role: string;
  match_percentage: number;
  matched_skills: string[];
  message: string;
}

export interface NavigationResult {
  target_comparison: {
    readiness_score: number;
    matching_skills: string[];
    missing_skills: string[];
  };
  recommended_roles: RecommendedRole[];
}

const NAV_SYS = `You are Disha AI, an expert career navigation advisor.
You will receive a list of candidate's skills and a target career role.

Your task is to:
1. Compare the candidate's skills with the required skills for the target role. Calculate a match percentage (0-100), identify matching skills, and identify missing skills.
2. Recommend 3 to 5 alternative or related career roles that best match the candidate's current skills. For each recommended role, calculate the match percentage, list matched skills, and provide a short encouraging message like "You are ready to apply for this role." or "You are close! Gain a few more skills."

Return ONLY valid JSON matching this TypeScript shape (no markdown fences, no comments, no extra text):
{
  "target_comparison": {
    "readiness_score": number,
    "matching_skills": string[],
    "missing_skills": string[]
  },
  "recommended_roles": [
    {
      "role": string,
      "match_percentage": number,
      "matched_skills": string[],
      "message": string
    }
  ]
}`;

export const getCareerNavigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      skills: z.array(z.string()),
      targetRole: z.string().min(2).max(120),
    }).parse(input)
  )
  .handler(async ({ data }): Promise<NavigationResult> => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;

    const prompt = `Candidate Skills: ${data.skills.join(", ")}\nTarget Role: ${data.targetRole}\n\nGenerate career navigation JSON.`;

    let parsed: NavigationResult;

    try {
      if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: NAV_SYS }] },
              generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
            }),
          }
        );
        if (!response.ok) throw new Error("Gemini API error");
        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty AI response");
        parsed = JSON.parse(stripFences(text)) as NavigationResult;
      } else if (lovableKey) {
        const gateway = createLovableAiGatewayProvider(lovableKey);
        const { text } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: NAV_SYS,
          prompt,
          temperature: 0.4,
        });
        parsed = JSON.parse(stripFences(text)) as NavigationResult;
      } else {
        throw new Error("No AI key configured.");
      }
    } catch (e) {
      console.error("AI Career Navigation generation failed, falling back to rule-based matchmaking", e);
      parsed = getFallbackNavigation(data.skills, data.targetRole);
    }

    // Sanitize output
    parsed.target_comparison.readiness_score = Math.max(0, Math.min(100, parsed.target_comparison.readiness_score || 0));
    parsed.target_comparison.matching_skills = parsed.target_comparison.matching_skills || [];
    parsed.target_comparison.missing_skills = parsed.target_comparison.missing_skills || [];
    
    parsed.recommended_roles = (parsed.recommended_roles || []).map(r => ({
      role: r.role || "Unknown Role",
      match_percentage: Math.max(0, Math.min(100, r.match_percentage || 0)),
      matched_skills: r.matched_skills || [],
      message: r.message || "Good role match for your background."
    }));

    return parsed;
  });

function getFallbackNavigation(userSkills: string[], targetRole: string): NavigationResult {
  const ROLE_SKILLS: Record<string, string[]> = {
    "Frontend Developer": ["React", "HTML", "CSS", "JavaScript", "TypeScript", "Tailwind CSS", "Next.js", "Redux", "Git"],
    "Full Stack Developer": ["React", "Node.js", "Express", "MongoDB", "SQL", "JavaScript", "TypeScript", "HTML", "CSS", "Git"],
    "Data Scientist": ["Python", "R", "SQL", "Machine Learning", "Pandas", "NumPy", "Statistics", "Data Visualization", "Jupyter"],
    "Data Analyst": ["SQL", "Excel", "Tableau", "Power BI", "Python", "Data Visualization", "Statistics", "Reporting"],
    "AI Engineer": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP", "LLMs", "AI APIs"],
    "Software Engineer": ["Java", "Python", "C++", "Data Structures", "Algorithms", "Git", "SQL", "Software Design"],
    "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Terraform", "Git", "Bash", "Monitoring"],
    "Product Manager": ["Product Strategy", "Agile", "Scrum", "User Research", "Roadmapping", "SQL", "Data Analytics", "Communication"],
    "QA Engineer": ["Manual Testing", "Automation Testing", "Selenium", "Jest", "Cypress", "Git", "Bug Reporting", "QA Methodologies"]
  };

  const cleanSkills = userSkills.map(s => s.toLowerCase());

  const getMatchMetrics = (reqSkills: string[]) => {
    const matched = reqSkills.filter(s => cleanSkills.some(us => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us)));

    const actualMissing = reqSkills.filter(s => !cleanSkills.some(us => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us)));
    const pct = reqSkills.length > 0 ? Math.round((matched.length / reqSkills.length) * 100) : 0;
    return { matched, missing: actualMissing, pct };
  };

  // 1. Target Comparison
  let targetReqs = ROLE_SKILLS[targetRole] || ["React", "JavaScript", "HTML", "CSS", "Git"];
  // If target role is custom, look for partial match in dictionary keys
  const dictKey = Object.keys(ROLE_SKILLS).find(k => k.toLowerCase().includes(targetRole.toLowerCase()) || targetRole.toLowerCase().includes(k.toLowerCase()));
  if (dictKey) {
    targetReqs = ROLE_SKILLS[dictKey];
  }
  const targetMetrics = getMatchMetrics(targetReqs);

  // 2. Recommended roles
  const recommended_roles: RecommendedRole[] = [];
  Object.entries(ROLE_SKILLS).forEach(([roleName, reqs]) => {
    const { matched, pct } = getMatchMetrics(reqs);
    let message = "You have a strong foundation. Try mastering a few more skills!";
    if (pct >= 85) {
      message = "You are ready to apply for this role.";
    } else if (pct >= 60) {
      message = "You are very close! Gain 1-2 skills to apply.";
    } else if (pct >= 40) {
      message = "Good entry point. Focus on core requirements.";
    }
    recommended_roles.push({
      role: roleName,
      match_percentage: pct,
      matched_skills: matched,
      message
    });
  });

  // Sort by match percentage desc, and take top 4
  recommended_roles.sort((a, b) => b.match_percentage - a.match_percentage);

  return {
    target_comparison: {
      readiness_score: targetMetrics.pct,
      matching_skills: targetMetrics.matched,
      missing_skills: targetMetrics.missing
    },
    recommended_roles: recommended_roles.slice(0, 4)
  };
}

function getFallbackAnalysis(resumeText: string, targetRole: string): AnalysisResult {
  const ROLE_SKILLS: Record<string, string[]> = {
    "Frontend Developer": ["React", "HTML", "CSS", "JavaScript", "TypeScript", "Tailwind CSS", "Next.js", "Redux", "Git"],
    "Full Stack Developer": ["React", "Node.js", "Express", "MongoDB", "SQL", "JavaScript", "TypeScript", "HTML", "CSS", "Git"],
    "Data Scientist": ["Python", "R", "SQL", "Machine Learning", "Pandas", "NumPy", "Statistics", "Data Visualization", "Jupyter"],
    "Data Analyst": ["SQL", "Excel", "Tableau", "Power BI", "Python", "Data Visualization", "Statistics", "Reporting"],
    "AI Engineer": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP", "LLMs", "AI APIs"],
    "Software Engineer": ["Java", "Python", "C++", "Data Structures", "Algorithms", "Git", "SQL", "Software Design"],
    "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Terraform", "Git", "Bash", "Monitoring"],
    "Product Manager": ["Product Strategy", "Agile", "Scrum", "User Research", "Roadmapping", "SQL", "Data Analytics", "Communication"],
    "QA Engineer": ["Manual Testing", "Automation Testing", "Selenium", "Jest", "Cypress", "Git", "Bug Reporting", "QA Methodologies"]
  };

  const cleanText = resumeText.toLowerCase();
  
  let matchedRole = "Software Engineer";
  let maxMatch = 0;
  Object.keys(ROLE_SKILLS).forEach(role => {
    const common = targetRole.toLowerCase().split(" ").filter(w => role.toLowerCase().includes(w)).length;
    if (common > maxMatch) {
      maxMatch = common;
      matchedRole = role;
    }
  });

  const expectedSkills = ROLE_SKILLS[matchedRole];
  
  const extracted_skills = expectedSkills.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    return regex.test(cleanText) || cleanText.includes(skill.toLowerCase());
  });

  const commonTech = [
    "Python", "Java", "C++", "JavaScript", "TypeScript", "HTML", "CSS", "React", "Node.js", 
    "Git", "Docker", "Kubernetes", "AWS", "SQL", "MongoDB", "Express", "Tailwind", "Next.js", 
    "Redux", "Rust", "Go", "Ruby", "PHP", "Swift", "Kotlin", "Flutter", "C#"
  ];
  commonTech.forEach(tech => {
    if (!extracted_skills.includes(tech) && cleanText.includes(tech.toLowerCase())) {
      extracted_skills.push(tech);
    }
  });

  const missing_skills = expectedSkills.filter(skill => !extracted_skills.includes(skill));

  if (extracted_skills.length === 0) {
    extracted_skills.push("HTML", "CSS", "JavaScript", "Git");
  }

  const score = Math.max(35, Math.min(95, Math.round((extracted_skills.filter(s => expectedSkills.includes(s)).length / expectedSkills.length) * 100)));

  const roadmap: Roadmap = [];
  const skillsToLearn = missing_skills.length > 0 ? missing_skills : ["Advanced Concepts", "System Design", "Testing"];
  
  const totalWeeks = Math.max(4, Math.min(6, skillsToLearn.length));
  for (let i = 0; i < totalWeeks; i++) {
    const skill = skillsToLearn[i] || "System Design & Best Practices";
    roadmap.push({
      week: i + 1,
      title: `Mastering ${skill}`,
      objectives: [
        `Understand core concepts of ${skill}`,
        `Build a mini-project showcasing ${skill}`,
        `Read official documentation and best practices`
      ],
      outcomes: [
        `Able to write production-grade code using ${skill}`,
        `Added new portfolio project to GitHub`,
        `Comfortable answering technical interview questions on ${skill}`
      ]
    });
  }

  const resources: Resource[] = [];
  skillsToLearn.slice(0, 4).forEach(skill => {
    resources.push({
      title: `${skill} Complete Course`,
      provider: "freeCodeCamp",
      url: `https://www.youtube.com/results?search_query=freecodecamp+${encodeURIComponent(skill)}`,
      skill: skill
    });
    resources.push({
      title: `${skill} Developer Docs`,
      provider: "Official Documentation",
      url: `https://www.google.com/search?q=${encodeURIComponent(skill)}+official+documentation`,
      skill: skill
    });
  });

  return {
    summary: `Resume analyzed successfully. Skill comparison based on a simulated alignment with target requirements of a ${targetRole}.`,
    extracted_skills,
    missing_skills,
    readiness_score: score,
    roadmap,
    resources
  };
}


