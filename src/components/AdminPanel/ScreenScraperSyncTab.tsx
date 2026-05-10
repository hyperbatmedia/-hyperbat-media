// ScreenScraperSyncTab.tsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Upload, CheckCircle, Loader2, Check, Database,
  RefreshCw, Download, Filter
} from 'lucide-react';
import { ThemeItem } from '../../types';
import {
  parseSSManquesCSV,
  SSGameEntry,
  SS_TO_THEME,
} from './utils/screenScraperUtils';
import { generateSystems } from '../../hooks/useSystemsLogic';
import { categories, systemsData, sectionIcons } from '../../constants';

// ===== INTERFACES =====

interface RowData {
  // Thème de la vitrine (peut être null si absent vitrine)
  theme: ThemeItem | null;
  // Entrée du CSV SS (peut être null si pas de CSV ou pas trouvé dans CSV)
  ssEntry: SSGameEntry | null;
  // Statut calculé
  onSS: boolean;       // onScreenScraper actuel du thème
  csvStatus: 'present' | 'missing' | 'none' | 'no-csv'; // statut dans le CSV SS
  isAbsentVitrine: boolean; // dans CSV SS mais absent de la vitrine
}

type FilterType = 'all' | 'on-ss' | 'to-upload' | 'absent-vitrine';

// ===== LISTE DES SYSTÈMES =====
const ALL_SYSTEM_SLUGS: { slug: string; name: string }[] = (() => {
  const systems = generateSystems(categories, systemsData, sectionIcons);
  const seen = new Set<string>();
  const result: { slug: string; name: string }[] = [];
  for (const s of systems) {
    if (s.isHeader || s.isSubHeader) continue;
    if (['all', 'tools', 'tutorials', 'main-themes', 'other-themes'].includes(s.id)) continue;
    const parts = s.id.split('-');
    const slug = parts[parts.length - 1];
    if (!seen.has(slug)) {
      seen.add(slug);
      result.push({ slug, name: s.name });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
})();

// ===== COMPOSANT PRINCIPAL =====

interface ScreenScraperSyncTabProps {
  themes: ThemeItem[];
  onUpdateThemes: (themes: ThemeItem[]) => Promise<void>;
}

const ScreenScraperSyncTab: React.FC<ScreenScraperSyncTabProps> = ({ themes, onUpdateThemes }) => {
  const [systemSlug, setSystemSlug] = useState('');
  const [csvEntries, setCsvEntries] = useState<SSGameEntry[] | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set()); // ids de ThemeItem
  const [filter, setFilter] = useState<FilterType>('all');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Deviner le slug depuis le nom de fichier ──────────────────────────────
  const guessSlug = (fileName: string): string => {
    const base = fileName.replace(/\.csv$/i, '').replace(/-manques$/i, '').toLowerCase();
    const ssMatch = SS_TO_THEME[base];
    if (ssMatch !== undefined && ssMatch !== null) return ssMatch;
    const found = ALL_SYSTEM_SLUGS.find(s => s.slug === base);
    return found ? found.slug : '';
  };

  // ── Thèmes du système sélectionné ────────────────────────────────────────
  const systemThemes = useMemo(
    () => themes.filter(t => t.system === systemSlug),
    [themes, systemSlug]
  );

  // ── Construction des lignes du tableau ───────────────────────────────────
  const rows = useMemo((): RowData[] => {
    const result: RowData[] = [];

    // Lignes vitrine
    for (const theme of systemThemes) {
      let ssEntry: SSGameEntry | null = null;
      let csvStatus: RowData['csvStatus'] = 'no-csv';

      if (csvEntries) {
        // Chercher par nom exact d'abord (les consoles matchent bien)
        const exact = csvEntries.find(e =>
          e.gameName.toLowerCase().trim() === theme.name.toLowerCase().trim()
        );
        if (exact) {
          ssEntry = exact;
          csvStatus = exact.hasTheme ? 'present' : 'missing';
        } else {
          csvStatus = 'none';
        }
      }

      result.push({
        theme,
        ssEntry,
        onSS: theme.onScreenScraper ?? false,
        csvStatus,
        isAbsentVitrine: false,
      });
    }

    // Lignes "absent vitrine" (dans CSV SS mais pas dans la vitrine)
    if (csvEntries) {
      const themeNames = new Set(systemThemes.map(t => t.name.toLowerCase().trim()));
      for (const entry of csvEntries) {
        if (!themeNames.has(entry.gameName.toLowerCase().trim())) {
          result.push({
            theme: null,
            ssEntry: entry,
            onSS: false,
            csvStatus: entry.hasTheme ? 'present' : 'missing',
            isAbsentVitrine: true,
          });
        }
      }
    }

    return result;
  }, [systemThemes, csvEntries]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    onSS: rows.filter(r => !r.isAbsentVitrine && r.onSS).length,
    toUpload: rows.filter(r => !r.isAbsentVitrine && !r.onSS).length,
    absentVitrine: rows.filter(r => r.isAbsentVitrine).length,
  }), [rows]);

  // ── Lignes filtrées ───────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'on-ss':           return rows.filter(r => !r.isAbsentVitrine && r.onSS);
      case 'to-upload':       return rows.filter(r => !r.isAbsentVitrine && !r.onSS);
      case 'absent-vitrine':  return rows.filter(r => r.isAbsentVitrine);
      default:                return rows;
    }
  }, [rows, filter]);

  // ── Import CSV ────────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    const guessed = guessSlug(file.name);
    if (guessed && !systemSlug) setSystemSlug(guessed);

    try {
      const text = await file.text();
      const parsed = parseSSManquesCSV(text, file.name, guessed || systemSlug);
      if (parsed.entries.length === 0) {
        setError('Aucune entrée trouvée. Vérifiez que le fichier contient les colonnes "Game Name" et "Thème HyperBat".');
        return;
      }
      setCsvEntries(parsed.entries);
      setCsvFileName(file.name);
      setSelected(new Set());
      setSuccess(false);
      setFilter('all');
    } catch (err) {
      setError(`Erreur de lecture : ${String(err)}`);
    }
    e.target.value = '';
  }, [systemSlug]);

  // ── Réanalyser (vider CSV) ────────────────────────────────────────────────
  const handleReset = () => {
    setCsvEntries(null);
    setCsvFileName('');
    setSelected(new Set());
    setSuccess(false);
    setError('');
    setFilter('all');
  };

  // ── Sélection ─────────────────────────────────────────────────────────────
  const toggleRow = (themeId: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(themeId) ? next.delete(themeId) : next.add(themeId);
      return next;
    });
  };

  const toggleAll = () => {
    const selectableIds = filteredRows
      .filter(r => r.theme !== null)
      .map(r => r.theme!.id);
    const allSelected = selectableIds.every(id => selected.has(id));
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        selectableIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        selectableIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const selectableInView = filteredRows.filter(r => r.theme !== null);
  const allInViewSelected = selectableInView.length > 0 && selectableInView.every(r => selected.has(r.theme!.id));

  // ── Appliquer ─────────────────────────────────────────────────────────────
  const handleApply = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Appliquer les changements pour ${selected.size} thème(s) ?`)) return;
    setSaving(true);
    try {
      const updated = themes.map(t => {
        if (!selected.has(t.id)) return t;
        const row = rows.find(r => r.theme?.id === t.id);
        if (!row) return t;
        let newOnSS: boolean;
        if (row.csvStatus === 'present') newOnSS = true;
        else if (row.csvStatus === 'missing') newOnSS = false;
        else newOnSS = !row.onSS;
        return { ...t, onScreenScraper: newOnSS };
      });
      await onUpdateThemes(updated);
      setSuccess(true);
      setSelected(new Set());
    } catch (err) {
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  // ── Export absents vitrine ────────────────────────────────────────────────
  const handleExportAbsents = () => {
    const absentRows = rows.filter(r => r.isAbsentVitrine && r.ssEntry);
    if (!absentRows.length) return;
    const lines = ['Nom SS,Game ID SS,Thème SS'];
    for (const r of absentRows) {
      lines.push(`"${r.ssEntry!.gameName}","${r.ssEntry!.gameId}","${r.ssEntry!.hasTheme ? 'oui' : 'non'}"`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${systemSlug}-absents-vitrine.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentOnSS = themes.filter(t => t.onScreenScraper).length;
  const systemName = ALL_SYSTEM_SLUGS.find(s => s.slug === systemSlug)?.name ?? systemSlug;

  return (
    <div className="text-white space-y-5">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3">
          <Database className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-orange-400 tracking-tight">Synchronisation ScreenScraper</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Import des fichiers "médias manquants" · {currentOnSS} thèmes marqués sur SS
          </p>
        </div>
      </div>

      {/* ── CONTRÔLES ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-gray-500 block mb-1.5">Système</label>
          <select
            value={systemSlug}
            onChange={e => { setSystemSlug(e.target.value); handleReset(); }}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors"
          >
            <option value="">-- Sélectionner --</option>
            {ALL_SYSTEM_SLUGS.map(s => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />
            {csvFileName ? csvFileName : 'Importer CSV SS'}
          </button>

          {csvEntries && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-orange-500/40 hover:bg-gray-700 text-orange-400 rounded-xl text-sm font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* ── ERREUR ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/40 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ── CONTENU (si système sélectionné) ────────────────────────────── */}
      {systemSlug && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setFilter(filter === 'on-ss' ? 'all' : 'on-ss')}
              className={`rounded-xl p-3 text-center transition-all border ${filter === 'on-ss' ? 'border-green-500 bg-green-900/30' : 'border-green-700/30 bg-green-900/20 hover:border-green-600/50'}`}
            >
              <div className="text-2xl font-black text-green-400">{stats.onSS}</div>
              <div className="text-xs text-gray-500 mt-0.5">✅ Sur ScreenScraper</div>
            </button>
            <button
              onClick={() => setFilter(filter === 'to-upload' ? 'all' : 'to-upload')}
              className={`rounded-xl p-3 text-center transition-all border ${filter === 'to-upload' ? 'border-red-500 bg-red-900/30' : 'border-red-700/30 bg-red-900/20 hover:border-red-600/50'}`}
            >
              <div className="text-2xl font-black text-red-400">{stats.toUpload}</div>
              <div className="text-xs text-gray-500 mt-0.5">❌ À uploader sur SS</div>
            </button>
            <button
              onClick={() => setFilter(filter === 'absent-vitrine' ? 'all' : 'absent-vitrine')}
              disabled={stats.absentVitrine === 0}
              className={`rounded-xl p-3 text-center transition-all border ${filter === 'absent-vitrine' ? 'border-yellow-500 bg-yellow-900/30' : 'border-yellow-700/30 bg-yellow-900/20 hover:border-yellow-600/50'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className="text-2xl font-black text-yellow-400">{stats.absentVitrine}</div>
              <div className="text-xs text-gray-500 mt-0.5">⚠️ Absent vitrine</div>
            </button>
          </div>

          {/* Filtre actif + export */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">
                {filter === 'all' && `Tous (${rows.length})`}
                {filter === 'on-ss' && `Sur SS (${stats.onSS})`}
                {filter === 'to-upload' && `À uploader (${stats.toUpload})`}
                {filter === 'absent-vitrine' && `Absent vitrine (${stats.absentVitrine})`}
              </span>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                >
                  Tout afficher
                </button>
              )}
            </div>

            {stats.absentVitrine > 0 && csvEntries && (
              <button
                onClick={handleExportAbsents}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-900/20 border border-yellow-700/30 hover:border-yellow-500/50 text-yellow-400 rounded-lg text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter {stats.absentVitrine} absents ({systemSlug}-absents-vitrine.csv)
              </button>
            )}
          </div>

          {/* Tableau */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

            {/* En-tête tableau */}
            <div className="grid bg-gray-950 border-b border-gray-800" style={{gridTemplateColumns:'44px 1fr 100px 120px'}}>
              <div className="p-3 flex items-center justify-center">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${allInViewSelected ? 'bg-green-600 border-green-500' : 'bg-gray-800 border-gray-600 hover:border-gray-400'}`}
                  onClick={toggleAll}
                >
                  {allInViewSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide flex items-center">
                Thème {systemName && <span className="ml-2 text-gray-600 normal-case font-normal">({systemThemes.length} thèmes)</span>}
              </div>
              <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide flex items-center justify-center">Sur SS</div>
              <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide flex items-center justify-center">CSV SS</div>
            </div>

            {/* Lignes */}
            <div className="max-h-[500px] overflow-y-auto">
              {filteredRows.length === 0 && (
                <div className="p-8 text-center text-gray-600 text-sm">Aucun résultat</div>
              )}

              {filteredRows.map((row, idx) => {
                if (row.isAbsentVitrine) {
                  return (
                    <div
                      key={`absent-${idx}`}
                      className="grid border-b border-gray-800/50 bg-yellow-950/10 border-l-2 border-l-yellow-600/50"
                      style={{gridTemplateColumns:'44px 1fr 100px 120px'}}
                    >
                      <div className="p-3 flex items-center justify-center">
                        <span className="text-gray-600 text-lg">—</span>
                      </div>
                      <div className="p-3">
                        <span className="text-yellow-600/80 text-sm italic">{row.ssEntry?.gameName}</span>
                        <span className="ml-2 text-xs text-yellow-700/60">absent vitrine</span>
                      </div>
                      <div className="p-3 flex items-center justify-center">
                        <span className="text-gray-600 text-lg">—</span>
                      </div>
                      <div className="p-3 flex items-center justify-center">
                        <CsvBadge status={row.csvStatus} />
                      </div>
                    </div>
                  );
                }

                const isSelected = selected.has(row.theme!.id);
                return (
                  <div
                    key={row.theme!.id}
                    className={`grid border-b border-gray-800/50 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-green-950/20 border-l-2 border-l-green-500'
                        : 'hover:bg-gray-800/30 border-l-2 border-l-transparent'
                    }`}
                    style={{gridTemplateColumns:'44px 1fr 100px 120px'}}
                    onClick={() => toggleRow(row.theme!.id)}
                  >
                    <div className="p-3 flex items-center justify-center">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-green-600 border-green-500' : 'bg-gray-800 border-gray-600'}`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div className="p-3 flex items-center">
                      <span className="font-mono text-sm text-gray-200">{row.theme!.name}</span>
                    </div>
                    <div className="p-3 flex items-center justify-center">
                      {row.onSS
                        ? <span className="text-green-400 text-lg">✅</span>
                        : <span className="text-red-400 text-lg">❌</span>
                      }
                    </div>
                    <div className="p-3 flex items-center justify-center">
                      <CsvBadge status={row.csvStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              {selected.size > 0
                ? `${selected.size} thème${selected.size > 1 ? 's' : ''} sélectionné${selected.size > 1 ? 's' : ''}`
                : 'Aucun thème sélectionné'
              }
            </p>
            {success && (
              <span className="text-green-400 text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Sauvegardé avec succès
              </span>
            )}
            <button
              onClick={handleApply}
              disabled={saving || selected.size === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</>
                : <><CheckCircle className="w-4 h-4" /> Appliquer {selected.size > 0 ? `${selected.size} changement${selected.size > 1 ? 's' : ''}` : ''}</>
              }
            </button>
          </div>
        </>
      )}

      {/* ── ÉTAT VIDE ────────────────────────────────────────────────────── */}
      {!systemSlug && (
        <div className="text-center py-12 text-gray-600">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez un système pour commencer</p>
        </div>
      )}
    </div>
  );
};

// ===== SOUS-COMPOSANT : badge CSV =====
const CsvBadge: React.FC<{ status: 'present' | 'missing' | 'none' | 'no-csv' }> = ({ status }) => {
  switch (status) {
    case 'present':
      return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-900/40 text-green-400 border border-green-700/40">✓ présent</span>;
    case 'missing':
      return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-900/40 text-red-400 border border-red-700/40">✗ manquant</span>;
    case 'none':
      return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-800 text-gray-500 border border-gray-700">— non trouvé</span>;
    case 'no-csv':
      return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-800/50 text-gray-600 border border-gray-700/50">— sans CSV</span>;
  }
};

export default ScreenScraperSyncTab;
