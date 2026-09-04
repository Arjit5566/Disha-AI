-- Create interviews table
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  target_role TEXT NOT NULL,
  questions_answers JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { question: string, answer: string, category: string, score: number, strengths: string[], improvements: string[], sampleAnswer: string }
  score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Interviews owner select" ON public.interviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Interviews owner insert" ON public.interviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Interviews owner delete" ON public.interviews FOR DELETE USING (auth.uid() = user_id);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
