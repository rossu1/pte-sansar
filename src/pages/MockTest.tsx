import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Clock, BookOpen, Mic, PenLine, Headphones, Eye,
  ChevronRight, Trophy, TrendingUp, TrendingDown, Minus,
  Loader2, ArrowRight, CheckCircle, Volume2, Square,
  RotateCcw, Play, Lock,
} from 'lucide-react';
import { useLang, t } from '@/lib/i18n';
import { toast } from 'sonner';
import { useRecorder } from '@/components/speaking/SpeakingRecorder';

/* ─── i18n ─── */
const i18n = {
  title: { en: 'Mock Test', np: 'मक टेस्ट' },
  selectExam: { en: 'Select Exam Type', np: 'परीक्षा प्रकार छान्नुहोस्' },
  selectMode: { en: 'Select Test Mode', np: 'टेस्ट मोड छान्नुहोस्' },
  fullTest: { en: 'Full Test', np: 'पूर्ण टेस्ट' },
  quickTest: { en: 'Quick Test (20 min)', np: 'छिटो टेस्ट (२० मिनेट)' },
  fullDesc: { en: 'Complete all sections at exam pace', np: 'परीक्षा गतिमा सबै खण्ड पूरा गर्नुहोस्' },
  quickDesc: { en: 'Timed 20-minute sprint across all skills', np: '२० मिनेटको सबै सीपमा स्प्रिन्ट' },
  start: { en: 'Start Test', np: 'टेस्ट सुरु गर्नुहोस्' },
  question: { en: 'Question', np: 'प्रश्न' },
  of: { en: 'of', np: 'मध्ये' },
  submit: { en: 'Submit & Next', np: 'पेश गरी अर्को' },
  submitFinal: { en: 'Finish Test', np: 'टेस्ट सकाउनुहोस्' },
  scoring: { en: 'Scoring…', np: 'स्कोरिङ…' },
  results: { en: 'Test Results', np: 'टेस्ट नतिजा' },
  overall: { en: 'Overall Score', np: 'समग्र स्कोर' },
  breakdown: { en: 'Skill Breakdown', np: 'सीप विभाजन' },
  backDash: { en: 'Back to Dashboard', np: 'ड्यासबोर्डमा फर्कनुहोस्' },
  better: { en: 'You improved since your last mock test! 🎉', np: 'तपाईंले गत मक टेस्टभन्दा सुधार गर्नुभयो! 🎉' },
  worse: { en: 'Your score dropped — keep practising!', np: 'तपाईंको स्कोर घट्यो — अभ्यास जारी राख्नुहोस्!' },
  same: { en: 'Same as last time — consistency is key!', np: 'पछिल्लो पटक जस्तै — निरन्तरता कुञ्जी हो!' },
  first: { en: 'Great job completing your first mock test!', np: 'तपाईंको पहिलो मक टेस्ट पूरा गर्नुभयो!' },
  timeUp: { en: 'Time is up!', np: 'समय सकियो!' },
  noQ: { en: 'Not enough questions in the database to start a mock test.', np: 'मक टेस्ट सुरु गर्न पर्याप्त प्रश्नहरू छैनन्।' },
  loading: { en: 'Preparing your test…', np: 'तपाईंको टेस्ट तयार गर्दै…' },
  typeAnswer: { en: 'Type your answer…', np: 'आफ्नो उत्तर टाइप गर्नुहोस्…' },
};

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  skill: string;
  difficulty: number;
  correct_answer: string | null;
  image_url: string | null;
  audio_url: string | null;
}

interface SkillScores {
  speaking: number[];
  writing: number[];
  reading: number[];
  listening: number[];
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  speaking: <Mic className="w-4 h-4" />,
  writing: <PenLine className="w-4 h-4" />,
  reading: <Eye className="w-4 h-4" />,
  listening: <Headphones className="w-4 h-4" />,
};

const SKILL_COLORS: Record<string, string> = {
  speaking: 'text-destructive',
  writing: 'text-accent-foreground',
  reading: 'text-primary',
  listening: 'text-muted-foreground',
};

const FULL_TIME = 60 * 60;
const QUICK_TIME = 20 * 60;
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const AUTO_SAVE_INTERVAL = 10_000; // 10 seconds

/* ────────────────────────────────────────────────── */

export default function MockTestPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<'loading' | 'select' | 'test' | 'scoring' | 'results'>('loading');
  const [examType, setExamType] = useState('PTE');
  const [mode, setMode] = useState<'full' | 'quick'>('quick');

  // Test state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [blanks, setBlanks] = useState<string[]>([]);
  const [scores, setScores] = useState<SkillScores>({ speaking: [], writing: [], reading: [], listening: [] });
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  // Audio playback for listening questions
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Speaking recorder
  const recorder = useRecorder();

  // Results
  const [finalScores, setFinalScores] = useState<{ overall: number; speaking: number; writing: number; reading: number; listening: number } | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [userPlan, setUserPlan] = useState('free');
  const [monthlyMockCount, setMonthlyMockCount] = useState(0);

  // Session persistence
  const sessionIdRef = useRef<string | null>(null);
  const [pendingSession, setPendingSession] = useState<{
    id: string;
    exam_type: string;
    mode: string;
    questions: Question[];
    answers: Record<string, string>;
    scores: SkillScores;
    current_question_index: number;
    seconds_remaining: number;
    last_saved_at: string;
  } | null>(null);
  const answersRef = useRef<Record<string, string>>({});

  /* ─── Check for existing session on mount ─── */
  useEffect(() => {
    if (!user) { setStep('select'); return; }
    const checkSession = async () => {
      const { data } = await supabase
        .from('mock_test_sessions' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('last_saved_at', { ascending: false })
        .limit(1);

      const sessions = data as any[];
      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const lastSaved = new Date(session.last_saved_at).getTime();
        const age = Date.now() - lastSaved;
        if (age < SESSION_MAX_AGE_MS) {
          setPendingSession({
            id: session.id,
            exam_type: session.exam_type,
            mode: session.mode,
            questions: session.questions as Question[],
            answers: session.answers as Record<string, string>,
            scores: session.scores as SkillScores,
            current_question_index: session.current_question_index,
            seconds_remaining: session.seconds_remaining,
            last_saved_at: session.last_saved_at,
          });
        }
      }
      setStep('select');
    };
    checkSession();
  }, [user]);

  /* ─── Save session helper ─── */
  const saveSession = useCallback(async () => {
    if (!user || !sessionIdRef.current || step !== 'test') return;
    try {
      await supabase
        .from('mock_test_sessions' as any)
        .update({
          answers: answersRef.current,
          scores,
          current_question_index: currentIdx,
          seconds_remaining: countdown,
          last_saved_at: new Date().toISOString(),
        } as any)
        .eq('id', sessionIdRef.current);
    } catch { /* silent */ }
  }, [user, step, scores, currentIdx, countdown]);

  /* ─── Auto-save every 10s ─── */
  useEffect(() => {
    if (step !== 'test') return;
    const interval = setInterval(saveSession, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [step, saveSession]);

  /* ─── Timer ─── */
  useEffect(() => {
    if (step !== 'test') return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  const handleTimeUp = useCallback(() => {
    toast.info(t(i18n.timeUp, lang));
    finishTest();
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  /* ─── Create session in DB ─── */
  const createSession = async (qs: Question[], examT: string, modeT: string, secs: number) => {
    if (!user) return;
    const { data } = await supabase
      .from('mock_test_sessions' as any)
      .insert({
        user_id: user.id,
        exam_type: examT,
        mode: modeT,
        questions: qs,
        answers: {},
        scores: { speaking: [], writing: [], reading: [], listening: [] },
        current_question_index: 0,
        seconds_remaining: secs,
        status: 'in_progress',
      } as any)
      .select('id')
      .single();
    if (data) sessionIdRef.current = (data as any).id;
    answersRef.current = {};
  };

  /* ─── Mark session completed ─── */
  const completeSession = async () => {
    if (!sessionIdRef.current) return;
    try {
      await supabase
        .from('mock_test_sessions' as any)
        .update({ status: 'completed', last_saved_at: new Date().toISOString() } as any)
        .eq('id', sessionIdRef.current);
    } catch { /* silent */ }
    sessionIdRef.current = null;
  };

  /* ─── Resume session ─── */
  const resumeSession = async () => {
    if (!pendingSession || !user) return;
    const elapsed = (Date.now() - new Date(pendingSession.last_saved_at).getTime()) / 1000;
    const adjustedTime = Math.max(0, Math.round(pendingSession.seconds_remaining - elapsed));

    if (adjustedTime <= 0) {
      toast.info(t(i18n.timeUp, lang));
      await deleteExistingSession();
      return;
    }

    sessionIdRef.current = pendingSession.id;
    answersRef.current = pendingSession.answers;
    setQuestions(pendingSession.questions);
    setCurrentIdx(pendingSession.current_question_index);
    setScores(pendingSession.scores);
    setCountdown(adjustedTime);
    setExamType(pendingSession.exam_type);
    setMode(pendingSession.mode as 'full' | 'quick');
    setPendingSession(null);

    // Fetch previous mock test for comparison
    const { data: prevTests } = await supabase
      .from('mock_tests')
      .select('total_score')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1);
    if (prevTests && prevTests.length > 0 && prevTests[0].total_score !== null) {
      setPrevScore(prevTests[0].total_score);
    }

    setStep('test');
  };

  /* ─── Delete existing in_progress sessions ─── */
  const deleteExistingSession = async () => {
    if (!user) return;
    await supabase
      .from('mock_test_sessions' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'in_progress');
    setPendingSession(null);
    sessionIdRef.current = null;
  };

  const startFresh = async () => {
    await deleteExistingSession();
  };

  /* ─── Fetch questions ─── */
  const startTest = async () => {
    if (!user) return;
    setLoading(true);

    // Delete any existing in-progress sessions
    await deleteExistingSession();

    const skillCounts: Record<string, number> = { speaking: 3, writing: 2, reading: 5, listening: 3 };
    const allQuestions: Question[] = [];

    for (const [skill, count] of Object.entries(skillCounts)) {
      const { data } = await supabase
        .from('questions')
        .select('id, question_text, question_type, skill, difficulty, correct_answer, image_url, audio_url')
        .eq('skill', skill)
        .eq('exam_type', examType)
        .limit(50);

      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        allQuestions.push(...shuffled.slice(0, count));
      }
    }

    if (allQuestions.length < 5) {
      toast.error(t(i18n.noQ, lang));
      setLoading(false);
      return;
    }

    // Fetch previous mock test for comparison
    const { data: prevTests } = await supabase
      .from('mock_tests')
      .select('total_score')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1);

    if (prevTests && prevTests.length > 0 && prevTests[0].total_score !== null) {
      setPrevScore(prevTests[0].total_score);
    }

    const secs = mode === 'full' ? FULL_TIME : QUICK_TIME;
    setQuestions(allQuestions);
    setCountdown(secs);
    setCurrentIdx(0);
    setScores({ speaking: [], writing: [], reading: [], listening: [] });
    setLoading(false);

    // Create persistent session
    await createSession(allQuestions, examType, mode, secs);

    setStep('test');
  };

  /* ─── Answer helpers ─── */
  const currentQ = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;

  const parseOptions = (text: string) => {
    const matches = text.match(/(?:^|\n)[A-D]\)\s*.+/gm);
    return matches ? matches.map(o => o.trim()) : [];
  };
  const parsePassage = (text: string) => text.split(/\n[A-D]\)/)[0].trim();
  const parseBlanks = (text: string) => (text.match(/___/g) || []).length;

  useEffect(() => {
    if (!currentQ) return;
    setAnswer('');
    setSelectedOption('');
    setAudioPlayed(false);
    recorder.reset();
    setBlanks(new Array(parseBlanks(currentQ.question_text)).fill(''));
  }, [currentIdx]);

  // Play TTS for listening questions (single listen)
  const playAudio = async () => {
    if (!currentQ || ttsLoading || audioPlayed) return;
    setTtsLoading(true);
    try {
      if (currentQ.audio_url) {
        const audio = new Audio(currentQ.audio_url);
        currentAudioRef.current = audio;
        await audio.play();
      } else {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text: currentQ.question_text }),
          }
        );
        if (!response.ok) throw new Error('TTS failed');
        const audioBlob = await response.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        currentAudioRef.current = audio;
        await audio.play();
      }
      setAudioPlayed(true);
    } catch {
      const utterance = new SpeechSynthesisUtterance(currentQ.question_text);
      utterance.rate = 0.9;
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
      setAudioPlayed(true);
    } finally {
      setTtsLoading(false);
    }
  };

  const getUserAnswer = (): string => {
    const options = parseOptions(currentQ?.question_text || '');
    const blankCount = parseBlanks(currentQ?.question_text || '');
    if (options.length > 0) return selectedOption;
    if (blankCount > 0) return blanks.join(', ');
    return answer;
  };

  /* ─── Submit single question ─── */
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitQuestion = async () => {
    if (!currentQ || !user) return;

    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    speechSynthesis.cancel();

    // Speaking questions use the recorder flow
    if (currentQ.skill === 'speaking') {
      if (recorder.phase === 'idle') {
        toast.error('Please record your answer first');
        return;
      }
      if (recorder.phase === 'recording') {
        recorder.stopRecording();
      }
      setSubmitting(true);
      try {
        await recorder.submitRecording({
          userId: user.id,
          questionId: currentQ.id,
          questionText: currentQ.question_text,
          questionType: currentQ.question_type,
          onScored: (result) => {
            const score = result.overall_score;
            const skill = 'speaking';
            setScores(prev => ({
              ...prev,
              [skill]: [...prev[skill], score],
            }));
            // Save answer to ref
            answersRef.current[currentQ.id] = '[audio recording]';
            saveSession();
            if (isLast) {
              const updatedScores = { ...scores, [skill]: [...scores[skill], score] };
              finishTestWithScores(updatedScores);
            } else {
              setCurrentIdx(prev => prev + 1);
            }
            setSubmitting(false);
          },
          onError: () => {
            if (isLast) {
              finishTestWithScores(scores);
            } else {
              setCurrentIdx(prev => prev + 1);
            }
            setSubmitting(false);
          },
        });
      } catch {
        toast.error('Recording submission failed');
        setSubmitting(false);
        if (isLast) finishTestWithScores(scores);
        else setCurrentIdx(prev => prev + 1);
      }
      return;
    }

    const userAnswer = getUserAnswer();
    if (!userAnswer.trim()) {
      toast.error('Please provide an answer');
      return;
    }
    setSubmitting(true);

    // Save answer to ref for persistence
    answersRef.current[currentQ.id] = userAnswer;

    try {
      const skill = currentQ.skill;
      let fnName = 'score-reading-listening';
      let body: Record<string, string> = {
        user_answer: userAnswer,
        question_text: currentQ.question_text,
        question_type: currentQ.question_type,
      };

      if (skill === 'writing' || currentQ.question_type === 'Summarise Spoken Text') {
        fnName = 'score-writing';
      } else if (skill === 'reading' || skill === 'listening') {
        body.correct_answer = currentQ.correct_answer || '';
        body.skill = skill;
      }

      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;

      const score = data?.overall_score ?? 0;
      setScores(prev => ({
        ...prev,
        [skill]: [...prev[skill as keyof SkillScores], score],
      }));

      // Save session after scoring
      saveSession();

      await supabase.from('user_attempts').insert({
        user_id: user.id,
        question_id: currentQ.id,
        user_answer: userAnswer,
        ai_score: score,
        ai_feedback: data?.feedback_en || '',
        ai_feedback_nepali: data?.feedback_np || '',
      });

      if (isLast) {
        const updatedScores = { ...scores, [skill]: [...scores[skill as keyof SkillScores], score] };
        await finishTestWithScores(updatedScores);
      } else {
        setCurrentIdx(prev => prev + 1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Scoring failed, skipping…');
      if (isLast) {
        await finishTestWithScores(scores);
      } else {
        setCurrentIdx(prev => prev + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Finish test ─── */
  const finishTest = () => finishTestWithScores(scores);

  const finishTestWithScores = async (s: SkillScores) => {
    if (!user) return;
    clearInterval(timerRef.current);
    setStep('scoring');

    // Mark session completed
    await completeSession();

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const speakingAvg = avg(s.speaking);
    const writingAvg = avg(s.writing);
    const readingAvg = avg(s.reading);
    const listeningAvg = avg(s.listening);
    const allScores = [...s.speaking, ...s.writing, ...s.reading, ...s.listening];
    const overallAvg = avg(allScores);

    try {
      await supabase.from('mock_tests').insert({
        user_id: user.id,
        exam_type: examType,
        total_score: overallAvg,
        speaking_score: speakingAvg,
        writing_score: writingAvg,
        reading_score: readingAvg,
        listening_score: listeningAvg,
      });

      await supabase.rpc('update_streak_and_xp', { p_user_id: user.id });

      setFinalScores({ overall: overallAvg, speaking: speakingAvg, writing: writingAvg, reading: readingAvg, listening: listeningAvg });
      setStep('results');
    } catch {
      toast.error('Failed to save results');
      setFinalScores({ overall: overallAvg, speaking: speakingAvg, writing: writingAvg, reading: readingAvg, listening: listeningAvg });
      setStep('results');
    }
  };

  /* ─── Render: Loading ─── */
  if (step === 'loading') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ─── Render: Selection ─── */
  if (step === 'select') {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold animate-fade-up" style={{ lineHeight: '1.2' }}>
          📝 {t(i18n.title, lang)}
        </h1>

        {/* Resume card */}
        {pendingSession && (
          <Card className="shadow-md border-primary/30 bg-primary/5 animate-fade-up">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0 mt-0.5">
                  <RotateCcw className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-semibold">You have an unfinished mock test</p>
                  <p className="text-xs text-muted-foreground">
                    Question {pendingSession.current_question_index + 1} of {pendingSession.questions.length}
                    {' · '}
                    Estimated time remaining: {Math.max(1, Math.round(
                      (pendingSession.seconds_remaining - (Date.now() - new Date(pendingSession.last_saved_at).getTime()) / 1000) / 60
                    ))} minutes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pendingSession.exam_type} · {pendingSession.mode === 'full' ? 'Full Test' : 'Quick Test'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={resumeSession} className="flex-1 gap-2" size="sm">
                  <Play className="w-3.5 h-3.5" /> Resume
                </Button>
                <Button onClick={startFresh} variant="outline" className="flex-1 gap-2" size="sm">
                  <RotateCcw className="w-3.5 h-3.5" /> Start Fresh
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exam Type */}
        <Card className="shadow-sm animate-fade-up" style={{ animationDelay: '60ms' }}>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t(i18n.selectExam, lang)}
            </h2>
          </CardHeader>
          <CardContent className="flex gap-3">
            {['PTE', 'IELTS'].map(ex => (
              <Button
                key={ex}
                variant={examType === ex ? 'default' : 'outline'}
                onClick={() => setExamType(ex)}
                className="flex-1"
              >
                {ex === 'PTE' ? 'PTE Academic' : 'IELTS'}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Test Mode */}
        <Card className="shadow-sm animate-fade-up" style={{ animationDelay: '120ms' }}>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t(i18n.selectMode, lang)}
            </h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { id: 'full' as const, label: i18n.fullTest, desc: i18n.fullDesc, time: '60 min' },
              { id: 'quick' as const, label: i18n.quickTest, desc: i18n.quickDesc, time: '20 min' },
            ]).map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`text-left rounded-xl border-2 p-4 transition-all duration-200 active:scale-[0.97] ${
                  mode === m.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{t(m.label, lang)}</span>
                  <Badge variant="secondary" className="text-xs">{m.time}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t(m.desc, lang)}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Button onClick={startTest} disabled={loading} className="w-full gap-2 animate-fade-up" style={{ animationDelay: '180ms' }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {loading ? t(i18n.loading, lang) : t(i18n.start, lang)}
        </Button>
      </div>
    );
  }

  /* ─── Render: Scoring screen ─── */
  if (step === 'scoring') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-up">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">{t(i18n.scoring, lang)}</p>
      </div>
    );
  }

  /* ─── Render: Results ─── */
  if (step === 'results' && finalScores) {
    const comparison = prevScore === null ? 'first'
      : finalScores.overall > prevScore ? 'better'
      : finalScores.overall < prevScore ? 'worse' : 'same';

    const compIcon = comparison === 'better' ? <TrendingUp className="w-5 h-5 text-emerald-600" />
      : comparison === 'worse' ? <TrendingDown className="w-5 h-5 text-red-500" />
      : comparison === 'same' ? <Minus className="w-5 h-5 text-amber-500" />
      : <Trophy className="w-5 h-5 text-primary" />;

    const scoreColor = finalScores.overall >= 60 ? 'text-emerald-600' : finalScores.overall >= 30 ? 'text-amber-600' : 'text-red-600';

    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6">
        <Card className="shadow-md animate-fade-up">
          <CardHeader className="text-center pb-2">
            <Trophy className="w-10 h-10 mx-auto text-primary mb-2" />
            <h1 className="text-xl font-bold">{t(i18n.results, lang)}</h1>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className={`text-5xl font-extrabold tabular-nums ${scoreColor}`}>
                {finalScores.overall}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{t(i18n.overall, lang)}</div>
            </div>

            <div className="flex items-center justify-center gap-2 bg-secondary/40 rounded-lg p-3">
              {compIcon}
              <span className="text-sm">{t(i18n[comparison], lang)}</span>
              {prevScore !== null && (
                <span className="text-xs text-muted-foreground ml-1">(prev: {prevScore})</span>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(i18n.breakdown, lang)}
              </h3>
              {(['speaking', 'writing', 'reading', 'listening'] as const).map(skill => {
                const score = finalScores[skill];
                return (
                  <div key={skill} className="flex items-center gap-3">
                    <div className={`${SKILL_COLORS[skill]} shrink-0`}>{SKILL_ICONS[skill]}</div>
                    <span className="text-sm capitalize w-20">{skill}</span>
                    <Progress value={score} className="flex-1 h-2.5" />
                    <span className="text-sm font-semibold tabular-nums w-8 text-right">{score}</span>
                  </div>
                );
              })}
            </div>


            <Button onClick={() => navigate('/')} className="w-full gap-2">
              {t(i18n.backDash, lang)} <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Render: Test (question by question) ─── */
  if (!currentQ) return null;

  const options = parseOptions(currentQ.question_text);
  const passage = parsePassage(currentQ.question_text);
  const blankCount = parseBlanks(currentQ.question_text);
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const isTextAnswer = options.length === 0 && blankCount === 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      {/* Timer & progress bar */}
      <div className="flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {SKILL_ICONS[currentQ.skill]}
            <span className="capitalize">{currentQ.skill}</span>
          </Badge>
          <span className="text-xs text-muted-foreground">
            {t(i18n.question, lang)} {currentIdx + 1} {t(i18n.of, lang)} {questions.length}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums ${countdown < 120 ? 'text-destructive' : ''}`}>
          <Clock className="w-4 h-4" />
          {formatTime(countdown)}
        </div>
      </div>
      <Progress value={progress} className="h-1.5" />

      {/* Question card */}
      <Card className="shadow-sm animate-fade-up" style={{ animationDelay: '60ms' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{currentQ.question_type}</span>
            <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">Difficulty: {currentQ.difficulty}/5</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {options.length > 0 ? (
            <p className="text-sm leading-relaxed">{passage}</p>
          ) : currentQ.image_url ? (
            <img src={currentQ.image_url} alt="Question" className="w-full rounded-lg border" />
          ) : (
            <p className="text-sm leading-relaxed">{currentQ.question_text}</p>
          )}

          {/* Audio player for listening questions */}
          {currentQ.skill === 'listening' && (
            <Button
              variant="outline"
              onClick={playAudio}
              disabled={ttsLoading || audioPlayed}
              className="w-full gap-2"
            >
              {ttsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
              {audioPlayed ? 'Audio played — single listen only' : ttsLoading ? 'Loading audio…' : 'Play Audio'}
            </Button>
          )}

          {/* MCQ options */}
          {options.length > 0 && (
            <div className="space-y-2">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full text-left rounded-lg border p-3 text-sm transition-all duration-150 active:scale-[0.98] ${
                    selectedOption === opt
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'hover:bg-secondary/50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Fill in blanks */}
          {blankCount > 0 && (
            <div className="space-y-2">
              {blanks.map((val, i) => (
                <Input
                  key={i}
                  placeholder={`Blank ${i + 1}`}
                  value={val}
                  onChange={e => {
                    const next = [...blanks];
                    next[i] = e.target.value;
                    setBlanks(next);
                  }}
                />
              ))}
            </div>
          )}

          {/* Speaking: audio recorder */}
          {currentQ.skill === 'speaking' && (
            <div className="space-y-3">
              {recorder.phase === 'idle' && (
                <Button onClick={recorder.startRecording} variant="outline" className="w-full gap-2">
                  <Mic className="w-4 h-4" /> Start Recording
                </Button>
              )}
              {recorder.phase === 'recording' && (
                <div className="space-y-3">
                  <p className="text-sm text-destructive font-medium animate-pulse text-center">Recording…</p>
                  <div className="flex items-end justify-center gap-[3px] h-12">
                    {recorder.audioLevels.map((level, i) => (
                      <div key={i} className="w-1.5 bg-destructive rounded-full transition-all duration-75" style={{ height: `${Math.max(6, level * 48)}px`, opacity: 0.6 + level * 0.4 }} />
                    ))}
                  </div>
                  <Button variant="destructive" onClick={recorder.stopRecording} className="w-full gap-2">
                    <Square className="w-4 h-4" /> Stop Recording
                  </Button>
                </div>
              )}
              {recorder.phase === 'scoring' && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Scoring your recording…</span>
                </div>
              )}
            </div>
          )}

          {/* Text answer (writing/SST — not speaking) */}
          {isTextAnswer && currentQ.skill !== 'speaking' && (
            <Textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder={t(i18n.typeAnswer, lang)}
              rows={5}
              className="resize-none"
            />
          )}
        </CardContent>
      </Card>

      {/* Submit button */}
      <Button
        onClick={handleSubmitQuestion}
        disabled={submitting}
        className="w-full gap-2 animate-fade-up"
        style={{ animationDelay: '120ms' }}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t(i18n.scoring, lang)}
          </>
        ) : (
          <>
            {isLast ? t(i18n.submitFinal, lang) : t(i18n.submit, lang)}
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  );
}
