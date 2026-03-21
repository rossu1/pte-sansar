import { create } from 'zustand';

type Lang = 'en' | 'np';

interface LangStore {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

// Persist to localStorage if available
const getInitialLang = (): Lang => {
  try {
    return (localStorage.getItem('pte-sathi-lang') as Lang) || 'en';
  } catch { return 'en'; }
};

export const useLang = create<LangStore>((set) => ({
  lang: getInitialLang(),
  setLang: (lang) => {
    localStorage.setItem('pte-sathi-lang', lang);
    set({ lang });
  },
  toggle: () => set((s) => {
    const next = s.lang === 'en' ? 'np' : 'en';
    localStorage.setItem('pte-sathi-lang', next);
    return { lang: next };
  }),
}));

export function t(strings: { en: string; np: string }, lang: Lang): string {
  return strings[lang] || strings.en;
}
