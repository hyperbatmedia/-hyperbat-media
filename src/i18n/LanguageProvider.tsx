// Fichier: src/i18n/LanguageProvider.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { detectLang, translate, translateLabel } from './core';
import type { Lang } from './core';
import { LangContext } from './context';
import type { LangContextValue } from './context';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Pas de mémorisation : le choix vaut pour la visite en cours.
  const [lang, setLangState] = useState<Lang>(() => detectLang());
  const setLang = useCallback((l: Lang) => setLangState(l), []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, params) => translate(lang, key, params),
      label: (frText, prefix) => translateLabel(lang, frText, prefix),
    }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};
