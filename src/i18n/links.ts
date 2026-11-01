// Fichier: src/i18n/links.ts
//
// Versions anglaise, espagnole et portugaise des liens (Tutoriels, Outils, Autres thèmes de Bob...).
// Les textes sont dans src/data/linksEn.json, linksEs.json et linksPt.json, classés par id de lien
// puis par id d'élément. L'admin réécrit tout links.json : c'est pour ça que
// l'anglais est dans un fichier à part, que l'admin ne touche jamais.
//
// Un lien ou un élément sans traduction (ajouté plus tard) reste en français.
import linksEn from '../data/linksEn.json';
import linksEs from '../data/linksEs.json';
import linksPt from '../data/linksPt.json';
import type { Lang } from './core';
import type { Link, ModalItem } from '../hooks/useLinksLoader';

interface ItemEn { name?: string; description?: string }
interface LinkEn { name?: string; title?: string; description?: string; items?: Record<string, ItemEn> }

const BY_LANG: Record<string, Record<string, LinkEn>> = {
  en: linksEn as Record<string, LinkEn>,
  es: linksEs as Record<string, LinkEn>,
  pt: linksPt as Record<string, LinkEn>,
};

export function localizeItem(item: ModalItem, linkId: string, lang: Lang): ModalItem {
  if (lang === 'fr') return item;
  const t = BY_LANG[lang]?.[linkId]?.items?.[item.id];
  if (!t) return item;
  return { ...item, name: t.name ?? item.name, description: t.description ?? item.description };
}

export function localizeLinks(links: Link[], lang: Lang): Link[] {
  if (lang === 'fr') return links;
  return links.map((link) => {
    const t = BY_LANG[lang]?.[link.id];
    if (!t) return link;
    return {
      ...link,
      name: t.name ?? link.name,
      description: t.description ?? link.description,
      modal: link.modal
        ? {
            ...link.modal,
            title: t.title ?? link.modal.title,
            items: link.modal.items.map((it) => localizeItem(it, link.id, lang)),
          }
        : link.modal,
    };
  });
}
