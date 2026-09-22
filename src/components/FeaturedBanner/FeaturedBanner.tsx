// Fichier: src/components/FeaturedBanner/FeaturedBanner.tsx
// Jusqu'à 2 encarts "vedette" en haut de la page d'accueil, pour un item
// choisi depuis l'onglet admin "Mise en avant" (voir LinksTab.tsx). Reprend
// les vraies couleurs du site (flamme #FF8C00 → #FFD700, cf.
// ThemeSubmissionPage.tsx) plutôt que des couleurs inventées.
import React from 'react';
import { Sparkles, Star, Flame } from 'lucide-react';
import type { ModalItem } from '../../hooks/useLinksLoader';

const BADGE_CONFIG: Record<NonNullable<ModalItem['vedette']>, { label: string; Icon: React.FC<{ className?: string }>; bg: string; text: string }> = {
  'nouveau':          { label: '🆕 Nouveau',          Icon: Sparkles, bg: '#FFD700', text: '#1a1a1a' },
  'a-la-une':         { label: '⭐ À la une',          Icon: Star,     bg: '#FF8C00', text: '#1a1a1a' },
  'a-ne-pas-manquer': { label: '🔥 À ne pas manquer',  Icon: Flame,    bg: '#dc2626', text: '#ffffff' },
};

interface FeaturedBannerProps {
  item: ModalItem;
  onClick: () => void;
}

const FeaturedBanner: React.FC<FeaturedBannerProps> = ({ item, onClick }) => {
  const badge = item.vedette ? BADGE_CONFIG[item.vedette] : null;

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl p-[2px] flex-1 min-w-[220px]"
      style={{
        background: 'linear-gradient(90deg, #FFD700, #FF8C00, #FF4500, #FF8C00, #FFD700)',
        backgroundSize: '300% 100%',
        animation: 'hyperbat-featured-move 3s linear infinite',
      }}
    >
      <div className="rounded-[10px] p-3 flex items-center gap-3 bg-gray-900 hover:bg-gray-800 transition-colors">
        <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Star className="w-5 h-5 text-gray-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {badge && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              <badge.Icon className="w-3 h-3" /> {badge.label}
            </span>
          )}
          <p className="text-sm font-bold text-white truncate">{item.name}</p>
          {item.description && (
            <p className="text-xs text-gray-400 truncate">{item.description}</p>
          )}
        </div>
      </div>
    </button>
  );
};

export default FeaturedBanner;
