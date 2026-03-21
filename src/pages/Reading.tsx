import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, GripVertical } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';
import { useSmartQuestion } from '@/hooks/useSmartQuestion';
import QuestionSkeleton from '@/components/shared/QuestionSkeleton';
import GenericScoreDisplay from '@/components/shared/GenericScoreDisplay';
import { toast } from 'sonner';

const i18n = {
  reading: { en: 'Reading Practice', np: 'पठन अभ्यास' },
  mcq: { en: 'Multiple Choice', np: 'बहुवैकल्पिक' },
  reorder: { en: 'Reorder Paragraphs', np: 'अनुच्छेद पुनःक्रम' },
  rwFib: { en: 'R/W Fill in Blanks', np: 'पढ्ने/लेख्ने खाली ठाउँ' },
  rFib: { en: 'Reading Fill in Blanks', np: 'पठन खाली ठाउँ' },
  noQuestions: { en: 'No questions available.', np: 'कुनै प्रश्न उपलब्ध छैन।' },
  submit: { en: 'Submit', np: 'पेश गर्नुहोस्' },
  scoring: { en: 'Scoring...', np: 'स्कोरिङ...' },
  aiGenerated: { en: '✨ AI-Generated', np: '✨ AI-उत्पन्न' },
  selectAnswer: { en: 'Select your answer', np: 'आफ्नो उत्तर चयन गर्नुहोस्' },
  reorderInstr: { en: 'Drag or use arrows to reorder the paragraphs.', np: 'अनुच्छेदहरू पुनःक्रम गर्नुहोस्।' },
  fibInstr: { en: 'Fill in each blank with the correct word.', np: 'प्रत्येक खाली ठाउँमा सही शब्द भर्नुहोस्।' },
};

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: number;
  correct_answer: string | null;
  image_url: string | null;
  is_generated?: boolean;
}

export default function ReadingPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState('Multiple Choice');
  const [questionsByType, setQuestionsByType] = useState<Record<string, Question[]>>({});
  const [indices, setIndices] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<'answering' | 'scoring' | 'result'>('answering');
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [userPlan, setUserPlan] = useState('free');
  const [smartQuestion, setSmartQuestion] = useState<Question | null>(null);
  const smartQ = useSmartQuestion();

  // MCQ state
  const [selectedOption, setSelectedOption] = useState<string>('');
  // Reorder state
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  // FIB state
  const [blanks, setBlanks] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).eq('status', 'active').single()
      .then(({ data }) => { if (data) setUserPlan(data.plan); });
  }, [user]);

  const isPremium = userPlan === 'pro' || userPlan === 'intensive';

  useEffect(() => {
    supabase.from('questions').select('id, question_text, question_type, difficulty, correct_answer, image_url')
      .eq('skill', 'reading')
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
    const q = await smartQ.generateQuestion(user.id, 'reading', type);
    if (q) setSmartQuestion(q as Question);
  }, [user, isPremium, smartQ.generateQuestion]);

  useEffect(() => {
    if (isPremium && user) fetchSmart(activeTab);
  }, [activeTab, isPremium, user]);

  const staticQuestions = questionsByType[activeTab] || [];
  const currentIdx = indices[activeTab] || 0;
  const question = isPremium ? smartQuestion : staticQuestions[currentIdx];
  const isLoading = isPremium && smartQ.loading;

  // Parse question content for MCQ options, reorder items, or blanks
  const parseQuestion = (q: Question | null) => {
    if (!q) return { passage: '', options: [] as string[], items: [] as string[], blankCount: 0 };
    const text = q.question_text;
    // MCQ: options separated by \n- or lines starting with A) B) C) D)
    const optionMatch = text.match(/(?:^|\n)[A-D]\)\s*.+/gm);
    const options = optionMatch ? optionMatch.map(o => o.trim()) : [];
    const passage = options.length > 0 ? text.split(/\n[A-D]\)/)[0].trim() : text;
    // Reorder: paragraphs separated by \n\n
    const items = text.split(/\n\n+/).filter(s => s.trim().length > 10);
    // FIB: count ___
    const blankCount = (text.match(/___/g) || []).length;
    return { passage, options, items, blankCount };
  };

  const parsed = parseQuestion(question);

  // Initialize states when question changes
  useEffect(() => {
    if (!question) return;
    setSelectedOption('');
    setOrderedItems(parsed.items.length > 1 ? [...parsed.items].sort(() => Math.random() - 0.5) : []);
    setBlanks(new Array(parsed.blankCount || 0).fill(''));
  }, [question?.id]);

  const getUserAnswer = (): string => {
    if (activeTab === 'Multiple Choice') return selectedOption;
    if (activeTab === 'Reorder Paragraphs') return orderedItems.join(' ||| ');
    return blanks.join(', ');
  };

  const handleSubmit = async () => {
    if (!question || !user) return;
    const userAnswer = getUserAnswer();
    if (!userAnswer.trim()) { toast.error('Please provide an answer'); return; }
    setPhase('scoring');
    try {
      const { data, error } = await supabase.functions.invoke('score-reading-listening', {
        body: {
          user_answer: userAnswer,
          question_text: question.question_text,
          question_type: question.question_type,
          correct_answer: question.correct_answer,
          skill: 'reading',
        },
      });
      if (error) throw error;
      setScoreResult(data);
      await supabase.from('user_attempts').insert({
        user_id: user.id,
        question_id: question.id,
        user_answer: userAnswer,
        ai_score: data.overall_score,
        ai_feedback: data.feedback_en,
        ai_feedback_nepali: data.feedback_np,
      });
      setPhase('result');
    } catch (err: any) {
      toast.error(err.message || 'Scoring failed');
      setPhase('answering');
    }
  };

  const nextQuestion = () => {
    setPhase('answering');
    setScoreResult(null);
    if (isPremium) {
      fetchSmart(activeTab);
    } else {
      setIndices((prev) => ({ ...prev, [activeTab]: ((prev[activeTab] || 0) + 1) % staticQuestions.length }));
    }
  };

  const handleTabChange = (tab: string) => {
    setPhase('answering');
    setScoreResult(null);
    setActiveTab(tab);
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= orderedItems.length) return;
    const items = [...orderedItems];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    setOrderedItems(items);
  };

  const tabMap: [string, { en: string; np: string }][] = [
    ['Multiple Choice', i18n.mcq],
    ['Reorder Paragraphs', i18n.reorder],
    ['R/W Fill in Blanks', i18n.rwFib],
    ['Reading Fill in Blanks', i18n.rFib],
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold animate-fade-up" style={{ lineHeight: '1.2' }}>
        📖 {t(i18n.reading, lang)}
      </h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-4">
          {tabMap.map(([type, label]) => (
            <TabsTrigger key={type} value={type} className="text-[10px] sm:text-xs">{t(label, lang)}</TabsTrigger>
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
                is_correct={scoreResult.is_correct}
                feedback_en={scoreResult.feedback_en}
                feedback_np={scoreResult.feedback_np}
                correct_answer_explanation={scoreResult.correct_answer_explanation}
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
                    {/* Passage */}
                    <div className="bg-secondary/30 rounded-lg p-4 border mb-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {type === 'Multiple Choice' ? parsed.passage : question.question_text}
                      </p>
                    </div>

                    {/* MCQ Options */}
                    {(type === 'Multiple Choice') && parsed.options.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t(i18n.selectAnswer, lang)}</p>
                        {parsed.options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedOption(opt)}
                            className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                              selectedOption === opt
                                ? 'border-primary bg-primary/5 font-medium'
                                : 'border-border hover:border-primary/50'
                            }`}
                            disabled={phase === 'scoring'}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reorder */}
                    {type === 'Reorder Paragraphs' && orderedItems.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t(i18n.reorderInstr, lang)}</p>
                        {orderedItems.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-card">
                            <div className="flex flex-col gap-0.5 mt-1">
                              <button onClick={() => moveItem(i, i - 1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                              <button onClick={() => moveItem(i, i + 1)} disabled={i === orderedItems.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
                            </div>
                            <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                            <p className="text-sm leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fill in Blanks */}
                    {(type === 'R/W Fill in Blanks' || type === 'Reading Fill in Blanks') && parsed.blankCount > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t(i18n.fibInstr, lang)}</p>
                        {blanks.map((val, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground w-16">Blank {i + 1}:</span>
                            <Input
                              value={val}
                              onChange={(e) => {
                                const next = [...blanks];
                                next[i] = e.target.value;
                                setBlanks(next);
                              }}
                              placeholder="Type your answer"
                              className="text-sm"
                              disabled={phase === 'scoring'}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button onClick={handleSubmit} disabled={phase === 'scoring'} className="w-full gap-2">
                  {phase === 'scoring' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{t(i18n.scoring, lang)}</>
                  ) : (
                    <><Send className="w-4 h-4" />{t(i18n.submit, lang)}</>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
