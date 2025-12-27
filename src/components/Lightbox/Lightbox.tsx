import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { ThemeItem, SystemRow } from '../../types';

interface LightboxProps {
  theme: ThemeItem | null;
  onClose: () => void;
  systems: SystemRow[];
  allThemes?: ThemeItem[];
  onNavigate?: (theme: ThemeItem) => void;
}

export default function Lightbox({ 
  theme, 
  onClose, 
  systems,
  allThemes = [],
  onNavigate
}: LightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const [previousFocus, setPreviousFocus] = useState<HTMLElement | null>(null);

  // ✅ Calcul de l'index avec useMemo pour éviter les recalculs
  const currentIndex = useMemo(() => {
    if (!theme) return -1;
    
    const extractDriveId = (url: string): string | null => {
      if (!url) return null;
      const match = url.match(/[?&]id=([^&]+)/);
      return match?.[1] || null;
    };
    
    const targetDriveId = extractDriveId(theme.imageUrl);
    
    return allThemes.findIndex(t => {
      const nameMatch = t.name === theme.name;
      const systemMatch = t.system === theme.system;
      
      if (targetDriveId) {
        const tDriveId = extractDriveId(t.imageUrl);
        return nameMatch && systemMatch && tDriveId === targetDriveId;
      }
      
      return nameMatch && systemMatch && t.imageUrl === theme.imageUrl;
    });
  }, [theme, allThemes]);

  const trapFocus = (e: KeyboardEvent) => {
    if (!lightboxRef.current) return;
    const focusableElements = lightboxRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  };

  useEffect(() => {
    if (theme) {
      setPreviousFocus(document.activeElement as HTMLElement);
      setTimeout(() => closeButtonRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
      if (previousFocus && !theme) {
        previousFocus.focus();
      }
    };
  }, [theme, previousFocus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!theme) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Tab') {
        trapFocus(e);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [theme, onClose]);

  if (!theme) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      ref={lightboxRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      style={{ 
        background: 'radial-gradient(ellipse at center, #1a0f00 0%, #000000 100%)',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div 
        className="flex-1 flex items-center justify-center p-6"
        style={{
          animation: 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {theme.imageUrl ? (
          <img
            src={theme.imageUrl.replace('sz=w400', 'sz=w1000')} 
		    alt={theme.name}
		    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 20px 60px rgba(255, 140, 0, 0.3), 0 0 100px rgba(255, 215, 0, 0.1)',
              transition: 'opacity 0.25s ease-out'
            }}
            loading="eager"
          />
        ) : (
          <div 
            className="flex items-center justify-center rounded-lg" 
            style={{ 
              width: '80%',
              height: '80%',
              background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
              border: '2px solid rgba(255, 140, 0, 0.3)',
            }}
            role="img"
            aria-label="Icône de jeu vidéo par défaut"
          >
            <svg 
              width="200" 
              height="200" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.3 }}
            >
              <path 
                d="M7 6V18M11 6V18M15 10V14M19 10V14" 
                stroke="#FF8C00" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
              <rect 
                x="3" 
                y="4" 
                width="18" 
                height="16" 
                rx="2" 
                stroke="#FF8C00" 
                strokeWidth="2"
              />
            </svg>
          </div>
        )}
        {allThemes.length > 0 && (
          <div 
            className="absolute bottom-6 right-6 px-5 py-2.5 rounded-full font-bold text-base"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.95), rgba(255, 100, 0, 0.95))',
              boxShadow: '0 0 30px rgba(255, 140, 0, 0.5), 0 10px 30px rgba(0, 0, 0, 0.6)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
            }}
            aria-label={`Thème ${currentIndex + 1} sur ${allThemes.length}`}
          >
            {currentIndex + 1} / {allThemes.length}
          </div>
        )}
      </div>
      <button
        ref={closeButtonRef}
        onClick={onClose}
        className="absolute top-6 right-6 z-20 p-3 rounded-full transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.9), rgba(255, 100, 0, 0.9))',
          boxShadow: '0 0 25px rgba(255, 140, 0, 0.5)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
          e.currentTarget.style.boxShadow = '0 0 35px rgba(255, 140, 0, 0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 140, 0, 0.5)';
        }}
        aria-label="Fermer la lightbox"
        title="Fermer (Échap)"
      >
        <X className="w-6 h-6 text-white" strokeWidth={2} />
      </button>
    </div>
  );
}