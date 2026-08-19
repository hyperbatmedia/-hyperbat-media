// Navigation manette mode kiosque (?retrobat=1) — zones exclues / autorisées.

/** Pastilles filtre : hors parcours manette. */
export const KIOSK_EXCLUDED_PILL_IDS = new Set([
  'artwork',
  'screenscraper',
  'export-json',
]);

/** Ordre D-Pad des pastilles navigables (DOM / flex-wrap). */
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

/** Entrée sidebar sélectionnable (système réel), pas modale / lien externe. */
export function isKioskNavigableSidebarSystem(
  system: { id: string; isHeader?: boolean; isSubHeader?: boolean },
  link: { modal?: unknown; url?: string } | undefined,
): boolean {
  if (system.isHeader || system.isSubHeader) return false;
  if (link?.modal) return false;
  if (link?.url) return false;
  return true;
}

export type KioskVisualFocus = {
  pillFocusIndex: number | null;
  toolbarFocus: 'sort' | 'dark' | null;
  sidebarSystemFocusIndex: number | null;
  chromeFocus: 'main' | 'sidebar' | null;
  paginationFocus: 'prev' | 'next' | null;
  gridFocused: boolean;
};
