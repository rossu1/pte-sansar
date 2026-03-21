import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScoreResult {
  overall_score: number;
  content_score: number;
  fluency_score: number;
  pronunciation_score: number;
  feedback_en: string;
  feedback_np: string;
  ideal_answer: string;
}

interface UseRecorderOptions {
  userId: string;
  questionId: string;
  questionText: string;
  questionType: string;
  onScored: (result: ScoreResult) => void;
  onError: () => void;
}

export function useRecorder() {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'scoring' | 'result'>('idle');
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0.1));
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartRef = useRef<number>(0);

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
      recorder.start();
      mediaRecorderRef.current = recorder;
      recordStartRef.current = Date.now();
      setPhase('recording');

      const updateLevels = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        setAudioLevels(Array.from(data.slice(0, 20)).map((v) => v / 255));
        animFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
      return recorder;
    } catch {
      toast.error('Microphone access denied');
      return null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const submitRecording = useCallback(async (opts: UseRecorderOptions) => {
    setPhase('scoring');
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const timeTaken = Math.round((Date.now() - recordStartRef.current) / 1000);

    try {
      const filePath = `${opts.userId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from('speaking-recordings').upload(filePath, blob);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.functions.invoke('score-speaking', {
        body: { audioPath: filePath, questionText: opts.questionText, questionType: opts.questionType },
      });
      if (error) throw error;

      const result: ScoreResult = data;
      setScoreResult(result);

      await supabase.from('user_attempts').insert({
        user_id: opts.userId,
        question_id: opts.questionId,
        user_answer: filePath,
        ai_score: result.overall_score,
        ai_feedback: result.feedback_en,
        ai_feedback_nepali: result.feedback_np,
        time_taken_seconds: timeTaken,
      });

      setPhase('result');
      opts.onScored(result);
    } catch (err: any) {
      toast.error(err.message || 'Scoring failed. Please try again.');
      setPhase('idle');
      opts.onError();
    }
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setScoreResult(null);
    setAudioLevels(new Array(20).fill(0.1));
  }, []);

  return { phase, setPhase, audioLevels, scoreResult, startRecording, stopRecording, submitRecording, reset, mediaRecorderRef };
}
