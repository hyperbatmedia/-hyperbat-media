// Fichier: src/i18n/index.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { detectLang, translate, translateLabel } from './core';
import type { Lang } from './core';

// Chaque zone du site a son fichier de textes (FR + EN côte à côte).
import './dict/common';
import './dict/errors';
import './dict/submission';
import './dict/agent';
import './dict/site';
import './dict/nav';
import './dict/cart';
import './dict/panels';
import './dict/list';

export type { Lang } from './core';

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
  /** Traduit un libellé français venant des constantes (catégories, rubriques...). */
  label: (frText: string, prefix: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

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

/**
 * Hors LanguageProvider (ex. l'admin), on reste en français : rien ne change
 * pour les écrans qui ne sont pas traduits.
 */
export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (ctx) return ctx;
  return {
    lang: 'fr',
    setLang: () => {},
    t: (key, params) => translate('fr', key, params),
    label: (frText) => frText,
  };
}
