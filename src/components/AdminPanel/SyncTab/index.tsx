import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash2, AlertTriangle, CheckCircle, Play, RefreshCw, Database,
  XCircle, Shield, Zap
} from 'lucide-react';
import { 
  extractDriveFileId, extractFolderId, fetchWithRetry,
  saveDriveApiKey, loadDriveApiKey, saveUrls, loadUrls
} from '../DriveTab/DriveHelpers';

interface ThemeItem {
  id: number;
  name: string;
  creator: string;
  system: string;
  category: string;
  imageUrl: string;
  downloadUrl: string;
  size: string;
  date?: string;
}

interface SyncTabProps {
  existingThemes: ThemeItem[];
  onDeleteThemes?: (themeIds: number[]) => Promise<void>;
}

interface OrphanedTheme extends ThemeItem {
  reason: string;
}

const SyncTab: React.FC<SyncTabProps> = ({ existingThemes, onDeleteThemes }) => {
  const [apiKey, setApiKey] = useState(() => loadDriveApiKey());
  const [driveUrls, setDriveUrls] = useState<string[]>(() => loadUrls());
  const [isScanning, setIsScanning] = useState(false);
  const [orphanedThemes, setOrphanedThemes] = useState<OrphanedTheme[]>([]);
  const [selectedOrphans, setSelectedOrphans] = useState<Set<number>>(new Set());
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: string }>>([]);
  const [stats, setStats] = useState({
    totalScanned: 0,
    orphansFound: 0,
    validThemes: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    saveUrls(driveUrls);
  }, [driveUrls]);

  useEffect(() => {
    if (apiKey?.length >= 39) saveDriveApiKey(apiKey);
  }, [apiKey]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString('fr-FR'),
      message,
      type
    }].slice(-100));
  };

  const listAllFilesInFolder = async (
    folderId: string,
    key: string,
    signal: AbortSignal,
    foundFiles: Set<string> = new Set(),
    depth: number = 0
  ): Promise<Set<string>> => {
    if (depth > 15 || signal.aborted) return foundFiles;

    try {
      let pageToken: string | null = null;
      
      do {
        const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&key=${key}&fields=files(id,name,mimeType),nextPageToken&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
        
        const data = await fetchWithRetry(url, signal, addLog);
        
        if (data.files) {
          for (const file of data.files) {
            if (file.mimeType === 'application/vnd.google-apps.folder') {
              await listAllFilesInFolder(file.id, key, signal, foundFiles, depth + 1);
            } else if (/\.(zip|7z|7zip|rar)$/i.test(file.name)) {
              foundFiles.add(file.id);
            }
          }
        }
        
        pageToken = data.nextPageToken || null;
      } while (pageToken);
      
      return foundFiles;
    } catch (error: any) {
      addLog(`❌ Erreur scan dossier: ${error.message}`, 'error');
      return foundFiles;
    }
  };

  const startSync = async () => {
    if (!apiKey.trim() || apiKey.length < 39) {
      alert('⚠️ Clé API invalide (minimum 39 caractères)');
      return;
    }

    const validUrls = driveUrls.filter(u => u.trim());
    
    if (validUrls.length < 3) {
      alert(`⚠️ Synchronisation requiert les 3 URLs Drive !

Actuellement: ${validUrls.length}/3 URLs configurées

Veuillez configurer les 3 URLs dans l'onglet Drive pour éviter les faux positifs.`);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsScanning(true);
    setOrphanedThemes([]);
    setSelectedOrphans(new Set());
    setLogs([]);
    setStats({
      totalScanned: 0,
      orphansFound: 0,
      validThemes: 0
    });

    addLog('🚀 Démarrage synchronisation', 'info');
    addLog('📊 Scan complet des 3 Drives requis', 'info');
    addLog('⏱️ Temps estimé: 3-5 minutes', 'warning');

    try {
      const allDriveFiles = new Set<string>();

      for (let i = 0; i < validUrls.length; i++) {
        if (controller.signal.aborted) break;

        const url = validUrls[i];
        const folderId = extractFolderId(url);
        
        if (!folderId) {
          addLog(`❌ URL ${i + 1} invalide: ${url}`, 'error');
          continue;
        }

        addLog(`\n📂 Scan Drive ${i + 1}/3...`, 'info');
        const filesInDrive = await listAllFilesInFolder(folderId, apiKey, controller.signal);
        
        addLog(`   ✅ ${filesInDrive.size} archives trouvées`, 'success');
        
        filesInDrive.forEach(id => allDriveFiles.add(id));
      }

      if (controller.signal.aborted) {
        addLog('⚠️ Scan annulé', 'warning');
        return;
      }

      addLog(`\n🔍 Analyse de ${existingThemes.length} thèmes existants...`, 'info');

      const orphans: OrphanedTheme[] = [];
      let validCount = 0;

      for (const theme of existingThemes) {
        if (controller.signal.aborted) break;

        if (!theme.downloadUrl || !theme.downloadUrl.trim()) {
          orphans.push({
            ...theme,
            reason: '❌ Lien ZIP manquant (downloadUrl vide)'
          });
          addLog(`⚠️ ${theme.name}: Lien ZIP manquant`, 'warning');
          continue;
        }

        const fileId = extractDriveFileId(theme.downloadUrl);
        
        if (!fileId) {
          orphans.push({
            ...theme,
            reason: '❌ URL invalide (pas d\'ID Google Drive)'
          });
          addLog(`⚠️ ${theme.name}: URL invalide`, 'warning');
          continue;
        }

        if (!allDriveFiles.has(fileId)) {
          orphans.push({
            ...theme,
            reason: '🗑️ Fichier supprimé du Drive'
          });
          addLog(`⚠️ ${theme.name}: Fichier absent`, 'warning');
        } else {
          validCount++;
        }
      }

      setOrphanedThemes(orphans);
      setStats({
        totalScanned: existingThemes.length,
        orphansFound: orphans.length,
        validThemes: validCount
      });

      if (orphans.length === 0) {
        addLog('\n✅ Aucun thème orphelin détecté !', 'success');
        addLog('🎉 Tous les thèmes sont valides', 'success');
      } else {
        addLog(`\n⚠️ ${orphans.length} thème(s) orphelin(s) détecté(s)`, 'warning');
        addLog('👇 Sélectionnez les thèmes à supprimer ci-dessous', 'info');
      }

    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const cancelSync = () => {
    abortControllerRef.current?.abort();
    addLog('⚠️ Synchronisation annulée', 'error');
  };

  const handleDelete = async () => {
    if (selectedOrphans.size === 0) {
      alert('⚠️ Aucun thème sélectionné');
      return;
    }

    if (!onDeleteThemes) {
      alert('❌ Fonction de suppression non disponible');
      return;
    }

    const confirmed = confirm(`🗑️ Confirmer la suppression de ${selectedOrphans.size} thème(s) ?

Cette action est irréversible !`);

    if (!confirmed) return;

    try {
      const idsToDelete = Array.from(selectedOrphans);
      await onDeleteThemes(idsToDelete);
      
      addLog(`✅ ${idsToDelete.length} thème(s) supprimé(s)`, 'success');
      
      setOrphanedThemes(prev => prev.filter(t => !selectedOrphans.has(t.id)));
      setSelectedOrphans(new Set());
      setStats(prev => ({
        ...prev,
        orphansFound: prev.orphansFound - idsToDelete.length,
        validThemes: prev.validThemes
      }));
      
    } catch (error: any) {
      addLog(`❌ Erreur suppression: ${error.message}`, 'error');
      alert('❌ Erreur lors de la suppression');
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrphans.size === orphanedThemes.length) {
      setSelectedOrphans(new Set());
    } else {
      setSelectedOrphans(new Set(orphanedThemes.map(t => t.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-orange-600 to-pink-600 p-1">
        <div className="bg-gray-900 rounded-[22px] p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative bg-gradient-to-br from-red-500 to-orange-500 p-4 rounded-2xl">
                <RefreshCw className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black text-white mb-1">Synchronisation Drive</h1>
              <p className="text-gray-400 text-sm font-semibold">🔍 Détecte les thèmes supprimés • 🗑️ Nettoyage automatique • 🛡️ 3 Drives requis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 shadow-xl mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">🔑 CLÉ API GOOGLE DRIVE</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              disabled={isScanning}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">📂 3 URLS GOOGLE DRIVE (REQUIS)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {driveUrls.slice(0, 3).map((url, i) => (
                <input
                  key={i}
                  type="text"
                  value={url}
                  onChange={(e) => {
                    const newUrls = [...driveUrls];
                    newUrls[i] = e.target.value;
                    setDriveUrls(newUrls);
                  }}
                  placeholder={`Drive #${i + 1} ${i === 0 ? '(Game Themes)' : i === 1 ? '(System Themes)' : '(Artwork)'}`}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-red-500 transition-all"
                  disabled={isScanning}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              {!isScanning ? (
                <button
                  onClick={startSync}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Lancer la Synchronisation
                </button>
              ) : (
                <button
                  onClick={cancelSync}
                  className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isScanning && (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
            <h3 className="text-xl font-black text-white">Scan en cours...</h3>
          </div>
          <div className="h-64 overflow-y-auto bg-gray-900 rounded-xl p-4 border border-gray-700 font-mono text-xs space-y-1">
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-2 ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' : 
                log.type === 'warning' ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                <span className="text-gray-600">[{log.time}]</span>
                <span>{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {!isScanning && stats.totalScanned > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-5 shadow-xl">
            <Database className="w-7 h-7 text-white mb-3" />
            <div className="text-5xl font-black text-white mb-1">{stats.totalScanned}</div>
            <div className="text-white/80 text-sm font-bold uppercase">Thèmes Analysés</div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-5 shadow-xl">
            <CheckCircle className="w-7 h-7 text-white mb-3" />
            <div className="text-5xl font-black text-white mb-1">{stats.validThemes}</div>
            <div className="text-white/80 text-sm font-bold uppercase">Thèmes Valides</div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-5 shadow-xl">
            <AlertTriangle className="w-7 h-7 text-white mb-3" />
            <div className="text-5xl font-black text-white mb-1">{stats.orphansFound}</div>
            <div className="text-white/80 text-sm font-bold uppercase">Thèmes Orphelins</div>
          </div>
        </div>
      )}

      {orphanedThemes.length > 0 && !isScanning && (
        <div className="bg-gray-800 rounded-2xl p-6 border border-red-700 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-black text-white">
                Thèmes Orphelins ({orphanedThemes.length})
              </h3>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={toggleSelectAll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all"
              >
                {selectedOrphans.size === orphanedThemes.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              <button 
                onClick={handleDelete}
                disabled={selectedOrphans.size === 0}
                className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer ({selectedOrphans.size})
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {orphanedThemes.map((theme) => (
              <div
                key={theme.id}
                onClick={() => {
                  setSelectedOrphans(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(theme.id)) {
                      newSet.delete(theme.id);
                    } else {
                      newSet.add(theme.id);
                    }
                    return newSet;
                  });
                }}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedOrphans.has(theme.id)
                    ? 'bg-red-900/30 border-red-500'
                    : 'bg-gray-900 border-gray-700 hover:border-red-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-bold">{theme.name}</h4>
                      <span className="px-2 py-1 bg-blue-600/80 text-white rounded-full text-xs font-bold">
                        {theme.system}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mb-1">
                      Par {theme.creator} • {theme.size}
                    </div>
                    <div className="text-xs text-red-400 font-semibold">
                      {theme.reason}
                    </div>
                  </div>
                  {selectedOrphans.has(theme.id) && (
                    <CheckCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isScanning && stats.totalScanned === 0 && (
        <div className="bg-gray-800 rounded-2xl p-12 border border-gray-700 text-center">
          <Shield className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-white mb-2">Prêt à synchroniser</h3>
          <p className="text-gray-400 mb-4">
            Configurez les 3 URLs Drive et lancez la synchronisation pour détecter les thèmes orphelins.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 rounded-lg text-sm text-gray-400">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Les 3 Drives doivent être configurés pour éviter les faux positifs
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncTab;