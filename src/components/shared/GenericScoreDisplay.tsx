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

export default function GenericScoreDisplay({
  overall_score, is_correct, feedback_en, feedback_np,
  correct_answer_explanation, extra, improved_version, onNext,
}: Props) {
  const { lang } = useLang();
  const scoreColor = overall_score >= 60 ? 'text-green-600' : overall_score >= 30 ? 'text-amber-600' : 'text-red-600';

  return (
    <Card className="shadow-sm animate-fade-up">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CheckCircle className={`w-5 h-5 ${scoreColor}`} />
          <span className="font-semibold">{t(i18n.score, lang)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="text-center">
          <div className={`text-4xl font-bold tabular-nums ${scoreColor}`}>{overall_score}</div>
          <div className="text-xs text-muted-foreground">/90</div>
          {is_correct !== undefined && (
            <div className={`text-sm font-medium mt-1 ${is_correct ? 'text-green-600' : 'text-red-600'}`}>
              {is_correct ? t(i18n.correct, lang) : t(i18n.incorrect, lang)}
            </div>
          )}
        </div>

        {/* Extra scores */}
        {extra && Object.keys(extra).length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(extra).map(([label, score]) => (
              <div key={label} className="bg-secondary/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold tabular-nums">{score}</div>
                <div className="text-xs text-muted-foreground capitalize">{label.replace(/_/g, ' ')}</div>
              </div>
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
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-900">
            <h4 className="text-xs font-semibold uppercase text-green-700 dark:text-green-400 mb-1">Improved Version</h4>
            <p className="text-sm leading-relaxed">{improved_version}</p>
          </div>
        )}

        <Button onClick={onNext} className="w-full gap-2">
          {t(i18n.next, lang)} <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
