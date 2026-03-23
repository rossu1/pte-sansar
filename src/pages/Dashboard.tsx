import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth, Profile } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Mic, PenTool, BookOpen, Headphones, Trophy, Flame, CalendarDays, Info, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useLang, t } from '@/lib/i18n';

const i18n = {
  welcome: { en: 'Welcome back', np: 'फेरि स्वागत छ' },
  daysLeft: { en: 'days until your exam', np: 'दिन बाँकी परीक्षाको' },
  todaysPlan: { en: "Today's Study Plan", np: 'आजको अध्ययन योजना' },
  practiceWeakest: { en: 'Focus on your weakest skill today', np: 'आज आफ्नो कमजोर सीपमा ध्यान दिनुहोस्' },
  practice: { en: 'Practice', np: 'अभ्यास' },
  recentScores: { en: 'Recent Mock Test Scores', np: 'हालैको मक परीक्षा स्कोर' },
  streak: { en: 'Day Streak', np: 'दिन स्ट्रीक' },
  
  quote: { en: 'Hard work never fails', np: '"मेहनत कहिल्यै बेकार जाँदैन" — सफलता तपाईंको हातमा छ! 💪' },
  noScores: { en: 'Take a mock test to see your scores here', np: 'स्कोर हेर्न मक टेस्ट दिनुहोस्' },
  readiness: { en: 'Readiness Score', np: 'तयारी स्कोर' },
  examIn: { en: 'Exam in', np: 'परीक्षा' },
  days: { en: 'days', np: 'दिन' },
  last7: { en: 'Last 7 scores', np: 'पछिल्लो ७ स्कोर' },
};

const skills = [
  { key: 'speaking', label: 'Speaking', icon: Mic, path: '/practice/speaking' },
  { key: 'writing', label: 'Writing', icon: PenTool, path: '/practice/writing' },
  { key: 'reading', label: 'Reading', icon: BookOpen, path: '/practice/reading' },
  { key: 'listening', label: 'Listening', icon: Headphones, path: '/practice/listening' },
];

/* ── Readiness Gauge ── */
function ReadinessGauge({ score }: { score: number }) {
  const radius = 78;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const target = circumference - (score / 100) * circumference;

  // Gradient color stops mapped to score
  const getColor = (s: number) => {
    if (s >= 70) return 'hsl(142, 71%, 45%)';
    if (s >= 40) return 'hsl(38, 92%, 50%)';
    return 'hsl(0, 72%, 51%)';
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* Background track */}
        <circle cx="90" cy="90" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        {/* Animated arc */}
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={target}
          transform="rotate(-90 90 90)"
          style={{
            animation: 'gauge-fill 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            ['--gauge-circumference' as any]: circumference,
            ['--gauge-target' as any]: target,
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-heading font-bold tabular-nums" style={{ color: getColor(score) }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ── XP Counter ── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 800;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    prevRef.current = value;
  }, [value]);

  return <>{display}</>;
}

/* ── Mini Sparkline ── */
function Sparkline({ data }: { data: number[] }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();
  const [mockScores, setMockScores] = useState<any[]>([]);
  const [skillAverages, setSkillAverages] = useState<Record<string, number>>({});
  const [skillTrends, setSkillTrends] = useState<Record<string, number[]>>({});
  const [weakestSkill, setWeakestSkill] = useState('speaking');

  useEffect(() => {
    if (!user) return;
    supabase.from('mock_tests').select('*').eq('user_id', user.id).order('completed_at', { ascending: true }).limit(10)
      .then(({ data }) => {
        if (data) setMockScores(data.map(d => ({
          date: new Date(d.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          score: d.total_score,
        })));
      });

    supabase.from('user_attempts').select('ai_score, questions(skill)').eq('user_id', user.id)
      .then(({ data }: any) => {
        if (!data || data.length === 0) return;
        const grouped: Record<string, number[]> = {};
        data.forEach((a: any) => {
          const skill = a.questions?.skill;
          if (skill && a.ai_score != null) {
            if (!grouped[skill]) grouped[skill] = [];
            grouped[skill].push(Number(a.ai_score));
          }
        });
        const avgs: Record<string, number> = {};
        const trends: Record<string, number[]> = {};
        let minAvg = Infinity, minSkill = 'speaking';
        Object.entries(grouped).forEach(([skill, scores]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          avgs[skill] = Math.round(avg);
          trends[skill] = scores.slice(-7);
          if (avg < minAvg) { minAvg = avg; minSkill = skill; }
        });
        setSkillAverages(avgs);
        setSkillTrends(trends);
        setWeakestSkill(minSkill);
      });
  }, [user]);

  const daysUntilExam = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  // Compute readiness score (average of all skill averages, scaled to 100)
  const allAvgs = Object.values(skillAverages);
  const readinessScore = allAvgs.length > 0
    ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length * 100 / 90)
    : 0;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground" style={{ lineHeight: '1.15' }}>
          {t(i18n.welcome, lang)}, {profile?.full_name || 'Student'} 👋
        </h1>
        {(profile?.exam_type === 'IELTS' || profile?.exam_type === 'Both') && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 cursor-help">
                  <Info className="w-3 h-3" /> Partial support
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] text-center">
                Full IELTS support is coming soon. Reading & Listening are fully compatible, while Speaking & Writing are optimised for PTE.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Hero Readiness Card */}
      <Card className="shadow-sm overflow-hidden" style={{ animationDelay: '80ms' }}>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <ReadinessGauge score={readinessScore} />
            <div className="flex-1 text-center sm:text-left space-y-3">
              <h2 className="font-heading text-lg font-bold">{t(i18n.readiness, lang)}</h2>
              {daysUntilExam !== null && (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <CalendarDays className="w-5 h-5 text-accent" />
                  <span className="text-2xl font-heading font-bold text-accent tabular-nums">{daysUntilExam}</span>
                  <span className="text-sm text-muted-foreground">{t(i18n.days, lang)}</span>
                </div>
              )}
              {/* Streak & XP inline */}
              <div className="flex items-center gap-4 justify-center sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-accent" />
                  <span className="font-bold tabular-nums">{profile?.streak_count || 0}</span>
                  <span className="text-xs text-muted-foreground">{t(i18n.streak, lang)}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-bold tabular-nums"><AnimatedNumber value={profile?.xp_points || 0} /></span>
                  <span className="text-xs text-muted-foreground">{t(i18n.xp, lang)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Study Plan */}
      <Card className="shadow-sm border-primary/20 bg-primary/[0.03]" style={{ animationDelay: '160ms' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent shrink-0" />
                {t(i18n.todaysPlan, lang)}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {t(i18n.practiceWeakest, lang)}: <span className="capitalize font-medium text-foreground">{weakestSkill}</span>
              </p>
            </div>
            <Button size="sm" onClick={() => navigate(`/practice/${weakestSkill}`)} className="gap-1 btn-press shrink-0">
              {t(i18n.practice, lang)} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skill Cards with Sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ animationDelay: '240ms' }}>
        {skills.map((skill) => {
          const trend = skillTrends[skill.key] || [];
          return (
            <Card
              key={skill.key}
              className="shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer group overflow-hidden"
              onClick={() => navigate(skill.path)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-[1.03] transition-transform text-primary">
                    <skill.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-heading font-bold text-sm">{skill.label}</div>
                    <div className="text-lg font-bold tabular-nums leading-none">
                      {skillAverages[skill.key] ?? '—'}
                    </div>
                  </div>
                </div>
                {trend.length > 1 ? (
                  <Sparkline data={trend} />
                ) : (
                  <div className="h-10 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">{t(i18n.last7, lang)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mock Test Chart */}
      <Card className="shadow-sm" style={{ animationDelay: '320ms' }}>
        <CardHeader className="pb-2">
          <h3 className="font-heading font-bold text-sm">{t(i18n.recentScores, lang)}</h3>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {mockScores.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={mockScores}>
                <RechartsTooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{t(i18n.noScores, lang)}</p>
          )}
        </CardContent>
      </Card>

      {/* Quote */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground font-nepali italic">
          {t(i18n.quote, lang)}
        </p>
      </div>
    </div>
  );
}
