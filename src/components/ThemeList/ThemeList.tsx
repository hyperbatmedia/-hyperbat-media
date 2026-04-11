// Fichier: src/components/ThemeList/ThemeList.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Plus } from 'lucide-react';
import { ThemeItem, SystemRow } from '../../types';
import { getThemeKey } from '../../utils/themeUtils';
import Lightbox from '../Lightbox/Lightbox';
import ScreenScraperBadge from '../ScreenScraperBadge';

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
  // Panier — état géré dans HyperBatMediaSite et passé en props
  cart: ThemeItem[];
  onCartAdd: (theme: ThemeItem) => void;
  onCartRemove: (key: string) => void;
  onCartOpen: () => void;
  sidebarCollapsed?: boolean;
}

const ThemeList: React.FC<ThemeListProps> = ({
  viewMode, themes, allFilteredThemes, filteredThemesLength,
  totalPages, currentPage, setCurrentPage, themesPerPage,
  systems,
  cart, onCartAdd, onCartRemove, sidebarCollapsed = false
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeItem | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [cartFullMsg, setCartFullMsg] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

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

      {/* Message panier plein */}
      {cartFullMsg && (
        <div className="cart-full-msg fixed top-6 left-1/2 z-50 px-5 py-3 rounded-lg border-2 font-bold text-sm shadow-lg"
          style={{ transform: 'translateX(-50%)', backgroundColor: '#1a1a1a', borderColor: '#FF8C00', color: '#FF8C00' }}>
          Sélection pleine — maximum {CART_MAX} thèmes
        </div>
      )}

      {/* Grille */}
      <div className={viewMode === 'grid'
        ? sidebarCollapsed
          ? 'grid grid-cols-2 md:grid-cols-5 gap-4'
          : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
        : 'space-y-4'}>
        {themes.map((theme, index) => {
          const key = getThemeKey(theme);
          const inCart = isInCart(theme);

          return (
            <div
              key={`${key}-${index}`}
              className="theme-card rounded-lg border-2 overflow-hidden group relative"
              style={{
                backgroundColor: '#111827',
                borderColor: inCart ? '#FF8C00' : '#444',
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
                card.style.borderColor = inCart ? '#FF8C00' : '#444';
                card.style.boxShadow = 'none';
                card.style.transform = 'translateY(0) scale(1)';
              }}
            >
              {/* Image */}
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

              {/* Infos */}
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

                {/* Boutons Télécharger + Panier */}
                <div className="flex gap-2">
                  <a href={theme.downloadUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 rounded flex items-center justify-center gap-2 font-bold text-xs border transition hover:brightness-110 active:scale-95"
                    style={{ backgroundColor: '#CC7000', borderColor: '#E89B3C', color: 'white' }}>
                    <Download className="w-4 h-4" />
                    Télécharger
                  </a>

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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg font-bold border-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }}>
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

          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg font-bold border-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }}>
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
    </>
  );
};

export default ThemeList;
