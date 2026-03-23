import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Mic, PenTool, BookOpen, Headphones, Flame, HelpCircle, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { useLang, t } from '@/lib/i18n';

const i18n = {
  title: { en: 'Your Progress', np: 'तपाईंको प्रगति' },
  mockScores: { en: 'Mock Test Scores', np: 'मक टेस्ट स्कोर' },
  emptyMock: { en: 'Complete your first mock test to see your progress here', np: 'प्रगति हेर्न पहिलो मक टेस्ट दिनुहोस्' },
  takeMock: { en: 'Take Mock Test', np: 'मक टेस्ट दिनुहोस्' },
  skillAvg: { en: 'Skill Averages', np: 'सीप औसत' },
  streak: { en: 'Current Streak', np: 'हालको स्ट्रीक' },
  days: { en: 'days', np: 'दिन' },
  totalAnswered: { en: 'Questions Answered', np: 'उत्तर दिइएका प्रश्नहरू' },
};

const skillMeta = [
  { key: 'speaking', label: 'Speaking', icon: Mic },
  { key: 'writing', label: 'Writing', icon: PenTool },
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'listening', label: 'Listening', icon: Headphones },
];

export default function Progress() {
  const { user, profile } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  const [mockScores, setMockScores] = useState<{ date: string; score: number }[]>([]);
  const [skillAverages, setSkillAverages] = useState<Record<string, number | null>>({});
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);

      // Mock test scores (last 10)
      const { data: mocks } = await supabase
        .from('mock_tests')
        .select('total_score, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: true })
        .limit(10);

      if (mocks) {
        const allSameDay =
          mocks.length > 1 &&
          mocks.every(
            (m) => new Date(m.completed_at).toDateString() === new Date(mocks[0].completed_at).toDateString()
          );

        setMockScores(
          mocks.map((m) => {
            const d = new Date(m.completed_at);
            const dateStr = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
            const label = allSameDay
              ? `${dateStr} ${d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}`
              : dateStr;
            return { date: label, score: Number(m.total_score) || 0 };
          })
        );
      }

      // Skill averages from user_attempts joined with questions
      const { data: attempts } = await supabase
        .from('user_attempts')
        .select('ai_score, question_id, questions!inner(skill)')
        .eq('user_id', user.id);

      const avgs: Record<string, { sum: number; count: number }> = {};
      if (attempts) {
        setTotalAnswered(attempts.length);
        for (const a of attempts) {
          const skill = (a as any).questions?.skill as string | undefined;
          if (!skill || a.ai_score == null) continue;
          if (!avgs[skill]) avgs[skill] = { sum: 0, count: 0 };
          avgs[skill].sum += Number(a.ai_score);
          avgs[skill].count += 1;
        }
      }

      const result: Record<string, number | null> = {};
      for (const s of skillMeta) {
        result[s.key] = avgs[s.key] ? Math.round(avgs[s.key].sum / avgs[s.key].count) : null;
      }
      setSkillAverages(result);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold font-heading">{t(i18n.title, lang)}</h1>

      {/* Mock Test Score Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            {t(i18n.mockScores, lang)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mockScores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
              <HelpCircle className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm max-w-xs">{t(i18n.emptyMock, lang)}</p>
              <Button onClick={() => navigate('/mock-test')} size="sm">
                {t(i18n.takeMock, lang)}
              </Button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mockScores}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tick={({ x, y, payload }: any) => (
                  <text x={x} y={y} dy={8} textAnchor="end" transform={`rotate(-35, ${x}, ${y})`} fontSize={11} className="fill-muted-foreground">{payload.value}</text>
                )} height={50} className="fill-muted-foreground" />
                <YAxis domain={[0, 90]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Skill Averages */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 font-heading">{t(i18n.skillAvg, lang)}</h2>
        <div className="grid grid-cols-2 gap-3">
          {skillMeta.map((s) => {
            const Icon = s.icon;
            const avg = skillAverages[s.key];
            return (
              <Card key={s.key}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold font-heading tabular-nums">
                      {avg != null ? avg : '—'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t(i18n.streak, lang)}</p>
              <p className="text-xl font-bold font-heading tabular-nums">
                {profile?.streak_count ?? 0} <span className="text-sm font-normal text-muted-foreground">{t(i18n.days, lang)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t(i18n.totalAnswered, lang)}</p>
              <p className="text-xl font-bold font-heading tabular-nums">{totalAnswered}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
