import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, SkipForward } from 'lucide-react';
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
}

export default function ScoreDisplay({ result, onNext }: Props) {
  const { lang } = useLang();

  return (
    <div className="space-y-4 animate-fade-up">
      <Card className="shadow-sm border-green-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-3xl font-bold tabular-nums">{result.overall_score}<span className="text-lg text-muted-foreground">/90</span></div>
              <div className="text-sm text-muted-foreground">{t(i18n.score, lang)}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Content', score: result.content_score },
              { label: 'Fluency', score: result.fluency_score },
              { label: 'Pronunciation', score: result.pronunciation_score },
            ].map((s) => (
              <div key={s.label} className="text-center p-2 bg-secondary rounded-lg">
                <div className="text-lg font-bold tabular-nums">{s.score}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-1">{t(i18n.feedback, lang)}</h4>
            <p className="text-sm text-muted-foreground">{result.feedback_en}</p>
          </div>
          <div className="border-t pt-3">
            <h4 className="text-sm font-semibold mb-1 font-nepali">{t(i18n.feedbackNp, lang)}</h4>
            <p className="text-sm text-muted-foreground font-nepali">{result.feedback_np}</p>
          </div>
          {result.ideal_answer && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-1">Ideal Answer</h4>
              <p className="text-sm text-muted-foreground italic">{result.ideal_answer}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={onNext} className="w-full gap-2">
        <SkipForward className="w-4 h-4" /> {t(i18n.nextQuestion, lang)}
      </Button>
    </div>
  );
}
