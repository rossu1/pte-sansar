
CREATE TABLE public.seen_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill TEXT NOT NULL,
  question_type TEXT NOT NULL,
  topic TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seen_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seen topics" ON public.seen_topics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seen topics" ON public.seen_topics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_seen_topics_user_skill ON public.seen_topics(user_id, skill, question_type);
