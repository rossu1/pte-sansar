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
      <Card className="shadow-sm border-destructive/30">
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-sm text-destructive font-medium animate-pulse">{t(i18n.recording, lang)}</p>
          <div className="text-4xl font-bold tabular-nums text-destructive">{recordCountdown}s</div>
          <div className="flex items-end justify-center gap-[3px] h-16">
            {audioLevels.map((level, i) => (
              <div key={i} className="w-1.5 bg-destructive rounded-full transition-all duration-75" style={{ height: `${Math.max(8, level * 64)}px`, opacity: 0.6 + level * 0.4 }} />
            ))}
          </div>
          <Button variant="destructive" onClick={onStopRecording} size="lg" className="gap-2">
            <Square className="w-4 h-4" /> {t(i18n.stopRecording, lang)}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // idle / prep
  return (
    <Card className="shadow-sm border-primary/20">
      <CardContent className="p-6 text-center space-y-4">
        <p className="text-sm text-muted-foreground">{t(i18n.prepTime, lang)}</p>
        <div className="text-5xl font-bold tabular-nums text-primary">{prepCountdown}s</div>
        <Button onClick={onStartRecording} size="lg" className="gap-2">
          <Mic className="w-4 h-4" /> {t(i18n.startRecording, lang)}
        </Button>
      </CardContent>
    </Card>
  );
}
