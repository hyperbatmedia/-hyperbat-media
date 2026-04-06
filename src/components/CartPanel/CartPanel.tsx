// Fichier: src/components/CartPanel/CartPanel.tsx
import React, { useState, useCallback } from 'react';
import { X, Trash2, Download, CheckSquare, Square } from 'lucide-react';
import { ThemeItem, SystemRow } from '../../types';
import { getThemeKey } from '../../utils/themeUtils';

const CART_MAX = 10;

interface CartPanelProps {
  cart: ThemeItem[];
  onRemove: (key: string) => void;
  onClear: () => void;
  onClose: () => void;
  systems: SystemRow[];
  isDarkMode: boolean;
}

const CartPanel: React.FC<CartPanelProps> = ({
  cart, onRemove, onClear, onClose, systems, isDarkMode
}) => {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(cart.map(t => getThemeKey(t)))
  );
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const getSystemName = (systemId: string) =>
    systems.find(s => s.id === systemId)?.name || systemId;

  const getCategoryName = (categoryId: string) => {
    const map: Record<string, string> = {
      'game-themes': 'Jeu', 'default-themes': 'Défaut',
      'system-themes': 'Système', 'artwork': 'Artwork',
      'collection': 'Collection', 'main-themes': 'Principal',
      'tools': 'Outil', 'tutorials': 'Tutoriel'
    };
    return map[categoryId] || categoryId;
  };

  const parseSize = (sizeStr: string | undefined): number => {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.,]+)\s*(mo|mb|go|gb|ko|kb)?/i);
    if (!match) return 0;
    const val = parseFloat(match[1].replace(',', '.'));
    const unit = (match[2] || 'mo').toLowerCase();
    if (unit === 'go' || unit === 'gb') return val * 1024;
    if (unit === 'ko' || unit === 'kb') return val / 1024;
    return val;
  };

  const toggleAll = useCallback(() => {
    if (checked.size === cart.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(cart.map(t => getThemeKey(t))));
    }
  }, [checked, cart]);

  const toggleOne = useCallback((key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const selectedThemes = cart.filter(t => checked.has(getThemeKey(t)));
  const totalMo = selectedThemes.reduce((acc, t) => acc + parseSize(t.size), 0);
  const allChecked = checked.size === cart.length && cart.length > 0;

  const downloadAll = useCallback(async () => {
    if (!selectedThemes.length || downloading) return;
    setDownloading(true);
    setProgress({ current: 0, total: selectedThemes.length });

    for (let i = 0; i < selectedThemes.length; i++) {
      const theme = selectedThemes[i];
      setProgress({ current: i + 1, total: selectedThemes.length });

      window.open(theme.downloadUrl, '_blank');
      setDoneKeys(prev => new Set(prev).add(getThemeKey(theme)));

      if (i < selectedThemes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setDownloading(false);
    setProgress(null);

    setTimeout(() => {
      onClear();
      onClose();
    }, 1000);
  }, [selectedThemes, downloading, onClear, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-xl border-2 flex flex-col"
        style={{
          backgroundColor: '#111827',
          borderColor: '#FF8C00',
          width: '540px',
          maxWidth: '95vw',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f172a', borderRadius: '12px 12px 0 0' }}>
          <h2 className="font-black text-lg" style={{ color: '#FF8C00' }}>
            🛒 Mon Panier
            <span className="ml-2 text-sm font-normal" style={{ color: '#6b7280' }}>
              {cart.length}/{CART_MAX} thèmes
            </span>
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition"
            style={{ color: '#6b7280' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre d'actions */}
        <div className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: '#1f2937' }}>
          <button onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-semibold transition hover:brightness-125"
            style={{ color: '#FFA500' }}>
            {allChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {allChecked ? 'Tout décocher' : 'Tout cocher'}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => { onClear(); onClose(); }}
            className="flex items-center gap-1.5 text-sm transition hover:text-red-400"
            style={{ color: '#4b5563' }}>
            <Trash2 className="w-4 h-4" />
            Vider le panier
          </button>
        </div>

        {/* ── Liste scrollable ── */}
        <div className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#FF8C00 #1a1a1a' }}>
          {cart.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#4b5563' }}>
              <p>Le panier est vide</p>
            </div>
          ) : (
            cart.map(theme => {
              const key = getThemeKey(theme);
              const isChecked = checked.has(key);
              const isDone = doneKeys.has(key);
              const imgError = imgErrors.has(key);

              return (
                <div key={key}
                  className="flex items-center gap-3 px-4 py-2.5 border-b transition"
                  style={{
                    borderColor: '#1f2937',
                    backgroundColor: isDone
                      ? 'rgba(34,197,94,0.05)'
                      : isChecked ? 'rgba(255,140,0,0.04)' : 'transparent'
                  }}>

                  {/* Checkbox */}
                  <button onClick={() => toggleOne(key)}
                    className="flex-shrink-0 transition hover:scale-110"
                    style={{ color: isChecked ? '#FF8C00' : '#374151' }}>
                    {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>

                  {/* Miniature 80×60 */}
                  <div className="flex-shrink-0 rounded-md overflow-hidden border"
                    style={{ width: 80, height: 60, borderColor: '#333', backgroundColor: '#1f2937' }}>
                    {theme.imageUrl && !imgError ? (
                      <img
                        src={theme.imageUrl}
                        alt={theme.name}
                        referrerPolicy="no-referrer"
                        onError={() => setImgErrors(prev => new Set(prev).add(key))}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🎮</div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate mb-1"
                      style={{ color: isDone ? '#22c55e' : '#fff' }}>
                      {isDone && <span className="mr-1">✓</span>}
                      {theme.name}
                    </p>
                    <div className="flex gap-1.5 flex-wrap mb-1">
                      <span className="px-1.5 py-0.5 rounded-full font-semibold border"
                        style={{ backgroundColor: 'rgba(255,140,0,0.2)', color: '#FFA500', borderColor: 'rgba(255,140,0,0.4)', fontSize: '10px' }}>
                        {getSystemName(theme.system)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full font-semibold border"
                        style={{ backgroundColor: 'rgba(59,130,246,0.2)', color: '#60A5FA', borderColor: 'rgba(59,130,246,0.4)', fontSize: '10px' }}>
                        {getCategoryName(theme.category)}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#4b5563' }}>Par {theme.creator}</p>
                  </div>

                  {/* Taille + Retirer */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        onRemove(key);
                        setChecked(prev => { const n = new Set(prev); n.delete(key); return n; });
                      }}
                      className="p-1 rounded transition hover:text-red-400"
                      style={{ color: '#374151' }}>
                      <X className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold" style={{ color: '#FFA500' }}>
                      {theme.size || '—'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer fixe ── */}
        <div className="border-t flex-shrink-0"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f172a', borderRadius: '0 0 12px 12px' }}>

          {/* Barre de progression */}
          {downloading && progress && (
            <div className="px-5 pt-3">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6b7280' }}>
                <span>Téléchargement {progress.current}/{progress.total}...</span>
                <span style={{ color: '#FFA500' }}>
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="w-full rounded-full h-2.5" style={{ backgroundColor: '#1f2937' }}>
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: '#FF8C00',
                    width: `${(progress.current / progress.total) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          <div className="px-5 py-4 flex flex-col gap-2">

            {/* Ligne 1 : message + bouton télécharger */}
            {cart.length > 0 && (
              <div className="flex items-center gap-3">
                {/* Message d'info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-black"
                    style={{ backgroundColor: '#FF8C00', color: '#1a1a1a', fontSize: '11px', minWidth: '20px' }}>
                    !
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#d4a853' }}>
                    Si un seul DL se lance —{' '}
                    <span style={{ color: '#B22222', fontWeight: 700 }}>autorisez les téléchargements multiples</span>
                    {' '}dans la barre d'adresse de votre navigateur.
                  </p>
                </div>

                {/* Bouton télécharger */}
                <button
                  onClick={downloadAll}
                  disabled={!checked.size || downloading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm border-2 transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{ backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }}>
                  <Download className="w-4 h-4" />
                  {downloading ? 'En cours...' : 'Télécharger'}
                </button>
              </div>
            )}

            {/* Ligne 2 : nombre sélectionnés + poids */}
            {cart.length > 0 && (
              <p className="text-xs" style={{ color: '#6b7280' }}>
                {checked.size} sélectionné{checked.size > 1 ? 's' : ''}
                {totalMo > 0 && (
                  <span style={{ color: '#FFA500' }}> • ~{Math.round(totalMo)} Mo</span>
                )}
                {downloading && (
                  <span style={{ color: '#FFA500' }}> • 1 fichier toutes les 2 secondes...</span>
                )}
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPanel;
