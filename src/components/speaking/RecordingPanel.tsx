import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';

const i18n = {
  prepTime: { en: 'Preparation time', np: 'तयारी समय' },
  recording: { en: 'Recording...', np: 'रेकर्डिङ...' },
  scoring: { en: 'AI is scoring your answer...', np: 'AI ले तपाईंको उत्तर जाँच गर्दैछ...' },
  startRecording: { en: 'Start Recording', np: 'रेकर्डिङ सुरु' },
  stopRecording: { en: 'Stop', np: 'रोक्नुहोस्' },
};

interface Props {
  phase: 'idle' | 'recording' | 'scoring' | 'result';
  prepCountdown: number;
  recordCountdown: number;
  audioLevels: number[];
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const CIRCLE_SIZE = 200;
const CIRCLE_R = 88;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

export default function RecordingPanel({ phase, prepCountdown, recordCountdown, audioLevels, onStartRecording, onStopRecording }: Props) {
  const { lang } = useLang();

  if (phase === 'scoring') {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t(i18n.scoring, lang)}</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'recording') {
    return (
      <Card className="shadow-sm border-destructive/20">
        <CardContent className="p-6 flex flex-col items-center space-y-5">
          {/* Circle with waveform inside and countdown arc outside */}
          <div className="relative" style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
            {/* Outer countdown arc */}
            <svg
              width={CIRCLE_SIZE}
              height={CIRCLE_SIZE}
              viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
              className="absolute inset-0"
            >
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_R}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="4"
              />
              <circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_R}
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={0}
                transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                style={{
                  transition: 'stroke-dashoffset 1s linear',
                }}
              />
            </svg>

            {/* Inner glow circle + waveform */}
            <div
              className="absolute inset-3 rounded-full bg-destructive/5 flex items-end justify-center gap-[2px] pb-8"
              style={{ animation: 'record-glow 2s ease-in-out infinite' }}
            >
              {audioLevels.map((level, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-destructive rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(6, level * 80)}px`,
                    opacity: 0.5 + level * 0.5,
                  }}
                />
              ))}
            </div>

            {/* Record time */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-3xl font-heading font-bold tabular-nums text-destructive">
                {recordCountdown}s
              </span>
            </div>
          </div>

          <Button variant="destructive" onClick={onStopRecording} size="lg" className="gap-2 btn-press">
            <Square className="w-4 h-4" /> {t(i18n.stopRecording, lang)}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // idle / prep — circular countdown
  const prepTotal = 35; // approximate, for visual only
  const fraction = prepCountdown / prepTotal;
  const prepOffset = CIRCLE_CIRCUMFERENCE * (1 - fraction);

  return (
    <Card className="shadow-sm border-primary/20">
      <CardContent className="p-6 flex flex-col items-center space-y-5">
        <div className="relative" style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
          <svg
            width={CIRCLE_SIZE}
            height={CIRCLE_SIZE}
            viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
          >
            <circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={CIRCLE_R}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
            />
            <circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={CIRCLE_R}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={prepOffset}
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-heading font-bold tabular-nums text-primary" style={{ animation: 'count-pulse 1s ease-in-out infinite' }}>
              {prepCountdown}
            </span>
            <span className="text-xs text-muted-foreground mt-1">{t(i18n.prepTime, lang)}</span>
          </div>
        </div>

        <Button onClick={onStartRecording} size="lg" className="gap-2 btn-press">
          <Mic className="w-4 h-4" /> {t(i18n.startRecording, lang)}
        </Button>
      </CardContent>
    </Card>
  );
}
