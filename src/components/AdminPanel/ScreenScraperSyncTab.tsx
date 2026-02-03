// ScreenScraperSyncTab.tsx - VERSION AVEC VALIDATION MANUELLE
import React, { useState, useMemo } from 'react';
import { Upload, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Loader2, Check, X, Filter } from 'lucide-react';
import { ThemeItem } from '../../types';
import {
  parseScreenScraperCSV,
  matchThemes,
  applyMatches,
  calculateStats,
  MatchResult,
  SyncStats,
  ScreenScraperTheme
} from './utils/screenScraperUtils';

interface ScreenScraperSyncTabProps {
  themes: ThemeItem[];
  onUpdateThemes: (themes: ThemeItem[]) => Promise<void>;
}

const ScreenScraperSyncTab: React.FC<ScreenScraperSyncTabProps> = ({
  themes,
  onUpdateThemes
}) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [synced, setSynced] = useState(false);
  
  // NOUVEAUX ÉTATS POUR VALIDATION MANUELLE
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [scoreFilter, setScoreFilter] = useState<'all' | '100' | '95+' | '90+' | '85+'>('all');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setMatchResults(null);
      setStats(null);
      setSynced(false);
      setSelectedMatches(new Set());
    }
  };

  const handleAnalyze = async () => {
    if (!csvFile) return;

    setIsAnalyzing(true);
    
    try {
      const text = await csvFile.text();
      const screenScraperThemes = parseScreenScraperCSV(text);
      
      // ABAISSÉ LE SEUIL À 80 pour voir TOUS les matchs possibles
      const results = matchThemes(screenScraperThemes, themes, 80);
      const syncStats = calculateStats(results, 95); // Stats gardent seuil 95
      
      setMatchResults(results);
      setStats(syncStats);
      
      // AUTO-SÉLECTIONNER LES MATCHS 100% par défaut
      const perfectMatches = new Set(
        results
          .map((r, i) => ({ r, i }))
          .filter(({ r }) => r.score === 100 && r.matched)
          .map(({ i }) => i)
      );
      setSelectedMatches(perfectMatches);
      
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      alert('Erreur lors de l\'analyse du fichier CSV');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // FILTRER LES RÉSULTATS PAR SCORE
  const filteredMatches = useMemo(() => {
    if (!matchResults) return [];
    
    return matchResults
      .map((r, i) => ({ ...r, index: i }))
      .filter(r => {
        if (!r.matched) return false;
        
        switch (scoreFilter) {
          case '100': return r.score === 100;
          case '95+': return r.score >= 95;
          case '90+': return r.score >= 90;
          case '85+': return r.score >= 85;
          default: return true;
        }
      });
  }, [matchResults, scoreFilter]);

  // ACTIONS DE SÉLECTION EN MASSE
  const selectByScore = (minScore: number) => {
    if (!matchResults) return;
    
    const indices = matchResults
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.score >= minScore && r.matched)
      .map(({ i }) => i);
    
    setSelectedMatches(new Set(indices));
  };

  const toggleMatch = (index: number) => {
    setSelectedMatches(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    const visibleIndices = filteredMatches.map(m => m.index);
    const allSelected = visibleIndices.every(i => selectedMatches.has(i));
    
    if (allSelected) {
      // Désélectionner tous les visibles
      setSelectedMatches(prev => {
        const next = new Set(prev);
        visibleIndices.forEach(i => next.delete(i));
        return next;
      });
    } else {
      // Sélectionner tous les visibles
      setSelectedMatches(prev => new Set([...prev, ...visibleIndices]));
    }
  };

  // APPLICATION SÉLECTIVE
  const handleSyncSelected = async () => {
    if (!matchResults || selectedMatches.size === 0) return;

    if (!confirm(`Appliquer la synchronisation pour ${selectedMatches.size} thème(s) sélectionné(s) ?`)) {
      return;
    }

    try {
      // Filtrer seulement les matchs sélectionnés
      const selectedResults = matchResults.filter((_, i) => selectedMatches.has(i));
      
      // Appliquer avec seuil 0 car déjà filtré manuellement
      const updatedThemes = applyMatches(themes, selectedResults, 0);
      
      await onUpdateThemes(updatedThemes);
      setSynced(true);
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      alert('Erreur lors de la synchronisation');
    }
  };

  const currentScreenScraperCount = themes.filter(t => t.onScreenScraper).length;
  const selectedCount = selectedMatches.size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      {/* HEADER */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-1">
        <div className="bg-gray-900 rounded-[22px] p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-2xl">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black text-white mb-1">Synchronisation ScreenScraper</h1>
              <p className="text-gray-400 text-sm font-semibold">Import CSV • Validation manuelle • Contrôle total</p>
            </div>
          </div>
        </div>
      </div>

      {/* IMPORT CSV */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />
          Importer le fichier CSV ScreenScraper
        </h2>
        
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-blue-600 file:to-cyan-600 file:text-white hover:file:from-blue-700 hover:file:to-cyan-700 cursor-pointer"
            />
          </div>

          {csvFile && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">{csvFile.name}</span>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!csvFile || isAnalyzing}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Analyser et comparer
              </>
            )}
          </button>
        </div>
      </div>

      {/* RÉSULTATS */}
      {stats && matchResults && (
        <>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              📊 Résultats de l'analyse
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Votre base */}
              <div className="bg-gray-950 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-bold text-blue-400 mb-3">🏠 Votre base actuelle</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total de thèmes :</span>
                    <span className="text-white font-bold">{themes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Déjà marqués SS :</span>
                    <span className="text-white font-bold">{currentScreenScraperCount} ({Math.round(currentScreenScraperCount / themes.length * 100)}%)</span>
                  </div>
                </div>
              </div>

              {/* CSV ScreenScraper */}
              <div className="bg-gray-950 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-bold text-cyan-400 mb-3">📂 CSV ScreenScraper</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Thèmes détectés :</span>
                    <span className="text-white font-bold">{stats.totalScreenScraper}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">✅ Matchs exacts :</span>
                    <span className="text-green-400 font-bold">{stats.exactMatches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">⚠️ Matchs flous (95-99%) :</span>
                    <span className="text-yellow-400 font-bold">{stats.fuzzyMatches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">❌ Non trouvés :</span>
                    <span className="text-red-400 font-bold">{stats.noMatches}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact */}
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/50 rounded-xl p-4">
              <h3 className="text-lg font-bold text-green-400 mb-3">⚡ Sélection actuelle</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Thèmes sélectionnés :</span>
                  <span className="text-white font-bold text-lg">{selectedCount} thèmes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total après sync :</span>
                  <span className="text-green-400 font-bold text-lg">
                    {currentScreenScraperCount + selectedCount} sur ScreenScraper 
                    ({Math.round((currentScreenScraperCount + selectedCount) / themes.length * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BARRE D'ACTIONS */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-400" />
                Actions rapides
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
              <button
                onClick={() => selectByScore(100)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-all"
              >
                ✅ Seulement 100%
              </button>
              <button
                onClick={() => selectByScore(95)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all"
              >
                ✅ ≥95%
              </button>
              <button
                onClick={() => selectByScore(90)}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold text-sm transition-all"
              >
                ✅ ≥90%
              </button>
              <button
                onClick={() => selectByScore(85)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-sm transition-all"
              >
                ✅ ≥85%
              </button>
              <button
                onClick={() => setSelectedMatches(new Set())}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-all"
              >
                ❌ Tout désélectionner
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Filtrer par score :</span>
              <div className="flex gap-2">
                {(['all', '100', '95+', '90+', '85+'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setScoreFilter(filter)}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                      scoreFilter === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {filter === 'all' ? 'Tous' : filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* LISTE DES MATCHS AVEC VALIDATION */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowMatches(!showMatches)}
                className="flex items-center gap-2 text-left flex-1"
              >
                <h3 className="text-lg font-bold text-white">
                  ✅ Thèmes trouvés ({filteredMatches.length})
                </h3>
                {showMatches ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              
              {filteredMatches.length > 0 && (
                <button
                  onClick={toggleAllVisible}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all"
                >
                  {filteredMatches.every(m => selectedMatches.has(m.index)) ? '❌ Tout désélectionner' : '✅ Tout sélectionner'}
                </button>
              )}
            </div>

            {showMatches && (
              <div className="mt-4 max-h-[600px] overflow-y-auto space-y-2">
                {filteredMatches.slice(0, 200).map((result) => (
                  <div 
                    key={result.index}
                    className={`bg-gray-950 rounded-lg p-4 border-2 transition-all cursor-pointer ${
                      selectedMatches.has(result.index)
                        ? 'border-green-500 bg-green-950/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => toggleMatch(result.index)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-1">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          selectedMatches.has(result.index)
                            ? 'bg-green-600 border-green-500'
                            : 'bg-gray-800 border-gray-600'
                        }`}>
                          {selectedMatches.has(result.index) && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white font-bold truncate">{result.matchedTheme?.name}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                            result.score === 100 
                              ? 'bg-green-600/30 text-green-400 border border-green-500/50'
                              : result.score >= 95
                              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                              : result.score >= 90
                              ? 'bg-yellow-600/30 text-yellow-400 border border-yellow-500/50'
                              : 'bg-orange-600/30 text-orange-400 border border-orange-500/50'
                          }`}>
                            {result.score}%
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mb-1">
                          <span className="font-semibold">CSV:</span> {result.screenScraperTheme.game}
                        </div>
                        <div className="text-xs text-gray-500">
                          Système: {result.screenScraperTheme.system}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredMatches.length > 200 && (
                  <div className="text-center text-gray-400 text-sm py-4 bg-gray-950 rounded-lg border border-gray-700">
                    ... et {filteredMatches.length - 200} autres thèmes (ajustez le filtre pour voir moins de résultats)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LISTE NON MATCHÉS */}
          {stats.noMatches > 0 && (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
              <button
                onClick={() => setShowUnmatched(!showUnmatched)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  ℹ️ Thèmes ScreenScraper non trouvés dans votre base ({stats.noMatches})
                </h3>
                {showUnmatched ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {showUnmatched && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-3">
                    Ces thèmes existent sur ScreenScraper mais pas dans votre collection actuelle.
                  </p>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {matchResults.filter(r => !r.matched).slice(0, 50).map((result, idx) => (
                      <div key={idx} className="bg-gray-950 rounded-lg p-3 border border-gray-700">
                        <div className="text-white font-semibold">{result.screenScraperTheme.game}</div>
                        <div className="text-sm text-gray-400">{result.screenScraperTheme.system}</div>
                      </div>
                    ))}
                    {stats.noMatches > 50 && (
                      <div className="text-center text-gray-400 text-sm py-2">
                        ... et {stats.noMatches - 50} autres thèmes
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BOUTON SYNC */}
          {!synced && (
            <button
              onClick={handleSyncSelected}
              disabled={selectedCount === 0}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-6 h-6" />
              {selectedCount === 0 
                ? 'Sélectionnez des thèmes pour synchroniser'
                : `Appliquer la synchronisation (${selectedCount} thème${selectedCount > 1 ? 's' : ''})`
              }
            </button>
          )}

          {synced && (
            <div className="bg-green-600/20 border-2 border-green-500 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-green-400 font-bold text-lg">✅ Synchronisation terminée avec succès !</div>
                <div className="text-gray-300 text-sm">{selectedCount} thèmes ont été marqués comme disponibles sur ScreenScraper</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ScreenScraperSyncTab;
