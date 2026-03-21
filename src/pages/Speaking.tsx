import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mic, Square, SkipForward, Loader2, CheckCircle2 } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';

const i18n = {
  speaking: { en: 'Speaking Practice', np: 'बोल्ने अभ्यास' },
  readAloud: { en: 'Read Aloud', np: 'जोडले पढ्नुहोस्' },
  prepTime: { en: 'Preparation time', np: 'तयारी समय' },
  recording: { en: 'Recording...', np: 'रेकर्डिङ...' },
  scoring: { en: 'AI is scoring your answer...', np: 'AI ले तपाईंको उत्तर जाँच गर्दैछ...' },
  startRecording: { en: 'Start Recording', np: 'रेकर्डिङ सुरु' },
  stopRecording: { en: 'Stop', np: 'रोक्नुहोस्' },
  nextQuestion: { en: 'Next Question', np: 'अर्को प्रश्न' },
  score: { en: 'Score', np: 'स्कोर' },
  feedback: { en: 'Feedback', np: 'प्रतिक्रिया' },
  feedbackNp: { en: 'Feedback (Nepali)', np: 'प्रतिक्रिया (नेपाली)' },
  noQuestions: { en: 'No questions available. Please check back later.', np: 'कुनै प्रश्न उपलब्ध छैन।' },
};

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: number;
}

interface ScoreResult {
  overall_score: number;
  content_score: number;
  fluency_score: number;
  pronunciation_score: number;
  feedback_en: string;
  feedback_np: string;
  ideal_answer: string;
}

export default function SpeakingPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'prep' | 'recording' | 'scoring' | 'result'>('prep');
  const [prepCountdown, setPrepCountdown] = useState(35);
  const [recordCountdown, setRecordCountdown] = useState(40);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0.1));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Load questions
  useEffect(() => {
    supabase.from('questions').select('id, question_text, question_type, difficulty')
      .eq('skill', 'speaking')
      .eq('question_type', 'Read Aloud')
      .then(({ data }) => {
        if (data && data.length > 0) setQuestions(data);
      });
  }, []);

  // Prep countdown
  useEffect(() => {
    if (phase !== 'prep' || questions.length === 0) return;
    setPrepCountdown(35);
    const interval = setInterval(() => {
      setPrepCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentIdx, questions.length]);

  // Record countdown
  useEffect(() => {
    if (phase !== 'recording') return;
    setRecordCountdown(40);
    const interval = setInterval(() => {
      setRecordCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => handleRecordingComplete();
      recorder.start();
      mediaRecorderRef.current = recorder;
      setPhase('recording');

      // Visualizer
      const updateLevels = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const levels = Array.from(data.slice(0, 20)).map((v) => v / 255);
        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch {
      toast.error('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const handleRecordingComplete = async () => {
    setPhase('scoring');
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const question = questions[currentIdx];

    try {
      // Upload to storage
      const filePath = `${user!.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from('speaking-recordings').upload(filePath, blob);
      if (uploadError) throw uploadError;

      // Call edge function
      const { data, error } = await supabase.functions.invoke('score-speaking', {
        body: { audioPath: filePath, questionText: question.question_text, questionType: question.question_type },
      });

      if (error) throw error;

      const result: ScoreResult = data;
      setScoreResult(result);

      // Save attempt
      await supabase.from('user_attempts').insert({
        user_id: user!.id,
        question_id: question.id,
        user_answer: filePath,
        ai_score: result.overall_score,
        ai_feedback: result.feedback_en,
        ai_feedback_nepali: result.feedback_np,
        time_taken_seconds: 40 - recordCountdown,
      });

      setPhase('result');
    } catch (err: any) {
      toast.error(err.message || 'Scoring failed. Please try again.');
      setPhase('prep');
    }
  };

  const nextQuestion = () => {
    setCurrentIdx((prev) => (prev + 1) % questions.length);
    setScoreResult(null);
    setPhase('prep');
  };

  const question = questions[currentIdx];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold animate-fade-up" style={{ lineHeight: '1.2' }}>
        🎙️ {t(i18n.speaking, lang)}
      </h1>

      <Tabs defaultValue="read-aloud">
        <TabsList>
          <TabsTrigger value="read-aloud">{t(i18n.readAloud, lang)}</TabsTrigger>
          <TabsTrigger value="repeat-sentence" disabled>Repeat Sentence</TabsTrigger>
          <TabsTrigger value="describe-image" disabled>Describe Image</TabsTrigger>
        </TabsList>

        <TabsContent value="read-aloud" className="mt-4">
          {questions.length === 0 ? (
            <Card className="shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">{t(i18n.noQuestions, lang)}</CardContent></Card>
          ) : (
            <div className="space-y-4 animate-fade-up">
              {/* Question Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Question {currentIdx + 1} of {questions.length}</span>
                    <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">Difficulty: {question.difficulty}/5</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed">{question.question_text}</p>
                </CardContent>
              </Card>

              {/* Phase: Preparation */}
              {phase === 'prep' && (
                <Card className="shadow-sm border-primary/20">
                  <CardContent className="p-6 text-center space-y-4">
                    <p className="text-sm text-muted-foreground">{t(i18n.prepTime, lang)}</p>
                    <div className="text-5xl font-bold tabular-nums text-primary">{prepCountdown}s</div>
                    <Button onClick={startRecording} size="lg" className="gap-2">
                      <Mic className="w-4 h-4" /> {t(i18n.startRecording, lang)}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Phase: Recording */}
              {phase === 'recording' && (
                <Card className="shadow-sm border-destructive/30">
                  <CardContent className="p-6 text-center space-y-4">
                    <p className="text-sm text-destructive font-medium animate-pulse">{t(i18n.recording, lang)}</p>
                    <div className="text-4xl font-bold tabular-nums text-destructive">{recordCountdown}s</div>

                    {/* Waveform */}
                    <div className="flex items-end justify-center gap-[3px] h-16">
                      {audioLevels.map((level, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-destructive rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(8, level * 64)}px`, opacity: 0.6 + level * 0.4 }}
                        />
                      ))}
                    </div>

                    <Button variant="destructive" onClick={stopRecording} size="lg" className="gap-2 animate-pulse-record">
                      <Square className="w-4 h-4" /> {t(i18n.stopRecording, lang)}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Phase: Scoring */}
              {phase === 'scoring' && (
                <Card className="shadow-sm">
                  <CardContent className="p-8 text-center space-y-4">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">{t(i18n.scoring, lang)}</p>
                  </CardContent>
                </Card>
              )}

              {/* Phase: Result */}
              {phase === 'result' && scoreResult && (
                <div className="space-y-4 animate-fade-up">
                  {/* Overall Score */}
                  <Card className="shadow-sm border-success/30">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <CheckCircle2 className="w-8 h-8 text-success" />
                        <div>
                          <div className="text-3xl font-bold tabular-nums">{scoreResult.overall_score}<span className="text-lg text-muted-foreground">/90</span></div>
                          <div className="text-sm text-muted-foreground">{t(i18n.score, lang)}</div>
                        </div>
                      </div>

                      {/* Sub-scores */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Content', score: scoreResult.content_score },
                          { label: 'Fluency', score: scoreResult.fluency_score },
                          { label: 'Pronunciation', score: scoreResult.pronunciation_score },
                        ].map((s) => (
                          <div key={s.label} className="text-center p-2 bg-secondary rounded-lg">
                            <div className="text-lg font-bold tabular-nums">{s.score}</div>
                            <div className="text-xs text-muted-foreground">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feedback */}
                  <Card className="shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold mb-1">{t(i18n.feedback, lang)}</h4>
                        <p className="text-sm text-muted-foreground">{scoreResult.feedback_en}</p>
                      </div>
                      <div className="border-t pt-3">
                        <h4 className="text-sm font-semibold mb-1 font-nepali">{t(i18n.feedbackNp, lang)}</h4>
                        <p className="text-sm text-muted-foreground font-nepali">{scoreResult.feedback_np}</p>
                      </div>
                      {scoreResult.ideal_answer && (
                        <div className="border-t pt-3">
                          <h4 className="text-sm font-semibold mb-1">Ideal Answer</h4>
                          <p className="text-sm text-muted-foreground italic">{scoreResult.ideal_answer}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Button onClick={nextQuestion} className="w-full gap-2">
                    <SkipForward className="w-4 h-4" /> {t(i18n.nextQuestion, lang)}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
