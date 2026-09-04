import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ─── Input Schemas ─── */
const GenerateInput = z.object({
  targetRole: z.string().min(2).max(120),
});

const EvaluateInput = z.object({
  question: z.string().min(5).max(2000),
  answer: z.string().min(2).max(10000),
  targetRole: z.string().min(2).max(120),
  category: z.string().min(2).max(50),
});

const FollowUpInput = z.object({
  targetRole: z.string().min(2).max(120),
  history: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    category: z.string()
  }))
});

/* ─── Types ─── */
export interface InterviewQuestion {
  id: string;
  question: string;
  category: "Technical" | "Behavioral" | "Situational" | "Problem Solving";
  tips: string;
}

export interface InterviewEvaluation {
  score: number; // 1-10
  strengths: string[];
  improvements: string[];
  sampleAnswer: string;
}

export interface InterviewHistoryItem {
  question: string;
  answer: string;
  category: "Technical" | "Behavioral" | "Situational" | "Problem Solving";
}

export interface DetailedQuestionEvaluation {
  question: string;
  answer: string;
  category: "Technical" | "Behavioral" | "Situational" | "Problem Solving";
  score: number;
  strengths: string[];
  improvements: string[];
  sampleAnswer: string;
}

export interface FullInterviewEvaluation {
  score: number;
  feedback: string;
  evaluations: DetailedQuestionEvaluation[];
}

/* ─── System Prompts ─── */
const FIRST_QUESTION_SYS = `You are an expert interview coach for tech and professional roles.
Generate the FIRST interview question tailored to the given target role.
It should be a warm, role-specific introduction or initial technical/behavioral question to start the interview.

Return ONLY valid JSON matching this shape (no markdown, no commentary, no fences):

{
  "question": string,
  "category": "Technical" | "Behavioral" | "Situational" | "Problem Solving",
  "tips": string
}`;

const FOLLOW_UP_SYS = `You are an expert interview coach. Based on the candidate's target role and previous interview conversation history, generate the NEXT natural interview question.

Guidelines:
- Analyze the candidate's previous answers. If they mentioned something interesting, technical, or incomplete, ask a natural follow-up question to probe deeper (e.g., "You mentioned X, how did you handle Y?").
- If the current topic is exhausted, transition naturally to a new topic (e.g., a behavioral question, situational scenario, or technical concept relevant to the role).
- Keep the conversation flow organic, professional, and engaging—like a real human interviewer.
- Do NOT repeat questions already asked.
- Provide a brief 1-sentence tip on how the candidate should approach answering.

Return ONLY valid JSON matching this shape (no markdown, no commentary, no fences):

{
  "question": string,
  "category": "Technical" | "Behavioral" | "Situational" | "Problem Solving",
  "tips": string
}`;

const EVALUATE_FULL_SYS = `You are an expert interview evaluator. Evaluate the candidate's responses for the entire interview for the specified role.
Analyze each question and answer pair individually.

Return ONLY valid JSON matching this shape (no markdown, no commentary, no fences):

{
  "score": number, // Overall interview score from 1-10 (average of question scores, rounded to 1 decimal place)
  "feedback": string, // Overall summary feedback of the candidate's performance
  "evaluations": [
    {
      "question": string,
      "answer": string,
      "category": "Technical" | "Behavioral" | "Situational" | "Problem Solving",
      "score": number, // 1-10 for this specific answer
      "strengths": string[], // 2-3 specific points
      "improvements": string[], // 2-3 actionable points
      "sampleAnswer": string // a concise ideal answer
    }
  ]
}

Rules:
- Be fair and constructive.
- Make sure "evaluations" matches the exact order of questions in the history.
- "score" is 1-10 where 1=poor, 5=average, 8=good, 10=exceptional.`;

const GENERATE_SYS = `You are an expert interview coach for tech and professional roles.
Generate exactly 8 interview questions tailored to the given target role.
Include a good mix of categories: Technical (3-4), Behavioral (2), Situational (1-2), and Problem Solving (1).

Return ONLY valid JSON matching this shape (no markdown, no commentary, no fences):

{
  "questions": [
    {
      "id": string,
      "question": string,
      "category": "Technical" | "Behavioral" | "Situational" | "Problem Solving",
      "tips": string
    }
  ]
}

Rules:
- Generate exactly 8 questions.
- Questions must be specific to the target role, not generic.
- "tips" should be a brief 1-sentence hint on how to approach the question.
- Make questions progressively harder.
- Output strict JSON only.`;

const EVALUATE_SYS = `You are an expert interview evaluator. Evaluate the candidate's answer to the given interview question for the specified role.

Return ONLY valid JSON matching this shape (no markdown, no commentary, no fences):

{
  "score": number,
  "strengths": string[],
  "improvements": string[],
  "sampleAnswer": string
}

Rules:
- "score" is 1-10 where 1=terrible, 5=average, 8=good, 10=exceptional.
- "strengths" should list 2-4 specific things the candidate did well.
- "improvements" should list 2-4 specific suggestions.
- Output strict JSON only.`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

/* ─── Server Functions ─── */

export const generateFirstQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }): Promise<{ question: string; category: "Technical" | "Behavioral" | "Situational" | "Problem Solving"; tips: string }> => {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
      const prompt = `Target Role: ${data.targetRole}\n\nGenerate the first interview question.`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: FIRST_QUESTION_SYS }] },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.6,
              },
            }),
          }
        );

        if (!response.ok) throw new Error(`Status ${response.status}`);
        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty response");

        return JSON.parse(stripFences(text));
      } catch (err: any) {
        console.error("Gemini first question failed, falling back to mock", err);
      }
    }
    return {
      question: `Welcome to the interview. To start, can you introduce yourself and walk me through your background as a ${data.targetRole}?`,
      category: "Behavioral",
      tips: "Briefly outline your relevant experiences and key accomplishments.",
    };
  });

export const generateFollowUpQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FollowUpInput.parse(input))
  .handler(async ({ data }): Promise<{ question: string; category: "Technical" | "Behavioral" | "Situational" | "Problem Solving"; tips: string }> => {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
      const historyText = data.history
        .map((h, i) => `Question ${i + 1}: ${h.question}\nCandidate Answer ${i + 1}: ${h.answer}`)
        .join("\n\n");
      const prompt = `Target Role: ${data.targetRole}\n\n--- INTERVIEW CONVERSATION HISTORY ---\n${historyText}\n--- END HISTORY ---\n\nBased on this history, generate the next follow-up question.`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: FOLLOW_UP_SYS }] },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
              },
            }),
          }
        );

        if (!response.ok) throw new Error(`Status ${response.status}`);
        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty response");

        return JSON.parse(stripFences(text));
      } catch (err: any) {
        console.error("Gemini follow-up failed, falling back to mock", err);
      }
    }

    // Fallbacks
    const fallbackQuestions: Array<{ question: string; category: "Technical" | "Behavioral" | "Situational" | "Problem Solving"; tips: string }> = [
      {
        question: `How do you handle conflict or differing opinions with team members or stakeholders when building a ${data.targetRole} application?`,
        category: "Behavioral",
        tips: "Focus on collaboration, communication, and reaching a compromise.",
      },
      {
        question: `Can you describe a challenging technical problem you solved while working on a ${data.targetRole} project?`,
        category: "Technical",
        tips: "Walk through the problem, the options you weighed, and your ultimate solution.",
      },
      {
        question: `If you noticed a production performance degradation in a key component of your ${data.targetRole} codebase, how would you triage it?`,
        category: "Problem Solving",
        tips: "Mention your monitoring tools, logging systems, and isolated testing strategy.",
      },
      {
        question: `How do you stay up-to-date with emerging tools and standards in the ${data.targetRole} landscape?`,
        category: "Situational",
        tips: "List books, blogs, newsletters, open source contributions, or side projects.",
      }
    ];
    const randomIndex = Math.floor(Math.random() * fallbackQuestions.length);
    return fallbackQuestions[randomIndex];
  });

export const evaluateFullInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FollowUpInput.parse(input))
  .handler(async ({ data }): Promise<FullInterviewEvaluation> => {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
      const historyText = data.history
        .map((h, i) => `Question ${i + 1}: ${h.question}\nCandidate Answer ${i + 1}: ${h.answer}`)
        .join("\n\n");
      const prompt = `Role: ${data.targetRole}\n\n--- FULL INTERVIEW HISTORY ---\n${historyText}\n--- END HISTORY ---\n\nEvaluate this entire interview.`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: EVALUATE_FULL_SYS }] },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.4,
              },
            }),
          }
        );

        if (!response.ok) throw new Error(`Status ${response.status}`);
        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty response");

        return JSON.parse(stripFences(text));
      } catch (err: any) {
        console.error("Gemini full evaluation failed, falling back to mock", err);
      }
    }

    // Fallback evaluation
    const evaluations = data.history.map((h) => ({
      question: h.question,
      answer: h.answer,
      category: h.category as any,
      score: 7,
      strengths: ["Communicated clearly", "Showed structured logical reasoning"],
      improvements: ["Provide more quantitative details", "Elaborate further on implementation details"],
      sampleAnswer: "A standard answer would explain the core terms, provide a practical example from past experience, and show impact.",
    }));

    return {
      score: 7.0,
      feedback: "Great job completing the mock interview! Your communication is solid, and you demonstrate a functional understanding. To improve, structure your responses more rigidly and include specific success metrics.",
      evaluations,
    };
  });

export const saveInterviewResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    targetRole: z.string(),
    questionsAnswers: z.any(),
    score: z.number(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("interviews" as any)
      .insert({
        user_id: userId,
        target_role: data.targetRole,
        questions_answers: data.questionsAnswers,
        score: data.score,
      } as any)
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error, interview will run locally", error);
      return { id: "local-only", success: false };
    }
    return { id: (inserted as any)?.id ?? "unknown", success: true };
  });

export const listInterviewResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("interviews" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to query interviews", error);
      return [];
    }
    return data || [];
  });

/* ─── Legacy Fallbacks (Kept for compatibility) ─── */

export const generateInterviewQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }): Promise<{ questions: InterviewQuestion[] }> => {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
      const prompt = `Target Role: ${data.targetRole}\n\nGenerate 8 interview questions for this role.`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: GENERATE_SYS }] },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.6,
              },
            }),
          }
        );

        if (!response.ok) throw new Error(`Status ${response.status}`);
        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty response");

        return JSON.parse(stripFences(text));
      } catch (err: any) {
        console.error("Legacy generation failed", err);
      }
    }
    return getMockQuestions(data.targetRole);
  });

export const evaluateInterviewAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EvaluateInput.parse(input))
  .handler(async ({ data }): Promise<InterviewEvaluation> => {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey !== "YOUR_GEMINI_API_KEY") {
      const prompt = `Role: ${data.targetRole}\nCategory: ${data.category}\n\nQuestion: ${data.question}\n\nCandidate's Answer: ${data.answer}\n\nEvaluate this answer.`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: EVALUATE_SYS }] },
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.4,
              },
            }),
          }
        );

        if (!response.ok) throw new Error(`Status ${response.status}`);
        const resData = await response.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty response");

        return JSON.parse(stripFences(text)) as InterviewEvaluation;
      } catch (err: any) {
        console.error("Legacy evaluation failed", err);
      }
    }
    return getMockEvaluation();
  });

function getMockQuestions(targetRole: string): { questions: InterviewQuestion[] } {
  return {
    questions: [
      {
        id: "iq1",
        question: `Explain how you would design a scalable system architecture for a ${targetRole} project.`,
        category: "Technical",
        tips: "Focus on scalability patterns, load balancing, and database choices.",
      },
      {
        id: "iq2",
        question: `What are the most important technical skills a ${targetRole} should master in 2025?`,
        category: "Technical",
        tips: "Mention specific technologies and explain why they matter.",
      },
    ],
  };
}

function getMockEvaluation(): InterviewEvaluation {
  return {
    score: 7,
    strengths: ["Demonstrated clear communication skills"],
    improvements: ["Could provide more specific examples"],
    sampleAnswer: "A strong answer would include specific examples from your experience.",
  };
}
