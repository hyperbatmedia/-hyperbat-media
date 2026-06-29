// Fichier: src/hooks/useGamepadGridNav.ts
// Navigation manette dans la grille de thèmes (mode kiosk RetroBat).
//
// Boutons utilisés :
//   - Croix directionnelle / stick gauche : déplacement dans la grille
//   - A (Croix PS)                        : action principale (installer/télécharger)
//   - B (Rond PS)                         : retour / annuler
//   - X (Carré PS)                        : aperçu (lightbox)
//   - Y (Triangle PS)                     : ajouter/retirer du panier
//   - Start (Options PS | Menu Xbox)      : ouvrir le panier (modale)
//   - L1 (LB Xbox)                        : page précédente (alias de HOTKEY+gauche)
//   - L2 (LT Xbox)                        : page suivante   (alias de HOTKEY+droite)
//   - HOTKEY (configurable)               : maintenu + gauche = page précédente
//                                           maintenu + droite = page suivante
//                                           PS = bouton PS | Xbox = Guide | Borne = Select/Coin
//
// Tous les index de boutons sont configurables via les paramètres URL
// passés par le launcher AHK (hyperbatmedia-theme-launcher) :
//   &btnA=0&btnB=1&btnX=2&btnY=3&btnStart=9&btnHotkey=16&btnL1=4&btnL2=6
// Si absents (site public sans RetroBat) → valeurs W3C standard par défaut.
//
// IMPORTANT : R1 et R3 ne sont JAMAIS utilisés ici. Ce sont les deux boutons
// recommandés par le launcher AHK pour ouvrir/fermer la vitrine
// (hyperbatmedia-settings.ini → JoystickButton). On garde tout le côté droit
// de la manette libre pour éviter tout conflit avec le launcher.
import { useEffect, useRef } from 'react';

const REPEAT_DELAY_MS = 350;    // délai avant que le déplacement maintenu se répète
const REPEAT_RATE_MS = 130;     // vitesse de répétition une fois lancée
const STICK_DEADZONE = 0.5;
const TRIGGER_THRESHOLD = 0.5;  // seuil pour considérer L2 (analogique) comme "appuyé"

// Index standards W3C Gamepad API ("standard" mapping)
const BTN_A = 0;
const BTN_B = 1;   // Rond PS / B Xbox       : retour / annuler
const BTN_X = 2;
const BTN_Y = 3;
const BTN_L1 = 4;  // L1 PS / LB Xbox        : page précédente (alias HOTKEY+gauche)
const BTN_L2 = 6;  // L2 PS / LT Xbox        : page suivante   (alias HOTKEY+droite)
const BTN_START = 9;   // Options PS / Menu Xbox : ouvrir le panier (modale)
const BTN_HOTKEY = 16; // PS/Home PS / Guide Xbox (boule lumineuse) : hotkey pagination
const BTN_DPAD_UP = 12;
const BTN_DPAD_DOWN = 13;
const BTN_DPAD_LEFT = 14;
const BTN_DPAD_RIGHT = 15;

export type GamepadDirection = 'up' | 'down' | 'left' | 'right';

interface GamepadGridNavOptions {
  enabled: boolean;
  lightboxOpen: boolean;           // true quand la Lightbox est ouverte
  onMove: (direction: GamepadDirection) => void;
  onSelect: () => void;            // A (Croix PS)         : action principale (installer/telecharger)
  onBack: () => void;              // B (Rond PS)           : retour / annuler
  onPreview: () => void;           // X (Carré PS)          : ouvrir/fermer lightbox (toggle)
  onToggleCart: () => void;        // Y (Triangle PS)       : ajouter/retirer du panier
  onOpenCart: () => void;          // Start (Options PS)    : ouvrir le panier (modale)
  onPrevPage: () => void;          // HOTKEY + gauche       : page précédente
  onNextPage: () => void;          // HOTKEY + droite       : page suivante
  onLightboxClose: () => void;     // X ou B quand lightbox ouverte : fermer
  onLightboxPrev: () => void;      // ← quand lightbox ouverte : thème précédent
  onLightboxNext: () => void;      // → quand lightbox ouverte : thème suivant
}

export function useGamepadGridNav({
  enabled, lightboxOpen,
  onMove, onSelect, onBack, onPreview, onToggleCart, onOpenCart, onPrevPage, onNextPage,
  onLightboxClose, onLightboxPrev, onLightboxNext
}: GamepadGridNavOptions) {

  const rafRef = useRef<number | null>(null);
  const heldDirection = useRef<GamepadDirection | null>(null);
  const nextRepeatAt = useRef<number>(0);
  const heldPageBtn = useRef<'L1' | 'L2' | null>(null);  // répétition L1/L2
  const nextPageRepeatAt = useRef<number>(0);
  const prevButtonsDown = useRef<boolean[]>([]);

  // Toujours utiliser les dernières versions des callbacks sans relancer la boucle
  const onMoveRef = useRef(onMove);
  const onSelectRef = useRef(onSelect);
  const onBackRef = useRef(onBack);
  const onPreviewRef = useRef(onPreview);
  const onToggleCartRef = useRef(onToggleCart);
  const onOpenCartRef = useRef(onOpenCart);
  const onPrevPageRef = useRef(onPrevPage);
  const onNextPageRef = useRef(onNextPage);
  const onLightboxCloseRef = useRef(onLightboxClose);
  const onLightboxPrevRef  = useRef(onLightboxPrev);
  const onLightboxNextRef  = useRef(onLightboxNext);
  const lightboxOpenRef    = useRef(lightboxOpen);
  onMoveRef.current         = onMove;
  onSelectRef.current       = onSelect;
  onBackRef.current         = onBack;
  onPreviewRef.current      = onPreview;
  onToggleCartRef.current   = onToggleCart;
  onOpenCartRef.current     = onOpenCart;
  onPrevPageRef.current     = onPrevPage;
  onNextPageRef.current     = onNextPage;
  onLightboxCloseRef.current = onLightboxClose;
  onLightboxPrevRef.current  = onLightboxPrev;
  onLightboxNextRef.current  = onLightboxNext;
  lightboxOpenRef.current    = lightboxOpen;

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

    // ── Lecture du mapping depuis les paramètres URL ──────────────────────
    // Déplacé ici pour éviter l'avertissement ESLint react-hooks/exhaustive-deps :
    // ces valeurs sont stables (params URL immuables pendant la vie du composant)
    // et n'ont aucune raison d'être dans le tableau de dépendances.
    const getUrlParam = (name: string, fallback: number): number => {
      if (typeof window === 'undefined') return fallback;
      const val = new URLSearchParams(window.location.search).get(name);
      if (val === null || val === '-1') return fallback;
      const n = parseInt(val, 10);
      return isNaN(n) ? fallback : n;
    };

    // Index résolus : URL en priorité, sinon constante W3C standard
    const idx = {
      A:      getUrlParam('btnA',      BTN_A),
      B:      getUrlParam('btnB',      BTN_B),
      X:      getUrlParam('btnX',      BTN_X),
      Y:      getUrlParam('btnY',      BTN_Y),
      Start:  getUrlParam('btnStart',  BTN_START),
      Hotkey: getUrlParam('btnHotkey', BTN_HOTKEY), // configurable : PS / Guide Xbox / Select borne
      L1:     getUrlParam('btnL1',     BTN_L1),
      L2:     getUrlParam('btnL2',     BTN_L2),
    };

    // L1/L2 désactivés si non configurés dans l'URL (borne arcade sans L1/L2)
    // Si pas de paramètre URL du tout (mode standard W3C), L1/L2 sont activés
    const urlParams = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
    const isRetrobatMode = urlParams.get('retrobat') === '1';
    const l1Enabled = !isRetrobatMode || getUrlParam('btnL1', -1) !== -1;
    const l2Enabled = !isRetrobatMode || getUrlParam('btnL2', -1) !== -1;

    const readDirection = (gp: Gamepad): GamepadDirection | null => {
      const up = gp.buttons[BTN_DPAD_UP]?.pressed;
      const down = gp.buttons[BTN_DPAD_DOWN]?.pressed;
      const left = gp.buttons[BTN_DPAD_LEFT]?.pressed;
      const right = gp.buttons[BTN_DPAD_RIGHT]?.pressed;
      const axisX = gp.axes[0] || 0;
      const axisY = gp.axes[1] || 0;

      if (up || axisY < -STICK_DEADZONE) return 'up';
      if (down || axisY > STICK_DEADZONE) return 'down';
      if (left || axisX < -STICK_DEADZONE) return 'left';
      if (right || axisX > STICK_DEADZONE) return 'right';
      return null;
    };

    const isButtonDown = (gp: Gamepad, index: number): boolean => {
      const btn = gp.buttons[index];
      if (!btn) return false;
      return btn.pressed || btn.value > TRIGGER_THRESHOLD;
    };

    const loop = () => {
      const pads = navigator.getGamepads();
      const gp = pads && pads[0];

      if (gp) {
        const now = performance.now();
        const prevDown = prevButtonsDown.current;
        const justPressed = (index: number) => index >= 0 && isButtonDown(gp, index) && !prevDown[index];

        // ══════════════════════════════════════════════════════════════════
        // ── MODE LIGHTBOX : quand la lightbox est ouverte ────────────────
        // X ou B → fermer | ←/→ → naviguer entre thèmes | tout le reste bloqué
        // ══════════════════════════════════════════════════════════════════
        if (lightboxOpenRef.current) {
          if (justPressed(idx.X) || justPressed(idx.B)) onLightboxCloseRef.current();

          const direction = readDirection(gp);
          if (direction === 'left' || direction === 'right') {
            if (direction !== heldDirection.current) {
              heldDirection.current = direction;
              nextRepeatAt.current = now + REPEAT_DELAY_MS;
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
          return; // ← on sort ici, rien d'autre ne s'exécute en mode lightbox
        }

        // ══════════════════════════════════════════════════════════════════
        // ── MODE GRILLE NORMAL ───────────────────────────────════════════
        // ══════════════════════════════════════════════════════════════════
        const hotkeyHeld = isButtonDown(gp, idx.Hotkey); // PS / Guide Xbox / Select borne
        const direction = readDirection(gp);

        if (hotkeyHeld) {
          // ── HOTKEY maintenu + gauche/droite : changement de page (avec répétition) ──
          // (haut/bas ignorés dans ce mode, pas de "page haut/bas")
          if (direction === 'left' || direction === 'right') {
            if (direction !== heldDirection.current) {
              heldDirection.current = direction;
              nextRepeatAt.current = now + REPEAT_DELAY_MS;
              (direction === 'left' ? onPrevPageRef : onNextPageRef).current();
            } else if (now >= nextRepeatAt.current) {
              nextRepeatAt.current = now + REPEAT_RATE_MS;
              (direction === 'left' ? onPrevPageRef : onNextPageRef).current();
            }
          } else {
            heldDirection.current = null;
          }
        } else {
          // ── Déplacement normal (croix / stick gauche), avec répétition si maintenu ──
          if (direction) {
            if (direction !== heldDirection.current) {
              heldDirection.current = direction;
              nextRepeatAt.current = now + REPEAT_DELAY_MS;
              onMoveRef.current(direction);
            } else if (now >= nextRepeatAt.current) {
              nextRepeatAt.current = now + REPEAT_RATE_MS;
              onMoveRef.current(direction);
            }
          } else {
            heldDirection.current = null;
          }
        }

        // ── Boutons à détection de front montant (un seul déclenchement par appui) ──
        if (justPressed(idx.A))     onSelectRef.current();
        if (justPressed(idx.B))     onBackRef.current();
        if (justPressed(idx.X))     onPreviewRef.current();
        if (justPressed(idx.Y))     onToggleCartRef.current();
        if (justPressed(idx.Start)) onOpenCartRef.current();

        // ── L1 / L2 : changement de page avec répétition si maintenu ──
        // Désactivés si non configurés (borne arcade sans L1/L2)
        const l1Down = l1Enabled && isButtonDown(gp, idx.L1);
        const l2Down = l2Enabled && isButtonDown(gp, idx.L2);
        if (l1Down) {
          if (heldPageBtn.current !== 'L1') {
            heldPageBtn.current = 'L1';
            nextPageRepeatAt.current = now + REPEAT_DELAY_MS;
            onPrevPageRef.current();
          } else if (now >= nextPageRepeatAt.current) {
            nextPageRepeatAt.current = now + REPEAT_RATE_MS;
            onPrevPageRef.current();
          }
        } else if (l2Down) {
          if (heldPageBtn.current !== 'L2') {
            heldPageBtn.current = 'L2';
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
      heldDirection.current = null;
      heldPageBtn.current = null;
      prevButtonsDown.current = [];
    };
  }, [enabled]);
}
