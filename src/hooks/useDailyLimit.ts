import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FREE_DAILY_LIMIT = 5;

export function useDailyLimit(userId: string | undefined, plan: string) {
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || plan === 'pro') {
      setLoading(false);
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    supabase
      .from('user_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .then(({ count }) => {
        setTodayCount(count ?? 0);
        setLoading(false);
      });
  }, [userId, plan]);

  const increment = () => setTodayCount((c) => c + 1);

  const isLimitReached = plan !== 'pro' && todayCount >= FREE_DAILY_LIMIT;
  const remaining = Math.max(0, FREE_DAILY_LIMIT - todayCount);

  return { todayCount, isLimitReached, remaining, increment, loading, limit: FREE_DAILY_LIMIT };
}
