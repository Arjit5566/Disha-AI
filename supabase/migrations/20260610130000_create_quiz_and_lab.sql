-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  weak_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quizzes owner select" ON public.quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Quizzes owner insert" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Quizzes owner delete" ON public.quizzes FOR DELETE USING (auth.uid() = user_id);

-- Create lab_evaluations table
CREATE TABLE IF NOT EXISTS public.lab_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT NOT NULL,
  filename TEXT,
  score INT NOT NULL DEFAULT 0,
  logic_score INT NOT NULL DEFAULT 0,
  doc_score INT NOT NULL DEFAULT 0,
  completeness_score INT NOT NULL DEFAULT 0,
  output_score INT NOT NULL DEFAULT 0,
  code_quality_score INT NOT NULL DEFAULT 0,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedback TEXT,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_evaluations TO authenticated;
GRANT ALL ON public.lab_evaluations TO service_role;
ALTER TABLE public.lab_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab evaluations owner select" ON public.lab_evaluations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Lab evaluations owner insert" ON public.lab_evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Lab evaluations owner delete" ON public.lab_evaluations FOR DELETE USING (auth.uid() = user_id);
