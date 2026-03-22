import { useEffect, useState } from 'react';
import { useAuth, Profile } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Mic, PenTool, BookOpen, Headphones, Trophy, Flame, Zap, CalendarDays, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useLang, t } from '@/lib/i18n';

const i18n = {
  welcome: { en: 'Welcome back', np: 'फेरि स्वागत छ' },
  daysLeft: { en: 'days until your exam', np: 'दिन बाँकी परीक्षाको' },
  todaysPlan: { en: "Today's Study Plan", np: 'आजको अध्ययन योजना' },
  practiceWeakest: { en: 'Focus on your weakest skill today', np: 'आज आफ्नो कमजोर सीपमा ध्यान दिनुहोस्' },
  practice: { en: 'Practice', np: 'अभ्यास' },
  recentScores: { en: 'Recent Mock Test Scores', np: 'हालैको मक परीक्षा स्कोर' },
  streak: { en: 'Day Streak', np: 'दिन स्ट्रीक' },
  xp: { en: 'XP Points', np: 'XP अंक' },
  quote: { en: 'Hard work never fails', np: '"मेहनत कहिल्यै बेकार जाँदैन" — सफलता तपाईंको हातमा छ! 💪' },
  noScores: { en: 'Take a mock test to see your scores here', np: 'स्कोर हेर्न मक टेस्ट दिनुहोस्' },
};

const skills = [
  { key: 'speaking', label: 'Speaking', icon: Mic, path: '/practice/speaking', color: 'text-primary' },
  { key: 'writing', label: 'Writing', icon: PenTool, path: '/practice/writing', color: 'text-accent' },
  { key: 'reading', label: 'Reading', icon: BookOpen, path: '/practice/reading', color: 'text-success' },
  { key: 'listening', label: 'Listening', icon: Headphones, path: '/practice/listening', color: 'text-warning' },
];

export default function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();
  const [mockScores, setMockScores] = useState<any[]>([]);
  const [skillAverages, setSkillAverages] = useState<Record<string, number>>({});
  const [weakestSkill, setWeakestSkill] = useState('speaking');

  useEffect(() => {
    if (!user) return;
    // Fetch mock test scores
    supabase.from('mock_tests').select('*').eq('user_id', user.id).order('completed_at', { ascending: true }).limit(10)
      .then(({ data }) => {
        if (data) setMockScores(data.map(d => ({
          date: new Date(d.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          score: d.total_score,
        })));
      });

    // Calculate skill averages from user_attempts
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
        let minAvg = Infinity, minSkill = 'speaking';
        Object.entries(grouped).forEach(([skill, scores]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          avgs[skill] = Math.round(avg);
          if (avg < minAvg) { minAvg = avg; minSkill = skill; }
        });
        setSkillAverages(avgs);
        setWeakestSkill(minSkill);
      });
  }, [user]);

  const daysUntilExam = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground" style={{ lineHeight: '1.2' }}>
          {t(i18n.welcome, lang)}, {profile?.full_name || 'Student'} 👋
        </h1>
        {daysUntilExam !== null && (
          <p className="text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
            <CalendarDays className="inline w-4 h-4 mr-0.5 -mt-0.5" />
            <span className="font-semibold text-accent">{daysUntilExam}</span> {t(i18n.daysLeft, lang)} ({profile?.exam_type})
            {(profile?.exam_type === 'IELTS' || profile?.exam_type === 'Both') && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 ml-1 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 cursor-help">
                      <Info className="w-3 h-3" /> Partial support
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] text-center">
                    Full IELTS support is coming soon. Reading & Listening are fully compatible, while Speaking & Writing are optimised for PTE.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </p>
        )}
      </div>

      {/* Streak & XP */}
      <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{profile?.streak_count || 0}</div>
              <div className="text-xs text-muted-foreground">{t(i18n.streak, lang)}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums">{profile?.xp_points || 0}</div>
              <div className="text-xs text-muted-foreground">{t(i18n.xp, lang)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Study Plan */}
      <Card className="shadow-sm animate-fade-up border-primary/20 bg-primary/[0.02]" style={{ animationDelay: '160ms' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent" />
                {t(i18n.todaysPlan, lang)}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t(i18n.practiceWeakest, lang)}: <span className="capitalize font-medium text-foreground">{weakestSkill}</span>
              </p>
            </div>
            <Button size="sm" onClick={() => navigate(`/practice/${weakestSkill}`)}>
              {t(i18n.practice, lang)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skill Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '240ms' }}>
        {skills.map((skill) => (
          <Card key={skill.key} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(skill.path)}>
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-2 group-hover:scale-[1.03] transition-transform ${skill.color}`}>
                <skill.icon className="w-5 h-5" />
              </div>
              <div className="font-medium text-sm">{skill.label}</div>
              <div className="text-lg font-bold tabular-nums mt-1">
                {skillAverages[skill.key] ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground">avg score</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mock Test Chart */}
      <Card className="shadow-sm animate-fade-up" style={{ animationDelay: '320ms' }}>
        <CardHeader className="pb-2">
          <h3 className="font-semibold text-sm">{t(i18n.recentScores, lang)}</h3>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {mockScores.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={mockScores}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(220, 87%, 48%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{t(i18n.noScores, lang)}</p>
          )}
        </CardContent>
      </Card>

      {/* Motivational Quote */}
      <div className="text-center py-4 animate-fade-up" style={{ animationDelay: '400ms' }}>
        <p className="text-sm text-muted-foreground font-nepali italic">
          {t(i18n.quote, lang)}
        </p>
      </div>
    </div>
  );
}
