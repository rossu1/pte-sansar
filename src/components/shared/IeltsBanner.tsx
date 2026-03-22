import { useState } from 'react';
import { Info, CheckCircle, X } from 'lucide-react';

interface IeltsBannerProps {
  variant: 'amber' | 'green';
  message: string;
  dismissible?: boolean;
}

export default function IeltsBanner({ variant, message, dismissible = false }: IeltsBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isGreen = variant === 'green';

  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-relaxed animate-fade-up ${
      isGreen
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
        : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
    }`}>
      {isGreen
        ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
        : <Info className="w-4 h-4 shrink-0 mt-0.5" />
      }
      <span className="flex-1">{message}</span>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
