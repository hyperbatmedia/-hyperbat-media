// Fichier: src/i18n/links.ts
//
// Version anglaise des liens (Tutoriels, Outils, Autres thèmes de Bob...).
// Les textes anglais sont dans src/data/linksEn.json, classés par id de lien
// puis par id d'élément. L'admin réécrit tout links.json : c'est pour ça que
// l'anglais est dans un fichier à part, que l'admin ne touche jamais.
//
// Un lien ou un élément sans traduction (ajouté plus tard) reste en français.
import linksEn from '../data/linksEn.json';
import type { Lang } from './core';
import type { Link, ModalItem } from '../hooks/useLinksLoader';

interface ItemEn { name?: string; description?: string }
interface LinkEn { name?: string; title?: string; description?: string; items?: Record<string, ItemEn> }

const EN = linksEn as Record<string, LinkEn>;

export function localizeItem(item: ModalItem, linkId: string, lang: Lang): ModalItem {
  if (lang === 'fr') return item;
  const t = EN[linkId]?.items?.[item.id];
  if (!t) return item;
  return { ...item, name: t.name ?? item.name, description: t.description ?? item.description };
}

export function localizeLinks(links: Link[], lang: Lang): Link[] {
  if (lang === 'fr') return links;
  return links.map((link) => {
    const t = EN[link.id];
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
