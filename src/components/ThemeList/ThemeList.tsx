// Fichier: src/components/ThemeList/ThemeList.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, Plus } from 'lucide-react';
import { ThemeItem, SystemRow } from '../../types';
import { getThemeKey } from '../../utils/themeUtils';
import Lightbox from '../Lightbox/Lightbox';
import ScreenScraperBadge from '../ScreenScraperBadge';
import { useGamepadGridNav } from '../../hooks/useGamepadGridNav';

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
}

const ThemeList: React.FC<ThemeListProps> = ({
  viewMode, themes, allFilteredThemes, filteredThemesLength,
  totalPages, currentPage, setCurrentPage, themesPerPage,
  systems,
  cart, onCartAdd, onCartRemove, sidebarCollapsed = false,
  isRetrobat = false
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeItem | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [cartFullMsg, setCartFullMsg] = useState(false);
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
  const prevPageBtnRef = useRef<HTMLButtonElement | null>(null);
  const nextPageBtnRef = useRef<HTMLButtonElement | null>(null);

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

  // Revient en haut de la grille à chaque changement de page/filtre
  useEffect(() => { setFocusedIndex(0); setPaginationFocus(null); }, [themes]);

  // Garde la carte (ou le bouton pagination) sélectionné visible à l'écran
  useEffect(() => {
    if (!isRetrobat) return;
    if (paginationFocus === 'prev') { prevPageBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (paginationFocus === 'next') { nextPageBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    cardRefs.current[focusedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedIndex, isRetrobat, paginationFocus]);

  // Donne le vrai focus DOM (pas juste visuel) au bouton "Installer" de la
  // carte sélectionnée. Indispensable pour hyperbat:// : un clic déclenché
  // par script (.click()) n'est pas "trusted" pour Chrome et ne peut pas
  // lancer un protocole externe une fois l'activation utilisateur consommée.
  // Un vrai Entrée envoyé par AHK (SendInput, donc trusted) sur un élément
  // réellement focusé déclenche en revanche un clic natif autorisé.
  useEffect(() => {
    if (!isRetrobat) return;
    if (paginationFocus === 'prev') { prevPageBtnRef.current?.focus({ preventScroll: true }); return; }
    if (paginationFocus === 'next') { nextPageBtnRef.current?.focus({ preventScroll: true }); return; }
    actionRefs.current[focusedIndex]?.focus({ preventScroll: true });
  }, [focusedIndex, isRetrobat, paginationFocus]);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    // Zone pagination active : gauche/droite bascule Precedent <-> Suivant,
    // haut retourne dans la grille (derniere ligne, meme colonne qu'avant).
    if (paginationFocus) {
      if (direction === 'left' || direction === 'right') {
        setPaginationFocus((p) => (p === 'prev' ? 'next' : 'prev'));
      } else if (direction === 'up') {
        setPaginationFocus(null);
      }
      // 'down' depuis la pagination : rien, deja tout en bas
      return;
    }

    setFocusedIndex((prev) => {
      const count = themes.length;
      if (count === 0) return prev;
      const col = prev % columns;
      if (direction === 'left' && col > 0) return prev - 1;
      if (direction === 'right' && col < columns - 1 && prev + 1 < count) return prev + 1;
      if (direction === 'up') {
        if (prev - columns >= 0) return prev - columns;
        // Deja sur la premiere ligne : meme logique symetrique que 'down'
        // ci-dessous, au cas ou l'utilisateur a scrolle manuellement (ou
        // via 'down') et veut remonter voir le haut de la carte/page.
        if (typeof window !== 'undefined') window.scrollBy({ top: -220, behavior: 'smooth' });
        return prev;
      }
      if (direction === 'down') {
        if (prev + columns < count) return prev + columns;
        // Derniere ligne : si pagination disponible, on y bascule le focus
        if (totalPages > 1) { setPaginationFocus('prev'); return prev; }
        // Sinon (une seule page - frequent quand il y a peu de themes) :
        // le D-Pad ne peut plus changer de carte, mais la carte
        // actuellement focus peut etre plus haute que la zone visible
        // (image + description + bouton Installer, coupes par le bandeau
        // de controles fixe en bas d'ecran) - remonte par un testeur :
        // "je veux voir le theme complet". Un simple retour a l'index
        // inchange ne re-declenche pas le scrollIntoView (React n'effectue
        // pas l'effet si la valeur ne change pas), donc rien ne se
        // passait. On scrolle manuellement la page vers le bas pour
        // reveler le reste de la carte.
        if (typeof window !== 'undefined') window.scrollBy({ top: 220, behavior: 'smooth' });
        return prev;
      }
      return prev;
    });
  }, [themes.length, columns, paginationFocus, totalPages]);

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

  // Le clic réel (Installer ET pagination) est désormais déclenché par un
  // vrai Entrée envoyé par AHK sur l'élément réellement focusé (SendInput
  // = "trusted" pour Chrome, contrairement à .click() en JS). On ne fait
  // donc plus de .click() ici du tout, sous peine de double-déclenchement :
  // un bouton <button> réagit nativement à Entrée quand il est focusé, donc
  // l'AHK suffit seul pour la pagination aussi, pas besoin de dupliquer.
  const handleGamepadSelect = useCallback(() => {
    // no-op volontaire : voir commentaire ci-dessus
  }, []);

  const handleGamepadBack = useCallback(() => {
    window.history.back();
  }, []);

  const handleGamepadPreview = useCallback(() => {
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
  }, [themes, focusedIndex, selectedTheme]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, [setCurrentPage]);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [setCurrentPage, totalPages]);

  useGamepadGridNav({
    enabled: isRetrobat,
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

  if (filteredThemesLength === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">Aucun thème trouvé</p>
        <p className="text-sm mt-2">Essayez de modifier votre recherche</p>
      </div>
    );
  }

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
          const isGamepadFocused = isRetrobat && index === focusedIndex;

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
                onClick={() => setSelectedTheme(theme)}
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
                      style={{ opacity: loadedImages.has(key) ? 1 : 0, transition: 'opacity 0.3s ease-in-out', willChange: 'opacity' }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                      style={{ display: loadedImages.has(key) ? 'none' : 'flex', pointerEvents: 'none' }}>
                      <span className="text-5xl">🎮</span>
                    </div>
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
                    // ── Mode RetroBat : bouton "Installer dans RetroBat" ──
                    <a
                      ref={(el) => { actionRefs.current[index] = el; }}
                      href={`hyperbat://install?url=${encodeURIComponent(theme.downloadUrl)}&system=${encodeURIComponent(theme.system)}&category=${encodeURIComponent(theme.category)}&name=${encodeURIComponent(theme.name)}`}
                      className="flex-1 py-2 rounded flex items-center justify-center gap-2 font-bold text-xs border transition hover:brightness-110 active:scale-95"
                      style={{ backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }}>
                      🎮 Installer dans RetroBat
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
          <button ref={prevPageBtnRef} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
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
          <button ref={nextPageBtnRef} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
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

      <Lightbox
        theme={selectedTheme}
        onClose={() => setSelectedTheme(null)}
        allThemes={allFilteredThemes}
        onNavigate={setSelectedTheme}
      />

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
            {/* SUD - Installer — vert Xbox (A) */}
            <BtnIcon dir="sud"  color="#2ecc71" active={btnSudOk}  label="SUD"  action="Installer"/>
            <Sep/>
            {/* EST - Retour — rouge Xbox (B) */}
            <BtnIcon dir="est"  color="#e74c3c" active={btnEstOk}  label="EST"  action="Retour"/>
            <Sep/>
            {/* NORD - Aperçu — jaune Xbox (Y) */}
            <BtnIcon dir="nord" color="#f1c40f" active={btnNordOk} label="NORD" action="Aperçu"/>
            <Sep/>
            {/* D-PAD : navigue aussi jusqu'aux boutons Precedent/Suivant en bas
                de la liste (borne arcade ET manette peuvent l'utiliser) */}
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