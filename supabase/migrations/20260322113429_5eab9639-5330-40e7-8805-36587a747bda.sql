
CREATE TABLE public.mock_test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_type text NOT NULL,
  mode text NOT NULL DEFAULT 'quick',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  scores jsonb NOT NULL DEFAULT '{"speaking":[],"writing":[],"reading":[],"listening":[]}'::jsonb,
  current_question_index integer NOT NULL DEFAULT 0,
  seconds_remaining integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_saved_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'in_progress'
);

ALTER TABLE public.mock_test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.mock_test_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.mock_test_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.mock_test_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.mock_test_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
