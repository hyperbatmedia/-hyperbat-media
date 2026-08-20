// Fichier: src/components/ThemeList/ThemeList.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, Plus } from 'lucide-react';
import { ThemeItem, SystemRow } from '../../types';
import { getThemeKey } from '../../utils/themeUtils';
import Lightbox from '../Lightbox/Lightbox';
import ScreenScraperBadge from '../ScreenScraperBadge';
import { useGamepadGridNav } from '../../hooks/useGamepadGridNav';
import AgentInstallFlow from '../../agent/AgentInstallFlow';
import type { AgentInfo } from '../../agent/hyperbatAgent';
import GamepadVirtualKeyboard from './GamepadVirtualKeyboard';
import type { KioskVisualFocus } from '../../kioskNavConfig';
import {
  findKioskPillNeighbor,
  findNearestKioskPillFromElement,
} from '../../kioskNavConfig';

import { CART_MAX } from '../../constants';

interface ThemeListProps {
  viewMode: 'grid' | 'list';
  themes: ThemeItem[];
  allFilteredThemes: ThemeItem[];
  filteredThemesLength: number;
  totalPages: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  themesPerPage: number;
  systems: SystemRow[];
  cart: ThemeItem[];
  onCartAdd: (theme: ThemeItem) => void;
  onCartRemove: (key: string) => void;
  sidebarCollapsed?: boolean;
  isRetrobat?: boolean;
  /** Agent local HyperBat Media détecté (voir src/agent/hyperbatAgent.ts).
   *  null = pas d'agent : l'installation passe par hyperbat:// comme avant. */
  agentInfo?: AgentInfo | null;
  /** Recherche thèmes (au-dessus de la grille). */
  searchInputRef?: React.RefObject<HTMLInputElement | null> | React.MutableRefObject<HTMLInputElement | null>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchHasValue?: boolean;
  onSearchClear?: () => void;
  onSearchGamepadFocusChange?: (focused: boolean) => void;
  /** Kiosque : pastilles + tri / mode clair-sombre (voir kioskNavConfig.ts). */
  onKioskPillActivate?: (pillId: string) => void;
  onKioskToolbarSort?: () => void;
  onKioskToolbarDark?: () => void;
  onKioskVisualFocusChange?: (focus: KioskVisualFocus) => void;
  kioskSortButtonRef?: React.RefObject<HTMLButtonElement | null>;
  kioskDarkButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const ThemeList: React.FC<ThemeListProps> = ({
  viewMode, themes, allFilteredThemes, filteredThemesLength,
  totalPages, currentPage, setCurrentPage, themesPerPage,
  systems,
  cart, onCartAdd, onCartRemove, sidebarCollapsed = false,
  isRetrobat = false,
  agentInfo = null,
  searchInputRef,
  searchValue = '',
  onSearchChange,
  searchHasValue = false,
  onSearchClear,
  onSearchGamepadFocusChange,
  onKioskPillActivate,
  onKioskToolbarSort,
  onKioskToolbarDark,
  onKioskVisualFocusChange,
  kioskSortButtonRef,
  kioskDarkButtonRef,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeItem | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [revealedMature, setRevealedMature] = useState<Set<string>>(new Set());
  const [cartFullMsg, setCartFullMsg] = useState(false);
  // Thème dont l'installation via l'agent local est en cours (fenêtre
  // AgentInstallFlow ouverte). null = fenêtre fermée.
  const [agentInstallTheme, setAgentInstallTheme] = useState<ThemeItem | null>(null);
  // Clavier virtuel manette (une instance) — ouvert depuis une barre de recherche.
  const [oskOpen, setOskOpen] = useState(false);
  const [oskInitial, setOskInitial] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Capture unique des parametres manette/kiosque au tout premier rendu,
  // avant qu'un eventuel window.history.replaceState() ailleurs (ex:
  // nettoyage de l'URL dans HyperBatMediaSite.tsx) ne les fasse disparaitre
  // de window.location.search. Sans ca, le bandeau relirait l'URL en
  // direct a chaque rendu et perdrait ses etats "actifs" des que l'URL
  // est modifiee par autre chose, meme correctement configuree au depart.
  const gamepadConfig = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const btnTriggerLOk = p.has('btnTriggerL') && p.get('btnTriggerL') !== '-1';
    const btnTriggerROk = p.has('btnTriggerR') && p.get('btnTriggerR') !== '-1';
    return {
      // Le badge L2/R2 (LT/RT) n'apparait que si les deux triggers sont
      // reellement configures - sinon (borne arcade, ou manette sans ces
      // boutons) on navigue vers Precedent/Suivant via le D-PAD, toujours
      // disponible, sans configuration necessaire.
      hasTriggers: btnTriggerLOk && btnTriggerROk,
      btnSudOk:  p.has('btnSud')  && p.get('btnSud')  !== '-1',
      btnEstOk:  p.has('btnEst')  && p.get('btnEst')  !== '-1',
      btnNordOk: p.has('btnNord') && p.get('btnNord') !== '-1',
      btnTriggerLOk,
      btnTriggerROk,
    };
  }, []);

  // ── Navigation manette (mode kiosk RetroBat uniquement) ──────────────────
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [columns, setColumns] = useState(2);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const actionRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Zone de focus pagination : null = focus dans la grille, sinon 'prev'/'next'.
  // Permet d'atteindre les boutons "Precedent"/"Suivant" avec le D-PAD,
  // depuis la derniere ligne de la grille - utile pour la borne arcade
  // (qui n'a pas de bouton dedie L2/R2) et utilisable aussi par une manette.
  const [paginationFocus, setPaginationFocus] = useState<'prev' | 'next' | null>(null);
  // Focus manette hors grille : recherche thèmes uniquement (pas la sidebar).
  type ChromeFocus = 'main' | null;
  const [chromeFocus, setChromeFocus] = useState<ChromeFocus>(null);
  const [pillFocusId, setPillFocusId] = useState<string | null>(null);
  const [toolbarFocus, setToolbarFocus] = useState<'sort' | 'dark' | null>(null);
  const prevPageBtnRef = useRef<HTMLButtonElement | null>(null);
  const nextPageBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    onSearchGamepadFocusChange?.(chromeFocus === 'main');
  }, [chromeFocus, onSearchGamepadFocusChange]);

  // Clic souris ailleurs : ne pas rester accroché sur la recherche thèmes.
  useEffect(() => {
    if (!isRetrobat) return;
    const main = searchInputRef?.current;
    const onMainBlur = () => {
      window.setTimeout(() => {
        if (document.activeElement !== main) {
          setChromeFocus((c) => (c === 'main' ? null : c));
        }
      }, 0);
    };
    main?.addEventListener('blur', onMainBlur);
    return () => {
      main?.removeEventListener('blur', onMainBlur);
    };
  }, [isRetrobat, searchInputRef]);

  const clearKioskExtraFocus = useCallback(() => {
    setPillFocusId(null);
    setToolbarFocus(null);
  }, []);

  useEffect(() => {
    if (!isRetrobat || !onKioskVisualFocusChange) return;
    onKioskVisualFocusChange({
      pillFocusId,
      toolbarFocus,
      chromeFocus,
      paginationFocus,
      gridFocused: !chromeFocus && pillFocusId === null && toolbarFocus === null
        && !paginationFocus,
    });
  }, [
    isRetrobat, onKioskVisualFocusChange, pillFocusId, toolbarFocus,
    chromeFocus, paginationFocus,
  ]);

  // Recalcule le nombre de colonnes réellement affichées (miroir des classes Tailwind ci-dessous)
  useEffect(() => {
    const computeColumns = () => {
      if (viewMode !== 'grid') { setColumns(1); return; }
      const w = window.innerWidth;
      if (sidebarCollapsed) {
        setColumns(w >= 768 ? 5 : 2);
      } else {
        setColumns(w >= 1024 ? 4 : w >= 768 ? 3 : 2);
      }
    };
    computeColumns();
    window.addEventListener('resize', computeColumns);
    return () => window.removeEventListener('resize', computeColumns);
  }, [viewMode, sidebarCollapsed]);

  // Revient en haut de la grille à chaque changement de page/filtre.
  // Ne touche pas chromeFocus : sinon chaque frappe dans la recherche
  // renverrait le focus manette sur Installer.
  useEffect(() => { setFocusedIndex(0); setPaginationFocus(null); }, [themes]);

  // Garde la carte (ou pagination / recherche / kiosque) sélectionné visible
  useEffect(() => {
    if (!isRetrobat) return;
    if (pillFocusId !== null) {
      document.querySelector(`[data-kiosk-pill="${pillFocusId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (toolbarFocus === 'sort') {
      kioskSortButtonRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (toolbarFocus === 'dark') {
      kioskDarkButtonRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (chromeFocus === 'main') {
      searchInputRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (paginationFocus === 'prev') { prevPageBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    if (paginationFocus === 'next') { nextPageBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    cardRefs.current[focusedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [
    focusedIndex, isRetrobat, paginationFocus, chromeFocus, searchInputRef,
    pillFocusId, toolbarFocus,
    kioskSortButtonRef, kioskDarkButtonRef,
  ]);

  // Focus DOM : évite qu'un bouton exclu reçoive Entrée AHK par accident.
  useEffect(() => {
    if (!isRetrobat) return;
    if (pillFocusId !== null) {
      (document.querySelector(`[data-kiosk-pill="${pillFocusId}"]`) as HTMLElement | null)
        ?.focus({ preventScroll: true });
      return;
    }
    if (toolbarFocus === 'sort') {
      kioskSortButtonRef?.current?.focus({ preventScroll: true });
      return;
    }
    if (toolbarFocus === 'dark') {
      kioskDarkButtonRef?.current?.focus({ preventScroll: true });
      return;
    }
    if (chromeFocus === 'main') {
      searchInputRef?.current?.focus({ preventScroll: true });
      return;
    }
    if (paginationFocus === 'prev') { prevPageBtnRef.current?.focus({ preventScroll: true }); return; }
    if (paginationFocus === 'next') { nextPageBtnRef.current?.focus({ preventScroll: true }); return; }
    actionRefs.current[focusedIndex]?.focus({ preventScroll: true });
  }, [
    focusedIndex, isRetrobat, paginationFocus, chromeFocus, searchInputRef,
    pillFocusId, toolbarFocus,
    kioskSortButtonRef, kioskDarkButtonRef,
  ]);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const mainInput = searchInputRef?.current ?? null;

    // ── Pastilles filtre (kiosque) — voisinage spatial à l'écran ──
    if (isRetrobat && pillFocusId !== null) {
      const next = findKioskPillNeighbor(pillFocusId, direction);
      if (next) {
        setPillFocusId(next);
      } else if (direction === 'down') {
        // Sous les filtres : recherche thèmes (colonne principale).
        setPillFocusId(null);
        if (mainInput) setChromeFocus('main');
      }
      return;
    }

    // ── Tri / mode clair-sombre (colonne gauche) ──
    if (isRetrobat && toolbarFocus) {
      if (direction === 'left' || direction === 'right') {
        setToolbarFocus((t) => (t === 'sort' ? 'dark' : 'sort'));
      } else if (direction === 'down') {
        setToolbarFocus(null);
        if (mainInput) setChromeFocus('main');
      } else if (direction === 'up') {
        setToolbarFocus(null);
        const refEl = toolbarFocus === 'sort'
          ? kioskSortButtonRef?.current
          : kioskDarkButtonRef?.current;
        const pillId = refEl ? findNearestKioskPillFromElement(refEl, 'up') : null;
        if (pillId) setPillFocusId(pillId);
      }
      return;
    }

    // Zone recherche thèmes
    if (chromeFocus === 'main') {
      if (direction === 'down') {
        setChromeFocus(null);
        setPaginationFocus(null);
        clearKioskExtraFocus();
      } else if (direction === 'left' && isRetrobat && kioskSortButtonRef?.current) {
        setChromeFocus(null);
        setToolbarFocus('sort');
      } else if (direction === 'up' && isRetrobat) {
        setChromeFocus(null);
        const pillId = mainInput ? findNearestKioskPillFromElement(mainInput, 'up') : null;
        if (pillId) setPillFocusId(pillId);
      }
      return;
    }

    // Zone pagination active : gauche/droite bascule Precedent <-> Suivant,
    // haut retourne dans la grille (derniere ligne, meme colonne qu'avant).
    if (paginationFocus) {
      if (direction === 'left' || direction === 'right') {
        setPaginationFocus((p) => (p === 'prev' ? 'next' : 'prev'));
      } else if (direction === 'up') {
        setPaginationFocus(null);
      }
      return;
    }

    setFocusedIndex((prev) => {
      const count = themes.length;
      if (count === 0) {
        if (direction === 'up' && mainInput) {
          setChromeFocus('main');
          clearKioskExtraFocus();
        }
        return prev;
      }
      const col = prev % columns;
      if (direction === 'left') {
        if (col > 0) return prev - 1;
        // Première colonne : pas d'entrée dans la sidebar.
        return prev;
      }
      if (direction === 'right' && col < columns - 1 && prev + 1 < count) return prev + 1;
      if (direction === 'up') {
        if (prev - columns >= 0) return prev - columns;
        if (mainInput) {
          setChromeFocus('main');
          clearKioskExtraFocus();
          return prev;
        }
        return prev;
      }
      if (direction === 'down') {
        if (prev + columns < count) return prev + columns;
        if (totalPages > 1) { setPaginationFocus('prev'); return prev; }
        return prev;
      }
      return prev;
    });
  }, [
    themes.length, columns, paginationFocus, totalPages, chromeFocus, searchInputRef,
    isRetrobat, pillFocusId, toolbarFocus, clearKioskExtraFocus,
    kioskSortButtonRef, kioskDarkButtonRef,
  ]);

  const isInCart = useCallback((theme: ThemeItem) =>
    cart.some(t => getThemeKey(t) === getThemeKey(theme)), [cart]);

  const handleCartToggle = useCallback((theme: ThemeItem) => {
    const key = getThemeKey(theme);
    if (isInCart(theme)) {
      onCartRemove(key);
    } else {
      if (cart.length >= CART_MAX) {
        setCartFullMsg(true);
        setTimeout(() => setCartFullMsg(false), 2500);
        return;
      }
      onCartAdd(theme);
    }
  }, [cart, isInCart, onCartAdd, onCartRemove]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, [setCurrentPage]);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [setCurrentPage, totalPages]);

  // Garde anti-double-déclenchement, active uniquement quand l'agent est
  // présent : dans ce mode, un appui SUD sous Windows produit A LA FOIS un
  // vrai Entrée relayé par l'AHK (clic natif sur l'élément focusé) ET un
  // onSelect de useGamepadGridNav (lecture Gamepad directe).
  // La garde est PARTAGÉE par toutes les activations (pagination ET
  // sélection d'un thème) : le premier des deux événements change par
  // exemple de page, ce qui remet le focus dans la grille - sans garde
  // commune, le second (quelques ms plus tard) sélectionnerait alors un
  // jeu au lieu d'être absorbé.
  // 1500 ms : couvre le delai mini "Rafraichissement…" (~1,2 s) + marge —
  // sinon le SUD qui a valide OK est relu comme un nouvel Installer.
  const GRID_ACTION_GUARD_MS = 1500;
  const pageActionGuardRef = useRef(0);
  const guardedPageAction = useCallback((fn: () => void) => {
    if (agentInfo) {
      const now = Date.now();
      if (now - pageActionGuardRef.current < GRID_ACTION_GUARD_MS) return;
      pageActionGuardRef.current = now;
    }
    fn();
  }, [agentInfo]);

  // Après fermeture de l'OSK / de l'installation : suspendre
  // useGamepadGridNav jusqu'au relâchement de SUD et EST. Un délai fixe
  // (ex. 1500 ms) ne suffit pas : si le bouton est encore enfoncé au
  // remount, l'état "précédent" est vide et l'appui est relu → le
  // clavier se rouvre tout seul.
  const [suppressGridNav, setSuppressGridNav] = useState(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitReleasePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const oskOpenRef = useRef(false);
  oskOpenRef.current = oskOpen;

  const clearNavSuppressTimers = useCallback(() => {
    if (waitReleasePollRef.current) {
      clearInterval(waitReleasePollRef.current);
      waitReleasePollRef.current = null;
    }
    if (suppressTimerRef.current) {
      clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = null;
    }
  }, []);

  const armGridNavSuppress = useCallback(() => {
    pageActionGuardRef.current = Date.now();
    setSuppressGridNav(true);
    clearNavSuppressTimers();

    const p = new URLSearchParams(window.location.search);
    const num = (key: string, def: number) => {
      const v = p.get(key);
      if (v === null) return def;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 0 ? n : def;
    };
    const btnSud = num('btnSud', 0);
    const btnEst = num('btnEst', 1);
    const btnNord = num('btnNord', 3);
    const AXIS = 0.5;
    const isDown = (gp: Gamepad, i: number) => {
      if (i < 0) return false;
      const b = gp.buttons[i];
      return b ? (b.pressed || b.value > AXIS) : false;
    };

    const resume = () => {
      clearNavSuppressTimers();
      suppressTimerRef.current = setTimeout(() => {
        setSuppressGridNav(false);
        suppressTimerRef.current = null;
      }, 200);
    };

    let idleTicks = 0;
    const started = Date.now();
    waitReleasePollRef.current = setInterval(() => {
      if (Date.now() - started > 8000) {
        resume();
        return;
      }
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of pads) { if (g && g.connected) { gp = g; break; } }
      if (!gp) {
        idleTicks += 1;
        if (idleTicks >= 20) resume();
        return;
      }
      idleTicks = 0;
      if (isDown(gp, btnSud) || isDown(gp, btnEst) || isDown(gp, btnNord)) return;
      resume();
    }, 50);
  }, [clearNavSuppressTimers]);

  const closeAgentInstall = useCallback(() => {
    setAgentInstallTheme(null);
    armGridNavSuppress();
  }, [armGridNavSuppress]);
  useEffect(() => () => {
    clearNavSuppressTimers();
  }, [clearNavSuppressTimers]);

  // SANS agent : no-op volontaire - le clic réel (Installer ET pagination)
  // est déclenché par un vrai Entrée envoyé par AHK sur l'élément réellement
  // focusé (SendInput = "trusted" pour Chrome, contrairement à .click() en
  // JS, exigence du protocole hyperbat://).
  // AVEC agent : fetch() n'exige aucun geste "trusted", on déclenche donc
  // directement ici - indispensable sur Batocera, où aucun AHK ne tourne
  // pour relayer SUD vers Entrée. Sous Windows (AHK actif), l'ouverture de
  // la fenêtre est idempotente et la pagination est protégée par la garde
  // ci-dessus : pas de double effet.
  const handleGamepadSelect = useCallback(() => {
    if (suppressGridNav || oskOpenRef.current) return;

    if (isRetrobat && pillFocusId !== null) {
      onKioskPillActivate?.(pillFocusId);
      return;
    }
    if (isRetrobat && toolbarFocus === 'sort') {
      onKioskToolbarSort?.();
      return;
    }
    if (isRetrobat && toolbarFocus === 'dark') {
      onKioskToolbarDark?.();
      return;
    }

    // Recherche thèmes focusée (kiosque) : SUD ouvre le clavier virtuel.
    if (isRetrobat && chromeFocus === 'main') {
      setOskInitial(searchValue);
      setOskOpen(true);
      return;
    }
    if (!agentInfo) return;
    // TOUT passe par la garde (pas seulement la pagination) : voir le
    // commentaire de guardedPageAction pour le scénario du double appui
    // qui changeait de page PUIS sélectionnait un jeu.
    guardedPageAction(() => {
      if (paginationFocus === 'prev') { handlePrevPage(); return; }
      if (paginationFocus === 'next') { handleNextPage(); return; }
      const theme = themes[focusedIndex];
      if (theme) setAgentInstallTheme(theme);
    });
  }, [
    agentInfo, paginationFocus, guardedPageAction, handlePrevPage, handleNextPage, themes,
    focusedIndex, chromeFocus, isRetrobat, searchValue, suppressGridNav,
    pillFocusId, toolbarFocus,
    onKioskPillActivate, onKioskToolbarSort, onKioskToolbarDark,
  ]);

  const kioskSudAction = (() => {
    if (chromeFocus === 'main') return 'Clavier';
    if (pillFocusId !== null) return 'Filtrer';
    if (toolbarFocus === 'sort') return 'Tri';
    if (toolbarFocus === 'dark') return 'Mode';
    return 'Installer';
  })();

  const handleGamepadBack = useCallback(() => {
    if (oskOpen) return; // EST géré par le clavier
    if (pillFocusId !== null) {
      setPillFocusId(null);
      return;
    }
    if (toolbarFocus) {
      setToolbarFocus(null);
      return;
    }
    if (chromeFocus === 'main') {
      if (searchHasValue && onSearchClear) {
        onSearchClear();
        return;
      }
      setChromeFocus(null);
      return;
    }
    window.history.back();
  }, [oskOpen, pillFocusId, toolbarFocus, chromeFocus, searchHasValue, onSearchClear]);

  const handleGamepadPreview = useCallback(() => {
    if (oskOpen) return; // NORD géré par le clavier (ferme)
    if (isRetrobat && chromeFocus === 'main') {
      if (suppressGridNav || oskOpenRef.current) return;
      setOskInitial(searchValue);
      setOskOpen(true);
      return;
    }
    if (chromeFocus) return;
    // Si la lightbox est deja ouverte : la fermer (toggle)
    if (selectedTheme !== null) {
      setSelectedTheme(null);
      return;
    }
    const theme = themes[focusedIndex];
    if (!theme) return;
    // Précharge l'image avant d'ouvrir la Lightbox pour éviter
    // le blanc quand on navigue à la manette (image pas encore en cache)
    if (theme.imageUrl) {
      const img = new Image();
      img.src = theme.imageUrl;
      img.onload = () => setSelectedTheme(theme);
      img.onerror = () => setSelectedTheme(theme); // ouvre quand même si erreur
    } else {
      setSelectedTheme(theme);
    }
  }, [themes, focusedIndex, selectedTheme, chromeFocus, oskOpen, isRetrobat, searchValue, suppressGridNav]);

  useGamepadGridNav({
    // Fenêtre d'installation / clavier virtuel / juste fermée : suspendre
    // la navigation de la grille.
    enabled: isRetrobat && !agentInstallTheme && !suppressGridNav && !oskOpen,
    lightboxOpen: selectedTheme !== null,
    onMove: moveFocus,
    onSelect: handleGamepadSelect,
    onBack: handleGamepadBack,
    onPreview: handleGamepadPreview,
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
    onLightboxClose: () => setSelectedTheme(null),
    onLightboxPrev: () => {
      if (!selectedTheme) return;
      const idx = allFilteredThemes.indexOf(selectedTheme);
      if (idx > 0) setSelectedTheme(allFilteredThemes[idx - 1]);
    },
    onLightboxNext: () => {
      if (!selectedTheme) return;
      const idx = allFilteredThemes.indexOf(selectedTheme);
      if (idx < allFilteredThemes.length - 1) setSelectedTheme(allFilteredThemes[idx + 1]);
    },
  });

  const handleOskChange = useCallback((value: string) => {
    onSearchChange?.(value);
  }, [onSearchChange]);

  const handleOskConfirm = useCallback(() => {
    oskOpenRef.current = false;
    setOskOpen(false);
    armGridNavSuppress();
  }, [armGridNavSuppress]);

  const handleOskCancel = useCallback(() => {
    oskOpenRef.current = false;
    setOskOpen(false);
    armGridNavSuppress();
  }, [armGridNavSuppress]);

  useEffect(() => {
    setLoadedImages(new Set());
    setTimeout(() => {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    }, 10);
  }, [currentPage]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) { img.src = src; observerRef.current?.unobserve(img); }
          }
        });
      },
      { rootMargin: '350px', threshold: 0.01 }
    );
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => { if (observerRef.current) observerRef.current.observe(img); });
    return () => { observerRef.current?.disconnect(); };
  }, [themes]);

  const getSystemName = (systemId: string) =>
    systems.find(s => s.id === systemId)?.name || systemId;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const getCategoryName = (categoryId: string) => {
    const categoryMap: Record<string, string> = {
      'game-themes':    'Jeu',
      'default-themes': 'Défaut',
      'system-themes':  'Système',
      'artwork':        'Artwork',
      'collection':     'Collection',
      'main-themes':    'Principal',
      'tools':          'Outil',
      'tutorials':      'Tutoriel'
    };
    return categoryMap[categoryId] || categoryId;
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .theme-card { animation: fadeIn 0.3s ease-out; }
        .skeleton {
          background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .cart-full-msg { animation: popIn 0.2s ease-out; }
      `}</style>

      {filteredThemesLength === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">Aucun thème trouvé</p>
          <p className="text-sm mt-2">Essayez de modifier votre recherche</p>
        </div>
      ) : (
        <>
      {cartFullMsg && (
        <div className="cart-full-msg fixed top-6 left-1/2 z-50 px-5 py-3 rounded-lg border-2 font-bold text-sm shadow-lg"
          style={{ transform: 'translateX(-50%)', backgroundColor: '#1a1a1a', borderColor: '#FF8C00', color: '#FF8C00' }}>
          Sélection pleine — maximum {CART_MAX} thèmes
        </div>
      )}

      <div className={viewMode === 'grid'
        ? sidebarCollapsed
          ? 'grid grid-cols-2 md:grid-cols-5 gap-4'
          : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
        : 'space-y-4'}>
        {themes.map((theme, index) => {
          const key = getThemeKey(theme);
          const inCart = isInCart(theme);
          const isGamepadFocused = isRetrobat && !chromeFocus && pillFocusId === null
            && toolbarFocus === null
            && !paginationFocus && index === focusedIndex;

          return (
            <div
              key={`${key}-${index}`}
              ref={(el) => { cardRefs.current[index] = el; }}
              className="theme-card rounded-lg border-2 overflow-hidden group relative"
              style={{
                backgroundColor: '#111827',
                borderColor: isGamepadFocused ? '#FF8C00' : inCart ? '#FF8C00' : '#444',
                boxShadow: isGamepadFocused ? '0 25px 50px rgba(255,140,0,0.8), 0 0 30px rgba(255,165,0,0.6)' : undefined,
                transform: isGamepadFocused ? 'translateY(-8px) scale(1.05)' : undefined,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                const card = e.currentTarget;
                card.style.borderColor = '#FF8C00';
                card.style.boxShadow = '0 25px 50px rgba(255,140,0,0.8), 0 0 30px rgba(255,165,0,0.6)';
                card.style.transform = 'translateY(-8px) scale(1.05)';
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget;
                card.style.borderColor = isGamepadFocused ? '#FF8C00' : inCart ? '#FF8C00' : '#444';
                card.style.boxShadow = isGamepadFocused ? '0 25px 50px rgba(255,140,0,0.8), 0 0 30px rgba(255,165,0,0.6)' : 'none';
                card.style.transform = isGamepadFocused ? 'translateY(-8px) scale(1.05)' : 'translateY(0) scale(1)';
              }}
            >
              <div
                className="bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border-b-2 border-gray-700 cursor-pointer relative overflow-hidden"
                style={{ height: '180px' }}
                onClick={() => {
                  if (theme.mature && !revealedMature.has(key)) {
                    setRevealedMature(prev => new Set(prev).add(key));
                    return;
                  }
                  setSelectedTheme(theme);
                }}
              >
                {theme.imageUrl ? (
                  <>
                    {!loadedImages.has(key) && <div className="absolute inset-0 skeleton" />}
                    <img
                      ref={(el) => {
                        if (el && !el.dataset.observed && observerRef.current) {
                          el.dataset.observed = 'true';
                          observerRef.current.observe(el);
                        }
                      }}
                      data-src={theme.imageUrl}
                      alt={theme.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onLoad={() => setLoadedImages(prev => new Set(prev).add(key))}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      style={{
                        opacity: loadedImages.has(key) ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out',
                        willChange: 'opacity',
                        filter: theme.mature && !revealedMature.has(key) ? 'blur(18px)' : 'none'
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                      style={{ display: loadedImages.has(key) ? 'none' : 'flex', pointerEvents: 'none' }}>
                      <span className="text-5xl">🎮</span>
                    </div>
                    {theme.mature && !revealedMature.has(key) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ backgroundColor: 'rgba(20,10,20,0.45)' }}>
                        <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: '#dc2626' }}>+18</div>
                        <span className="text-xs font-semibold" style={{ color: '#f5d5d5' }}>Cliquer pour révéler</span>
                      </div>
                    )}
                    {theme.mature && revealedMature.has(key) && (
                      <div className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#dc2626' }}>+18</div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-5xl">🎮</span>
                    <span className="text-xs text-gray-500">Pas d'image</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <h3 className="font-bold text-sm mb-2 text-white group-hover:text-orange-400 transition truncate">
                  {theme.name}
                </h3>

                <div className="flex gap-2 text-xs mb-1 flex-wrap items-center">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold border"
                    style={{ backgroundColor: 'rgba(255,140,0,0.3)', color: '#FFA500', borderColor: 'rgba(255,140,0,0.5)' }}>
                    {getSystemName(theme.system)}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold border"
                    style={{ backgroundColor: 'rgba(59,130,246,0.3)', color: '#60A5FA', borderColor: 'rgba(59,130,246,0.5)' }}>
                    {getCategoryName(theme.category)}
                  </span>
                  {/* ── Badge Multi ── */}
                  {theme.isMulti && (
                    <span className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'linear-gradient(to right, #9333ea, #ec4899)', color: 'white' }}>
                      🌍 Multi-region
                    </span>
                  )}
                </div>

                <div className="flex gap-2 text-xs mb-2 flex-wrap items-center">
                  {theme.date && (
                    <>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                        style={{ backgroundColor: 'rgba(255,140,0,0.7)', color: '#FFF', borderColor: 'rgba(255,140,0,0.8)' }}>
                        {formatDate(theme.date)}
                      </span>
                      <span className="text-gray-600">•</span>
                    </>
                  )}
                  <span className="text-gray-400 text-xs">{theme.size}</span>
                </div>

                <div className="flex justify-center mb-2">
                  <p className="text-sm font-semibold px-4 py-1.5 rounded inline-block"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.15) 100%)',
                      color: '#FCD34D', borderLeft: '2px solid #F59E0B', borderRight: '2px solid #F59E0B', fontSize: '0.8rem'
                    }}>
                    ✨ Par {theme.creator}
                  </p>
                </div>

                {theme.onScreenScraper && <div className="mb-2"><ScreenScraperBadge /></div>}

                <div className="flex gap-2">
                  {isRetrobat ? (
                    // ── Mode RetroBat/Batocera : bouton "Installer" ──
                    // Agent local détecté : installation via son API (fetch),
                    // fenêtre AgentInstallFlow. Sinon : protocole hyperbat://
                    // historique (Windows uniquement), comportement inchangé.
                    <a
                      ref={(el) => { actionRefs.current[index] = el; }}
                      href={`hyperbat://install?url=${encodeURIComponent(theme.downloadUrl)}&system=${encodeURIComponent(theme.system)}&category=${encodeURIComponent(theme.category)}&name=${encodeURIComponent(theme.name)}${theme.gameId ? `&gameId=${encodeURIComponent(String(theme.gameId))}` : ''}`}
                      onClick={agentInfo ? (e) => {
                        e.preventDefault();
                        // Même garde que la manette : un Entrée AHK retardé
                        // (arrivé APRÈS un changement de page, quand ce
                        // bouton vient de recevoir le focus DOM) ne doit pas
                        // ouvrir la fenêtre d'installation.
                        guardedPageAction(() => setAgentInstallTheme(theme));
                      } : undefined}
                      className="flex-1 py-2 rounded flex items-center justify-center gap-2 font-bold text-xs border transition hover:brightness-110 active:scale-95"
                      style={{ backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }}>
                      🎮 Installer dans {agentInfo?.platform === 'batocera' ? 'Batocera' : 'RetroBat'}
                    </a>
                  ) : (
                    // ── Mode normal : bouton Télécharger ──
                    <a
                      ref={(el) => { actionRefs.current[index] = el; }}
                      href={theme.downloadUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-2 rounded flex items-center justify-center gap-2 font-bold text-xs border transition hover:brightness-110 active:scale-95"
                      style={{ backgroundColor: '#CC7000', borderColor: '#E89B3C', color: 'white' }}>
                      <Download className="w-4 h-4" />
                      Télécharger
                    </a>
                  )}
                  <button
                    tabIndex={isRetrobat ? -1 : undefined}
                    onClick={() => handleCartToggle(theme)}
                    title={inCart ? 'Retirer de la sélection' : cart.length >= CART_MAX ? 'Sélection pleine' : 'Ajouter à la sélection'}
                    className="px-3 py-2 rounded border-2 transition hover:brightness-110 active:scale-95 flex items-center justify-center gap-1 text-xs font-bold"
                    style={{
                      backgroundColor: inCart ? 'rgba(34,197,94,0.15)' : cart.length >= CART_MAX && !inCart ? 'rgba(255,140,0,0.05)' : '#1a1a1a',
                      borderColor: inCart ? '#22c55e' : cart.length >= CART_MAX && !inCart ? '#555' : '#555',
                      color: inCart ? '#22c55e' : '#888',
                      cursor: cart.length >= CART_MAX && !inCart ? 'not-allowed' : 'pointer'
                    }}>
                    {inCart
                      ? <><span>✓</span><span>Ajouté</span></>
                      : <><Plus className="w-4 h-4" style={{ color: '#FFD700' }} /><span>Ajouter</span></>
                    }
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
          <button ref={prevPageBtnRef} onClick={() => guardedPageAction(handlePrevPage)} disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg font-bold border-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white',
              ...(paginationFocus === 'prev' ? { outline: '3px solid #fff', outlineOffset: '2px' } : {}),
            }}>
            ← Précédent
          </button>
          <div className="flex gap-1">
            {currentPage > 3 && (
              <>
                <button onClick={() => setCurrentPage(1)}
                  className="px-3 py-2 rounded-lg font-bold border-2 transition hover:brightness-110"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#444', color: '#FFA500' }}>1</button>
                {currentPage > 4 && <span className="px-2 py-2 text-gray-500">...</span>}
              </>
            )}
            {[-2, -1, 0, 1, 2].map(offset => {
              const page = currentPage + offset;
              if (page < 1 || page > totalPages) return null;
              return (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className="px-3 py-2 rounded-lg font-bold border-2 transition hover:brightness-110"
                  style={currentPage === page
                    ? { backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }
                    : { backgroundColor: '#1a1a1a', borderColor: '#444', color: '#FFA500' }}>
                  {page}
                </button>
              );
            })}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="px-2 py-2 text-gray-500">...</span>}
                <button onClick={() => setCurrentPage(totalPages)}
                  className="px-3 py-2 rounded-lg font-bold border-2 transition hover:brightness-110"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#444', color: '#FFA500' }}>
                  {totalPages}
                </button>
              </>
            )}
          </div>
          <button ref={nextPageBtnRef} onClick={() => guardedPageAction(handleNextPage)} disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg font-bold border-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white',
              ...(paginationFocus === 'next' ? { outline: '3px solid #fff', outlineOffset: '2px' } : {}),
            }}>
            Suivant →
          </button>
        </div>
      )}

      {filteredThemesLength > 0 && (
        <div className="mt-4 text-center text-gray-400 text-sm">
          Affichage de {((currentPage - 1) * themesPerPage) + 1} à{' '}
          {Math.min(currentPage * themesPerPage, filteredThemesLength)} sur{' '}
          <span className="font-bold text-orange-400">{filteredThemesLength.toLocaleString()}</span> thème(s)
        </div>
      )}
        </>
      )}

      <Lightbox
        theme={selectedTheme}
        onClose={() => setSelectedTheme(null)}
        allThemes={allFilteredThemes}
        onNavigate={setSelectedTheme}
      />

      {/* ── Fenêtre d'installation via l'agent local (remplace hyperbat://
          quand l'agent est détecté) : choix de ROM, conflits, progression ── */}
      {agentInstallTheme && agentInfo && (
        <AgentInstallFlow
          theme={agentInstallTheme}
          agentInfo={agentInfo}
          onClose={closeAgentInstall}
        />
      )}

      {isRetrobat && (
        <GamepadVirtualKeyboard
          open={oskOpen}
          initialValue={oskInitial}
          title="Recherche thèmes"
          onChange={handleOskChange}
          onConfirm={handleOskConfirm}
          onCancel={handleOskCancel}
        />
      )}

      {/* ── Bandeau de controles manette (mode kiosk RetroBat uniquement) ── */}
      {isRetrobat && (() => {
        const { hasTriggers, btnSudOk, btnEstOk, btnNordOk, btnTriggerLOk, btnTriggerROk } = gamepadConfig;

        // Icone bouton cardinal style RetroBat
        const BtnIcon = ({ dir, color, active, label, action }: {
          dir: 'sud'|'est'|'nord'; color: string; active: boolean; label: string; action: string;
        }) => {
          const dx = { sud: 0, est: 9, nord: 0 };
          const dy = { sud: 9, est: 0, nord: -9 };
          const c  = active ? color : '#333';
          return (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', opacity: active ? 1 : 0.35 }}>
              <svg width="34" height="34" viewBox="-17 -17 34 34">
                <circle cx="0" cy="0" r="15" fill="#1a1a1a" stroke={active ? '#555' : '#333'} strokeWidth="1.5"/>
                <circle cx="0"  cy="-9" r="2.8" fill={dir==='nord' ? c : '#444'}/>
                <circle cx="0"  cy="9"  r="2.8" fill={dir==='sud'  ? c : '#444'}/>
                <circle cx="-9" cy="0"  r="2.8" fill="#444"/>
                <circle cx="9"  cy="0"  r="2.8" fill={dir==='est'  ? c : '#444'}/>
                <circle cx="0"  cy="0"  r="2"   fill="#333"/>
                <circle cx={dx[dir]} cy={dy[dir]} r="4" fill={c} opacity={active ? '0.95' : '0.3'}/>
              </svg>
              <span style={{ fontSize:'9px', fontWeight:700, color: active ? '#fff' : '#444', lineHeight:1 }}>{label}</span>
              <span style={{ fontSize:'9px', color: active ? '#aaa' : '#333', lineHeight:1 }}>{action}</span>
            </div>
          );
        };

        // Icone D-PAD
        const DPad = () => (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
            <svg width="34" height="34" viewBox="-17 -17 34 34">
              <circle cx="0" cy="0" r="15" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
              <rect x="-2.5" y="-11" width="5" height="22" rx="1.5" fill="#666"/>
              <rect x="-11" y="-2.5" width="22" height="5" rx="1.5" fill="#666"/>
              <circle cx="0" cy="0" r="4" fill="#3a3a3a" stroke="#555" strokeWidth="1"/>
            </svg>
            <span style={{ fontSize:'9px', fontWeight:700, color:'#fff', lineHeight:1 }}>D-PAD</span>
            <span style={{ fontSize:'9px', color:'#aaa', lineHeight:1 }}>Naviguer</span>
          </div>
        );

        // Badge L2/R2
        const Badge = ({ label, action, active }: { label:string; action:string; active:boolean }) => (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', opacity: active ? 1 : 0.35 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              minWidth:'34px', height:'22px', padding:'0 6px', borderRadius:'5px',
              backgroundColor: active ? '#2a2a2a' : '#111',
              border:`1.5px solid ${active ? '#666' : '#2a2a2a'}`,
              fontSize:'9px', fontWeight:700, color: active ? '#fff' : '#333',
            }}>{label}</div>
            <span style={{ fontSize:'9px', color: active ? '#aaa' : '#333', lineHeight:1 }}>{action}</span>
          </div>
        );

        const Sep = () => <div style={{ width:'1px', height:'56px', backgroundColor:'#2a2a2a', margin:'0 4px' }}/>;

        return (
          <div style={{
            position:'fixed', bottom:0, left:0, right:0,
            backgroundColor:'rgba(10,10,10,0.97)',
            borderTop:'2px solid #FF8C00',
            padding:'6px 16px',
            zIndex:9999,
            display:'flex', flexDirection:'column', alignItems:'center',
          }}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            gap:'6px', flexWrap:'nowrap',
          }}>
            {/* R1 (ou touche configuree au setup) : ouvre/ferme la vitrine.
                Gere entierement par l'AHK, toujours disponible (manette
                comme borne), donc pas de condition d'affichage - juste un
                rappel visuel + F9 en secours clavier. */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
              <div style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                minWidth:'34px', height:'22px', padding:'0 6px', borderRadius:'5px',
                backgroundColor:'#2a2a2a', border:'1.5px solid #666',
                fontSize:'9px', fontWeight:700, color:'#fff',
              }}>R1</div>
              <span style={{ fontSize:'9px', color:'#aaa', lineHeight:1 }}>Fermer</span>
              <span style={{ fontSize:'8px', color:'#666', marginTop:'1px' }}>(F9 clavier)</span>
            </div>
            <Sep/>
            {/* SUD - Installer / Clavier si recherche focusée */}
            <BtnIcon dir="sud"  color="#2ecc71" active={btnSudOk}  label="SUD"  action={kioskSudAction}/>
            <Sep/>
            {/* EST - Retour — rouge Xbox (B) */}
            <BtnIcon dir="est"  color="#e74c3c" active={btnEstOk}  label="EST"  action="Retour"/>
            <Sep/>
            {/* NORD - Aperçu / Clavier */}
            <BtnIcon dir="nord" color="#f1c40f" active={btnNordOk} label="NORD" action={chromeFocus === 'main' ? 'Clavier' : (pillFocusId !== null || toolbarFocus) ? '—' : 'Aperçu'}/>
            <Sep/>
            {/* D-PAD : grille + pagination bas + recherche (haut 1re ligne) */}
            <DPad/>
            {/* Trigger gauche/droite : raccourci direct de pagination,
                manette uniquement (pas de badge dedie pour la borne, qui
                passe par le D-PAD ci-dessus) */}
            {hasTriggers && (
              <>
                <Sep/>
                <Badge label="L2/LT" action="Page -" active={btnTriggerLOk}/>
                <Badge label="R2/RT" action="Page +" active={btnTriggerROk}/>
              </>
            )}
            {/* Page courante */}
            {totalPages > 1 && (
              <>
                <Sep/>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#FFD700', whiteSpace:'nowrap' }}>
                  Page {currentPage}/{totalPages}
                </span>
              </>
            )}
            {/* Agent local détecté : installation directe (sans hyperbat://) */}
            {agentInfo && (
              <>
                <Sep/>
                <span style={{ fontSize:'10px', fontWeight:700, color:'#2ecc71', whiteSpace:'nowrap' }}>
                  ● Agent {agentInfo.platform === 'batocera' ? 'Batocera' : 'RetroBat'}
                </span>
              </>
            )}
          </div>
          <span style={{ fontSize:'10px', color:'#666', marginTop:'4px' }}>
            🖱 Vous pouvez aussi utiliser une souris pour plus de confort
          </span>
          </div>
        );
      })()}
    </>
  );
};

export default ThemeList;