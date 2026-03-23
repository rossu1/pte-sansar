import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import IeltsBanner from '@/components/shared/IeltsBanner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Volume2, Loader2 as VolumeLoader } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';
import { useSmartQuestion } from '@/hooks/useSmartQuestion';
import { useDailyLimit } from '@/hooks/useDailyLimit';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QuestionSkeleton from '@/components/shared/QuestionSkeleton';
import GenericScoreDisplay from '@/components/shared/GenericScoreDisplay';
import { toast } from 'sonner';

const i18n = {
  listening: { en: 'Listening Practice', np: 'सुन्ने अभ्यास' },
  sst: { en: 'Summarise Spoken Text', np: 'बोलेको पाठ सारांश' },
  mcq: { en: 'Multiple Choice', np: 'बहुवैकल्पिक' },
  fib: { en: 'Fill in Blanks', np: 'खाली ठाउँ' },
  hcs: { en: 'Highlight Summary', np: 'सारांश हाइलाइट' },
  noQuestions: { en: 'No questions available.', np: 'कुनै प्रश्न उपलब्ध छैन।' },
  submit: { en: 'Submit', np: 'पेश गर्नुहोस्' },
  scoring: { en: 'Scoring...', np: 'स्कोरिङ...' },
  aiGenerated: { en: '✨ AI-Generated', np: '✨ AI-उत्पन्न' },
  playAudio: { en: 'Play Audio', np: 'अडियो बजाउनुहोस्' },
  played: { en: 'Audio played. You can only listen once.', np: 'अडियो बजाइयो। तपाईं एक पटक मात्र सुन्न सक्नुहुन्छ।' },
  sstPrompt: { en: 'Listen to the audio and write a 50-70 word summary.', np: 'अडियो सुन्नुहोस् र ५०-७० शब्दको सारांश लेख्नुहोस्।' },
  selectAnswer: { en: 'Select your answer', np: 'आफ्नो उत्तर चयन गर्नुहोस्' },
  fibInstr: { en: 'Fill in each blank with the correct word.', np: 'प्रत्येक खाली ठाउँमा सही शब्द भर्नुहोस्।' },
  hcsInstr: { en: 'Select the option that best summarises the audio.', np: 'अडियोको सारांश दिने विकल्प चयन गर्नुहोस्।' },
  wordCount: { en: 'words', np: 'शब्दहरू' },
};

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: number;
  correct_answer: string | null;
  audio_url: string | null;
  image_url: string | null;
  is_generated?: boolean;
}

export default function ListeningPage() {
  const { user, profile } = useAuth();
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState('Summarise Spoken Text');
  const isIelts = profile?.exam_type === 'IELTS' || profile?.exam_type === 'Both';
  const [questionsByType, setQuestionsByType] = useState<Record<string, Question[]>>({});
  const [indices, setIndices] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<'answering' | 'scoring' | 'result'>('answering');
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [userPlan, setUserPlan] = useState('free');
  const [smartQuestion, setSmartQuestion] = useState<Question | null>(null);
  const smartQ = useSmartQuestion();

  // Audio
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);

  // Answer states
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [blanks, setBlanks] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).eq('status', 'active').single()
      .then(({ data }) => { if (data) setUserPlan(data.plan); });
  }, [user]);

  const isPremium = userPlan === 'pro';
  const dailyLimit = useDailyLimit(user?.id, userPlan);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('questions').select('id, question_text, question_type, difficulty, correct_answer, audio_url, image_url')
      .eq('skill', 'listening')
      .then(({ data }) => {
        if (!data) return;
        const grouped: Record<string, Question[]> = {};
        data.forEach((q) => {
          if (!grouped[q.question_type]) grouped[q.question_type] = [];
          grouped[q.question_type].push(q as Question);
        });
        setQuestionsByType(grouped);
      });
  }, []);

  const fetchSmart = useCallback(async (type: string) => {
    if (!user || !isPremium) return;
    setSmartQuestion(null);
    const q = await smartQ.generateQuestion(user.id, 'listening', type);
    if (q) setSmartQuestion(q as Question);
  }, [user, isPremium, smartQ.generateQuestion]);

  useEffect(() => {
    if (isPremium && user) fetchSmart(activeTab);
  }, [activeTab, isPremium, user]);

  const staticQuestions = questionsByType[activeTab] || [];
  const currentIdx = indices[activeTab] || 0;
  const question = isPremium ? smartQuestion : staticQuestions[currentIdx];
  const isLoading = isPremium && smartQ.loading;

  // Parse options
  const parseOptions = (text: string) => {
    const optionMatch = text.match(/(?:^|\n)[A-D]\)\s*.+/gm);
    return optionMatch ? optionMatch.map(o => o.trim()) : [];
  };
  const parseBlanks = (text: string) => (text.match(/___/g) || []).length;

  // Reset answer states when question changes
  useEffect(() => {
    if (!question) return;
    setTextAnswer('');
    setSelectedOption('');
    setAudioPlayed(false);
    const bc = parseBlanks(question.question_text);
    setBlanks(new Array(bc).fill(''));
  }, [question?.id]);

  // Play TTS (single listen)
  const playAudio = async () => {
    if (!question || ttsLoading || audioPlayed) return;
    setTtsLoading(true);
    try {
      if (question.audio_url) {
        const audio = new Audio(question.audio_url);
        await audio.play();
      } else {
        // Use ElevenLabs TTS
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text: question.question_text }),
          }
        );
        if (!response.ok) throw new Error('TTS failed');
        const audioBlob = await response.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        await audio.play();
      }
      setAudioPlayed(true);
    } catch {
      const utterance = new SpeechSynthesisUtterance(question.question_text);
      utterance.rate = 0.9;
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
      setAudioPlayed(true);
    } finally {
      setTtsLoading(false);
    }
  };

  const getUserAnswer = (): string => {
    if (activeTab === 'Summarise Spoken Text') return textAnswer;
    if (activeTab === 'Multiple Choice' || activeTab === 'Highlight Correct Summary') return selectedOption;
    return blanks.join(', ');
  };

  const handleSubmit = async () => {
    if (!question || !user) return;
    const userAnswer = getUserAnswer();
    if (!userAnswer.trim()) { toast.error('Please provide an answer'); return; }
    setPhase('scoring');
    try {
      const fnName = activeTab === 'Summarise Spoken Text' ? 'score-writing' : 'score-reading-listening';
      const body = activeTab === 'Summarise Spoken Text'
        ? { user_answer: userAnswer, question_text: question.question_text, question_type: 'Summarise Spoken Text' }
        : { user_answer: userAnswer, question_text: question.question_text, question_type: question.question_type, correct_answer: question.correct_answer, skill: 'listening' };

      const { data, error } = await supabase.functions.invoke(fnName, { body });
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
      await supabase.rpc('update_streak_and_xp', { p_user_id: user.id });
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

  const wordCount = textAnswer.trim() ? textAnswer.trim().split(/\s+/).length : 0;
  const options = question ? parseOptions(question.question_text) : [];
  const passage = options.length > 0 ? question!.question_text.split(/\n[A-D]\)/)[0].trim() : question?.question_text || '';

  const tabMap: [string, { en: string; np: string }][] = [
    ['Summarise Spoken Text', i18n.sst],
    ['Multiple Choice', i18n.mcq],
    ['Fill in Blanks', i18n.fib],
    ['Highlight Correct Summary', i18n.hcs],
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold animate-fade-up" style={{ lineHeight: '1.2' }}>
        🎧 {t(i18n.listening, lang)}
      </h1>

      {isIelts && (
        <IeltsBanner
          variant="green"
          message="Our Listening practice is fully compatible with IELTS preparation. These question types appear in both PTE and IELTS exams."
        />
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-4">
          {tabMap.map(([type, label]) => (
            <TabsTrigger key={type} value={type} className="text-[10px] sm:text-xs">{t(label, lang)}</TabsTrigger>
          ))}
        </TabsList>

        {tabMap.map(([type]) => (
          <TabsContent key={type} value={type} className="mt-4">
            {activeTab !== type ? null : !isPremium && dailyLimit.isLimitReached ? (
              <Card className="shadow-sm"><CardContent className="p-8 text-center space-y-3">
                <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You've used all {dailyLimit.limit} free questions for today. Upgrade to Pro for unlimited practice.</p>
                <Button variant="outline" onClick={() => navigate('/pricing')}>View Plans</Button>
              </CardContent></Card>
            ) : isLoading ? (
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
                improved_version={scoreResult.improved_version}
                extra={scoreResult.content_score ? {
                  content: scoreResult.content_score,
                  grammar: scoreResult.grammar_score,
                  vocabulary: scoreResult.vocabulary_score,
                } : undefined}
                onNext={nextQuestion}
              />
            ) : (
              <div className="space-y-4 animate-fade-up">
                {/* Audio Player - single listen */}
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        {isPremium ? t(i18n.aiGenerated, lang) : `Question ${currentIdx + 1} of ${staticQuestions.length}`}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">Difficulty: {question.difficulty}/5</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={playAudio}
                      disabled={ttsLoading || audioPlayed}
                      className="w-full gap-2"
                    >
                      {ttsLoading ? <VolumeLoader className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                      {audioPlayed ? t(i18n.played, lang) : ttsLoading ? 'Loading...' : t(i18n.playAudio, lang)}
                    </Button>
                  </CardContent>
                </Card>

                {/* Answer Area */}
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    {/* SST - text area */}
                    {type === 'Summarise Spoken Text' && (
                      <>
                        <p className="text-sm text-muted-foreground">{t(i18n.sstPrompt, lang)}</p>
                        <Textarea
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                          placeholder="Write your summary here..."
                          className="min-h-[150px] resize-none"
                          disabled={phase === 'scoring'}
                        />
                        <div className="text-xs text-muted-foreground text-right">{wordCount} {t(i18n.wordCount, lang)}</div>
                      </>
                    )}

                    {/* MCQ */}
                    {type === 'Multiple Choice' && (
                      <>
                        {passage && (
                          <div className="bg-secondary/30 rounded-lg p-3 border mb-2">
                            <p className="text-sm leading-relaxed">{passage}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">{t(i18n.selectAnswer, lang)}</p>
                        {options.map((opt, i) => (
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
                      </>
                    )}

                    {/* Fill in Blanks */}
                    {type === 'Fill in Blanks' && (
                      <>
                        <div className="bg-secondary/30 rounded-lg p-3 border mb-2">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.question_text}</p>
                        </div>
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
                      </>
                    )}

                    {/* Highlight Correct Summary */}
                    {type === 'Highlight Correct Summary' && (
                      <>
                        <p className="text-xs text-muted-foreground">{t(i18n.hcsInstr, lang)}</p>
                        {options.map((opt, i) => (
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
                      </>
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
