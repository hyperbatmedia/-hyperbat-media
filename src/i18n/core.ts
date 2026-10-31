// Fichier: src/i18n/core.ts
//
// Coeur de la version FR / EN du site (sans React, donc utilisable aussi
// par l'écran d'erreur, qui est en dehors du contexte React).
//
// - Le français reste la langue de base : si une phrase n'a pas de version
//   anglaise, on affiche le français (jamais de texte vide ni de clé brute).
// - Rien n'est mémorisé : à chaque visite, on prend la langue du navigateur
//   (français -> FR, le reste -> EN). Le bouton FR | EN change la langue
//   pour la visite en cours seulement.

export type Lang = 'fr' | 'en';
export type Dict = Record<string, string>;

const registry: Record<Lang, Dict> = { fr: {}, en: {} };

/** Chaque fichier de textes s'enregistre ici (un fichier par zone du site). */
export function registerDict(dicts: { fr: Dict; en: Dict }): void {
  Object.assign(registry.fr, dicts.fr);
  Object.assign(registry.en, dicts.en);
}

export function detectLang(): Lang {
  try {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'fr';
    return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  } catch {
    return 'fr';
  }
}

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const raw = registry[lang][key] ?? registry.fr[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

/** Traduit un texte français déjà connu (ex. nom de catégorie venant des constantes). */
export function translateLabel(lang: Lang, frText: string, prefix: string): string {
  if (lang === 'fr') return frText;
  const key = prefix + frText;
  return registry.en[key] ?? frText;
}

const MONTHS_FR_EN: Array<[RegExp, string]> = [
  [/Janvier/g, 'January'], [/Février/g, 'February'], [/Mars/g, 'March'], [/Avril/g, 'April'],
  [/Mai/g, 'May'], [/Juin/g, 'June'], [/Juillet/g, 'July'], [/Août/g, 'August'],
  [/Septembre/g, 'September'], [/Octobre/g, 'October'], [/Novembre/g, 'November'], [/Décembre/g, 'December'],
];

/**
 * Textes des packs du mois (écrits en français dans themePacks.json) :
 * mois et phrases habituelles traduits ; tout autre texte reste tel quel.
 */
export function translatePackText(lang: Lang, text: string): string {
  if (lang === 'fr' || !text) return text;
  let s = text;
  for (const [re, en] of MONTHS_FR_EN) s = s.replace(re, en);
  s = s.replace(/^\+ de (\d+)/, '$1+');
  s = s.replace(/(\d+\+?) thèmes de jeux, default et système/, '$1 game, default and system themes');
  s = s.replace(/(\d+\+?) thèmes de jeux, system et défaut/, '$1 game, system and default themes');
  s = s.replace(/(\d+\+?) thèmes de jeux$/, '$1 game themes');
  s = s.replace(/(\d+\+?) thèmes de jeux /, '$1 game themes ');
  return s;
}
