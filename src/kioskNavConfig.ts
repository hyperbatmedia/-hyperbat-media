// Navigation manette mode kiosque (?retrobat=1) — zones exclues / autorisées.
// La sidebar (systèmes) n'est PAS navigable à la manette.

/** Pastilles filtre : hors parcours manette. */
export const KIOSK_EXCLUDED_PILL_IDS = new Set([
  'artwork',
  'screenscraper',
  'export-json',
]);

/** Pastilles navigables (référence ; le D-Pad suit la position à l'écran). */
export const KIOSK_NAVIGABLE_PILL_IDS: readonly string[] = [
  'multi',
  'magazines',
  'collection',
  'system-themes',
  'default-themes',
  'game-themes',
  'all',
];

export function isKioskNavigablePill(id: string): boolean {
  return !KIOSK_EXCLUDED_PILL_IDS.has(id);
}

export type KioskVisualFocus = {
  /** ID pastille focusée (navigation spatiale). */
  pillFocusId: string | null;
  toolbarFocus: 'sort' | 'dark' | null;
  /** Recherche thèmes uniquement (pas la sidebar). */
  chromeFocus: 'main' | null;
  paginationFocus: 'prev' | 'next' | null;
  gridFocused: boolean;
};

type KioskDirection = 'up' | 'down' | 'left' | 'right';

function pillCenter(el: HTMLElement): { x: number; y: number; id: string } {
  const r = el.getBoundingClientRect();
  return {
    id: el.dataset.kioskPill!,
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
  };
}

function listNavigablePills(): Array<{ x: number; y: number; id: string }> {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-kiosk-pill]'))
    .map(pillCenter);
}

/** Contour orange / halo — même langage visuel que la grille de thèmes. */
export function kioskFocusStyle(active: boolean): Record<string, string | number> {
  if (!active) return {};
  return {
    outline: '3px solid #FF8C00',
    outlineOffset: '2px',
    boxShadow: '0 0 22px rgba(255,140,0,0.85), 0 0 40px rgba(255,215,0,0.35)',
    borderColor: '#FFD700',
    borderWidth: '3px',
  };
}

/** Pastille voisine dans la direction du D-Pad (position réelle à l'écran). */
export function findKioskPillNeighbor(
  currentId: string | null,
  direction: KioskDirection,
): string | null {
  const items = listNavigablePills();
  if (items.length === 0) return null;

  const current = currentId ? items.find((i) => i.id === currentId) : null;
  if (!current) return items[0]?.id ?? null;

  const OBLIQUE = 2.2;
  const MIN = 10;

  const candidates = items.filter((item) => {
    if (item.id === current.id) return false;
    const dx = item.x - current.x;
    const dy = item.y - current.y;
    switch (direction) {
      case 'left':
        return dx < -MIN && Math.abs(dy) <= Math.abs(dx) * OBLIQUE;
      case 'right':
        return dx > MIN && Math.abs(dy) <= Math.abs(dx) * OBLIQUE;
      case 'up':
        return dy < -MIN && Math.abs(dx) <= Math.abs(dy) * OBLIQUE;
      case 'down':
        return dy > MIN && Math.abs(dx) <= Math.abs(dy) * OBLIQUE;
    }
  });

  if (candidates.length === 0) return null;

  return candidates.reduce((best, item) => {
    const dist = (item.x - current.x) ** 2 + (item.y - current.y) ** 2;
    const bestDist = (best.x - current.x) ** 2 + (best.y - current.y) ** 2;
    return dist < bestDist ? item : best;
  }).id;
}

/** Pastille la plus proche depuis un élément (ex. champ recherche → haut). */
export function findNearestKioskPillFromElement(
  el: HTMLElement,
  direction: KioskDirection,
): string | null {
  const items = listNavigablePills();
  if (items.length === 0) return null;

  const r = el.getBoundingClientRect();
  const origin = {
    x: r.left + r.width / 2,
    y: direction === 'up' ? r.top : direction === 'down' ? r.bottom : r.top + r.height / 2,
  };

  const OBLIQUE = 2.2;
  const MIN = 8;

  const candidates = items.filter((item) => {
    const dx = item.x - origin.x;
    const dy = item.y - origin.y;
    switch (direction) {
      case 'left':
        return dx < -MIN && Math.abs(dy) <= Math.abs(dx) * OBLIQUE;
      case 'right':
        return dx > MIN && Math.abs(dy) <= Math.abs(dx) * OBLIQUE;
      case 'up':
        return dy < -MIN && Math.abs(dx) <= Math.abs(dy) * OBLIQUE;
      case 'down':
        return dy > MIN && Math.abs(dx) <= Math.abs(dy) * OBLIQUE;
    }
  });

  if (candidates.length === 0) return null;

  return candidates.reduce((best, item) => {
    const dist = (item.x - origin.x) ** 2 + (item.y - origin.y) ** 2;
    const bestDist = (best.x - origin.x) ** 2 + (best.y - origin.y) ** 2;
    return dist < bestDist ? item : best;
  }).id;
}
