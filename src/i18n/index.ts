// Fichier: src/i18n/index.ts
// Point d'entrée : charge tous les textes et expose le fournisseur et le hook.

// Chaque zone du site a son fichier de textes (FR + EN + ES + PT).
import './dict/common';
import './dict/errors';
import './dict/submission';
import './dict/agent';
import './dict/site';
import './dict/nav';
import './dict/cart';
import './dict/panels';
import './dict/list';
import './dict/es';
import './dict/pt';

export type { Lang } from './core';
export { useLang } from './context';
export { LanguageProvider } from './LanguageProvider';
