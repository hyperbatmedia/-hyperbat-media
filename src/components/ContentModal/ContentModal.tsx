// Fichier: src/components/ContentModal/ContentModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
}

// ── Thumbnail YouTube ─────────────────────────────────────────────────────────
const YoutubeThumbnail: React.FC<{ youtubeId: string; name: string }> = ({ youtubeId, name }) => {
  const [imgError, setImgError] = useState(false);
  const thumbUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#1a1a1a', overflow: 'hidden' }}>
      {!imgError ? (
        <img
          src={thumbUrl}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
          <Play style={{ color: '#FF8C00', width: 32, height: 32 }} />
        </div>
      )}

    </div>
  );
};

// ── Carte outil/thème ─────────────────────────────────────────────────────────
const DownloadCard: React.FC<{ item: ModalItem; isDarkMode: boolean }> = ({ item, isDarkMode }) => {
  const [imgError, setImgError] = useState(false);
  const convertedImageUrl = item.imageUrl ? convertGoogleDriveUrl(item.imageUrl, true) : '';
  const hasImage = !!convertedImageUrl && !imgError;

  const handleDownload = () => {
    if (item.downloadUrl) {
      window.open(item.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div style={{
      background: isDarkMode ? '#1a1a1a' : '#f9f9f9',
      borderRadius: 12,
      border: `1px solid ${isDarkMode ? '#2a2a2a' : '#e5e5e5'}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.2s',
    }}>
      {/* Image ou visuel titre */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0f0f1a', overflow: 'hidden', flexShrink: 0 }}>
        {hasImage ? (
          <img src={convertedImageUrl} alt={item.name} onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : item.id === 'tool-arrm' ? (
          /* Visuel ARRM — effet glace bleu */
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #020d1a 0%, #041e3a 50%, #020d1a 100%)',
          }}>
            <svg viewBox="0 0 300 110" style={{ width: '85%', height: '85%' }}>
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
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '16px',
            background: 'linear-gradient(135deg, #020d1a 0%, #041e3a 50%, #020d1a 100%)',
          }}>
            <div style={{
              fontSize: 11, letterSpacing: '0.2em', color: '#FF8C00', marginBottom: 8,
              textTransform: 'uppercase', opacity: 0.7
            }}>
              HyperBat
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: '#FF8C00', textAlign: 'center',
              lineHeight: 1.3, textShadow: '0 0 20px rgba(255,140,0,0.5)',
              letterSpacing: '0.05em'
            }}>
              {item.name}
            </div>
            <div style={{
              marginTop: 12, width: 40, height: 2,
              background: 'linear-gradient(90deg, transparent, #FF8C00, transparent)'
            }} />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div>
          {item.id !== 'tool-arrm' && (
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3,
              color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>
              {item.name}
            </p>
          )}
          {item.id === 'tool-arrm' && (
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>
              {item.name}
            </p>
          )}
          <p style={{ margin: item.id !== 'tool-arrm' ? '4px 0 0' : 0, fontSize: 12, color: '#FF8C00' }}>
            par {item.creator}
          </p>
        </div>
        {item.description && (
          <p style={{ margin: 0, fontSize: 12, color: isDarkMode ? '#aaaaaa' : '#666', lineHeight: 1.5 }}>
            {item.description}
          </p>
        )}
        <button
          onClick={handleDownload}
          style={{
            marginTop: 'auto', width: '100%', padding: '8px 12px',
            background: 'linear-gradient(135deg, #FF8C00, #FFA500)',
            color: '#1a1a1a', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'filter 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
          onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          <Download style={{ width: 14, height: 14 }} />
          Télécharger
        </button>
      </div>
    </div>
  );
};

// ── Carte YouTube ─────────────────────────────────────────────────────────────
const YoutubeCard: React.FC<{ item: ModalItem; isDarkMode: boolean }> = ({ item, isDarkMode }) => {
  const handleWatch = () => {
    if (item.youtubeUrl) {
      window.open(item.youtubeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div style={{
      background: isDarkMode ? '#1a1a1a' : '#f9f9f9',
      borderRadius: 12,
      border: `1px solid ${isDarkMode ? '#2a2a2a' : '#e5e5e5'}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'pointer',
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onClick={handleWatch}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#FF8C00';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isDarkMode ? '#2a2a2a' : '#e5e5e5';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {item.youtubeId && <YoutubeThumbnail youtubeId={item.youtubeId} name={item.name} />}

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isDarkMode ? '#ffffff' : '#1a1a1a', lineHeight: 1.4 }}>
            {item.name}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#FF8C00' }}>
            par {item.creator}
          </p>
        </div>
        <div style={{
          marginTop: 'auto', width: '100%', padding: '7px 12px',
          background: '#FF0000', color: 'white', borderRadius: 8,
          fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Play style={{ width: 13, height: 13, marginLeft: 2 }} />
          Regarder
        </div>
      </div>
    </div>
  );
};

// ── Modal principal ───────────────────────────────────────────────────────────
const ContentModal: React.FC<ContentModalProps> = ({ isOpen, onClose, config, isDarkMode }) => {
  const [search, setSearch] = useState('');

  // Fermer avec Échap
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
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

  if (!isOpen) return null;

  const filtered = config.items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.creator.toLowerCase().includes(search.toLowerCase())
  );

  const isEmpty = config.items.length === 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(4px)'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: isDarkMode ? '#111111' : '#ffffff',
        borderRadius: 16,
        border: '2px solid #FF8C00',
        width: '100%',
        maxWidth: 900,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(255,140,0,0.2)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '2px solid #FF8C00',
          background: isDarkMode ? '#0f0f0f' : '#fafafa',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, height: 28, background: '#FF8C00', borderRadius: 2 }} />
            <span style={{ fontSize: 18, fontWeight: 800, color: '#FF8C00', letterSpacing: '0.1em' }}>
              {config.title}
            </span>
            <span style={{
              fontSize: 12, padding: '3px 10px',
              background: 'rgba(255,140,0,0.15)', color: '#FF8C00',
              borderRadius: 20, border: '1px solid rgba(255,140,0,0.3)'
            }}>
              {config.items.length} {config.items.length > 1 ? 'entrées' : 'entrée'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: '1px solid rgba(255,140,0,0.3)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDarkMode ? '#aaa' : '#666',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,140,0,0.15)'; e.currentTarget.style.color = '#FF8C00'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isDarkMode ? '#aaa' : '#666'; }}
            title="Fermer (Échap)"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── Barre de recherche ── */}
        {config.items.length > 4 && (
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${isDarkMode ? '#222' : '#eee'}`, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                width: 16, height: 16, color: '#FF8C00'
              }} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 38px',
                  background: isDarkMode ? '#1a1a1a' : '#f5f5f5',
                  border: `1px solid ${isDarkMode ? '#333' : '#ddd'}`,
                  borderRadius: 8, fontSize: 14,
                  color: isDarkMode ? '#fff' : '#1a1a1a',
                  outline: 'none', boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = '#FF8C00'}
                onBlur={e => e.target.style.borderColor = isDarkMode ? '#333' : '#ddd'}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: isDarkMode ? '#aaa' : '#999'
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Contenu scrollable ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {isEmpty ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: isDarkMode ? '#555' : '#aaa' }}>
              <ExternalLink style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 15, margin: 0 }}>Aucun contenu pour le moment</p>
              <p style={{ fontSize: 13, margin: '8px 0 0', opacity: 0.7 }}>Revenez bientôt !</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: isDarkMode ? '#555' : '#aaa' }}>
              <p style={{ fontSize: 14, margin: 0 }}>Aucun résultat pour "<span style={{ color: '#FF8C00' }}>{search}</span>"</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16
            }}>
              {filtered.map(item =>
                config.type === 'youtube'
                  ? <YoutubeCard key={item.id} item={item} isDarkMode={isDarkMode} />
                  : <DownloadCard key={item.id} item={item} isDarkMode={isDarkMode} />
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '10px 20px',
          borderTop: `1px solid ${isDarkMode ? '#222' : '#eee'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <span style={{ fontSize: 11, color: isDarkMode ? '#444' : '#bbb' }}>
            {config.type === 'youtube' ? 'Les vidéos s\'ouvrent sur YouTube' : 'Les liens de téléchargement sont sécurisés'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContentModal;
