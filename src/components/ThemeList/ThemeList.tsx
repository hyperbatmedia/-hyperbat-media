// Fichier: src/components/ThemeList/ThemeList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { ThemeItem, SystemRow } from '../../types';
import { getThemeKey } from '../../utils/themeUtils';
import Lightbox from '../Lightbox/Lightbox';

interface ThemeListProps {
  viewMode: 'grid' | 'list';
  themes: ThemeItem[];
  allFilteredThemes: ThemeItem[];
  filteredThemesLength: number;
  totalPages: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  themesPerPage: number;
  isAuthenticated: boolean;
  handleDeleteTheme: (themeKey: string) => Promise<void>;
  systems: SystemRow[];
}

const ThemeList: React.FC<ThemeListProps> = ({
  viewMode,
  themes,
  allFilteredThemes,
  filteredThemesLength,
  totalPages,
  currentPage,
  setCurrentPage,
  themesPerPage,
  isAuthenticated,
  handleDeleteTheme,
  systems
}) => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeItem | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 🆕 CORRECTION : Réinitialise les images quand la liste de thèmes change
  useEffect(() => {
    setLoadedImages(new Set());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, themes.length]); // 🆕 Ajout de themes.length

  // ⚡ Intersection Observer pour lazy loading
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            
            if (src) {
              // 🆕 Force le rechargement même si src existe déjà
              img.src = src;
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '200px',
        threshold: 0.01
      }
    );

    // 🆕 Observer toutes les images dès le montage
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      if (observerRef.current) {
        observerRef.current.observe(img);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [themes]);

  const getSystemName = (systemId: string) =>
    systems.find(s => s.id === systemId)?.name || systemId;

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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .theme-card {
          animation: fadeIn 0.3s ease-out;
        }
        .skeleton {
          background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className={viewMode === 'grid'
        ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
        : 'space-y-4'}
      >
        {themes.map((theme, index) => {
          const key = getThemeKey(theme);

          return (
            <div
              key={`${key}-${index}`}
              className="theme-card bg-gray-900 rounded-lg border-2 overflow-hidden group relative"
              style={{
                borderColor: '#444',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                const card = e.currentTarget;
                card.style.borderColor = '#FF8C00';
                card.style.boxShadow = '0 25px 50px rgba(255, 140, 0, 0.8), 0 0 30px rgba(255, 165, 0, 0.6)';
                card.style.transform = 'translateY(-8px) scale(1.05)';
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget;
                card.style.borderColor = '#444';
                card.style.boxShadow = 'none';
                card.style.transform = 'translateY(0) scale(1)';
              }}
            >
              {isAuthenticated && (
                <button
                  onClick={() => handleDeleteTheme(key)}
                  className="absolute top-2 right-2 z-10 bg-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div
                className="bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border-b-2 border-gray-700 cursor-pointer relative overflow-hidden"
                style={{ height: '180px' }}
                onClick={() => setSelectedTheme(theme)}
              >
                {theme.imageUrl ? (
                  <>
                    {/* Skeleton loader */}
                    {!loadedImages.has(key) && (
                      <div className="absolute inset-0 skeleton" />
                    )}
                    
                    {/* 🆕 Image avec key unique pour forcer le re-render */}
                    <img
                      key={`${key}-${themes.length}-${currentPage}`}
                      ref={(el) => {
                        if (el && observerRef.current) {
                          observerRef.current.observe(el);
                        }
                      }}
                      data-src={theme.imageUrl}
                      alt={theme.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onLoad={() => {
                        setLoadedImages(prev => new Set(prev).add(key));
                      }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = 'none';
                      }}
                      style={{
                        opacity: loadedImages.has(key) ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out'
                      }}
                    />
                    
                    {/* Fallback */}
                    <div 
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                      style={{ 
                        display: loadedImages.has(key) ? 'none' : 'flex',
                        pointerEvents: 'none'
                      }}
                    >
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

              <div className="p-2">
                <h3 className="font-bold text-sm mb-1 text-white group-hover:text-orange-400 transition truncate">
                  {theme.name}
                </h3>

                <div className="flex gap-2 text-xs mb-1 flex-wrap items-center">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      backgroundColor: 'rgba(255, 140, 0, 0.3)',
                      color: '#FFA500',
                      borderColor: 'rgba(255, 140, 0, 0.5)'
                    }}
                  >
                    {getSystemName(theme.system)}
                  </span>
                  <span className="text-gray-400 text-xs">• {theme.size}</span>
                </div>

                <p className="text-xs text-cyan-400 font-semibold mb-2">Par {theme.creator}</p>

                <a
                  href={theme.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded flex items-center justify-center gap-2 font-bold text-xs border transition hover:brightness-110 active:scale-95"
                  style={{
                    backgroundColor: '#CC7000',
                    borderColor: '#E89B3C',
                    color: 'white'
                  }}
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg font-bold border-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }}
          >
            ← Précédent
          </button>

          <div className="flex gap-1">
            {currentPage > 3 && (
              <>
                <button
                  onClick={() => setCurrentPage(1)}
                  className="px-3 py-2 rounded-lg font-bold border-2 transition hover:brightness-110"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#444', color: '#FFA500' }}
                >
                  1
                </button>
                {currentPage > 4 && <span className="px-2 py-2 text-gray-500">...</span>}
              </>
            )}

            {[-2, -1, 0, 1, 2].map(offset => {
              const page = currentPage + offset;
              if (page < 1 || page > totalPages) return null;
              
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className="px-3 py-2 rounded-lg font-bold border-2 transition hover:brightness-110"
                  style={currentPage === page
                    ? { backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }
                    : { backgroundColor: '#1a1a1a', borderColor: '#444', color: '#FFA500' }}
                >
                  {page}
                </button>
              );
            })}

            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="px-2 py-2 text-gray-500">...</span>}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-3 py-2 rounded-lg font-bold border-2 transition hover:brightness-110"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#444', color: '#FFA500' }}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg font-bold border-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }}
          >
            Suivant →
          </button>
        </div>
      )}

      {filteredThemesLength > 0 && (
        <div className="mt-4 text-center text-gray-400 text-sm">
          Affichage de {((currentPage - 1) * themesPerPage) + 1} à {' '}
          {Math.min(currentPage * themesPerPage, filteredThemesLength)} sur{' '}
          <span className="font-bold text-orange-400">{filteredThemesLength.toLocaleString()}</span> thème(s)
        </div>
      )}

      <Lightbox
        theme={selectedTheme}
        onClose={() => setSelectedTheme(null)}
        systems={systems}
        allThemes={allFilteredThemes}
        onNavigate={setSelectedTheme}
      />
    </>
  );
};

export default ThemeList;