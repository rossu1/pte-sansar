
-- Add indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_user_attempts_user_id ON public.user_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_attempts_question_id ON public.user_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_user_attempts_created_at ON public.user_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_skill ON public.questions(skill);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON public.questions(exam_type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_skill_type ON public.questions(skill, question_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_seen_topics_user_id ON public.seen_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_seen_topics_lookup ON public.seen_topics(user_id, skill, question_type);
CREATE INDEX IF NOT EXISTS idx_mock_tests_user_id ON public.mock_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
