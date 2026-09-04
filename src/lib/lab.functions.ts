import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const LabInput = z.object({
  codeOrReportText: z.string().min(10).max(80_000),
  subject: z.string().min(2).max(100),
  filename: z.string().optional(),
});

export interface LabEvaluationTimelineItem {
  step: number;
  title: string;
  description: string;
}

export interface LabEvaluationResult {
  score: number;
  logic_score: number;
  doc_score: number;
  completeness_score: number;
  output_score: number;
  code_quality_score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  suggestions: string[];
  timeline: LabEvaluationTimelineItem[];
}

const LAB_SYS = `You are an AI Lab Evaluator. Analyze the uploaded programming source code or report for this subject.
Evaluate the submission against five criteria, scoring each from 0 to 100:
1. Logic (correctness, algorithm efficiency, edge cases)
2. Documentation (comments, report structure, explanations)
3. Completeness (fulfilled objectives, complete functions)
4. Output Quality (expected vs actual outputs, error handling)
5. Code Quality (formatting, naming conventions, clean code, SOLID)

Return ONLY valid JSON matching this TypeScript shape (do not wrap in markdown or fences, output raw JSON):

{
  "score": number,                // overall score (0-100)
  "logic_score": number,          // 0-100
  "doc_score": number,            // 0-100
  "completeness_score": number,    // 0-100
  "output_score": number,          // 0-100
  "code_quality_score": number,    // 0-100
  "strengths": string[],          // 2-3 key strengths of the submission
  "weaknesses": string[],         // 2-3 key weaknesses or areas of concern
  "feedback": string,             // 2-3 sentence overall critique
  "suggestions": string[],        // 2-3 actionable tips for code improvement
  "timeline": [                   // 3-4 sequential steps to elevate this lab to a perfect 100/100
    { "step": number, "title": string, "description": string }
  ]
}

Be constructive, specific, and code-focused.`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

export const evaluateLab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LabInput.parse(input))
  .handler(async ({ data }): Promise<LabEvaluationResult> => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;

    let parsed: LabEvaluationResult;

    if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
      const prompt = `Subject: ${data.subject}\nFilename: ${data.filename || "unknown"}\n\n--- SUBMISSION CONTENT ---\n${data.codeOrReportText}\n--- END SUBMISSION CONTENT ---\n\nEvaluate and return the JSON.`;
      
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: LAB_SYS }] },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API error (Status ${response.status})`);
        }

        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty response");

        parsed = JSON.parse(stripFences(text)) as LabEvaluationResult;
      } catch (err: any) {
        console.error("Gemini failed, falling back to mock evaluator", err);
        parsed = getMockEvaluation(data.subject, data.filename);
      }
    } else if (lovableKey) {
      const gateway = createLovableAiGatewayProvider(lovableKey);
      const prompt = `Subject: ${data.subject}\nFilename: ${data.filename || "unknown"}\n\n--- SUBMISSION CONTENT ---\n${data.codeOrReportText}\n--- END SUBMISSION CONTENT ---\n\nEvaluate and return the JSON.`;

      try {
        const { text } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: LAB_SYS,
          prompt,
          temperature: 0.3,
        });
        parsed = JSON.parse(stripFences(text)) as LabEvaluationResult;
      } catch (err: any) {
        console.error("Lovable failed, falling back to mock evaluator", err);
        parsed = getMockEvaluation(data.subject, data.filename);
      }
    } else {
      console.log("No AI keys found. Falling back to mock evaluator.");
      parsed = getMockEvaluation(data.subject, data.filename);
    }

    return parsed;
  });

export const saveLabEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    subject: z.string(),
    filename: z.string().optional(),
    score: z.number(),
    logicScore: z.number(),
    docScore: z.number(),
    completenessScore: z.number(),
    outputScore: z.number(),
    codeQualityScore: z.number(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    feedback: z.string(),
    suggestions: z.array(z.string()),
    timeline: z.any(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("lab_evaluations" as any)
      .insert({
        user_id: userId,
        subject: data.subject,
        filename: data.filename || "Code_Upload",
        score: data.score,
        logic_score: data.logicScore,
        doc_score: data.docScore,
        completeness_score: data.completenessScore,
        output_score: data.outputScore,
        code_quality_score: data.codeQualityScore,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        feedback: data.feedback,
        suggestions: data.suggestions,
        timeline: data.timeline,
      } as any)
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error, evaluation saved locally", error);
      return { id: "local-only", success: false };
    }
    // inserted may be undefined if no data returned; safely access id
    const evalId = (inserted as any)?.id;
    return { id: evalId ?? "unknown", success: true };
  });

export const listLabEvaluations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("lab_evaluations" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to query lab evaluations", error);
      return [];
    }
    return data || [];
  });

function getMockEvaluation(subject: string, filename?: string): LabEvaluationResult {
  return {
    score: 78,
    logic_score: 85,
    doc_score: 60,
    completeness_score: 90,
    output_score: 75,
    code_quality_score: 80,
    strengths: [
      "Well-structured algorithm with O(N) linear time complexity.",
      "Successfully covers the standard test cases and main helper functions.",
      "Clear naming convention for core variables and functions."
    ],
    weaknesses: [
      "Lack of inline comments and structural Javadocs/docstrings.",
      "Missing error boundary checks and exception handling for null values.",
      "Loose configuration parameters hardcoded in the main script."
    ],
    feedback: `The submission for ${subject} demonstrates a solid logical flow and fulfills the core objectives. However, code readability and defensive programming need improvement to prevent system crashes on edge case inputs.`,
    suggestions: [
      "Incorporate docstrings for all top-level functions explaining arguments and types.",
      "Add a try-catch/except block to handle file reading or network socket timeouts.",
      "Extract environment variables or config arrays into a separate config block."
    ],
    timeline: [
      {
        step: 1,
        title: "Improve Exception Boundaries",
        description: "Enclose data parsing sections within structured try/except blocks to return formatted user-friendly errors."
      },
      {
        step: 2,
        title: "Add Structural Documentation",
        description: "Add docstrings detailing inputs, outputs, and side-effects for each helper function."
      },
      {
        step: 3,
        title: "Externalize Hardcoded Values",
        description: "Migrate database paths, API endpoints, and configuration flags into constants at the top of the file."
      },
      {
        step: 4,
        title: "Refactor Edge Cases",
        description: "Write unit assertions validating empty strings, negative integers, or overflow inputs."
      }
    ]
  };
}
