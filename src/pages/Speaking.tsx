import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import IeltsBanner from '@/components/shared/IeltsBanner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Volume2, Loader2 as VolumeLoader, Lock } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';
import { useRecorder } from '@/components/speaking/SpeakingRecorder';
import RecordingPanel from '@/components/speaking/RecordingPanel';
import ScoreDisplay from '@/components/speaking/ScoreDisplay';
import QuestionSkeleton from '@/components/shared/QuestionSkeleton';
import { useSmartQuestion } from '@/hooks/useSmartQuestion';
import { useDailyLimit } from '@/hooks/useDailyLimit';
import RecordingConsentModal, { hasRecordingConsent, grantRecordingConsent } from '@/components/speaking/RecordingConsentModal';

const i18n = {
  speaking: { en: 'Speaking Practice', np: 'बोल्ने अभ्यास' },
  readAloud: { en: 'Read Aloud', np: 'जोडले पढ्नुहोस्' },
  repeatSentence: { en: 'Repeat Sentence', np: 'वाक्य दोहोर्याउनुहोस्' },
  describeImage: { en: 'Describe Image', np: 'तस्वीर वर्णन' },
  noQuestions: { en: 'No questions available.', np: 'कुनै प्रश्न उपलब्ध छैन।' },
  listenCarefully: { en: 'Listen to the sentence, then repeat it.', np: 'वाक्य सुन्नुहोस्, त्यसपछि दोहोर्याउनुहोस्।' },
  describePrompt: { en: 'Describe the image/data below in detail.', np: 'तलको तस्वीर/डाटा विस्तृत रूपमा वर्णन गर्नुहोस्।' },
  playAudio: { en: 'Play Sentence', np: 'वाक्य सुन्नुहोस्' },
  aiGenerated: { en: '✨ AI-Generated Question', np: '✨ AI-उत्पन्न प्रश्न' },
};

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: number;
  image_url: string | null;
  is_generated?: boolean;
}

const PREP_TIMES: Record<string, number> = {
  'Read Aloud': 35,
  'Repeat Sentence': 3,
  'Describe Image': 25,
};

const RECORD_TIMES: Record<string, number> = {
  'Read Aloud': 40,
  'Repeat Sentence': 15,
  'Describe Image': 40,
};

export default function SpeakingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState('Read Aloud');
  const isIelts = profile?.exam_type === 'IELTS' || profile?.exam_type === 'Both';
  const [questionsByType, setQuestionsByType] = useState<Record<string, Question[]>>({});
  const [indices, setIndices] = useState<Record<string, number>>({ 'Read Aloud': 0, 'Repeat Sentence': 0, 'Describe Image': 0 });
  const [prepCountdown, setPrepCountdown] = useState(35);
  const [recordCountdown, setRecordCountdown] = useState(40);
  const [ttsPlayed, setTtsPlayed] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [smartQuestion, setSmartQuestion] = useState<Question | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(() => hasRecordingConsent());

  const recorder = useRecorder();
  const smartQ = useSmartQuestion();
  const prepTimerRef = useRef<ReturnType<typeof setInterval>>();
  const recTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Fetch user subscription plan
  useEffect(() => {
    if (!user) return;
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).eq('status', 'active').single()
      .then(({ data }) => {
        if (data) setUserPlan(data.plan);
      });
  }, [user]);

  const isPremiumUser = userPlan === 'pro';
  const dailyLimit = useDailyLimit(user?.id, userPlan);

  // Load static speaking questions (for free users or fallback)
  useEffect(() => {
    supabase.from('questions').select('id, question_text, question_type, difficulty, image_url')
      .eq('skill', 'speaking')
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

  // Generate smart question for premium users
  const fetchSmartQuestion = useCallback(async (type: string) => {
    if (!user || !isPremiumUser) return;
    setSmartQuestion(null);
    const q = await smartQ.generateQuestion(user.id, 'speaking', type);
    if (q) {
      setSmartQuestion(q);
    }
  }, [user, isPremiumUser, smartQ.generateQuestion]);

  // Auto-fetch smart question when tab changes for premium users
  useEffect(() => {
    if (isPremiumUser && user) {
      fetchSmartQuestion(activeTab);
    }
  }, [activeTab, isPremiumUser, user]);

  // Determine current question
  const staticQuestions = questionsByType[activeTab] || [];
  const currentIdx = indices[activeTab] || 0;
  const question = isPremiumUser ? smartQuestion : staticQuestions[currentIdx];
  const isLoadingQuestion = isPremiumUser && smartQ.loading;

  const prepTime = PREP_TIMES[activeTab] || 35;
  const recordTime = RECORD_TIMES[activeTab] || 40;

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(prepTimerRef.current);
      clearInterval(recTimerRef.current);
    };
  }, []);

  // Prep countdown
  useEffect(() => {
    if (recorder.phase !== 'idle' || !question || isLoadingQuestion) return;
    clearInterval(prepTimerRef.current);
    setPrepCountdown(prepTime);
    setTtsPlayed(false);

    prepTimerRef.current = setInterval(() => {
      setPrepCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(prepTimerRef.current);
          handleStartRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(prepTimerRef.current);
  }, [recorder.phase, question?.id, isLoadingQuestion]);

  // Record countdown
  useEffect(() => {
    if (recorder.phase !== 'recording') return;
    clearInterval(recTimerRef.current);
    setRecordCountdown(recordTime);

    recTimerRef.current = setInterval(() => {
      setRecordCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(recTimerRef.current);
          handleStopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(recTimerRef.current);
  }, [recorder.phase]);

  const handleStartRecording = useCallback(async () => {
    if (!hasConsent) {
      clearInterval(prepTimerRef.current);
      setShowConsent(true);
      return;
    }
    clearInterval(prepTimerRef.current);
    const rec = await recorder.startRecording();
    if (rec && question && user) {
      rec.onstop = () => {
        recorder.submitRecording({
          userId: user.id,
          questionId: question.id,
          questionText: question.question_text,
          questionType: question.question_type,
          onScored: () => {},
          onError: () => {},
        });
      };
    }
  }, [recorder.startRecording, question, user, hasConsent]);

  const handleStopRecording = useCallback(() => {
    clearInterval(recTimerRef.current);
    recorder.stopRecording();
  }, [recorder.stopRecording]);

  const nextQuestion = () => {
    recorder.reset();
    if (isPremiumUser) {
      fetchSmartQuestion(activeTab);
    } else {
      setIndices((prev) => ({ ...prev, [activeTab]: ((prev[activeTab] || 0) + 1) % staticQuestions.length }));
    }
  };

  const handleTabChange = (tab: string) => {
    clearInterval(prepTimerRef.current);
    clearInterval(recTimerRef.current);
    recorder.reset();
    setActiveTab(tab);
  };

  const playTTS = async () => {
    if (!question || ttsLoading) return;
    setTtsLoading(true);
    try {
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
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
      setTtsPlayed(true);
    } catch (err) {
      const utterance = new SpeechSynthesisUtterance(question.question_text);
      utterance.rate = 0.9;
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
      setTtsPlayed(true);
    } finally {
      setTtsLoading(false);
    }
  };

  const tabMap: [string, { en: string; np: string }][] = [
    ['Read Aloud', i18n.readAloud],
    ['Repeat Sentence', i18n.repeatSentence],
    ['Describe Image', i18n.describeImage],
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold animate-fade-up" style={{ lineHeight: '1.2' }}>
        🎙️ {t(i18n.speaking, lang)}
      </h1>

      {isIelts && (
        <IeltsBanner
          variant="amber"
          message="This module is optimised for PTE Academic. IELTS Speaking support is coming soon."
          dismissible
        />
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-3">
          {tabMap.map(([type, label]) => (
            <TabsTrigger key={type} value={type} className="text-xs sm:text-sm">
              {t(label, lang)}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabMap.map(([type]) => (
          <TabsContent key={type} value={type} className="mt-4">
            {activeTab !== type ? null : !isPremiumUser && dailyLimit.isLimitReached ? (
              <Card className="shadow-sm"><CardContent className="p-8 text-center space-y-3">
                <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You've used all {dailyLimit.limit} free questions for today. Upgrade to Pro for unlimited practice.</p>
                <Button variant="outline" onClick={() => navigate('/pricing')}>View Plans</Button>
              </CardContent></Card>
            ) : isLoadingQuestion ? (
              <QuestionSkeleton />
            ) : !question && !isPremiumUser && (questionsByType[type] || []).length === 0 ? (
              <Card className="shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">{t(i18n.noQuestions, lang)}</CardContent></Card>
            ) : !question && isPremiumUser && smartQ.error ? (
              <Card className="shadow-sm">
                <CardContent className="p-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">{smartQ.error}</p>
                  <Button variant="outline" onClick={() => fetchSmartQuestion(activeTab)}>Try Again</Button>
                </CardContent>
              </Card>
            ) : question ? (
              <div className="space-y-4 animate-fade-up">
                {/* Question Card */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        {isPremiumUser
                          ? t(i18n.aiGenerated, lang)
                          : `Question ${currentIdx + 1} of ${staticQuestions.length}`}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                        Difficulty: {question.difficulty}/5
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {type === 'Repeat Sentence' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">{t(i18n.listenCarefully, lang)}</p>
                        <Button variant="outline" onClick={playTTS} disabled={ttsLoading} className="gap-2">
                          {ttsLoading ? <VolumeLoader className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                          {ttsLoading ? 'Loading...' : t(i18n.playAudio, lang)}
                        </Button>
                        {ttsPlayed && (
                          <p className="text-xs text-muted-foreground italic">Sentence has been played. Now repeat what you heard.</p>
                        )}
                      </div>
                    ) : type === 'Describe Image' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground mb-2">{t(i18n.describePrompt, lang)}</p>
                        {question.image_url ? (
                          <img
                            src={question.image_url}
                            alt="Describe this image"
                            className="w-full rounded-lg border"
                          />
                        ) : (
                          <div className="bg-secondary/50 border rounded-lg p-4">
                            <p className="text-sm leading-relaxed font-medium">{question.question_text}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-base leading-relaxed">{question.question_text}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Recording / Score */}
                {recorder.phase !== 'result' ? (
                  <RecordingPanel
                    phase={recorder.phase}
                    prepCountdown={prepCountdown}
                    recordCountdown={recordCountdown}
                    audioLevels={recorder.audioLevels}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                  />
                ) : recorder.scoreResult ? (
              <ScoreDisplay result={recorder.scoreResult} onNext={() => { dailyLimit.increment(); nextQuestion(); }} isPro={isPremiumUser} />
                ) : null}
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
