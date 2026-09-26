// Fichier: src/components/ContentModal/ContentModal.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Play, Download, ExternalLink } from 'lucide-react';

// ── Conversion URL Google Drive ───────────────────────────────────────────────
const convertGoogleDriveUrl = (url: string, isImage: boolean = false): string => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('/thumbnail?') || url.includes('/uc?') || url.includes('lh3.googleusercontent.com')) return url;
  let fileId = '';
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (match) fileId = match[1];
  if (!fileId) { match = url.match(/\/(?:folders|d)\/([a-zA-Z0-9_-]{25,})/); if (match) fileId = match[1]; }
  if (!fileId) { match = url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/); if (match) fileId = match[1]; }
  if (!fileId) { match = url.match(/open\?id=([a-zA-Z0-9_-]{25,})/); if (match) fileId = match[1]; }
  if (!fileId && /^[a-zA-Z0-9_-]{25,40}$/.test(url.trim())) fileId = url.trim();
  if (!fileId) return url;
  if (isImage) return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
  return `https://drive.google.com/uc?id=${fileId}&export=download`;
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ModalItem {
  id: string;
  name: string;
  creator: string;
  // YouTube
  youtubeUrl?: string;
  youtubeId?: string;
  // Download
  description?: string;
  imageUrl?: string;
  downloadUrl?: string;
}

export interface ModalConfig {
  title: string;
  type: 'youtube' | 'download';
  items: ModalItem[];
}

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ModalConfig;
  isDarkMode: boolean;
  /** Id de l'item à faire défiler jusqu'à lui et mettre en évidence à
   *  l'ouverture (utilisé par un bandeau "vedette" de la page d'accueil). */
  highlightItemId?: string;
  /** Préfixe pour les id/name des champs internes (cette modale est rendue
   *  à 2 endroits — Sidebar et page d'accueil — un id fixe créerait un
   *  doublon si les deux étaient ouvertes en même temps). */
  instanceId?: string;
}

// ── Thumbnail YouTube ─────────────────────────────────────────────────────────
const YoutubeThumbnail: React.FC<{ youtubeId: string; name: string }> = ({ youtubeId, name }) => {
  const [imgError, setImgError] = useState(false);
  const thumbUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;

  return (
    <div className="relative w-full aspect-video bg-[#1a1a1a] overflow-hidden">
      {!imgError ? (
        <img
          src={thumbUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover block"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
          <Play className="text-[#FF8C00] w-8 h-8" />
        </div>
      )}
    </div>
  );
};

// ── Carte outil/thème ─────────────────────────────────────────────────────────
const DownloadCard: React.FC<{ item: ModalItem; isDarkMode: boolean; isHighlighted?: boolean }> = ({ item, isDarkMode, isHighlighted }) => {
  const [imgError, setImgError] = useState(false);
  const convertedImageUrl = item.imageUrl ? convertGoogleDriveUrl(item.imageUrl, true) : '';
  const hasImage = !!convertedImageUrl && !imgError;

  const handleDownload = () => {
    if (item.downloadUrl) {
      window.open(item.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col transition-colors duration-200 border-2 ${
        isDarkMode ? 'bg-[#1a1a1a]' : 'bg-[#f9f9f9]'
      } ${isHighlighted ? 'border-[#FF8C00] shadow-[0_0_0_3px_rgba(255,140,0,0.25)]' : isDarkMode ? 'border-[#2a2a2a]' : 'border-[#e5e5e5]'}`}
    >
      {/* Image ou visuel titre */}
      <div className="relative w-full aspect-video bg-[#0f0f1a] overflow-hidden shrink-0">
        {hasImage ? (
          <img src={convertedImageUrl} alt={item.name} onError={() => setImgError(true)}
            className="w-full h-full object-contain block" />
        ) : item.id === 'tool-arrm' ? (
          /* Visuel ARRM — effet glace bleu */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#020d1a] via-[#041e3a] to-[#020d1a]">
            <svg viewBox="0 0 300 110" className="w-[85%] h-[85%]">
              <defs>
                <linearGradient id="iceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stopColor="#a8e6ff" />
                  <stop offset="30%"  stopColor="#4fc3f7" />
                  <stop offset="60%"  stopColor="#0288d1" />
                  <stop offset="100%" stopColor="#01579b" />
                </linearGradient>
                <linearGradient id="iceShine" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"  stopColor="#e1f5fe" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#4fc3f7" stopOpacity="0" />
                  <stop offset="100%" stopColor="#0288d1" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="iceGradSub" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stopColor="#e1f5fe" />
                  <stop offset="100%" stopColor="#4fc3f7" />
                </linearGradient>
                <filter id="iceShadow">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#29b6f6" floodOpacity="0.9" />
                  <feDropShadow dx="0" dy="2" stdDeviation="8" floodColor="#0288d1" floodOpacity="0.6" />
                </filter>
                <filter id="iceSubShadow">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#29b6f6" floodOpacity="0.7" />
                </filter>
              </defs>
              {/* Texte ARRM effet glace */}
              <text x="150" y="68" textAnchor="middle"
                style={{ fontSize: 68, fontWeight: 900, fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: '6px' }}
                fill="url(#iceGrad)" filter="url(#iceShadow)">
                ARRM
              </text>
              {/* Reflet brillant */}
              <text x="150" y="68" textAnchor="middle"
                style={{ fontSize: 68, fontWeight: 900, fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: '6px' }}
                fill="url(#iceShine)" opacity="0.5">
                ARRM
              </text>
              {/* Sous-titre glacé */}
              <text x="150" y="88" textAnchor="middle"
                style={{ fontSize: 11, fontFamily: 'Arial, sans-serif', letterSpacing: '3px' }}
                fill="#ffffff" opacity="0.75">
                ANOTHER RECALBOX ROMS MANAGER
              </text>
              {/* Petites bulles de glace */}
              {[[80,25],[140,15],[200,28],[240,20],[100,48],[170,12],[220,44]].map(([cx,cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 2 : 1.5}
                  fill="#a8e6ff" opacity="0.6" />
              ))}
              {/* Éclats de glace */}
              <line x1="68" y1="20" x2="75" y2="13" stroke="#a8e6ff" strokeWidth="1" opacity="0.5" />
              <line x1="228" y1="17" x2="235" y2="25" stroke="#a8e6ff" strokeWidth="1" opacity="0.5" />
              <line x1="155" y1="6" x2="160" y2="14" stroke="#e1f5fe" strokeWidth="1" opacity="0.4" />
            </svg>
          </div>
        ) : (
          /* Visuel titre générique (HyperBat Theme Creator etc.) */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#020d1a] via-[#041e3a] to-[#020d1a]">
            <div className="text-[11px] tracking-widest text-[#FF8C00] mb-2 uppercase opacity-70">
              HyperBat
            </div>
            <div className="text-[15px] font-bold text-[#FF8C00] text-center leading-tight tracking-wide"
              style={{ textShadow: '0 0 20px rgba(255,140,0,0.5)' }}>
              {item.name}
            </div>
            <div className="mt-3 w-10 h-0.5 bg-gradient-to-r from-transparent via-[#FF8C00] to-transparent" />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className={`m-0 text-sm font-semibold leading-tight ${isDarkMode ? 'text-white' : 'text-[#1a1a1a]'}`}>
            {item.name}
          </p>
          <p className="mt-1 mb-0 text-xs text-[#FF8C00]">
            par {item.creator}
          </p>
        </div>
        {item.description && (
          <p className={`m-0 text-xs leading-relaxed ${isDarkMode ? 'text-[#aaaaaa]' : 'text-[#666]'}`}>
            {item.description}
          </p>
        )}
        <button
          onClick={handleDownload}
          className="mt-auto w-full py-2 px-3 bg-gradient-to-br from-[#FF8C00] to-[#FFA500] text-[#1a1a1a] border-none rounded-lg text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-[filter] duration-200 hover:brightness-110"
        >
          <Download className="w-3.5 h-3.5" />
          Télécharger
        </button>
      </div>
    </div>
  );
};

// ── Carte YouTube ─────────────────────────────────────────────────────────────
const YoutubeCard: React.FC<{ item: ModalItem; isDarkMode: boolean; isHighlighted?: boolean }> = ({ item, isDarkMode, isHighlighted }) => {
  const handleWatch = () => {
    if (item.youtubeUrl) {
      window.open(item.youtubeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 border-2 hover:-translate-y-0.5 hover:border-[#FF8C00] ${
        isDarkMode ? 'bg-[#1a1a1a]' : 'bg-[#f9f9f9]'
      } ${isHighlighted ? 'border-[#FF8C00] shadow-[0_0_0_3px_rgba(255,140,0,0.25)]' : isDarkMode ? 'border-[#2a2a2a]' : 'border-[#e5e5e5]'}`}
      onClick={handleWatch}
    >
      {item.youtubeId && <YoutubeThumbnail youtubeId={item.youtubeId} name={item.name} />}

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className={`m-0 text-[13px] font-semibold leading-snug ${isDarkMode ? 'text-white' : 'text-[#1a1a1a]'}`}>
            {item.name}
          </p>
          <p className="mt-1 mb-0 text-xs text-[#FF8C00]">
            par {item.creator}
          </p>
        </div>
        {item.description && (
          <p className={`m-0 text-xs leading-relaxed ${isDarkMode ? 'text-[#aaaaaa]' : 'text-[#666]'}`}>
            {item.description}
          </p>
        )}
        <div className="mt-auto w-full py-[7px] px-3 bg-[#FF0000] text-white rounded-lg text-[13px] font-bold flex items-center justify-center gap-1.5">
          <Play className="w-[13px] h-[13px] ml-0.5" />
          Regarder
        </div>
      </div>
    </div>
  );
};

// ── Modal principal ───────────────────────────────────────────────────────────
const ContentModal: React.FC<ContentModalProps> = ({ isOpen, onClose, config, isDarkMode, highlightItemId, instanceId = 'content-modal' }) => {
  const [search, setSearch] = useState('');
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Fermer avec Échap + piège du focus (Tab) à l'intérieur de la modale
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first?.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      const t = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => {
        clearTimeout(t);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        previousFocus.current?.focus();
      };
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Reset search à l'ouverture
  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  // Défiler jusqu'à l'item mis en avant (venant d'un bandeau vedette de la
  // page d'accueil) dès que la modale est ouverte et affichée.
  useEffect(() => {
    if (!isOpen || !highlightItemId) return;
    const t = setTimeout(() => {
      itemRefs.current[highlightItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(t);
  }, [isOpen, highlightItemId]);

  if (!isOpen) return null;

  const filtered = config.items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.creator.toLowerCase().includes(search.toLowerCase())
  );

  const isEmpty = config.items.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="content-modal-title"
      className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className={`rounded-2xl border-2 border-[#FF8C00] w-full max-w-[1100px] max-h-[97vh] flex flex-col overflow-hidden shadow-[0_0_60px_rgba(255,140,0,0.2)] ${
          isDarkMode ? 'bg-[#111111]' : 'bg-white'
        }`}
      >

        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-5 py-2.5 border-b-2 border-[#FF8C00] shrink-0 ${
          isDarkMode ? 'bg-[#0f0f0f]' : 'bg-[#fafafa]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 bg-[#FF8C00] rounded-sm" />
            <span id="content-modal-title" className="text-lg font-extrabold text-[#FF8C00] tracking-widest">
              {config.title}
            </span>
            <span className="text-xs py-[3px] px-2.5 bg-[#FF8C00]/15 text-[#FF8C00] rounded-full border border-[#FF8C00]/30">
              {config.items.length} {config.items.length > 1 ? 'entrées' : 'entrée'}
            </span>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={`w-[34px] h-[34px] rounded-full border border-[#FF8C00]/30 bg-transparent cursor-pointer flex items-center justify-center transition-colors duration-200 hover:bg-[#FF8C00]/15 hover:text-[#FF8C00] ${
              isDarkMode ? 'text-[#aaa]' : 'text-[#666]'
            }`}
            title="Fermer (Échap)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Barre de recherche ── */}
        {config.items.length > 4 && (
          <div className={`py-3 px-5 border-b shrink-0 ${isDarkMode ? 'border-[#222]' : 'border-[#eee]'}`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF8C00]" />
              <input
                type="text"
                id={`${instanceId}-search`}
                name={`${instanceId}-search`}
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoComplete="off"
                className={`w-full py-2 pl-[38px] pr-3 rounded-lg text-sm outline-none box-border border focus:border-[#FF8C00] ${
                  isDarkMode ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-[#f5f5f5] border-[#ddd] text-[#1a1a1a]'
                }`}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1 ${
                    isDarkMode ? 'text-[#aaa]' : 'text-[#999]'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Contenu scrollable ── */}
        <div className="flex-1 min-h-0 overflow-y-auto py-3 px-5">
          {isEmpty ? (
            <div className={`text-center py-16 px-5 ${isDarkMode ? 'text-[#555]' : 'text-[#aaa]'}`}>
              <ExternalLink className="w-10 h-10 mb-3 opacity-40 mx-auto" />
              <p className="text-[15px] m-0">Aucun contenu pour le moment</p>
              <p className="text-[13px] mt-2 mb-0 opacity-70">Revenez bientôt !</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={`text-center py-10 px-5 ${isDarkMode ? 'text-[#555]' : 'text-[#aaa]'}`}>
              <p className="text-sm m-0">Aucun résultat pour "<span className="text-[#FF8C00]">{search}</span>"</p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
              {filtered.map(item => (
                <div key={item.id} ref={el => { itemRefs.current[item.id] = el; }}>
                  {config.type === 'youtube'
                    ? <YoutubeCard item={item} isDarkMode={isDarkMode} isHighlighted={item.id === highlightItemId} />
                    : <DownloadCard item={item} isDarkMode={isDarkMode} isHighlighted={item.id === highlightItemId} />
                  }
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={`py-1.5 px-5 border-t flex items-center justify-between shrink-0 ${
          isDarkMode ? 'border-[#222]' : 'border-[#eee]'
        }`}>
          <span className={`text-[11px] ${isDarkMode ? 'text-[#444]' : 'text-[#bbb]'}`}>
            {config.type === 'youtube' ? 'Les vidéos s\'ouvrent sur YouTube' : 'Les liens de téléchargement sont sécurisés'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContentModal;
