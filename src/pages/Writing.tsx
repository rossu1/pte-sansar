import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import IeltsBanner from '@/components/shared/IeltsBanner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';
import { useSmartQuestion } from '@/hooks/useSmartQuestion';
import QuestionSkeleton from '@/components/shared/QuestionSkeleton';
import GenericScoreDisplay from '@/components/shared/GenericScoreDisplay';
import { toast } from 'sonner';
import { sanitizeText } from '@/lib/sanitize';

const i18n = {
  writing: { en: 'Writing Practice', np: 'लेखन अभ्यास' },
  swt: { en: 'Summarise Written Text', np: 'लिखित पाठ सारांश' },
  essay: { en: 'Write Essay', np: 'निबन्ध लेख्नुहोस्' },
  noQuestions: { en: 'No questions available.', np: 'कुनै प्रश्न उपलब्ध छैन।' },
  submit: { en: 'Submit', np: 'पेश गर्नुहोस्' },
  scoring: { en: 'Scoring...', np: 'स्कोरिङ...' },
  timeLeft: { en: 'Time left', np: 'बाँकी समय' },
  wordCount: { en: 'words', np: 'शब्दहरू' },
  swtPrompt: { en: 'Read the passage and write a single sentence summary (5-75 words).', np: 'पाठ पढ्नुहोस् र एक वाक्य सारांश लेख्नुहोस् (५-७५ शब्द)।' },
  essayPrompt: { en: 'Write a 200-300 word essay on the topic below.', np: 'तलको विषयमा २००-३०० शब्दको निबन्ध लेख्नुहोस्।' },
  aiGenerated: { en: '✨ AI-Generated', np: '✨ AI-उत्पन्न' },
};

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: number;
  image_url: string | null;
  is_generated?: boolean;
}

const TIME_LIMITS: Record<string, number> = {
  'Summarise Written Text': 600, // 10 min
  'Write Essay': 1200, // 20 min
};

export default function WritingPage() {
  const { user, profile } = useAuth();
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState('Summarise Written Text');
  const isIelts = profile?.exam_type === 'IELTS' || profile?.exam_type === 'Both';
  const [questionsByType, setQuestionsByType] = useState<Record<string, Question[]>>({});
  const [indices, setIndices] = useState<Record<string, number>>({});
  const [answer, setAnswer] = useState('');
  const [countdown, setCountdown] = useState(600);
  const [phase, setPhase] = useState<'writing' | 'scoring' | 'result'>('writing');
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [userPlan, setUserPlan] = useState('free');
  const [smartQuestion, setSmartQuestion] = useState<Question | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const smartQ = useSmartQuestion();

  useEffect(() => {
    if (!user) return;
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).eq('status', 'active').single()
      .then(({ data }) => { if (data) setUserPlan(data.plan); });
  }, [user]);

  const isPremium = userPlan === 'pro' || userPlan === 'intensive';

  useEffect(() => {
    supabase.from('questions').select('id, question_text, question_type, difficulty, image_url')
      .eq('skill', 'writing')
      .then(({ data }) => {
        if (!data) return;
        const grouped: Record<string, Question[]> = {};
        data.forEach((q) => {
          if (!grouped[q.question_type]) grouped[q.question_type] = [];
          grouped[q.question_type].push(q);
        });
        setQuestionsByType(grouped);
      });
  }, []);

  const fetchSmart = useCallback(async (type: string) => {
    if (!user || !isPremium) return;
    setSmartQuestion(null);
    const q = await smartQ.generateQuestion(user.id, 'writing', type);
    if (q) setSmartQuestion(q);
  }, [user, isPremium, smartQ.generateQuestion]);

  useEffect(() => {
    if (isPremium && user) fetchSmart(activeTab);
  }, [activeTab, isPremium, user]);

  const staticQuestions = questionsByType[activeTab] || [];
  const currentIdx = indices[activeTab] || 0;
  const question = isPremium ? smartQuestion : staticQuestions[currentIdx];
  const isLoading = isPremium && smartQ.loading;

  // Timer
  useEffect(() => {
    if (phase !== 'writing' || !question || isLoading) return;
    const timeLimit = TIME_LIMITS[activeTab] || 600;
    setCountdown(timeLimit);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, question?.id, isLoading]);

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  const handleSubmit = async () => {
    if (!question || !user || !answer.trim()) return;
    clearInterval(timerRef.current);
    setPhase('scoring');
    const sanitizedAnswer = sanitizeText(answer, 5000);
    try {
      const { data, error } = await supabase.functions.invoke('score-writing', {
        body: { user_answer: sanitizedAnswer, question_text: question.question_text, question_type: question.question_type },
      });
      if (error) throw error;
      setScoreResult(data);
      await supabase.from('user_attempts').insert({
        user_id: user.id,
        question_id: question.id,
        user_answer: answer,
        ai_score: data.overall_score,
        ai_feedback: data.feedback_en,
        ai_feedback_nepali: data.feedback_np,
        time_taken_seconds: (TIME_LIMITS[activeTab] || 600) - countdown,
      });
      await supabase.rpc('update_streak_and_xp', { p_user_id: user.id, p_xp_gained: 10 });
      setPhase('result');
    } catch (err: any) {
      toast.error(err.message || 'Scoring failed');
      setPhase('writing');
    }
  };

  const nextQuestion = () => {
    setPhase('writing');
    setAnswer('');
    setScoreResult(null);
    if (isPremium) {
      fetchSmart(activeTab);
    } else {
      setIndices((prev) => ({ ...prev, [activeTab]: ((prev[activeTab] || 0) + 1) % staticQuestions.length }));
    }
  };

  const handleTabChange = (tab: string) => {
    clearInterval(timerRef.current);
    setPhase('writing');
    setAnswer('');
    setScoreResult(null);
    setActiveTab(tab);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const tabMap: [string, { en: string; np: string }][] = [
    ['Summarise Written Text', i18n.swt],
    ['Write Essay', i18n.essay],
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold animate-fade-up" style={{ lineHeight: '1.2' }}>
        ✍️ {t(i18n.writing, lang)}
      </h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-2">
          {tabMap.map(([type, label]) => (
            <TabsTrigger key={type} value={type} className="text-xs sm:text-sm">{t(label, lang)}</TabsTrigger>
          ))}
        </TabsList>

        {tabMap.map(([type]) => (
          <TabsContent key={type} value={type} className="mt-4">
            {activeTab !== type ? null : isLoading ? (
              <QuestionSkeleton />
            ) : !question ? (
              <Card className="shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">{t(i18n.noQuestions, lang)}</CardContent></Card>
            ) : phase === 'result' && scoreResult ? (
              <GenericScoreDisplay
                overall_score={scoreResult.overall_score}
                feedback_en={scoreResult.feedback_en}
                feedback_np={scoreResult.feedback_np}
                improved_version={scoreResult.improved_version}
                extra={{
                  content: scoreResult.content_score,
                  grammar: scoreResult.grammar_score,
                  vocabulary: scoreResult.vocabulary_score,
                  structure: scoreResult.structure_score,
                }}
                onNext={nextQuestion}
              />
            ) : (
              <div className="space-y-4 animate-fade-up">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        {isPremium ? t(i18n.aiGenerated, lang) : `Question ${currentIdx + 1} of ${staticQuestions.length}`}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">Difficulty: {question.difficulty}/5</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      {type === 'Summarise Written Text' ? t(i18n.swtPrompt, lang) : t(i18n.essayPrompt, lang)}
                    </p>
                    <div className="bg-secondary/30 rounded-lg p-4 border">
                      <p className="text-sm leading-relaxed">{question.question_text}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>⏱ {t(i18n.timeLeft, lang)}: <span className={`font-mono font-bold ${countdown < 60 ? 'text-red-500' : ''}`}>{formatTime(countdown)}</span></span>
                      <span>{wordCount} {t(i18n.wordCount, lang)}</span>
                    </div>
                    <Textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder={type === 'Summarise Written Text' ? 'Write your summary here...' : 'Write your essay here...'}
                      className="min-h-[200px] resize-none"
                      disabled={phase === 'scoring'}
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={phase === 'scoring' || !answer.trim()}
                      className="w-full gap-2"
                    >
                      {phase === 'scoring' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />{t(i18n.scoring, lang)}</>
                      ) : (
                        <><Send className="w-4 h-4" />{t(i18n.submit, lang)}</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
