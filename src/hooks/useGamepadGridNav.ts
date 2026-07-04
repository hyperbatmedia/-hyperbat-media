// Fichier: src/hooks/useGamepadGridNav.ts
// Navigation manette dans la grille de thèmes (mode kiosk RetroBat).
//
// Boutons utilisés :
//   - Croix directionnelle / stick gauche (axes 0 et 1 uniquement)
//   - SUD  (A Xbox / Croix PS)   : installer un thème
//   - EST  (B Xbox / Rond PS)    : retour / annuler
//   - NORD (Y Xbox / Triangle PS): ouvrir/fermer lightbox (toggle)
//   - L2/LT                      : page précédente (si configuré)
//   - R2/RT                      : page suivante   (si configuré)
//
// Sans L1/L2 configurés (ex: borne arcade), la pagination se fait en
// naviguant au D-PAD jusqu'aux boutons Précédent/Suivant, geré par le
// composant appelant (ThemeList) via onMove, pas par ce hook.
//
// Paramètres URL passés par le launcher AHK :
//   &btnSud=0&btnEst=1&btnNord=3&btnTriggerL=4&btnTriggerR=6
// Si absents → valeurs W3C standard par défaut. L1/L2 ne sont utilisés
// que si effectivement présents dans l'URL (sinon -1 côté launcher).
//
// Le stick droit (axes 2 et 3) est volontairement ignoré.
//
// IMPORTANT : R1 et R3 ne sont JAMAIS utilisés ici (gérés par l'AHK, hors
// de la page web, pour ouvrir/fermer la vitrine).
import { useEffect, useRef } from 'react';

const REPEAT_DELAY_MS   = 350;
const REPEAT_RATE_MS    = 130;
const STICK_DEADZONE    = 0.5;
const TRIGGER_THRESHOLD = 0.5;

// Index W3C Gamepad API standards
const BTN_SUD        = 0;   // A Xbox / Croix PS
const BTN_EST        = 1;   // B Xbox / Rond PS
const BTN_NORD       = 3;   // Y Xbox / Triangle PS
const BTN_TRIGGER_L  = 4;
const BTN_TRIGGER_R  = 6;
const BTN_DPAD_UP    = 12;
const BTN_DPAD_DOWN  = 13;
const BTN_DPAD_LEFT  = 14;
const BTN_DPAD_RIGHT = 15;

export type GamepadDirection = 'up' | 'down' | 'left' | 'right';

interface GamepadGridNavOptions {
  enabled: boolean;
  lightboxOpen: boolean;
  onMove: (direction: GamepadDirection) => void;
  onSelect: () => void;         // SUD  : installer un thème
  onBack: () => void;           // EST  : retour / annuler
  onPreview: () => void;        // NORD : ouvrir/fermer lightbox (toggle)
  onPrevPage: () => void;       // TriggerL (L2/LT) : page précédente
  onNextPage: () => void;       // TriggerR (R2/RT) : page suivante
  onLightboxClose: () => void;  // NORD ou EST quand lightbox ouverte
  onLightboxPrev: () => void;   // ← quand lightbox ouverte
  onLightboxNext: () => void;   // → quand lightbox ouverte
}

export function useGamepadGridNav({
  enabled, lightboxOpen,
  onMove, onSelect, onBack, onPreview, onPrevPage, onNextPage,
  onLightboxClose, onLightboxPrev, onLightboxNext
}: GamepadGridNavOptions) {

  const rafRef           = useRef<number | null>(null);
  const heldDirection    = useRef<GamepadDirection | null>(null);
  const nextRepeatAt     = useRef<number>(0);
  const heldPageBtn      = useRef<'TriggerL' | 'TriggerR' | null>(null);
  const nextPageRepeatAt = useRef<number>(0);
  const prevButtonsDown  = useRef<boolean[]>([]);

  const onMoveRef          = useRef(onMove);
  const onSelectRef        = useRef(onSelect);
  const onBackRef          = useRef(onBack);
  const onPreviewRef       = useRef(onPreview);
  const onPrevPageRef      = useRef(onPrevPage);
  const onNextPageRef      = useRef(onNextPage);
  const onLightboxCloseRef = useRef(onLightboxClose);
  const onLightboxPrevRef  = useRef(onLightboxPrev);
  const onLightboxNextRef  = useRef(onLightboxNext);
  const lightboxOpenRef    = useRef(lightboxOpen);

  onMoveRef.current          = onMove;
  onSelectRef.current        = onSelect;
  onBackRef.current          = onBack;
  onPreviewRef.current       = onPreview;
  onPrevPageRef.current      = onPrevPage;
  onNextPageRef.current      = onNextPage;
  onLightboxCloseRef.current = onLightboxClose;
  onLightboxPrevRef.current  = onLightboxPrev;
  onLightboxNextRef.current  = onLightboxNext;
  lightboxOpenRef.current    = lightboxOpen;

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

    const getUrlParam = (name: string, fallback: number): number => {
      if (typeof window === 'undefined') return fallback;
      const val = new URLSearchParams(window.location.search).get(name);
      if (val === null || val === '-1') return fallback;
      const n = parseInt(val, 10);
      return isNaN(n) ? fallback : n;
    };

    const urlParams      = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

    const idx = {
      Sud:  getUrlParam('btnSud',  BTN_SUD),
      Est:  getUrlParam('btnEst',  BTN_EST),
      Nord: getUrlParam('btnNord', BTN_NORD),
      TriggerL: getUrlParam('btnTriggerL', BTN_TRIGGER_L),
      TriggerR: getUrlParam('btnTriggerR', BTN_TRIGGER_R),
    };

    // L1/L2 actifs seulement si reellement configures (presents et != -1
    // dans l'URL) - pas de configuration = pas de raccourci, la pagination
    // se fait alors via le D-PAD jusqu'aux boutons Precedent/Suivant, gere
    // par le composant appelant (onMove), pas ici.
    const triggerLEnabled = urlParams.has('btnTriggerL') && urlParams.get('btnTriggerL') !== '-1';
    const triggerREnabled = urlParams.has('btnTriggerR') && urlParams.get('btnTriggerR') !== '-1';

    // Stick gauche uniquement (axes 0 et 1) — stick droit (axes 2 et 3) ignoré
    const readDirection = (gp: Gamepad): GamepadDirection | null => {
      const up    = gp.buttons[BTN_DPAD_UP]?.pressed;
      const down  = gp.buttons[BTN_DPAD_DOWN]?.pressed;
      const left  = gp.buttons[BTN_DPAD_LEFT]?.pressed;
      const right = gp.buttons[BTN_DPAD_RIGHT]?.pressed;
      const axisX = gp.axes[0] || 0;
      const axisY = gp.axes[1] || 0;

      if (up    || axisY < -STICK_DEADZONE) return 'up';
      if (down  || axisY >  STICK_DEADZONE) return 'down';
      if (left  || axisX < -STICK_DEADZONE) return 'left';
      if (right || axisX >  STICK_DEADZONE) return 'right';
      return null;
    };

    const isButtonDown = (gp: Gamepad, index: number): boolean => {
      if (index < 0) return false;
      const btn = gp.buttons[index];
      if (!btn) return false;
      return btn.pressed || btn.value > TRIGGER_THRESHOLD;
    };

    const loop = () => {
      const pads = navigator.getGamepads();
      const gp   = pads && pads[0];

      if (gp) {
        const now      = performance.now();
        const prevDown = prevButtonsDown.current;
        const justPressed = (index: number) =>
          index >= 0 && isButtonDown(gp, index) && !prevDown[index];

        // ── MODE LIGHTBOX ─────────────────────────────────────────────────
        if (lightboxOpenRef.current) {
          if (justPressed(idx.Nord) || justPressed(idx.Est))
            onLightboxCloseRef.current();

          const direction = readDirection(gp);
          if (direction === 'left' || direction === 'right') {
            if (direction !== heldDirection.current) {
              heldDirection.current = direction;
              nextRepeatAt.current  = now + REPEAT_DELAY_MS;
              (direction === 'left' ? onLightboxPrevRef : onLightboxNextRef).current();
            } else if (now >= nextRepeatAt.current) {
              nextRepeatAt.current = now + REPEAT_RATE_MS;
              (direction === 'left' ? onLightboxPrevRef : onLightboxNextRef).current();
            }
          } else {
            heldDirection.current = null;
          }

          const newPrevDown: boolean[] = [];
          gp.buttons.forEach((_, i) => { newPrevDown[i] = isButtonDown(gp, i); });
          prevButtonsDown.current = newPrevDown;
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        // ── MODE GRILLE NORMAL ────────────────────────────────────────────
        const direction = readDirection(gp);

        if (direction) {
          if (direction !== heldDirection.current) {
            heldDirection.current = direction;
            nextRepeatAt.current  = now + REPEAT_DELAY_MS;
            onMoveRef.current(direction);
          } else if (now >= nextRepeatAt.current) {
            nextRepeatAt.current = now + REPEAT_RATE_MS;
            onMoveRef.current(direction);
          }
        } else {
          heldDirection.current = null;
        }

        // ── Boutons ───────────────────────────────────────────────────────
        if (justPressed(idx.Sud))  onSelectRef.current();
        if (justPressed(idx.Est))  onBackRef.current();
        if (justPressed(idx.Nord)) onPreviewRef.current();

        // ── TriggerL/TriggerR avec répétition (raccourci optionnel) ────────
        const triggerLDown = triggerLEnabled && isButtonDown(gp, idx.TriggerL);
        const triggerRDown = triggerREnabled && isButtonDown(gp, idx.TriggerR);
        if (triggerLDown) {
          if (heldPageBtn.current !== 'TriggerL') {
            heldPageBtn.current      = 'TriggerL';
            nextPageRepeatAt.current = now + REPEAT_DELAY_MS;
            onPrevPageRef.current();
          } else if (now >= nextPageRepeatAt.current) {
            nextPageRepeatAt.current = now + REPEAT_RATE_MS;
            onPrevPageRef.current();
          }
        } else if (triggerRDown) {
          if (heldPageBtn.current !== 'TriggerR') {
            heldPageBtn.current      = 'TriggerR';
            nextPageRepeatAt.current = now + REPEAT_DELAY_MS;
            onNextPageRef.current();
          } else if (now >= nextPageRepeatAt.current) {
            nextPageRepeatAt.current = now + REPEAT_RATE_MS;
            onNextPageRef.current();
          }
        } else {
          heldPageBtn.current = null;
        }

        const newPrevDown: boolean[] = [];
        gp.buttons.forEach((_, i) => { newPrevDown[i] = isButtonDown(gp, i); });
        prevButtonsDown.current = newPrevDown;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      heldDirection.current   = null;
      heldPageBtn.current     = null;
      prevButtonsDown.current = [];
    };
  }, [enabled]);
}
