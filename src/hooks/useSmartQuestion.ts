import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GeneratedQuestion {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: number;
  image_url: string | null;
  is_generated?: boolean;
}

export function useSmartQuestion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuestion = useCallback(
    async (userId: string, skill: string, questionType: string): Promise<GeneratedQuestion | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-question', {
          body: { user_id: userId, skill, question_type: questionType },
        });
        if (fnError) throw fnError;
        return data as GeneratedQuestion;
      } catch (err: any) {
        const msg = err?.message || 'Failed to generate question';
        setError(msg);
        console.error('Smart question error:', msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { generateQuestion, loading, error };
}
