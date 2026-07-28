// Fichier: src/components/RecapThemesPanel/RecapThemesPanel.tsx
import { useMemo, useState, useCallback } from 'react';
import { X, Download, Search, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { ThemeItem } from '../../types';

// ── Import des données statiques ──────────────────────────────────────────────
import bobSystemsData from '../../data/bob-systems.json';
import { resolveBobSlug } from '../../data/systemAliases';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BobSystem {
  slug: string;
  fullname: string;
  existsOn: string; // "Batocera", "Retrobat", "Batocera + Retrobat", ""
}

interface SystemRow {
  slug: string;
  fullname: string;
  inRetrobat: boolean;
  inBatocera: boolean;
  systemThemes: number;
  defaultThemes: number;
  gameThemes: number;
  total: number;
}

interface RecapThemesPanelProps {
  themes: ThemeItem[];
  onClose: () => void;
  isDarkMode: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseExistsOn = (existsOn: string) => {
  const val = existsOn.toLowerCase();
  return {
    inRetrobat: val.includes('retrobat'),
    inBatocera: val.includes('batocera'),
  };
};

const exportCSV = (rows: SystemRow[]) => {
  const headers = ['Slug', 'Nom système', 'RetroBat', 'Batocera', 'Thèmes système', 'Thèmes défaut', 'Thèmes jeu', 'Total'];
  const lines = [
    headers.join(';'),
    ...rows.map(r => [
      r.slug,
      r.fullname,
      r.inRetrobat ? 'OUI' : 'NON',
      r.inBatocera ? 'OUI' : 'NON',
      r.systemThemes,
      r.defaultThemes,
      r.gameThemes,
      r.total,
    ].join(';'))
  ];
  // BOM UTF-8 (\uFEFF) + CRLF pour compatibilité Excel / LibreOffice
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recap-themes-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
};

// ── Composant principal ───────────────────────────────────────────────────────
export default function RecapThemesPanel({ themes, onClose, isDarkMode }: RecapThemesPanelProps) {
  const [search, setSearch] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<'all' | 'retrobat' | 'batocera' | 'both' | 'none'>('all');
  const [filterMissing, setFilterMissing] = useState<'all' | 'system' | 'default' | 'both-missing'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'system' | 'default' | 'game' | 'total'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // ── Calcul des compteurs ──────────────────────────────────────────────────
  const rows = useMemo<SystemRow[]>(() => {
    const bobSystems = bobSystemsData as BobSystem[];

    // Index inversé : bobSlug → slugs themes qui y correspondent
    const bobSlugToThemeSlugs = new Map<string, string[]>();
    const allThemeSlugs = [...new Set(themes.map(t => t.system))];
    for (const themeSlug of allThemeSlugs) {
      const bobSlug = resolveBobSlug(themeSlug);
      if (!bobSlug) continue;
      if (!bobSlugToThemeSlugs.has(bobSlug)) bobSlugToThemeSlugs.set(bobSlug, []);
      bobSlugToThemeSlugs.get(bobSlug)!.push(themeSlug);
    }

    return bobSystems.map(sys => {
      const { inRetrobat, inBatocera } = parseExistsOn(sys.existsOn);
      const matchingSlugs = bobSlugToThemeSlugs.get(sys.slug) ?? [sys.slug];

      const systemThemes = themes.filter(
        t => matchingSlugs.includes(t.system) && t.category === 'system-themes'
      ).length;

      const defaultThemes = themes.filter(
        t => matchingSlugs.includes(t.system) && t.category === 'default-themes'
      ).length;

      const gameThemes = themes.filter(
        t => matchingSlugs.includes(t.system) && t.category === 'game-themes'
      ).length;

      return {
        slug: sys.slug,
        fullname: sys.fullname,
        inRetrobat,
        inBatocera,
        systemThemes,
        defaultThemes,
        gameThemes,
        total: systemThemes + defaultThemes + gameThemes,
      };
    });
  }, [themes]);

  // ── Stats globales ────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: rows.length,
    withSystem: rows.filter(r => r.systemThemes > 0).length,
    withDefault: rows.filter(r => r.defaultThemes > 0).length,
    withGame: rows.filter(r => r.gameThemes > 0).length,
    missingBoth: rows.filter(r => r.systemThemes === 0 && r.defaultThemes === 0 && r.gameThemes === 0).length,
    retrobat: rows.filter(r => r.inRetrobat).length,
    batocera: rows.filter(r => r.inBatocera).length,
  }), [rows]);

  // ── Filtrage + tri ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = rows.filter(r => {
      const matchSearch = !search ||
        r.fullname.toLowerCase().includes(search.toLowerCase()) ||
        r.slug.toLowerCase().includes(search.toLowerCase());

      const matchPlatform =
        filterPlatform === 'all' ? true :
        filterPlatform === 'retrobat' ? r.inRetrobat && !r.inBatocera :
        filterPlatform === 'batocera' ? r.inBatocera && !r.inRetrobat :
        filterPlatform === 'both' ? r.inRetrobat && r.inBatocera :
        filterPlatform === 'none' ? !r.inRetrobat && !r.inBatocera : true;

      const matchMissing =
        filterMissing === 'all' ? true :
        filterMissing === 'system' ? r.systemThemes === 0 :
        filterMissing === 'default' ? r.defaultThemes === 0 :
        filterMissing === 'both-missing' ? r.systemThemes === 0 && r.defaultThemes === 0 && r.gameThemes === 0 : true;

      return matchSearch && matchPlatform && matchMissing;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.fullname.localeCompare(b.fullname);
      else if (sortBy === 'system') cmp = a.systemThemes - b.systemThemes;
      else if (sortBy === 'default') cmp = a.defaultThemes - b.defaultThemes;
      else if (sortBy === 'game') cmp = a.gameThemes - b.gameThemes;
      else if (sortBy === 'total') cmp = a.total - b.total;
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [rows, search, filterPlatform, filterMissing, sortBy, sortAsc]);

  const handleSort = useCallback((col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(p => !p);
    else { setSortBy(col); setSortAsc(true); }
  }, [sortBy]);

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3" style={{ color: '#FF8C00' }} />
      : <ChevronDown className="w-3 h-3" style={{ color: '#FF8C00' }} />;
  };

  const bg = isDarkMode ? '#0f0519' : '#f3f4f6';
  const cardBg = isDarkMode ? '#111827' : '#ffffff';
  const text = isDarkMode ? '#ffffff' : '#1f2937';
  const textSecondary = isDarkMode ? '#9ca3af' : '#6b7280';
  const borderColor = isDarkMode ? '#1f2937' : '#e5e7eb';

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: bg, color: text }}>

      {/* ── Header ── */}
      <div className="border-b-4 flex-shrink-0" style={{ borderColor: '#FF8C00', backgroundColor: isDarkMode ? '#0a0314' : '#f9fafb' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-wide" style={{
                background: 'linear-gradient(180deg, #FF8C00 0%, #FFA500 30%, #FFFF00 50%, #FFA500 70%, #FF8C00 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(1px 1px 0px #000)'
              }}>
                RÉCAP THÈMES
              </h1>
              <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                Couverture des thèmes par système — {rows.length} systèmes de référence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm border-2 transition hover:brightness-110"
              style={{ backgroundColor: cardBg, borderColor: borderColor, color: textSecondary }}>
              <HelpCircle className="w-4 h-4" />
              Guide
            </button>
            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border-2 transition hover:brightness-110"
              style={{ backgroundColor: '#FF8C00', borderColor: '#FFD700', color: 'white' }}>
              <Download className="w-4 h-4" />
              Télécharger CSV ({filtered.length})
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition hover:brightness-110"
              style={{ backgroundColor: cardBg, border: `2px solid ${borderColor}`, color: textSecondary }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats rapides ── */}
      <div className="flex-shrink-0 border-b" style={{ borderColor: borderColor, backgroundColor: isDarkMode ? '#0d0d1a' : '#f3f4f6' }}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Total systèmes', value: stats.total, color: '#FFA500' },
              { label: 'Ont thème système', value: stats.withSystem, color: '#22c55e' },
              { label: 'Ont thème défaut', value: stats.withDefault, color: '#60A5FA' },
              { label: 'Ont thème jeu', value: stats.withGame, color: '#f472b6' },
              { label: 'Aucun thème', value: stats.missingBoth, color: '#ef4444' },
              { label: 'RetroBat', value: stats.retrobat, color: '#a78bfa' },
              { label: 'Batocera', value: stats.batocera, color: '#34d399' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{ backgroundColor: cardBg, borderColor }}>
                <span className="text-lg font-black" style={{ color }}>{value}</span>
                <span className="text-xs" style={{ color: textSecondary }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="flex-shrink-0 border-b" style={{ borderColor, backgroundColor: cardBg }}>
        <div className="container mx-auto px-4 py-3 flex flex-wrap gap-3 items-center">

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#FFA500' }} />
            <input
              type="text"
              placeholder="Rechercher un système..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb', borderColor, color: text, width: '220px' }}
            />
          </div>

          {/* Filtre plateforme */}
          <div className="flex gap-1">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'both', label: 'RB + BAT' },
              { id: 'retrobat', label: 'RB only' },
              { id: 'batocera', label: 'BAT only' },
              { id: 'none', label: 'Aucun' },
            ].map(({ id, label }) => (
              <button key={id}
                onClick={() => setFilterPlatform(id as typeof filterPlatform)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:brightness-110"
                style={{
                  backgroundColor: filterPlatform === id ? '#FF8C00' : (isDarkMode ? '#1f2937' : '#f9fafb'),
                  borderColor: filterPlatform === id ? '#FFD700' : borderColor,
                  color: filterPlatform === id ? 'white' : textSecondary,
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Filtre manquants */}
          <div className="flex gap-1">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'system', label: '0 Système' },
              { id: 'default', label: '0 Défaut' },
              { id: 'both-missing', label: '0 Aucun' },
            ].map(({ id, label }) => (
              <button key={id}
                onClick={() => setFilterMissing(id as typeof filterMissing)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:brightness-110"
                style={{
                  backgroundColor: filterMissing === id ? '#ef4444' : (isDarkMode ? '#1f2937' : '#f9fafb'),
                  borderColor: filterMissing === id ? '#fca5a5' : borderColor,
                  color: filterMissing === id ? 'white' : textSecondary,
                }}>
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto text-xs" style={{ color: textSecondary }}>
            {filtered.length} système{filtered.length > 1 ? 's' : ''} affichés
          </div>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="rounded-xl border overflow-hidden" style={{ borderColor }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f9fafb' }}>
                  <th className="px-4 py-3 text-left font-bold border-b cursor-pointer select-none"
                    style={{ borderColor, color: '#FFA500' }}
                    onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      Système <SortIcon col="name" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center font-bold border-b" style={{ borderColor, color: textSecondary }}>
                    Plateforme
                  </th>
                  <th className="px-4 py-3 text-center font-bold border-b cursor-pointer select-none"
                    style={{ borderColor, color: '#22c55e' }}
                    onClick={() => handleSort('system')}>
                    <div className="flex items-center justify-center gap-1">
                      Thèmes système <SortIcon col="system" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center font-bold border-b cursor-pointer select-none"
                    style={{ borderColor, color: '#60A5FA' }}
                    onClick={() => handleSort('default')}>
                    <div className="flex items-center justify-center gap-1">
                      Thèmes défaut <SortIcon col="default" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center font-bold border-b cursor-pointer select-none"
                    style={{ borderColor, color: '#f472b6' }}
                    onClick={() => handleSort('game')}>
                    <div className="flex items-center justify-center gap-1">
                      Thèmes jeu <SortIcon col="game" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center font-bold border-b cursor-pointer select-none"
                    style={{ borderColor, color: '#FFD700' }}
                    onClick={() => handleSort('total')}>
                    <div className="flex items-center justify-center gap-1">
                      Total <SortIcon col="total" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.slug}
                    style={{
                      backgroundColor: i % 2 === 0
                        ? (isDarkMode ? '#0f0f1a' : '#ffffff')
                        : (isDarkMode ? '#111827' : '#f9fafb'),
                    }}
                    className="hover:brightness-110 transition">

                    {/* Nom */}
                    <td className="px-4 py-2.5 border-b" style={{ borderColor }}>
                      <div className="font-semibold" style={{ color: text }}>{row.fullname}</div>
                      <div className="text-xs" style={{ color: textSecondary }}>{row.slug}</div>
                    </td>

                    {/* Plateforme badges */}
                    <td className="px-4 py-2.5 border-b text-center" style={{ borderColor }}>
                      <div className="flex gap-1 justify-center flex-wrap">
                        {row.inRetrobat && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)' }}>
                            RB
                          </span>
                        )}
                        {row.inBatocera && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: 'rgba(52,211,153,0.2)', color: '#34d399', border: '1px solid rgba(52,211,153,0.4)' }}>
                            BAT
                          </span>
                        )}
                        {!row.inRetrobat && !row.inBatocera && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: 'rgba(107,114,128,0.2)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.4)' }}>
                            HB
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Thèmes système */}
                    <td className="px-4 py-2.5 border-b text-center font-black text-base" style={{ borderColor }}>
                      {row.systemThemes === 0
                        ? <span style={{ color: '#ef4444' }}>0</span>
                        : <span style={{ color: '#22c55e' }}>{row.systemThemes}</span>
                      }
                    </td>

                    {/* Thèmes défaut */}
                    <td className="px-4 py-2.5 border-b text-center font-black text-base" style={{ borderColor }}>
                      {row.defaultThemes === 0
                        ? <span style={{ color: '#ef4444' }}>0</span>
                        : <span style={{ color: '#60A5FA' }}>{row.defaultThemes}</span>
                      }
                    </td>

                    {/* Thèmes jeu */}
                    <td className="px-4 py-2.5 border-b text-center font-black text-base" style={{ borderColor }}>
                      {row.gameThemes === 0
                        ? <span style={{ color: '#ef4444' }}>0</span>
                        : <span style={{ color: '#f472b6' }}>{row.gameThemes}</span>
                      }
                    </td>

                    {/* Total */}
                    <td className="px-4 py-2.5 border-b text-center font-black text-base" style={{ borderColor }}>
                      {row.total === 0
                        ? <span style={{ color: '#ef4444' }}>0</span>
                        : <span style={{ color: '#FFD700' }}>{row.total}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-16" style={{ color: textSecondary }}>
                <p className="text-lg">Aucun système trouvé</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALE GUIDE */}
      {showGuide && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 border"
            style={{ backgroundColor: cardBg, borderColor, color: text }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor }}>
              <h3 className="text-lg font-black" style={{ color: '#FF8C00' }}>Guide — "Récap Thèmes"</h3>
              <button onClick={() => setShowGuide(false)} style={{ color: textSecondary }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm" style={{ color: textSecondary }}>
              <section>
                <h4 className="font-bold mb-1" style={{ color: text }}>À quoi sert ce panneau</h4>
                <p>
                  Pour chaque système RetroBat/Batocera de référence, il montre s'il existe sur RetroBat,
                  Batocera, les deux ou aucun (badges RB/BAT/HB), et combien tu as de thèmes système, par
                  défaut et par jeu pour ce système, avec le total.
                </p>
              </section>

              <section>
                <h4 className="font-bold mb-1" style={{ color: text }}>Filtrer / trier</h4>
                <p>
                  Recherche par nom de système, filtre par plateforme (RetroBat/Batocera/les deux/aucune),
                  filtre "manquants" (système ou thème par défaut absent), et tri par n'importe quelle
                  colonne en cliquant sur son en-tête.
                </p>
              </section>

              <section>
                <h4 className="font-bold mb-1" style={{ color: text }}>Exporter</h4>
                <p>Le bouton "Télécharger CSV" exporte exactement les lignes actuellement filtrées/affichées.</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
