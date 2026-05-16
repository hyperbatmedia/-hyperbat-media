// ScreenScraperSyncTab.tsx
import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Upload, Loader2, Check, Database, Download, Search, X
} from 'lucide-react';
import { ThemeItem } from '../../types';
import {
  parseSSManquesCSV,
  guessSystemSlug,
  findSSEntry,
  applySSChanges,
  SSGameEntry,
} from './utils/screenScraperUtils';
import { generateSystems } from '../../hooks/useSystemsLogic';
import { categories, systemsData, sectionIcons } from '../../constants';

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

// ===== TYPES INTERNES =====
type SSStatus = 'present' | 'missing' | 'not-found';
type FilterType = 'tous' | 'sur-ss' | 'a-uploader' | 'absent-vitrine';

interface VitreRow {
  theme: ThemeItem;
  ssEntry: SSGameEntry | null;
  ssStatus: SSStatus;
}

interface AbsentRow {
  ssEntry: SSGameEntry;
}

// Lien manuel en cours d'édition
interface LinkEdit {
  ssEntry: SSGameEntry;        // jeu SS à lier
  searchQuery: string;          // texte de recherche
  selectedThemeId: number | null;
}

// ===== COMPOSANT PRINCIPAL =====
interface ScreenScraperSyncTabProps {
  themes: ThemeItem[];
  onUpdateThemes: (themes: ThemeItem[]) => Promise<void>;
}

const ScreenScraperSyncTab: React.FC<ScreenScraperSyncTabProps> = ({ themes, onUpdateThemes }) => {
  const [csvEntries, setCsvEntries] = useState<SSGameEntry[] | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [systemSlug, setSystemSlug] = useState('');
  const [systemName, setSystemName] = useState('');
  const [filter, setFilter] = useState<FilterType>('tous');
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [linkEdit, setLinkEdit] = useState<LinkEdit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Thèmes de jeux du système ───────────────────────────────────────────
  const systemThemes = useMemo(
    () => themes.filter(t => t.system === systemSlug && t.category === 'game-themes'),
    [themes, systemSlug]
  );

  // ── Lignes vitrine ──────────────────────────────────────────────────────
  const vitrineRows = useMemo((): VitreRow[] => {
    if (!csvEntries) return [];
    return systemThemes.map(theme => {
      const ssEntry = findSSEntry(theme, csvEntries);
      let ssStatus: SSStatus = 'not-found';
      if (ssEntry) ssStatus = ssEntry.hasTheme ? 'present' : 'missing';
      return { theme, ssEntry, ssStatus };
    });
  }, [systemThemes, csvEntries]);

  // ── Lignes absentes de la vitrine ───────────────────────────────────────
  const absentRows = useMemo((): AbsentRow[] => {
    if (!csvEntries) return [];
    const linkedIds = new Set(
      systemThemes
        .filter(t => t.ssGameId)
        .map(t => t.ssGameId!)
    );
    const matchedIds = new Set(
      vitrineRows
        .filter(r => r.ssEntry)
        .map(r => r.ssEntry!.gameId)
    );
    return csvEntries
      .filter(e => !matchedIds.has(e.gameId) && !linkedIds.has(e.gameId))
      .map(e => ({ ssEntry: e }));
  }, [csvEntries, systemThemes, vitrineRows]);

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    surSS: vitrineRows.filter(r => r.theme.onScreenScraper).length,
    aUploader: vitrineRows.filter(r => !r.theme.onScreenScraper).length,
    absentVitrine: absentRows.length,
  }), [vitrineRows, absentRows]);

  // ── Lignes filtrées ─────────────────────────────────────────────────────
  const filteredVitrineRows = useMemo(() => {
    switch (filter) {
      case 'sur-ss':    return vitrineRows.filter(r => r.theme.onScreenScraper);
      case 'a-uploader': return vitrineRows.filter(r => !r.theme.onScreenScraper);
      default:          return vitrineRows;
    }
  }, [vitrineRows, filter]);

  const showAbsents = filter === 'tous' || filter === 'absent-vitrine';

  // ── Import CSV ──────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const slug = guessSystemSlug(file.name);
      const name = ALL_SYSTEM_SLUGS.find(s => s.slug === slug)?.name ?? slug;
      const text = await file.text();
      const parsed = parseSSManquesCSV(text, file.name, slug);
      if (parsed.entries.length === 0) {
        setError('Aucune entrée trouvée. Vérifiez les colonnes "Game Name" et "Thème HyperBat".');
        return;
      }
      setCsvEntries(parsed.entries);
      setCsvFileName(file.name);
      setSystemSlug(slug);
      setSystemName(name);
      setFilter('tous');
      setLinkEdit(null);
    } catch (err) {
      setError(`Erreur de lecture : ${String(err)}`);
    }
    e.target.value = '';
  }, []);

  // ── Toggle vitrine direct (sauvegarde immédiate) ─────────────────────────
  const handleToggleVitrine = useCallback(async (theme: ThemeItem) => {
    setSavingId(theme.id);
    try {
      const updated = applySSChanges(themes, [{
        themeId: theme.id,
        onScreenScraper: !(theme.onScreenScraper ?? false),
      }]);
      await onUpdateThemes(updated);
    } catch {
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSavingId(null);
    }
  }, [themes, onUpdateThemes]);

  // ── Lier un thème absent à un thème de la vitrine ───────────────────────
  const handleConfirmLink = useCallback(async () => {
    if (!linkEdit?.selectedThemeId) return;
    setSaving(true);
    try {
      const updated = applySSChanges(themes, [{
        themeId: linkEdit.selectedThemeId,
        onScreenScraper: linkEdit.ssEntry.hasTheme,
        ssGameId: linkEdit.ssEntry.gameId,
      }]);
      await onUpdateThemes(updated);
      setLinkEdit(null);
    } catch {
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }, [linkEdit, themes, onUpdateThemes]);

  // ── Export absents vitrine ───────────────────────────────────────────────
  const handleExportAbsents = () => {
    if (!absentRows.length) return;
    const lines = ['Nom SS,ID SS,Thème SS'];
    for (const r of absentRows) {
      lines.push(`"${r.ssEntry.gameName}","${r.ssEntry.gameId}","${r.ssEntry.hasTheme ? 'oui' : 'non'}"`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${systemSlug}-absents-vitrine.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Recherche pour le lien manuel ───────────────────────────────────────
  const linkSearchResults = useMemo(() => {
    if (!linkEdit) return [];
    const q = linkEdit.searchQuery.toLowerCase().trim();
    if (!q) return systemThemes.slice(0, 10);
    return systemThemes
      .filter(t => t.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [linkEdit, systemThemes]);

  const currentOnSS = themes.filter(t => t.onScreenScraper).length;

  return (
    <div className="text-white space-y-5">

      {/* HEADER */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3">
          <Database className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-orange-400 tracking-tight">Synchronisation ScreenScraper</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {currentOnSS} thèmes marqués sur SS
            {systemName && <> · <span className="text-cyan-400 font-semibold">{systemName}</span></>}
          </p>
        </div>
      </div>

      {/* IMPORT CSV */}
      {!csvEntries ? (
        <div
          className="border-2 border-dashed border-gray-700 hover:border-cyan-600 rounded-2xl p-10 text-center transition-colors cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <Upload className="w-10 h-10 text-gray-600 group-hover:text-cyan-500 mx-auto mb-3 transition-colors" />
          <p className="text-gray-400 font-semibold group-hover:text-white transition-colors">
            Cliquer pour importer un fichier CSV ScreenScraper
          </p>
          <p className="text-gray-600 text-sm mt-1">Format : export "médias manquants" (séparateur ;)</p>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      ) : (
        <>
          {/* Fichier chargé + bouton changer */}
          <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{csvFileName}</p>
                <p className="text-gray-500 text-xs">{csvEntries.length} jeux · {systemName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Changer
              </button>
              <button
                onClick={() => { setCsvEntries(null); setCsvFileName(''); setSystemSlug(''); setSystemName(''); setFilter('tous'); setLinkEdit(null); }}
                className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* STATS cliquables */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setFilter(filter === 'sur-ss' ? 'tous' : 'sur-ss')}
              className={`rounded-xl p-3 text-center transition-all border ${filter === 'sur-ss' ? 'border-green-500 bg-green-900/30' : 'border-green-700/30 bg-green-900/20 hover:border-green-500/50'}`}
            >
              <div className="text-2xl font-black text-green-400">{stats.surSS}</div>
              <div className="text-xs text-gray-500 mt-0.5">✅ Sur ScreenScraper</div>
            </button>
            <button
              onClick={() => setFilter(filter === 'a-uploader' ? 'tous' : 'a-uploader')}
              className={`rounded-xl p-3 text-center transition-all border ${filter === 'a-uploader' ? 'border-red-500 bg-red-900/30' : 'border-red-700/30 bg-red-900/20 hover:border-red-500/50'}`}
            >
              <div className="text-2xl font-black text-red-400">{stats.aUploader}</div>
              <div className="text-xs text-gray-500 mt-0.5">❌ À uploader sur SS</div>
            </button>
            <button
              onClick={() => setFilter(filter === 'absent-vitrine' ? 'tous' : 'absent-vitrine')}
              disabled={stats.absentVitrine === 0}
              className={`rounded-xl p-3 text-center transition-all border ${filter === 'absent-vitrine' ? 'border-yellow-500 bg-yellow-900/30' : 'border-yellow-700/30 bg-yellow-900/20 hover:border-yellow-500/50'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className="text-2xl font-black text-yellow-400">{stats.absentVitrine}</div>
              <div className="text-xs text-gray-500 mt-0.5">⚠️ Absent vitrine</div>
            </button>
          </div>

          {/* TABLEAU */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

            {/* En-tête */}
            <div className="grid bg-gray-950 border-b border-gray-800" style={{gridTemplateColumns:'44px 100px 1fr 100px 110px'}}>
              <div className="p-3" />
              <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">ID SS</div>
              <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Nom</div>
              <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide text-center">SS</div>
              <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide text-center">Vitrine</div>
            </div>

            <div className="max-h-[520px] overflow-y-auto">

              {/* Lignes vitrine */}
              {(filter !== 'absent-vitrine' ? filteredVitrineRows : []).map(row => (
                <div
                  key={row.theme.id}
                  className="grid border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors"
                  style={{gridTemplateColumns:'44px 100px 1fr 100px 110px'}}
                >
                  {/* Icône statut SS */}
                  <div className="p-3 flex items-center justify-center">
                    {row.ssStatus === 'present' && <span className="text-green-400 text-sm">✅</span>}
                    {row.ssStatus === 'missing' && <span className="text-red-400 text-sm">❌</span>}
                    {row.ssStatus === 'not-found' && <span className="text-gray-600 text-sm">—</span>}
                  </div>

                  {/* ID SS */}
                  <div className="p-3 flex items-center">
                    <span className="font-mono text-xs text-gray-500">
                      {row.theme.ssGameId ?? (row.ssEntry?.gameId ?? '—')}
                    </span>
                  </div>

                  {/* Nom */}
                  <div className="p-3 flex items-center min-w-0">
                    <span className="text-sm text-gray-200 truncate">{row.theme.name}</span>
                  </div>

                  {/* SS badge */}
                  <div className="p-3 flex items-center justify-center">
                    <SSBadge status={row.ssStatus} />
                  </div>

                  {/* Vitrine toggle */}
                  <div className="p-3 flex items-center justify-center">
                    {savingId === row.theme.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                      : (
                        <button
                          onClick={() => handleToggleVitrine(row.theme)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                            row.theme.onScreenScraper
                              ? 'bg-green-900/40 border-green-600/50 text-green-400 hover:bg-green-900/60'
                              : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {row.theme.onScreenScraper ? 'Oui' : 'Non'}
                        </button>
                      )
                    }
                  </div>
                </div>
              ))}

              {/* Séparateur absents vitrine */}
              {showAbsents && absentRows.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 bg-yellow-950/20 border-y border-yellow-700/20">
                  <span className="text-xs text-yellow-500 font-semibold">
                    ⚠️ Présents sur ScreenScraper mais absents de votre vitrine ({absentRows.length})
                  </span>
                  <button
                    onClick={handleExportAbsents}
                    className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Exporter ({systemSlug}-absents-vitrine.csv)
                  </button>
                </div>
              )}

              {showAbsents && absentRows.map((row, idx) => (
                <div
                  key={`absent-${idx}`}
                  className="grid border-b border-gray-800/40 bg-yellow-950/5"
                  style={{gridTemplateColumns:'44px 100px 1fr 100px 110px'}}
                >
                  <div className="p-3 flex items-center justify-center">
                    <span className="text-yellow-600 text-sm">⚠️</span>
                  </div>
                  <div className="p-3 flex items-center">
                    <span className="font-mono text-xs text-gray-600">{row.ssEntry.gameId}</span>
                  </div>
                  <div className="p-3 flex items-center min-w-0">
                    <span className="text-sm text-yellow-600/80 italic truncate">{row.ssEntry.gameName}</span>
                    <span className="ml-2 text-xs text-gray-600 flex-shrink-0">Pas présent</span>
                  </div>
                  <div className="p-3 flex items-center justify-center">
                    <SSBadge status={row.ssEntry.hasTheme ? 'present' : 'missing'} />
                  </div>
                  <div className="p-3 flex items-center justify-center">
                    <button
                      onClick={() => setLinkEdit({ ssEntry: row.ssEntry, searchQuery: row.ssEntry.gameName, selectedThemeId: null })}
                      className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 text-gray-400 hover:border-cyan-500 hover:text-cyan-400 rounded-lg transition-colors"
                    >
                      Lier
                    </button>
                  </div>
                </div>
              ))}

              {filteredVitrineRows.length === 0 && absentRows.length === 0 && (
                <div className="p-8 text-center text-gray-600 text-sm">Aucun résultat</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL LIEN MANUEL */}
      {linkEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Lier à un thème de votre vitrine</h3>
              <button onClick={() => setLinkEdit(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-800 rounded-xl p-3 text-sm">
              <span className="text-gray-400">Jeu SS : </span>
              <span className="text-white font-semibold">{linkEdit.ssEntry.gameName}</span>
              <span className="ml-2 font-mono text-xs text-gray-500">#{linkEdit.ssEntry.gameId}</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={linkEdit.searchQuery}
                onChange={e => setLinkEdit(prev => prev ? { ...prev, searchQuery: e.target.value, selectedThemeId: null } : null)}
                placeholder="Rechercher dans votre vitrine..."
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {linkSearchResults.map(t => (
                <button
                  key={t.id}
                  onClick={() => setLinkEdit(prev => prev ? { ...prev, selectedThemeId: t.id } : null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    linkEdit.selectedThemeId === t.id
                      ? 'bg-cyan-600/20 border border-cyan-500/50 text-cyan-300'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <span className="font-mono text-xs text-gray-500 mr-2">{t.system}</span>
                  {t.name}
                </button>
              ))}
              {linkSearchResults.length === 0 && (
                <p className="text-center text-gray-600 text-sm py-4">Aucun résultat</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setLinkEdit(null)}
                className="flex-1 py-2.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmLink}
                disabled={!linkEdit.selectedThemeId || saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirmer le lien
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== SOUS-COMPOSANT : badge SS =====
const SSBadge: React.FC<{ status: 'present' | 'missing' | 'not-found' }> = ({ status }) => {
  switch (status) {
    case 'present':
      return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-900/40 text-green-400 border border-green-700/40">Présent</span>;
    case 'missing':
      return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-900/40 text-red-400 border border-red-700/40">Manquant</span>;
    case 'not-found':
      return <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-800 text-gray-500 border border-gray-700">Non trouvé</span>;
  }
};

export default ScreenScraperSyncTab;
