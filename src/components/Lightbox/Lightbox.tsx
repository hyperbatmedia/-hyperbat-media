import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ThemeItem } from '../../types';

interface LightboxProps {
  theme: ThemeItem | null;
  onClose: () => void;
  allThemes?: ThemeItem[];
  onNavigate?: (theme: ThemeItem) => void;
}

export default function Lightbox({
  theme,
  onClose,
  allThemes = [],
  onNavigate
}: LightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxRef    = useRef<HTMLDivElement>(null);
  const previousFocus  = useRef<HTMLElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentIndex = useMemo(() => {
    if (!theme) return -1;
    const extractDriveId = (url: string): string | null => {
      if (!url) return null;
      return url.match(/[?&]id=([^&]+)/)?.[1] || null;
    };
    const targetDriveId = extractDriveId(theme.imageUrl);
    return allThemes.findIndex(t => {
      const nameMatch   = t.name   === theme.name;
      const systemMatch = t.system === theme.system;
      if (targetDriveId) {
        return nameMatch && systemMatch && extractDriveId(t.imageUrl) === targetDriveId;
      }
      return nameMatch && systemMatch && t.imageUrl === theme.imageUrl;
    });
  }, [theme, allThemes]);

  const navigatePrev = useCallback(() => {
    if (!onNavigate || currentIndex <= 0) return;
    onNavigate(allThemes[currentIndex - 1]);
  }, [onNavigate, currentIndex, allThemes]);

  const navigateNext = useCallback(() => {
    if (!onNavigate || currentIndex >= allThemes.length - 1) return;
    onNavigate(allThemes[currentIndex + 1]);
  }, [onNavigate, currentIndex, allThemes]);

  // Réinitialiser le chargement image quand le thème change
  useEffect(() => {
    setImageLoaded(false);
  }, [theme?.imageUrl]);

  // Gestion focus + scroll
  useEffect(() => {
    if (theme) {
      previousFocus.current = document.activeElement as HTMLElement;
      setTimeout(() => closeButtonRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      previousFocus.current?.focus();
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [theme]);

  // Clavier : Escape, Tab (trap focus), flèches navigation
  useEffect(() => {
    if (!theme) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      } else if (e.key === 'Tab') {
        if (!lightboxRef.current) return;
        const focusable = lightboxRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [theme, onClose, navigatePrev, navigateNext]);

  if (!theme) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allThemes.length - 1;

  return (
    <div
      ref={lightboxRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        background: 'radial-gradient(ellipse at center, #1a0f00 0%, #000000 100%)',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>

      {/* Bouton Précédent */}
      {hasPrev && (
        <button
          onClick={navigatePrev}
          className="absolute left-4 top-1/2 z-20 p-3 rounded-full transition-all duration-300"
          style={{ transform: 'translateY(-50%)', background: 'rgba(255,140,0,0.85)', boxShadow: '0 0 20px rgba(255,140,0,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(255,140,0,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(-50%) scale(1)';   e.currentTarget.style.boxShadow = '0 0 20px rgba(255,140,0,0.4)'; }}
          aria-label="Thème précédent"
          title="Précédent (←)"
        >
          <ChevronLeft className="w-6 h-6 text-white" strokeWidth={2} />
        </button>
      )}

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        style={{ animation: 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        onClick={e => e.stopPropagation()}
      >
        {theme.imageUrl ? (
          <div className="relative max-w-full max-h-[80vh]">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '8px' }}>
                <div style={{
                  width: '48px', height: '48px',
                  border: '4px solid rgba(255,140,0,0.3)',
                  borderTop: '4px solid #FF8C00',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
            )}
            <img
              key={theme.imageUrl}
              src={theme.imageUrl.replace('sz=w400', 'sz=w1000')}
              alt={theme.name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              style={{
                width: 'auto', height: 'auto',
                boxShadow: '0 20px 60px rgba(255,140,0,0.3), 0 0 100px rgba(255,215,0,0.1)',
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-out'
              }}
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg"
            style={{
              width: '80%', height: '80%',
              background: 'linear-gradient(135deg, rgba(255,140,0,0.1) 0%, rgba(255,215,0,0.05) 100%)',
              border: '2px solid rgba(255,140,0,0.3)'
            }}
            role="img"
            aria-label="Pas d'image disponible"
          >
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
              <path d="M7 6V18M11 6V18M15 10V14M19 10V14" stroke="#FF8C00" strokeWidth="2" strokeLinecap="round" />
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="#FF8C00" strokeWidth="2" />
            </svg>
          </div>
        )}
      </div>

      {/* Bouton Suivant */}
      {hasNext && (
        <button
          onClick={navigateNext}
          className="absolute right-4 top-1/2 z-20 p-3 rounded-full transition-all duration-300"
          style={{ transform: 'translateY(-50%)', background: 'rgba(255,140,0,0.85)', boxShadow: '0 0 20px rgba(255,140,0,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(255,140,0,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(-50%) scale(1)';   e.currentTarget.style.boxShadow = '0 0 20px rgba(255,140,0,0.4)'; }}
          aria-label="Thème suivant"
          title="Suivant (→)"
        >
          <ChevronRight className="w-6 h-6 text-white" strokeWidth={2} />
        </button>
      )}

      {/* Bouton Fermer */}
      <button
        ref={closeButtonRef}
        onClick={onClose}
        className="absolute top-6 right-6 z-20 p-3 rounded-full transition-all duration-300"
        style={{ background: 'linear-gradient(135deg, rgba(255,140,0,0.9), rgba(255,100,0,0.9))', boxShadow: '0 0 25px rgba(255,140,0,0.5)' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'; e.currentTarget.style.boxShadow = '0 0 35px rgba(255,140,0,0.7)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)';    e.currentTarget.style.boxShadow = '0 0 25px rgba(255,140,0,0.5)'; }}
        aria-label="Fermer la lightbox"
        title="Fermer (Échap)"
      >
        <X className="w-6 h-6 text-white" strokeWidth={2} />
      </button>
    </div>
  );
}
