// Fichier: src/hooks/useGamepadGridNav.ts
// Navigation manette dans la grille de thèmes (mode kiosk RetroBat).
//
// Boutons utilisés :
//   - Croix directionnelle / stick gauche (axes 0 et 1 uniquement)
//   - SUD  (A Xbox / Croix PS)   : installer un thème
//   - EST  (B Xbox / Rond PS)    : retour / annuler
//   - NORD (Y Xbox / Triangle PS): ouvrir/fermer lightbox (toggle)
//   - L1                         : page précédente (manette uniquement)
//   - L2                         : page suivante   (manette uniquement)
//   - HOTKEY + gauche/droite     : page précédente/suivante (borne arcade)
//
// Paramètres URL passés par le launcher AHK :
//   &btnSud=0&btnEst=1&btnNord=3&btnHotkey=16&btnL1=4&btnL2=6
//   &controllerType=gamepad|arcade|both
// Si absents → valeurs W3C standard par défaut.
//
// Le stick droit (axes 2 et 3) est volontairement ignoré.
//
// IMPORTANT : R1 et R3 ne sont JAMAIS utilisés ici.
import { useEffect, useRef } from 'react';

const REPEAT_DELAY_MS   = 350;
const REPEAT_RATE_MS    = 130;
const STICK_DEADZONE    = 0.5;
const TRIGGER_THRESHOLD = 0.5;

// Index W3C Gamepad API standards
const BTN_SUD        = 0;   // A Xbox / Croix PS
const BTN_EST        = 1;   // B Xbox / Rond PS
const BTN_NORD       = 3;   // Y Xbox / Triangle PS
const BTN_L1         = 4;
const BTN_L2         = 6;
const BTN_HOTKEY     = 16;
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
  onPrevPage: () => void;       // L1 ou HOTKEY+← : page précédente
  onNextPage: () => void;       // L2 ou HOTKEY+→ : page suivante
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
  const heldPageBtn      = useRef<'L1' | 'L2' | null>(null);
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
    const isRetrobatMode = urlParams.get('retrobat') === '1';
    const controllerType = urlParams.get('controllerType') || 'gamepad';

    const idx = {
      Sud:    getUrlParam('btnSud',    BTN_SUD),
      Est:    getUrlParam('btnEst',    BTN_EST),
      Nord:   getUrlParam('btnNord',   BTN_NORD),
      Hotkey: getUrlParam('btnHotkey', BTN_HOTKEY),
      L1:     getUrlParam('btnL1',     BTN_L1),
      L2:     getUrlParam('btnL2',     BTN_L2),
    };

    // L1/L2 actifs pour manette, HOTKEY actif pour borne
    const l1Enabled     = !isRetrobatMode || controllerType === 'gamepad' || controllerType === 'both';
    const l2Enabled     = l1Enabled;
    const hotkeyEnabled = !isRetrobatMode || controllerType === 'arcade'  || controllerType === 'both';

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
        const hotkeyHeld = hotkeyEnabled && isButtonDown(gp, idx.Hotkey);
        const direction  = readDirection(gp);

        if (hotkeyHeld) {
          if (direction === 'left' || direction === 'right') {
            if (direction !== heldDirection.current) {
              heldDirection.current = direction;
              nextRepeatAt.current  = now + REPEAT_DELAY_MS;
              (direction === 'left' ? onPrevPageRef : onNextPageRef).current();
            } else if (now >= nextRepeatAt.current) {
              nextRepeatAt.current = now + REPEAT_RATE_MS;
              (direction === 'left' ? onPrevPageRef : onNextPageRef).current();
            }
          } else {
            heldDirection.current = null;
          }
        } else {
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
        }

        // ── Boutons ───────────────────────────────────────────────────────
        if (justPressed(idx.Sud))  onSelectRef.current();
        if (justPressed(idx.Est))  onBackRef.current();
        if (justPressed(idx.Nord)) onPreviewRef.current();

        // ── L1/L2 avec répétition (manette uniquement) ────────────────────
        const l1Down = l1Enabled && isButtonDown(gp, idx.L1);
        const l2Down = l2Enabled && isButtonDown(gp, idx.L2);
        if (l1Down) {
          if (heldPageBtn.current !== 'L1') {
            heldPageBtn.current      = 'L1';
            nextPageRepeatAt.current = now + REPEAT_DELAY_MS;
            onPrevPageRef.current();
          } else if (now >= nextPageRepeatAt.current) {
            nextPageRepeatAt.current = now + REPEAT_RATE_MS;
            onPrevPageRef.current();
          }
        } else if (l2Down) {
          if (heldPageBtn.current !== 'L2') {
            heldPageBtn.current      = 'L2';
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
