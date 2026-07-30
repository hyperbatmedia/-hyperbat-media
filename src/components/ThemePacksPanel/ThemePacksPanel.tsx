// Fichier: src/components/ThemePacksPanel/ThemePacksPanel.tsx
import React, { useMemo } from 'react';
import { X, Gift, Download, Package } from 'lucide-react';
import { ThemePacksData } from '../../types';

// Convertit n'importe quel format de lien Google Drive (partage, view, open...)
// en lien de téléchargement direct, pour éviter la page de prévisualisation
// Drive qui s'affiche sinon sur les gros fichiers comme les .zip.
const toDirectDriveDownload = (url: string): string => {
  const match = url.match(/[-\w]{25,}/); // l'ID Drive fait toujours 25+ caractères alphanumériques/-/_
  if (!match) return url;
  return `https://drive.google.com/uc?export=download&id=${match[0]}`;
};

interface ThemePacksPanelProps {
  packsData: ThemePacksData;
  onClose: () => void;
  isDarkMode: boolean;
}

const ThemePacksPanel: React.FC<ThemePacksPanelProps> = ({ packsData, onClose, isDarkMode }) => {
  const { featuredMonth, packs } = packsData;
  const bg = isDarkMode ? '#0f0519' : '#f3f4f6';
  const headBg = isDarkMode ? '#0a0314' : '#f9fafb';
  const cardBg = isDarkMode ? '#151221' : '#ffffff';
  const cardBorder = isDarkMode ? '#262133' : '#e5e7eb';
  const text = isDarkMode ? '#ffffff' : '#1f2937';
  const textSecondary = isDarkMode ? '#9ca3af' : '#6b7280';

  // Le pack mis en avant : celui dont le "month" correspond à featuredMonth,
  // choisi manuellement dans l'admin (sinon le premier du tableau en repli).
  const featuredPack = useMemo(
    () => packs.find(p => p.month === featuredMonth) ?? packs[0],
    [packs, featuredMonth]
  );
  const historyPacks = useMemo(
    () => packs.filter(p => p.month !== featuredPack?.month),
    [packs, featuredPack]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: '720px', maxHeight: '85vh', backgroundColor: bg, display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: headBg, borderBottom: '4px solid #FF8C00' }}
        >
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" style={{ color: '#fb923c' }} />
            <div>
              <h3 className="text-lg font-black" style={{ color: '#fb923c' }}>Packs de thèmes par mois</h3>
              <p className="text-xs" style={{ color: textSecondary }}>Tous les thèmes ajoutés, regroupés mois par mois</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: textSecondary }} className="hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto px-6 py-5" style={{ flex: 1 }}>

          {featuredPack && (
            <div
              className="rounded-2xl p-5 flex items-center justify-between gap-4 mb-6 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(234,179,8,0.10))',
                border: '1.5px solid rgba(249,115,22,0.5)',
                boxShadow: '0 0 30px rgba(249,115,22,0.12)'
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <Gift className="w-9 h-9 flex-shrink-0" style={{ color: '#FFA500' }} />
                <div className="min-w-0">
                  <span
                    className="inline-block text-white font-black rounded-md px-2 py-0.5 mb-1"
                    style={{ backgroundColor: '#dc2626', fontSize: '10px', letterSpacing: '0.5px' }}
                  >
                    NOUVEAU
                  </span>
                  <div className="font-black text-xl" style={{ color: text }}>{featuredPack.label}</div>
                  {featuredPack.note && (
                    <div className="text-sm mt-1" style={{ color: textSecondary }}>{featuredPack.note}</div>
                  )}
                </div>
              </div>
              <a
                href={toDirectDriveDownload(featuredPack.driveUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 font-black text-sm px-5 py-3 rounded-xl flex items-center gap-2 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg,#f97316,#eab308)', color: '#1a1206', boxShadow: '0 4px 14px rgba(249,115,22,0.4)' }}
              >
                <Download className="w-4 h-4" /> Télécharger
              </a>
            </div>
          )}

          {historyPacks.length > 0 && (
            <>
              <div className="text-xs font-bold uppercase tracking-wide mb-2 ml-1" style={{ color: textSecondary }}>
                Historique des mois précédents
              </div>
              <div className="flex flex-col gap-2">
                {historyPacks.map(pack => (
                  <div
                    key={pack.month}
                    className="flex items-center justify-between rounded-lg px-4 py-3"
                    style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-sm font-semibold" style={{ color: text }}>{pack.label}</div>
                      {pack.note && (
                        <div className="text-xs mt-0.5 truncate" style={{ color: textSecondary }}>{pack.note}</div>
                      )}
                    </div>
                    <a
                      href={toDirectDriveDownload(pack.driveUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-xs font-bold flex items-center gap-1.5"
                      style={{ color: '#FFA500' }}
                    >
                      <Download className="w-3.5 h-3.5" /> Télécharger
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}

          {packs.length === 0 && (
            <div className="text-center py-10 text-sm" style={{ color: textSecondary }}>
              Aucun pack disponible pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemePacksPanel;
