// ScreenScraperSyncTab.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  Upload, CheckCircle, ChevronDown, ChevronUp,
  Loader2, Check, Database, AlertTriangle, FileText, Trash2
} from 'lucide-react';
import { ThemeItem } from '../../types';
import {
  parseSSManquesCSV,
  matchFileResults,
  applySelectedMatches,
  SSFileResult,
  MatchResult,
  SS_TO_THEME,
} from './utils/screenScraperUtils';
import { generateSystems } from '../../hooks/useSystemsLogic';
import { categories, systemsData, sectionIcons } from '../../constants';

interface ScreenScraperSyncTabProps {
  themes: ThemeItem[];
  onUpdateThemes: (themes: ThemeItem[]) => Promise<void>;
}

// ── Liste de tous les slugs disponibles pour le sélecteur de système ──────────
const ALL_SYSTEM_SLUGS: { slug: string; name: string }[] = (() => {
  const systems = generateSystems(categories, systemsData, sectionIcons);
  const seen = new Set<string>();
  const result: { slug: string; name: string }[] = [];

  for (const s of systems) {
    if (s.isHeader || s.isSubHeader) continue;
    if (['all', 'tools', 'tutorials', 'main-themes', 'other-themes'].includes(s.id)) continue;
    // Le slug = dernière partie de l'id (après le dernier tiret composé de section-sub-normalizedName)
    const parts = s.id.split('-');
    const slug = parts[parts.length - 1];
    if (!seen.has(slug)) {
      seen.add(slug);
      result.push({ slug, name: s.name });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
})();

// ── Types internes ─────────────────────────────────────────────────────────────
interface LoadedFile {
  id: string;
  file: File;
  systemSlug: string;
  parsed?: SSFileResult;
  matchResults?: MatchResult[];
  selected: Set<number>; // indices dans matchResults
  expanded: { present: boolean; missing: boolean; notFound: boolean };
  applied: boolean;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

const ScreenScraperSyncTab: React.FC<ScreenScraperSyncTabProps> = ({ themes, onUpdateThemes }) => {
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [globalSuccess, setGlobalSuccess] = useState(false);

  // ── Deviner le slug depuis le nom de fichier ─────────────────────────────────
  const guessSlug = (fileName: string): string => {
    const base = fileName
      .replace(/\.csv$/i, '')
      .replace(/-manques$/i, '')
      .toLowerCase();

    // Chercher dans SS_TO_THEME (ex: "megadrive" → "megadrivegenesis")
    const ssMatch = SS_TO_THEME[base];
    if (ssMatch !== undefined && ssMatch !== null) return ssMatch;

    // Correspondance directe dans les slugs de ta base
    const found = ALL_SYSTEM_SLUGS.find(s => s.slug === base);
    return found ? found.slug : '';
  };

  // ── Ajout de fichiers ────────────────────────────────────────────────────────
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const newEntries: LoadedFile[] = files.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      systemSlug: guessSlug(file.name),
      selected: new Set(),
      expanded: { present: false, missing: false, notFound: false },
      applied: false,
    }));

    setLoadedFiles(prev => [...prev, ...newEntries]);
    e.target.value = '';
  };

  // ── Supprimer un fichier ─────────────────────────────────────────────────────
  const removeFile = (id: string) => {
    setLoadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // ── Changer le système d'un fichier ─────────────────────────────────────────
  const updateSlug = (id: string, slug: string) => {
    setLoadedFiles(prev => prev.map(f =>
      f.id === id
        ? { ...f, systemSlug: slug, parsed: undefined, matchResults: undefined, selected: new Set(), applied: false, error: undefined }
        : f
    ));
  };

  // ── Analyser un fichier ──────────────────────────────────────────────────────
  const analyzeFile = useCallback(async (lf: LoadedFile) => {
    if (!lf.systemSlug) return;
    setAnalyzing(lf.id);

    try {
      const text = await lf.file.text();
      const parsed = parseSSManquesCSV(text, lf.file.name, lf.systemSlug);

      if (parsed.entries.length === 0) {
        setLoadedFiles(prev => prev.map(f =>
          f.id === lf.id
            ? { ...f, error: 'Aucune entrée trouvée. Vérifiez le format du fichier (colonnes "Game Name" et "Thème HyperBat" requises).' }
            : f
        ));
        return;
      }

      const matchResults = matchFileResults(parsed, themes, 80);

      // Auto-sélectionner les matchs exacts (100%) présents sur SS
      const autoSelected = new Set<number>(
        matchResults
          .map((r, i) => ({ r, i }))
          .filter(({ r }) => r.matched && r.ssEntry.hasTheme && r.score === 100)
          .map(({ i }) => i)
      );

      setLoadedFiles(prev => prev.map(f =>
        f.id === lf.id
          ? {
              ...f,
              parsed,
              matchResults,
              selected: autoSelected,
              expanded: { present: true, missing: false, notFound: false },
              error: undefined,
            }
          : f
      ));
    } catch (err) {
      console.error('Erreur analyse:', err);
      setLoadedFiles(prev => prev.map(f =>
        f.id === lf.id ? { ...f, error: `Erreur de lecture : ${String(err)}` } : f
      ));
    } finally {
      setAnalyzing(null);
    }
  }, [themes]);

  // ── Sélection individuelle ───────────────────────────────────────────────────
  const toggleResult = (fileId: string, idx: number) => {
    setLoadedFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      const next = new Set(f.selected);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return { ...f, selected: next };
    }));
  };

  // ── Sélection de groupe ──────────────────────────────────────────────────────
  const selectGroup = (fileId: string, indices: number[], select: boolean) => {
    setLoadedFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      const next = new Set(f.selected);
      indices.forEach(i => select ? next.add(i) : next.delete(i));
      return { ...f, selected: next };
    }));
  };

  // ── Plier/déplier une section ────────────────────────────────────────────────
  const toggleExpand = (fileId: string, section: 'present' | 'missing' | 'notFound') => {
    setLoadedFiles(prev => prev.map(f =>
      f.id !== fileId ? f : { ...f, expanded: { ...f.expanded, [section]: !f.expanded[section] } }
    ));
  };

  // ── Total sélectionné tous fichiers confondus ────────────────────────────────
  const totalSelected = useMemo(
    () => loadedFiles.reduce((acc, f) => acc + f.selected.size, 0),
    [loadedFiles]
  );

  // ── Appliquer tous les changements sélectionnés ──────────────────────────────
  const handleApplyAll = async () => {
    const toApply = loadedFiles.flatMap(f =>
      (f.matchResults ?? []).filter((_, i) => f.selected.has(i))
    );
    if (!toApply.length) return;
    if (!confirm(`Appliquer les changements pour ${toApply.length} thème(s) ?`)) return;

    setSaving(true);
    try {
      const updated = applySelectedMatches(themes, toApply);
      await onUpdateThemes(updated);
      setLoadedFiles(prev => prev.map(f => ({ ...f, applied: true })));
      setGlobalSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const currentOnSS = themes.filter(t => t.onScreenScraper).length;
  const hasResults = loadedFiles.some(f => f.matchResults && f.selected.size > 0);

  return (
    <div className="text-white space-y-6">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3">
          <Database className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Synchronisation ScreenScraper</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Import des fichiers "médias manquants" · {currentOnSS} thèmes actuellement marqués sur SS
          </p>
        </div>
      </div>

      {/* ── ZONE D'IMPORT ───────────────────────────────────────────────────── */}
      <div
        className="border-2 border-dashed border-gray-700 hover:border-cyan-600 rounded-2xl p-8 text-center transition-colors cursor-pointer group"
        onClick={() => document.getElementById('ss-file-input')?.click()}
      >
        <input
          id="ss-file-input"
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFilesChange}
        />
        <Upload className="w-10 h-10 text-gray-600 group-hover:text-cyan-500 mx-auto mb-3 transition-colors" />
        <p className="text-gray-400 font-semibold group-hover:text-white transition-colors">
          Cliquer pour importer un ou plusieurs fichiers CSV
        </p>
        <p className="text-gray-600 text-sm mt-1">
          Format : export "médias manquants" ScreenScraper (séparateur ;)
        </p>
      </div>

      {/* ── FICHIERS CHARGÉS ────────────────────────────────────────────────── */}
      {loadedFiles.map(lf => (
        <FileCard
          key={lf.id}
          lf={lf}
          analyzing={analyzing === lf.id}
          onAnalyze={() => analyzeFile(lf)}
          onRemove={() => removeFile(lf.id)}
          onSlugChange={slug => updateSlug(lf.id, slug)}
          onToggleResult={idx => toggleResult(lf.id, idx)}
          onSelectGroup={(indices, select) => selectGroup(lf.id, indices, select)}
          onToggleExpand={section => toggleExpand(lf.id, section)}
        />
      ))}

      {/* ── BOUTON APPLIQUER GLOBAL ──────────────────────────────────────────── */}
      {hasResults && !globalSuccess && (
        <div className="sticky bottom-4 pt-2">
          <button
            onClick={handleApplyAll}
            disabled={saving || totalSelected === 0}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-2xl shadow-cyan-900/40"
          >
            {saving
              ? <><Loader2 className="w-6 h-6 animate-spin" /> Sauvegarde en cours…</>
              : <><CheckCircle className="w-6 h-6" /> Appliquer {totalSelected} changement{totalSelected > 1 ? 's' : ''}</>
            }
          </button>
        </div>
      )}

      {/* ── SUCCÈS GLOBAL ───────────────────────────────────────────────────── */}
      {globalSuccess && (
        <div className="bg-green-900/30 border border-green-500/40 rounded-2xl p-5 flex items-center gap-4">
          <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
          <div>
            <div className="text-green-400 font-bold text-lg">Synchronisation appliquée !</div>
            <div className="text-gray-400 text-sm">{totalSelected} thème{totalSelected > 1 ? 's' : ''} mis à jour dans votre base.</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT : carte d'un fichier chargé
// ══════════════════════════════════════════════════════════════════════════════

interface FileCardProps {
  lf: LoadedFile;
  analyzing: boolean;
  onAnalyze: () => void;
  onRemove: () => void;
  onSlugChange: (slug: string) => void;
  onToggleResult: (idx: number) => void;
  onSelectGroup: (indices: number[], select: boolean) => void;
  onToggleExpand: (section: 'present' | 'missing' | 'notFound') => void;
}

const FileCard: React.FC<FileCardProps> = ({
  lf, analyzing, onAnalyze, onRemove, onSlugChange,
  onToggleResult, onSelectGroup, onToggleExpand,
}) => {
  const { file, systemSlug, matchResults, selected, expanded, applied, error } = lf;

  const presentResults  = useMemo(() => (matchResults ?? []).map((r, i) => ({ r, i })).filter(({ r }) =>  r.matched &&  r.ssEntry.hasTheme), [matchResults]);
  const missingResults  = useMemo(() => (matchResults ?? []).map((r, i) => ({ r, i })).filter(({ r }) =>  r.matched && !r.ssEntry.hasTheme), [matchResults]);
  const notFoundResults = useMemo(() => (matchResults ?? []).map((r, i) => ({ r, i })).filter(({ r }) => !r.matched), [matchResults]);

  const allPresentSelected = presentResults.length > 0 && presentResults.every(({ i }) => selected.has(i));
  const allMissingSelected = missingResults.length > 0 && missingResults.every(({ i }) => selected.has(i));

  const stats = matchResults
    ? {
        total: matchResults.length,
        present: presentResults.length,
        missing: missingResults.length,
        notFound: notFoundResults.length,
      }
    : null;

  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${applied ? 'border-green-600/50' : 'border-gray-800'}`}>

      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-800">
        <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{file.name}</p>
          {stats && (
            <p className="text-gray-500 text-xs mt-0.5">
              {stats.total} jeux · {stats.present} présents · {stats.missing} manquants · {stats.notFound} non trouvés
            </p>
          )}
        </div>

        {/* Sélecteur de système */}
        <select
          value={systemSlug}
          onChange={e => onSlugChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 max-w-[220px] focus:outline-none focus:border-cyan-500 transition-colors"
        >
          <option value="">-- Sélectionner le système --</option>
          {ALL_SYSTEM_SLUGS.map(s => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
        </select>

        {/* Bouton Analyser (visible tant que pas encore analysé) */}
        {!matchResults && (
          <button
            onClick={onAnalyze}
            disabled={!systemSlug || analyzing}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors flex-shrink-0"
          >
            {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
            Analyser
          </button>
        )}

        <button
          onClick={onRemove}
          title="Supprimer"
          className="p-2 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mx-4 my-3 bg-red-900/30 border border-red-700/40 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Résultats */}
      {matchResults && (
        <div className="p-4 space-y-3">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatBox value={presentResults.length}  label="Présents + trouvés"  color="green" />
            <StatBox value={missingResults.length}   label="Manquants + trouvés" color="red"   />
            <StatBox value={notFoundResults.length}  label="Non trouvés en base" color="yellow"/>
          </div>

          {/* Section PRÉSENTS */}
          {presentResults.length > 0 && (
            <ResultSection
              title={`✅ Présents sur ScreenScraper (${presentResults.length})`}
              titleColor="text-green-400"
              borderColor="border-green-700/30"
              bgColor="bg-green-900/10"
              expanded={expanded.present}
              onToggle={() => onToggleExpand('present')}
              allSelected={allPresentSelected}
              onSelectAll={() => onSelectGroup(presentResults.map(x => x.i), !allPresentSelected)}
            >
              {presentResults.map(({ r, i }) => (
                <ResultRow key={i} result={r} selected={selected.has(i)} onToggle={() => onToggleResult(i)} accent="green" />
              ))}
            </ResultSection>
          )}

          {/* Section MANQUANTS */}
          {missingResults.length > 0 && (
            <ResultSection
              title={`❌ Manquants sur ScreenScraper (${missingResults.length})`}
              titleColor="text-red-400"
              borderColor="border-red-700/30"
              bgColor="bg-red-900/10"
              expanded={expanded.missing}
              onToggle={() => onToggleExpand('missing')}
              allSelected={allMissingSelected}
              onSelectAll={() => onSelectGroup(missingResults.map(x => x.i), !allMissingSelected)}
            >
              {missingResults.map(({ r, i }) => (
                <ResultRow key={i} result={r} selected={selected.has(i)} onToggle={() => onToggleResult(i)} accent="red" />
              ))}
            </ResultSection>
          )}

          {/* Section NON TROUVÉS */}
          {notFoundResults.length > 0 && (
            <ResultSection
              title={`❓ Non trouvés dans votre base (${notFoundResults.length})`}
              titleColor="text-yellow-400"
              borderColor="border-yellow-700/30"
              bgColor="bg-yellow-900/10"
              expanded={expanded.notFound}
              onToggle={() => onToggleExpand('notFound')}
              hideSelectAll
            >
              {notFoundResults.map(({ r, i }) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-900/50">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-300 text-sm truncate block">{r.ssEntry.gameName}</span>
                    {r.matchedTheme && (
                      <span className="text-gray-600 text-xs">
                        Meilleur match : {r.matchedTheme.name} ({r.score}%)
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold ${
                    r.ssEntry.hasTheme
                      ? 'bg-green-900/40 text-green-400'
                      : 'bg-red-900/40 text-red-400'
                  }`}>
                    {r.ssEntry.hasTheme ? 'présent SS' : 'absent SS'}
                  </span>
                </div>
              ))}
            </ResultSection>
          )}

          {/* Compteur de sélection */}
          {selected.size > 0 && (
            <p className="text-sm text-cyan-400 font-semibold text-center pt-1">
              {selected.size} élément{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''} dans ce fichier
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT : boîte de stat
// ══════════════════════════════════════════════════════════════════════════════

const StatBox: React.FC<{ value: number; label: string; color: 'green' | 'red' | 'yellow' }> = ({ value, label, color }) => {
  const colors = {
    green:  'bg-green-900/20  border-green-700/30  text-green-400',
    red:    'bg-red-900/20    border-red-700/30    text-red-400',
    yellow: 'bg-yellow-900/20 border-yellow-700/30 text-yellow-400',
  };
  return (
    <div className={`border rounded-xl p-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT : section pliable
// ══════════════════════════════════════════════════════════════════════════════

interface ResultSectionProps {
  title: string;
  titleColor: string;
  borderColor: string;
  bgColor: string;
  expanded: boolean;
  onToggle: () => void;
  allSelected?: boolean;
  onSelectAll?: () => void;
  hideSelectAll?: boolean;
  children: React.ReactNode;
}

const ResultSection: React.FC<ResultSectionProps> = ({
  title, titleColor, borderColor, bgColor,
  expanded, onToggle, allSelected, onSelectAll, hideSelectAll, children,
}) => (
  <div className={`border ${borderColor} ${bgColor} rounded-xl overflow-hidden`}>
    <div
      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
      onClick={onToggle}
    >
      <span className={`font-bold text-sm ${titleColor}`}>{title}</span>
      <div className="flex items-center gap-3">
        {!hideSelectAll && onSelectAll && (
          <button
            onClick={e => { e.stopPropagation(); onSelectAll(); }}
            className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
              allSelected
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-cyan-700/50 text-cyan-300 hover:bg-cyan-600/50'
            }`}
          >
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        )}
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-500" />
          : <ChevronDown className="w-4 h-4 text-gray-500" />
        }
      </div>
    </div>

    {expanded && (
      <div className="px-3 pb-3 max-h-[500px] overflow-y-auto space-y-1.5">
        {children}
      </div>
    )}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT : ligne de résultat sélectionnable
// ══════════════════════════════════════════════════════════════════════════════

interface ResultRowProps {
  result: MatchResult;
  selected: boolean;
  onToggle: () => void;
  accent: 'green' | 'red';
}

const ResultRow: React.FC<ResultRowProps> = ({ result, selected, onToggle, accent }) => {
  const isExact = result.score === 100;

  const styles = {
    green: {
      border: selected ? 'border-green-500' : 'border-transparent hover:border-green-800',
      bg:     selected ? 'bg-green-950/30'  : 'bg-gray-900/50 hover:bg-gray-800/50',
      check:  'bg-green-600 border-green-500',
    },
    red: {
      border: selected ? 'border-red-500'   : 'border-transparent hover:border-red-800',
      bg:     selected ? 'bg-red-950/20'    : 'bg-gray-900/50 hover:bg-gray-800/50',
      check:  'bg-red-600 border-red-500',
    },
  };
  const s = styles[accent];

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg border cursor-pointer transition-all ${s.border} ${s.bg}`}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? s.check : 'bg-gray-800 border-gray-600'}`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white text-sm font-semibold truncate">
            {result.matchedTheme?.name}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 border ${
            isExact
              ? 'bg-green-900/50 text-green-300 border-green-700/50'
              : result.score >= 95
              ? 'bg-blue-900/50  text-blue-300  border-blue-700/50'
              : result.score >= 90
              ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50'
              : 'bg-orange-900/50 text-orange-300 border-orange-700/50'
          }`}>
            {result.score}%
          </span>
        </div>
        {/* Afficher le nom SS uniquement si ce n'est pas un match exact */}
        {!isExact && (
          <div className="text-gray-500 text-xs truncate mt-0.5">
            SS : {result.ssEntry.gameName}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenScraperSyncTab;
