// Fichier: src/i18n/core.ts
//
// Coeur de la version FR / EN du site (sans React, donc utilisable aussi
// par l'écran d'erreur, qui est en dehors du contexte React).
//
// - Le français reste la langue de base. Une phrase sans traduction dans la
//   langue choisie s'affiche en anglais, puis en français à défaut (jamais de
//   texte vide ni de clé brute).
// - Rien n'est mémorisé : à chaque visite, on prend la langue du navigateur
//   (français -> FR, espagnol -> ES, portugais -> PT, le reste -> EN). Le bouton FR | EN change la langue
//   pour la visite en cours seulement.

export type Lang = 'fr' | 'en' | 'es' | 'pt';
export const LANGS: Lang[] = ['fr', 'en', 'es', 'pt'];
export type Dict = Record<string, string>;

const registry: Record<Lang, Dict> = { fr: {}, en: {}, es: {}, pt: {} };

/** Chaque fichier de textes s'enregistre ici (un fichier par zone du site). */
export function registerDict(dicts: Partial<Record<Lang, Dict>>): void {
  for (const l of LANGS) Object.assign(registry[l], dicts[l] ?? {});
}

/** Pour le contrôle des traductions (outil de test). */
export function getDict(lang: Lang): Dict {
  return registry[lang];
}

export function detectLang(): Lang {
  try {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'fr';
    const n = nav.toLowerCase();
    if (n.startsWith('fr')) return 'fr';
    if (n.startsWith('es')) return 'es';
    if (n.startsWith('pt')) return 'pt';
    return 'en';
  } catch {
    return 'fr';
  }
}

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const raw = registry[lang][key] ?? registry.en[key] ?? registry.fr[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

/** Traduit un texte français déjà connu (ex. nom de catégorie venant des constantes). */
export function translateLabel(lang: Lang, frText: string, prefix: string): string {
  if (lang === 'fr') return frText;
  const key = prefix + frText;
  return registry[lang][key] ?? registry.en[key] ?? frText;
}

const FR_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const PACK_WORDS: Record<Exclude<Lang, 'fr'>, {
  months: string[];
  gameDefaultSystem: string;
  gameSystemDefault: string;
  gameThemes: string;
  themes: string;
}> = {
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    gameDefaultSystem: '$1 game, default and system themes',
    gameSystemDefault: '$1 game, system and default themes',
    gameThemes: '$1 game themes',
    themes: '$1 themes',
  },
  es: {
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    gameDefaultSystem: '$1 temas de juegos, por defecto y de sistema',
    gameSystemDefault: '$1 temas de juegos, de sistema y por defecto',
    gameThemes: '$1 temas de juegos',
    themes: '$1 temas',
  },
  pt: {
    months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    gameDefaultSystem: '$1 temas de jogos, padrão e de sistema',
    gameSystemDefault: '$1 temas de jogos, de sistema e padrão',
    gameThemes: '$1 temas de jogos',
    themes: '$1 temas',
  },
};

/**
 * Textes des packs du mois (écrits en français dans themePacks.json) :
 * mois et phrases habituelles traduits ; tout autre texte reste tel quel.
 */
export function translatePackText(lang: Lang, text: string): string {
  if (lang === 'fr' || !text) return text;
  const w = PACK_WORDS[lang];
  let s = text;
  FR_MONTHS.forEach((m, i) => { s = s.split(m).join(w.months[i]); });
  s = s.replace(/^\+ de (\d+)/, '$1+');
  s = s.replace(/(\d+\+?) thèmes de jeux, default et système/, w.gameDefaultSystem);
  s = s.replace(/(\d+\+?) thèmes de jeux, system et défaut/, w.gameSystemDefault);
  s = s.replace(/(\d+\+?) thèmes de jeux$/, w.gameThemes);
  s = s.replace(/(\d+\+?) thèmes de jeux /, w.gameThemes + ' ');
  s = s.replace(/(\d+\+?) themes\b/, w.themes);
  return s;
}

// Messages d'erreur du robot Google (toujours écrits en français côté Code.gs).
// On reconnaît les messages connus et on les traduit ici, sans toucher au
// robot. Tout message inconnu est renvoyé tel quel.
export function translateRobotError(lang: Lang, msg: string): string {
  const exact: Record<string, string> = {
    'Le pseudo est manquant.': 'rb.noPseudo',
    'Aucun thème reçu.': 'rb.noTheme',
    'Un thème est envoyé sans nom.': 'rb.noName',
  };
  if (exact[msg]) return translate(lang, exact[msg]);
  let m = msg.match(/^Famille inconnue pour "(.*)" : (.*)$/);
  if (m) return translate(lang, 'rb.badFamily', { nom: m[1], val: m[2] });
  m = msg.match(/^Catégorie inconnue pour "(.*)" : (.*)$/);
  if (m) return translate(lang, 'rb.badCat', { nom: m[1], val: m[2] });
  m = msg.match(/^Fichier \.zip manquant pour "(.*)"\.$/);
  if (m) return translate(lang, 'rb.noZip', { nom: m[1] });
  m = msg.match(/^Image manquante pour "(.*)" \(elle est obligatoire\)\.$/);
  if (m) return translate(lang, 'rb.noImg', { nom: m[1] });
  return msg;
}
