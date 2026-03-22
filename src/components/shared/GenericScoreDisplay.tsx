import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useLang, t } from '@/lib/i18n';

const i18n = {
  score: { en: 'Score', np: 'स्कोर' },
  feedback: { en: 'Feedback', np: 'प्रतिक्रिया' },
  next: { en: 'Next Question', np: 'अर्को प्रश्न' },
  correct: { en: 'Correct!', np: 'सहि!' },
  incorrect: { en: 'Incorrect', np: 'गलत' },
  explanation: { en: 'Explanation', np: 'व्याख्या' },
};

interface Props {
  overall_score: number;
  is_correct?: boolean;
  feedback_en: string;
  feedback_np: string;
  correct_answer_explanation?: string;
  extra?: Record<string, number>;
  improved_version?: string;
  onNext: () => void;
}

/* ── Animated circular score arc ── */
function ScoreArc({ score, max = 90, size = 120 }: { score: number; max?: number; size?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.min(score / max, 1);
  const target = circumference * (1 - fraction);
  const color = fraction >= 0.67 ? 'hsl(142,71%,45%)' : fraction >= 0.33 ? 'hsl(38,92%,50%)' : 'hsl(0,72%,51%)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
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
        <span className="text-3xl font-heading font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">/{max}</span>
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
        <span className="text-muted-foreground capitalize">{label.replace(/_/g, ' ')}</span>
        <span className="font-bold tabular-nums">{value}</span>
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

export default function GenericScoreDisplay({
  overall_score, is_correct, feedback_en, feedback_np,
  correct_answer_explanation, extra, improved_version, onNext,
}: Props) {
  const { lang } = useLang();

  return (
    <Card className="shadow-sm animate-fade-up">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CheckCircle className={`w-5 h-5 ${overall_score >= 60 ? 'text-green-600' : overall_score >= 30 ? 'text-amber-600' : 'text-red-600'}`} />
          <span className="font-heading font-bold">{t(i18n.score, lang)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score arc */}
        <div className="flex flex-col items-center">
          <ScoreArc score={overall_score} />
          {is_correct !== undefined && (
            <div className={`text-sm font-medium mt-2 ${is_correct ? 'text-green-600' : 'text-red-600'}`}>
              {is_correct ? t(i18n.correct, lang) : t(i18n.incorrect, lang)}
            </div>
          )}
        </div>

        {/* Extra scores as progress bars */}
        {extra && Object.keys(extra).length > 0 && (
          <div className="space-y-2">
            {Object.entries(extra).map(([label, score], i) => (
              <ProgressBar key={label} label={label} value={score} delay={i * 0.1} />
            ))}
          </div>
        )}

        {/* Feedback */}
        <div className="bg-secondary/30 rounded-lg p-3">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{t(i18n.feedback, lang)}</h4>
          <p className="text-sm leading-relaxed">{lang === 'np' ? feedback_np : feedback_en}</p>
        </div>

        {/* Explanation */}
        {correct_answer_explanation && (
          <div className="bg-primary/5 rounded-lg p-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{t(i18n.explanation, lang)}</h4>
            <p className="text-sm leading-relaxed">{correct_answer_explanation}</p>
          </div>
        )}

        {/* Improved version */}
        {improved_version && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <h4 className="text-xs font-semibold uppercase text-green-700 mb-1">Improved Version</h4>
            <p className="text-sm leading-relaxed">{improved_version}</p>
          </div>
        )}

        <Button onClick={onNext} className="w-full gap-2 btn-press">
          {t(i18n.next, lang)} <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
