// ScreenScraperSyncTab.tsx
// Tableau de toutes les données ScreenScraper des thèmes (statut on/off, gameId),
// avec filtres, tri, vues groupées (par créateur / par système) et export CSV/JSON.
import React, { useState, useMemo } from 'react';
import { Download, Search, X, Check, Pencil, Database, ArrowUp, ArrowDown, List, Users, Cpu, HelpCircle } from 'lucide-react';
import { ThemeItem } from '../../types';
import { generateSystems } from '../../hooks/useSystemsLogic';
import { categories, systemsData, sectionIcons } from '../../constants';

// ===== LISTE DES SYSTÈMES (pour le filtre) =====
const ALL_SYSTEMS: { slug: string; name: string }[] = (() => {
  const systems = generateSystems(categories, systemsData, sectionIcons);
  const seen = new Set<string>();
  const result: { slug: string; name: string }[] = [];
  for (const s of systems) {
    if (s.isHeader || s.isSubHeader) continue;
    if (['all', 'tools', 'tutorials', 'main-themes', 'other-themes'].includes(s.id)) continue;
    const parts = s.id.split('-');
    const slug = parts[parts.length - 1];
    if (!seen.has(slug)) { seen.add(slug); result.push({ slug, name: s.name }); }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
})();
const SYSTEM_NAME_BY_SLUG = new Map(ALL_SYSTEMS.map(s => [s.slug, s.name]));

type StatusFilter = 'tous' | 'on' | 'off';
type ViewMode = 'liste' | 'createurs' | 'systemes';
type SortKey = 'name' | 'system' | 'creator' | 'date' | 'onScreenScraper' | 'gameId';
type SortDir = 'asc' | 'desc';

// ===== HELPERS =====
const csvSafe = (s: string | undefined | null) => `"${(s ?? '').toString().replace(/"/g, '""')}"`;
const today = () => new Date().toISOString().split('T')[0];
const downloadBlob = (content: string, type: string, filename: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};


interface GroupRow {
  key: string;
  label: string;
  total: number;
  on: number;
  off: number;
  missingGameId: number;
}

interface ScreenScraperSyncTabProps {
  themes: ThemeItem[];
  onUpdateThemes: (themes: ThemeItem[]) => Promise<void>;
}

const ScreenScraperSyncTab: React.FC<ScreenScraperSyncTabProps> = ({ themes, onUpdateThemes: _onUpdateThemes }) => {
  const [search, setSearch] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('tous');
  const [gameIdFilter, setGameIdFilter] = useState<'tous' | 'avec' | 'sans'>('tous');
  const [showHelp, setShowHelp] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('liste');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingGameId, setEditingGameId] = useState<{ id: number; value: string } | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Seuls les vrais thèmes de jeux concernent ScreenScraper : les thèmes
  // système, par défaut et collections personnalisées n'y ont structurellement
  // pas leur place, donc on les exclut entièrement (tableau + stats).
  const gameThemesOnly = useMemo(() => themes.filter(t => t.category === 'game-themes'), [themes]);

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = gameThemesOnly.filter(t => {
      if (q && !t.name.toLowerCase().includes(q) && !t.creator.toLowerCase().includes(q)) return false;
      if (systemFilter && t.system !== systemFilter) return false;
      if (statusFilter === 'on' && !t.onScreenScraper) return false;
      if (statusFilter === 'off' && t.onScreenScraper) return false;
      if (gameIdFilter === 'sans' && t.gameId !== undefined && t.gameId !== null) return false;
      if (gameIdFilter === 'avec' && (t.gameId === undefined || t.gameId === null)) return false;
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name, 'fr') * dir;
        case 'system': return a.system.localeCompare(b.system, 'fr') * dir;
        case 'creator': return a.creator.localeCompare(b.creator, 'fr') * dir;
        case 'date': return ((a.date ?? '') > (b.date ?? '') ? 1 : (a.date ?? '') < (b.date ?? '') ? -1 : 0) * dir;
        case 'onScreenScraper': return ((a.onScreenScraper ? 1 : 0) - (b.onScreenScraper ? 1 : 0)) * dir;
        case 'gameId': return ((a.gameId ?? -1) - (b.gameId ?? -1)) * dir;
        default: return 0;
      }
    });
  }, [gameThemesOnly, search, systemFilter, statusFilter, gameIdFilter, sortKey, sortDir]);

  // ── Stats globales (tous les game-themes, non filtrés) ──────────────────
  const stats = useMemo(() => ({
    total: gameThemesOnly.length,
    on: gameThemesOnly.filter(t => t.onScreenScraper).length,
    off: gameThemesOnly.filter(t => !t.onScreenScraper).length,
    missingGameId: gameThemesOnly.filter(t => t.gameId === undefined || t.gameId === null).length,
  }), [gameThemesOnly]);

  // ── Résumé du sous-ensemble actuellement filtré ──────────────────────────
  const filteredStats = useMemo(() => ({
    total: filtered.length,
    on: filtered.filter(t => t.onScreenScraper).length,
    off: filtered.filter(t => !t.onScreenScraper).length,
    missingGameId: filtered.filter(t => t.gameId === undefined || t.gameId === null).length,
  }), [filtered]);

  // ── Vues groupées (par créateur / par système) ───────────────────────────
  const groupedRows = useMemo((): GroupRow[] => {
    if (viewMode === 'liste') return [];
    const groups = new Map<string, GroupRow>();
    for (const t of filtered) {
      const key = viewMode === 'createurs' ? t.creator : t.system;
      const label = viewMode === 'createurs' ? t.creator : (SYSTEM_NAME_BY_SLUG.get(t.system) ?? t.system);
      let g = groups.get(key);
      if (!g) { g = { key, label, total: 0, on: 0, off: 0, missingGameId: 0 }; groups.set(key, g); }
      g.total++;
      if (t.onScreenScraper) g.on++; else g.off++;
      if (t.gameId === undefined || t.gameId === null) g.missingGameId++;
    }
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [viewMode, filtered]);

  const resetFilters = () => {
    setSearch(''); setSystemFilter(''); setStatusFilter('tous'); setGameIdFilter('tous');
  };
  const hasActiveFilters = search !== '' || systemFilter !== '' || statusFilter !== 'tous' || gameIdFilter !== 'tous';

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDrillDown = (row: GroupRow) => {
    if (viewMode === 'createurs') setSearch(row.key);
    else setSystemFilter(row.key);
    setViewMode('liste');
  };

  // ── Édition gameId ───────────────────────────────────────────────────────
  const handleSaveGameId = async () => {
    if (!editingGameId) return;
    const trimmed = editingGameId.value.trim();
    const num = trimmed === '' ? undefined : Number(trimmed);
    if (trimmed !== '' && (num === undefined || Number.isNaN(num))) {
      alert('gameId doit être un nombre.');
      return;
    }
    setSavingId(editingGameId.id);
    try {
      const updated = themes.map(t => t.id === editingGameId.id ? { ...t, gameId: num } : t);
      await _onUpdateThemes(updated);
      setEditingGameId(null);
    } catch {
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSavingId(null);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = (format: 'csv' | 'json') => {
    if (viewMode !== 'liste') {
      // Export du récap groupé actuellement affiché
      if (groupedRows.length === 0) return;
      if (format === 'json') {
        downloadBlob(JSON.stringify(groupedRows, null, 2), 'application/json', `screenscraper-recap-${viewMode}-${today()}.json`);
      } else {
        const header = 'label;total;on;off;missingGameId';
        const lines = groupedRows.map(g => [csvSafe(g.label), g.total, g.on, g.off, g.missingGameId].join(';'));
        downloadBlob([header, ...lines].join('\n'), 'text/csv;charset=utf-8;', `screenscraper-recap-${viewMode}-${today()}.csv`);
      }
      return;
    }
    if (filtered.length === 0) return;
    const rows = filtered.map(t => ({
      id: t.id, name: t.name, system: t.system, creator: t.creator, category: t.category,
      date: t.date ?? '', size: t.size ?? '', onScreenScraper: t.onScreenScraper ?? false,
      gameId: t.gameId ?? null,
    }));
    if (format === 'json') {
      downloadBlob(JSON.stringify(rows, null, 2), 'application/json', `screenscraper-export-${today()}.json`);
    } else {
      const header = 'id;name;system;creator;category;date;size;onScreenScraper;gameId';
      const lines = rows.map(r =>
        [r.id, csvSafe(r.name), r.system, csvSafe(r.creator), r.category, r.date, csvSafe(r.size),
         r.onScreenScraper ? 'on' : 'off', r.gameId ?? ''].join(';')
      );
      downloadBlob([header, ...lines].join('\n'), 'text/csv;charset=utf-8;', `screenscraper-export-${today()}.csv`);
    }
  };

  const SortHeader: React.FC<{ label: string; sortK: SortKey; className?: string }> = ({ label, sortK, className }) => (
    <button
      onClick={() => handleSort(sortK)}
      className={`p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide flex items-center gap-1 hover:text-gray-300 transition-colors ${className ?? ''}`}
    >
      {label}
      {sortKey === sortK && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
    </button>
  );

  return (
    <div className="text-white space-y-5">

      {/* HEADER */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3">
          <Database className="w-8 h-8 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black text-orange-400 tracking-tight">Données ScreenScraper</h2>
          <p className="text-gray-500 text-sm mt-0.5">{stats.total} thèmes de jeux (système/défaut/collections exclus)</p>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-colors border border-gray-700"
        >
          <HelpCircle className="w-4 h-4" /> Guide
        </button>
      </div>

      {/* STATS cliquables (raccourcis de filtre) */}
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === 'on' ? 'tous' : 'on')}
          className={`rounded-xl p-3 text-center transition-all border ${statusFilter === 'on' ? 'border-green-500 bg-green-900/30' : 'border-green-700/30 bg-green-900/20 hover:border-green-500/50'}`}
        >
          <div className="text-2xl font-black text-green-400">{stats.on}</div>
          <div className="text-xs text-gray-500 mt-0.5">✅ Sur ScreenScraper</div>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'off' ? 'tous' : 'off')}
          className={`rounded-xl p-3 text-center transition-all border ${statusFilter === 'off' ? 'border-red-500 bg-red-900/30' : 'border-red-700/30 bg-red-900/20 hover:border-red-500/50'}`}
        >
          <div className="text-2xl font-black text-red-400">{stats.off}</div>
          <div className="text-xs text-gray-500 mt-0.5">❌ Hors ScreenScraper</div>
        </button>
        <button
          onClick={() => setGameIdFilter(gameIdFilter === 'avec' ? 'tous' : 'avec')}
          className={`rounded-xl p-3 text-center transition-all border ${gameIdFilter === 'avec' ? 'border-cyan-500 bg-cyan-900/30' : 'border-cyan-700/30 bg-cyan-900/20 hover:border-cyan-500/50'}`}
        >
          <div className="text-2xl font-black text-cyan-400">{stats.total - stats.missingGameId}</div>
          <div className="text-xs text-gray-500 mt-0.5">🔗 Avec gameId</div>
        </button>
        <button
          onClick={() => setGameIdFilter(gameIdFilter === 'sans' ? 'tous' : 'sans')}
          className={`rounded-xl p-3 text-center transition-all border ${gameIdFilter === 'sans' ? 'border-yellow-500 bg-yellow-900/30' : 'border-yellow-700/30 bg-yellow-900/20 hover:border-yellow-500/50'}`}
        >
          <div className="text-2xl font-black text-yellow-400">{stats.missingGameId}</div>
          <div className="text-xs text-gray-500 mt-0.5">⚠️ Sans gameId</div>
        </button>
      </div>

      {/* ONGLETS DE VUE */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('liste')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'liste' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          <List className="w-3.5 h-3.5" /> Liste
        </button>
        <button
          onClick={() => setViewMode('createurs')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'createurs' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          <Users className="w-3.5 h-3.5" /> Par créateur
        </button>
        <button
          onClick={() => setViewMode('systemes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'systemes' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          <Cpu className="w-3.5 h-3.5" /> Par système
        </button>
      </div>

      {/* FILTRES */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou créateur..."
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={systemFilter}
          onChange={e => setSystemFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
        >
          <option value="">Tous les systèmes</option>
          {ALL_SYSTEMS.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        )}

        <div className="flex-1" />

        <span className="text-xs text-gray-500">
          {viewMode === 'liste' ? `${filtered.length} résultat(s)` : `${groupedRows.length} ${viewMode === 'createurs' ? 'créateur(s)' : 'système(s)'}`}
        </span>

        <button
          onClick={() => handleExport('csv')}
          className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-xl transition-colors flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
        <button
          onClick={() => handleExport('json')}
          className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 rounded-xl transition-colors flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> JSON
        </button>
      </div>

      {/* RÉSUMÉ DU FILTRE ACTIF (vue liste uniquement) */}
      {viewMode === 'liste' && hasActiveFilters && (
        <div className="text-xs text-gray-400 bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2">
          <span className="font-bold text-white">{filteredStats.total}</span> thème(s) trouvé(s) ·{' '}
          <span className="text-green-400 font-semibold">{filteredStats.on} sur SS</span> ·{' '}
          <span className="text-red-400 font-semibold">{filteredStats.off} hors SS</span> ·{' '}
          <span className="text-yellow-400 font-semibold">{filteredStats.missingGameId} sans gameId</span>
        </div>
      )}

      {/* ═══════════════ VUE LISTE ═══════════════ */}
      {viewMode === 'liste' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="grid bg-gray-950 border-b border-gray-800" style={{ gridTemplateColumns: '1fr 130px 140px 100px 90px 90px' }}>
            <SortHeader label="Nom" sortK="name" />
            <SortHeader label="Système" sortK="system" />
            <SortHeader label="Créateur" sortK="creator" />
            <SortHeader label="Date" sortK="date" />
            <SortHeader label="SS" sortK="onScreenScraper" className="justify-center" />
            <SortHeader label="gameId" sortK="gameId" className="justify-center" />
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {filtered.map(theme => (
              <div
                key={theme.id}
                className="grid border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors group"
                style={{ gridTemplateColumns: '1fr 130px 140px 100px 90px 90px' }}
              >
                <div className="p-3 flex items-center min-w-0">
                  <span className="text-sm text-gray-200 truncate">{theme.name}</span>
                </div>
                <div className="p-3 flex items-center min-w-0">
                  <span className="text-xs text-gray-500 truncate">{theme.system}</span>
                </div>
                <div className="p-3 flex items-center min-w-0">
                  <span className="text-xs text-gray-500 truncate">{theme.creator}</span>
                </div>
                <div className="p-3 flex items-center">
                  <span className="text-xs text-gray-600">{theme.date ?? '—'}</span>
                </div>

                {/* Statut SS (lecture seule — l'édition se fait dans l'onglet Gérer) */}
                <div className="p-3 flex items-center justify-center">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                    theme.onScreenScraper
                      ? 'bg-green-900/40 border-green-600/50 text-green-400'
                      : 'bg-gray-800 border-gray-600 text-gray-500'
                  }`}>
                    {theme.onScreenScraper ? 'On' : 'Off'}
                  </span>
                </div>

                {/* gameId éditable */}
                <div className="p-3 flex items-center justify-center">
                  {editingGameId?.id === theme.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingGameId.value}
                        onChange={e => setEditingGameId({ id: theme.id, value: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveGameId(); if (e.key === 'Escape') setEditingGameId(null); }}
                        className="w-14 bg-gray-800 border border-cyan-600 text-white text-xs rounded-lg px-1.5 py-1 focus:outline-none"
                      />
                      <button onClick={handleSaveGameId} className="text-green-400 hover:text-green-300">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingGameId(null)} className="text-gray-500 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : savingId === theme.id ? (
                    <span className="text-xs text-gray-500">...</span>
                  ) : (
                    <button
                      onClick={() => setEditingGameId({ id: theme.id, value: theme.gameId?.toString() ?? '' })}
                      className="flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      {theme.gameId ?? <span className="text-gray-700">—</span>}
                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                </div>

              </div>
            ))}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-gray-600 text-sm">Aucun résultat</div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ VUES GROUPÉES (créateur / système) ═══════════════ */}
      {viewMode !== 'liste' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="grid bg-gray-950 border-b border-gray-800" style={{ gridTemplateColumns: '1fr 90px 90px 90px 120px' }}>
            <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">
              {viewMode === 'createurs' ? 'Créateur' : 'Système'}
            </div>
            <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide text-center">Total</div>
            <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide text-center">Sur SS</div>
            <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide text-center">Hors SS</div>
            <div className="p-3 text-xs text-gray-500 font-semibold uppercase tracking-wide text-center">Sans gameId</div>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {groupedRows.map(row => (
              <button
                key={row.key}
                onClick={() => handleDrillDown(row)}
                className="grid w-full border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors text-left"
                style={{ gridTemplateColumns: '1fr 90px 90px 90px 120px' }}
                title="Cliquer pour voir le détail dans la vue Liste"
              >
                <div className="p-3 flex items-center min-w-0">
                  <span className="text-sm text-gray-200 truncate">{row.label}</span>
                </div>
                <div className="p-3 flex items-center justify-center text-sm font-bold text-gray-300">{row.total}</div>
                <div className="p-3 flex items-center justify-center text-sm font-bold text-green-400">{row.on}</div>
                <div className="p-3 flex items-center justify-center text-sm font-bold text-red-400">{row.off}</div>
                <div className="p-3 flex items-center justify-center text-sm font-bold text-yellow-400">{row.missingGameId}</div>
              </button>
            ))}

            {groupedRows.length === 0 && (
              <div className="p-8 text-center text-gray-600 text-sm">Aucun résultat</div>
            )}
          </div>
        </div>
      )}

      {/* MODALE GUIDE */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h3 className="text-lg font-black text-orange-400">Guide — Onglet "ScreenScraper Sync"</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-300">
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">À quoi sert cet onglet</h4>
                <p>
                  Affiche tous les <strong>thèmes de jeux</strong> de la vitrine (les thèmes système,
                  par défaut et collections personnalisées n'apparaissent pas ici) avec leur statut
                  ScreenScraper (On/Off) et leur <code className="text-cyan-300">gameId</code> (identifiant
                  interne rempli à la main pour éviter les doublons).
                </p>
                <p className="mt-2 text-yellow-400/90">
                  Le statut On/Off est <strong>déclaratif</strong> : rien n'est vérifié automatiquement
                  contre le vrai site ScreenScraper. Pour le <strong>changer</strong>, ça se fait dans
                  l'onglet <strong>Gérer</strong> (pas ici) — cet onglet ne fait qu'afficher, filtrer et exporter.
                </p>
              </section>

              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Filtrer</h4>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Recherche par nom de thème ou de créateur</li>
                  <li>Filtre par système (menu déroulant)</li>
                  <li>Pastilles cliquables : Sur SS / Hors SS / Avec gameId / Sans gameId</li>
                  <li>Tous les filtres se combinent (ex : système N64 + "sans gameId")</li>
                </ul>
              </section>

              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Trier</h4>
                <p>Cliquer sur un en-tête de colonne trie le tableau ; recliquer inverse l'ordre.</p>
              </section>

              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Les 3 vues</h4>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>Liste</strong> : détail thème par thème</li>
                  <li><strong>Par créateur</strong> : récap par créateur (total / sur SS / hors SS / sans gameId)</li>
                  <li><strong>Par système</strong> : même récap, groupé par système</li>
                </ul>
                <p className="mt-1">Cliquer sur une ligne d'un récap bascule vers la Liste, filtrée dessus.</p>
              </section>

              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Éditer le gameId</h4>
                <p>Seule modification possible ici : cliquer sur la valeur (ou "—"), taper le numéro, Entrée pour valider.</p>
              </section>

              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Exporter</h4>
                <p>
                  Les boutons CSV/JSON exportent ce qui est affiché à l'écran : le détail filtré en vue
                  Liste, ou le récap groupé en vue Par créateur / Par système.
                </p>
              </section>

              <section>
                <h4 className="text-red-400 font-bold mb-1">Ce que cet onglet ne fait pas</h4>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Ne vérifie rien automatiquement contre le vrai site ScreenScraper</li>
                  <li>Ne permet pas de changer le statut On/Off (→ onglet Gérer)</li>
                  <li>N'affiche pas les thèmes système / par défaut / collections</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenScraperSyncTab;
