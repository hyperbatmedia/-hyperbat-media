// Fichier: src/i18n/context.ts
// Contexte de langue et hook useLang (séparés du composant LanguageProvider
// pour que le rechargement à chaud de Vite fonctionne).
import { createContext, useContext } from 'react';
import { translate } from './core';
import type { Lang } from './core';

export type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
  /** Traduit un libellé français venant des constantes (catégories, rubriques...). */
  label: (frText: string, prefix: string) => string;
}

export const LangContext = createContext<LangContextValue | null>(null);

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
