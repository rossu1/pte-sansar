import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, SkipForward, Lock } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';
import type { ScoreResult } from './SpeakingRecorder';

const i18n = {
  score: { en: 'Score', np: 'स्कोर' },
  feedback: { en: 'Feedback', np: 'प्रतिक्रिया' },
  feedbackNp: { en: 'Feedback (Nepali)', np: 'प्रतिक्रिया (नेपाली)' },
  nextQuestion: { en: 'Next Question', np: 'अर्को प्रश्न' },
};

interface Props {
  result: ScoreResult;
  onNext: () => void;
  isPro?: boolean;
}

/* ── Animated circular score arc ── */
function ScoreArc({ score, max = 90, size = 100 }: { score: number; max?: number; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.min(score / max, 1);
  const target = circumference * (1 - fraction);
  const color = fraction >= 0.7 ? 'hsl(142,71%,45%)' : fraction >= 0.4 ? 'hsl(38,92%,50%)' : 'hsl(0,72%,51%)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={target}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            animation: 'gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            ['--gauge-circumference' as any]: circumference,
            ['--gauge-target' as any]: target,
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-heading font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground">/{max}</span>
      </div>
    </div>
  );
}

/* ── Animated progress bar ── */
function ProgressBar({ label, value, max = 30, delay = 0 }: { label: string; value: number; max?: number; delay?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${pct}%`,
            animation: `progress-bar 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s both`,
          }}
        />
      </div>
    </div>
  );
}

export default function ScoreDisplay({ result, onNext, isPro = false }: Props) {
  const { lang } = useLang();

  return (
    <div className="space-y-4 animate-fade-up">
      <Card className="shadow-sm border-green-500/20">
        <CardContent className="p-5">
          {isPro ? (
            <>
              <div className="flex items-center gap-5 mb-5">
                <ScoreArc score={result.overall_score} />
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-heading font-bold">{t(i18n.score, lang)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <ProgressBar label="Content" value={result.content_score} delay={0} />
                <ProgressBar label="Fluency" value={result.fluency_score} delay={0.1} />
                <ProgressBar label="Pronunciation" value={result.pronunciation_score} delay={0.2} />
              </div>
            </>
          ) : (
            <div className="text-center space-y-3 py-2">
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span className="font-heading font-bold text-muted-foreground">{t(i18n.score, lang)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Upgrade to Pro to see your detailed speaking scores and sub-scores.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{t(i18n.feedback, lang)}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.feedback_en}</p>
          </div>
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1 font-nepali">{t(i18n.feedbackNp, lang)}</h4>
            <p className="text-sm text-muted-foreground font-nepali leading-relaxed">{result.feedback_np}</p>
          </div>
          {result.ideal_answer && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Ideal Answer</h4>
              <p className="text-sm text-muted-foreground italic leading-relaxed">{result.ideal_answer}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={onNext} className="w-full gap-2 btn-press">
        <SkipForward className="w-4 h-4" /> {t(i18n.nextQuestion, lang)}
      </Button>
    </div>
  );
}
