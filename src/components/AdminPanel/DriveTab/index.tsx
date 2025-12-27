// src/components/AdminPanel/DriveTab/index.tsx
import React, { useState, useRef, useEffect } from 'react';
import { FolderOpen, Zap, Activity, CheckCircle, Play, StopCircle, Download, FileArchive, Clock, Layers, Filter, ArrowUpDown, Pause, PlayCircle } from 'lucide-react';

import { 
  DriveTheme, 
  generateSystemMapping,
  findMatchingSystem,
  formatSize,
  extractFolderId,
  convertToDirectLink,
  findMatchingImage,
  fetchWithRetry,
  saveUrls,
  loadUrls,
  saveDriveApiKey,
  loadDriveApiKey,
  extractCreatorFromArchive,
  QUEUE_DELAY
} from './DriveHelpers';

interface ThemeItem {
  id: number;
  name: string;
  creator: string;
  system: string;
  category: string;
  imageUrl: string;
  downloadUrl: string;
  size: string;
}

interface SystemProgress {
  name: string;
  count: number;
  lastAdded: string;
}

interface AnalysisStats {
  totalFolders: number;
  processedFolders: number;
  totalThemes: number;
  activeRequests: number;
  speed: number;
  startTime: number;
  errors: number;
  creatorsExtracted: number;
}

interface DriveTabProps {
  onImportThemes?: (themes: ThemeItem[]) => Promise<void>;
  existingThemes?: ThemeItem[];
  setAdminTab?: (tab: string) => void;
}

type SortOption = 'name' | 'system' | 'size';
type CreatorExtractionMode = 'never' | 'smart' | 'always';

const getSystemColor = (systemName: string): string => {
  if (systemName.includes('MAME') || systemName.includes('CPS')) return 'from-purple-600 to-pink-600';
  if (systemName.includes('Neo Geo')) return 'from-yellow-600 to-red-600';
  if (systemName.includes('PlayStation')) return 'from-blue-600 to-cyan-600';
  if (systemName.includes('Nintendo') || systemName.includes('SNES')) return 'from-red-600 to-orange-600';
  if (systemName.includes('Sega') || systemName.includes('Genesis')) return 'from-gray-600 to-slate-700';
  if (systemName.includes('Game Boy')) return 'from-green-600 to-teal-600';
  return 'from-indigo-600 to-purple-600';
};

const parseSize = (sizeStr: string): number => {
  const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?B)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  const multipliers: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024
  };
  
  return value * (multipliers[unit] || 1);
};

const DriveTab: React.FC<DriveTabProps> = ({ onImportThemes, existingThemes = [], setAdminTab }) => {
  const [apiKey, setApiKey] = useState(() => loadDriveApiKey());
  const [driveUrls, setDriveUrls] = useState<string[]>(() => loadUrls());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [themes, setThemes] = useState<DriveTheme[]>([]);
  const [systemsProgress, setSystemsProgress] = useState<Record<string, SystemProgress>>({});
  const [stats, setStats] = useState<AnalysisStats>({
    totalFolders: 0,
    processedFolders: 0,
    totalThemes: 0,
    activeRequests: 0,
    speed: 0,
    startTime: 0,
    errors: 0,
    creatorsExtracted: 0
  });
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedSystemFilter, setSelectedSystemFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [creatorExtractionMode, setCreatorExtractionMode] = useState<CreatorExtractionMode>('never');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef(false);
  const pauseResolversRef = useRef<Set<() => void>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);
  const systemMapping = useRef(generateSystemMapping()).current;
  const themeIdCounter = useRef(Date.now());
  const creatorCacheRef = useRef<Map<string, string>>(new Map());
  const downloadQueueRef = useRef<Array<() => Promise<any>>>([]);
  const isProcessingQueueRef = useRef(false);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { saveUrls(driveUrls); }, [driveUrls]);
  useEffect(() => { if (apiKey && apiKey.length >= 39) { saveDriveApiKey(apiKey); } }, [apiKey]);
  useEffect(() => { if (autoScroll) { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); } }, [logs, autoScroll]);
  useEffect(() => {
    if (!isAnalyzing || stats.startTime === 0) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - stats.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isAnalyzing, stats.startTime]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString('fr-FR'),
      message,
      type
    }].slice(-100));
  };

  const getDetectedSystems = (): string[] => {
    const systems = new Set(themes.map(t => t.systemDisplayName));
    return Array.from(systems).sort();
  };

  const getFilteredAndSortedThemes = (): DriveTheme[] => {
    let filtered = themes;
    if (selectedSystemFilter !== 'all') {
      filtered = filtered.filter(t => t.systemDisplayName === selectedSystemFilter);
    }
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name': comparison = a.name.localeCompare(b.name); break;
        case 'system': comparison = a.systemDisplayName.localeCompare(b.systemDisplayName); break;
        case 'size': comparison = parseSize(a.size) - parseSize(b.size); break;
      }
      return sortAsc ? comparison : -comparison;
    });
    return sorted;
  };

  const waitIfPaused = async (): Promise<void> => {
    if (!isPausedRef.current) return;
    return new Promise(resolve => { pauseResolversRef.current.add(resolve); });
  };

  const togglePause = () => {
    if (isPausedRef.current) {
      setIsPaused(false);
      addLog('▶️ Analyse reprise', 'success');
      pauseResolversRef.current.forEach(resolve => resolve());
      pauseResolversRef.current.clear();
    } else {
      setIsPaused(true);
      addLog('⏸️ Analyse mise en pause', 'info');
    }
  };

  const listFiles = async (folderId: string, key: string, signal: AbortSignal) => {
    let allFiles: any[] = [];
    let pageToken: string | null = null;
    do {
      if (signal.aborted) throw new Error('Annulé');
      await waitIfPaused();
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&key=${key}&fields=files(id,name,mimeType,size),nextPageToken&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const data = await fetchWithRetry(url, signal, addLog);
      allFiles = [...allFiles, ...(data.files || [])];
      pageToken = data.nextPageToken || null;
    } while (pageToken);
    return allFiles;
  };

  const processDownloadQueue = async () => {
    if (isProcessingQueueRef.current || downloadQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;
    while (downloadQueueRef.current.length > 0) {
      await waitIfPaused();
      const task = downloadQueueRef.current.shift();
      if (task) {
        try {
          await task();
          await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY));
        } catch (error) {}
      }
    }
    isProcessingQueueRef.current = false;
  };

  const queueDownload = async (task: () => Promise<{ creator: string; format: string }>): Promise<{ creator: string; format: string }> => {
    return new Promise((resolve) => {
      downloadQueueRef.current.push(async () => {
        const result = await task();
        resolve(result);
      });
      processDownloadQueue();
    });
  };

  const getCreatorOptimized = async (
    archive: any,
    matchedSystem: { systemId: string; systemName: string },
    key: string,
    signal: AbortSignal
  ): Promise<{ creator: string; format: string }> => {
    if (creatorExtractionMode === 'never') return { creator: 'Unknown', format: 'UNKNOWN' };
    const cacheKey = `${archive.id}_${archive.name}`;
    
    if (creatorCacheRef.current.has(cacheKey)) {
      const cached = creatorCacheRef.current.get(cacheKey)!;
      addLog(`💾 Cache: ${archive.name} → ${cached}`, 'info');
      return { creator: cached, format: 'CACHED' };
    }
    
    const name = archive.name.replace(/\.(zip|7z|7zip|rar)$/i, '');
    const existingTheme = existingThemes.find(existing => 
      existing.name.toLowerCase() === name.toLowerCase() &&
      existing.system === matchedSystem.systemId
    );
    
    if (existingTheme?.creator) {
      const creator = existingTheme.creator;
      creatorCacheRef.current.set(cacheKey, creator);
      addLog(`♻️ Existant: ${name} → ${creator}`, 'success');
      return { creator, format: 'EXISTING' };
    }
    
    if (creatorExtractionMode === 'smart') {
      addLog(`⭐ Skip: ${name}`, 'info');
      return { creator: 'Unknown', format: 'SKIPPED' };
    }
    
    if (signal.aborted) return { creator: 'Unknown', format: 'ABORTED' };
    
    addLog(`⏳ File: ${name} (${downloadQueueRef.current.length + 1})`, 'info');
    
    const result = await queueDownload(async () => {
      try {
        await waitIfPaused();
        addLog(`📦 DL: ${name}`, 'info');
        const { creator, format } = await extractCreatorFromArchive(archive.id, key, addLog);
        creatorCacheRef.current.set(cacheKey, creator);
        if (creator !== 'Unknown') {
          setStats(prev => ({ ...prev, creatorsExtracted: prev.creatorsExtracted + 1 }));
        }
        return { creator, format };
      } catch (error: any) {
        addLog(`⚠️ Err ${name}: ${error.message}`, 'error');
        return { creator: 'Unknown', format: 'ERROR' };
      }
    });
    return result;
  };

  const analyzeFolder = async (
    folderId: string,
    key: string,
    signal: AbortSignal,
    path = '',
    depth = 0
  ): Promise<{ themes: DriveTheme[]; folderCount: number }> => {
    if (depth > 15 || signal.aborted) return { themes: [], folderCount: 0 };
    await waitIfPaused();
    setStats(prev => ({ ...prev, activeRequests: prev.activeRequests + 1 }));
    try {
      addLog(`🔍 ${path || 'Root'}...`, 'info');
      const files = await listFiles(folderId, key, signal);
      addLog(`   ✔ ${files.length} fichiers`, 'success');
      const localThemes: DriveTheme[] = [];
      let folderCount = 1;
      const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      const archives = files.filter(f => /\.(zip|7z|7zip|rar)$/i.test(f.name));
      const images = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f.name));
      if (archives.length > 0) {
        const pathParts = path.split('/').filter(p => p);
        let systemName = 'unknown';
        for (let i = pathParts.length - 1; i >= 0; i--) {
          const segment = pathParts[i];
          if (!segment.toLowerCase().includes('theme') && !segment.toLowerCase().includes('artwork')) {
            const match = findMatchingSystem(segment, systemMapping, addLog);
            if (match.systemId !== 'unknown') {
              systemName = match.systemName;
              break;
            }
          }
        }
        const matchedSystem = findMatchingSystem(systemName, systemMapping, addLog);
        addLog(`🎮 ${archives.length} → ${matchedSystem.systemName}`, 'info');
        for (const archive of archives) {
          if (signal.aborted) break;
          await waitIfPaused();
          const name = archive.name.replace(/\.(zip|7z|7zip|rar)$/i, '');
          const { creator, format } = await getCreatorOptimized(archive, matchedSystem, key, signal);
          const image = findMatchingImage(archive.name, images);
          const newTheme: DriveTheme = {
            id: `theme_${++themeIdCounter.current}`,
            name,
            systemDisplayName: matchedSystem.systemName,
            system: matchedSystem.systemId,
            category: 'game-themes',
            imageUrl: image ? convertToDirectLink(image.id, key, true) : '',
            downloadUrl: convertToDirectLink(archive.id, key),
            creator,
            size: formatSize(archive.size),
            selected: false,
            archiveFormat: format as 'ZIP' | '7Z' | 'RAR' | 'UNKNOWN'
          };
          localThemes.push(newTheme);
          setSystemsProgress(prev => ({
            ...prev,
            [matchedSystem.systemName]: {
              name: matchedSystem.systemName,
              count: (prev[matchedSystem.systemName]?.count || 0) + 1,
              lastAdded: name
            }
          }));
        }
        if (localThemes.length > 0) {
          setThemes(prev => [...prev, ...localThemes]);
          setStats(prev => {
            const newTotal = prev.totalThemes + localThemes.length;
            const elapsed = (Date.now() - prev.startTime) / 1000;
            const speed = elapsed > 0 ? newTotal / elapsed : 0;
            return { ...prev, totalThemes: newTotal, speed };
          });
        }
      }
      if (folders.length > 0) {
        const MAX_CONCURRENT = 5;
        const results: Array<{ themes: DriveTheme[]; folderCount: number }> = [];
        for (let i = 0; i < folders.length; i += MAX_CONCURRENT) {
          if (signal.aborted) break;
          await waitIfPaused();
          const batch = folders.slice(i, i + MAX_CONCURRENT);
          const batchResults = await Promise.all(
            batch.map(folder => {
              const subPath = path ? `${path}/${folder.name}` : folder.name;
              return analyzeFolder(folder.id, key, signal, subPath, depth + 1);
            })
          );
          results.push(...batchResults);
        }
        results.forEach(result => {
          localThemes.push(...result.themes);
          folderCount += result.folderCount;
        });
      }
      setStats(prev => ({ ...prev, processedFolders: prev.processedFolders + 1 }));
      return { themes: localThemes, folderCount };
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`, 'error');
      setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      return { themes: [], folderCount: 0 };
    } finally {
      setStats(prev => ({ ...prev, activeRequests: Math.max(0, prev.activeRequests - 1) }));
    }
  };
  
  const startAnalysis = async () => {
    if (!apiKey.trim() || apiKey.length < 39) {
      alert('⚠️ Clé API invalide (minimum 39 caractères)');
      return;
    }
    const urls = driveUrls.filter(u => u.trim());
    if (urls.length === 0) {
      alert('⚠️ Au moins une URL Drive requise');
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsAnalyzing(true);
    setIsPaused(false);
    isPausedRef.current = false;
    pauseResolversRef.current.clear();
    setThemes([]);
    setSystemsProgress({});
    setLogs([]);
    setStats({
      totalFolders: 0,
      processedFolders: 0,
      totalThemes: 0,
      activeRequests: 0,
      speed: 0,
      startTime: Date.now(),
      errors: 0,
      creatorsExtracted: 0
    });
    setElapsedTime(0);
    setSelectedSystemFilter('all');
    creatorCacheRef.current.clear();
    downloadQueueRef.current = [];
    isProcessingQueueRef.current = false;
    addLog('🚀 Démarrage analyse', 'info');
    const modeLabels = {
      never: '⚡ Mode rapide',
      smart: '🧠 Mode intelligent',
      always: '🐌 Mode complet'
    };
    addLog(`📋 ${modeLabels[creatorExtractionMode]}`, 'info');
    if (creatorExtractionMode !== 'never') {
      addLog('💾 Cache intelligent actif', 'info');
      addLog(`📊 ${existingThemes.length} thèmes existants`, 'info');
      const withCreator = existingThemes.filter(t => t.creator && t.creator !== 'Unknown').length;
      if (withCreator > 0) {
        addLog(`♻️ ${withCreator} créateurs connus`, 'success');
      }
    }
    try {
      for (const url of urls) {
        if (controller.signal.aborted) break;
        const folderId = extractFolderId(url);
        if (!folderId) {
          addLog(`❌ URL invalide: ${url}`, 'error');
          continue;
        }
        addLog(`\n📂 Analyse: ${url}`, 'info');
        const result = await analyzeFolder(folderId, apiKey, controller.signal);
        if (!controller.signal.aborted) {
          addLog(`✅ ${result.themes.length} thèmes trouvés`, 'success');
        }
      }
      if (!controller.signal.aborted) {
        addLog(`\n🎉 Terminé: ${themes.length} thèmes`, 'success');
        if (creatorExtractionMode !== 'never') {
          addLog(`👤 ${stats.creatorsExtracted} créateurs extraits`, 'success');
        }
      }
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
      setIsPaused(false);
      isPausedRef.current = false;
      pauseResolversRef.current.clear();
      setStats(prev => ({ ...prev, activeRequests: 0 }));
    }
  };

  const cancelAnalysis = () => {
    abortControllerRef.current?.abort();
    setIsPaused(false);
    isPausedRef.current = false;
    pauseResolversRef.current.forEach(resolve => resolve());
    pauseResolversRef.current.clear();
    addLog('⚠️ Analyse annulée', 'error');
  };

  const handleImport = async () => {
    const selected = themes.filter(t => selectedThemes.has(t.id));
    if (selected.length === 0) {
      alert('⚠️ Aucun thème sélectionné');
      return;
    }
    if (!onImportThemes) {
      alert('❌ Fonction d\'import non disponible');
      return;
    }
    const themesToImport: ThemeItem[] = selected.map((t, i) => ({
      id: Date.now() + i,
      name: t.name,
      creator: t.creator,
      system: t.system,
      category: t.category,
      imageUrl: t.imageUrl,
      downloadUrl: t.downloadUrl,
      size: t.size
    }));
    try {
      await onImportThemes(themesToImport);
      addLog(`✅ ${themesToImport.length} thème(s) importés`, 'success');
      setSelectedThemes(new Set());
      setTimeout(() => {
        if (setAdminTab) {
          setAdminTab('manage');
        }
      }, 500);
    } catch (error) {
      addLog(`❌ Erreur import: ${error}`, 'error');
      alert('❌ Erreur lors de l\'importation');
    }
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredAndSortedThemes();
    const filteredIds = new Set(filtered.map(t => t.id));
    if (Array.from(selectedThemes).every(id => filteredIds.has(id)) && selectedThemes.size === filtered.length) {
      const newSelection = new Set(Array.from(selectedThemes).filter(id => !filteredIds.has(id)));
      setSelectedThemes(newSelection);
    } else {
      const newSelection = new Set([...Array.from(selectedThemes), ...filtered.map(t => t.id)]);
      setSelectedThemes(newSelection);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredThemes = getFilteredAndSortedThemes();
  const detectedSystems = getDetectedSystems();

  const ThemeCard = ({ theme, isSelected, onToggleSelect }: { theme: DriveTheme; isSelected: boolean; onToggleSelect: () => void }) => {
    const [imageError, setImageError] = useState(false);
    return (
      <div
        onClick={onToggleSelect}
        className={`bg-gray-900 rounded-xl overflow-hidden border-2 cursor-pointer transition-all group relative ${
          isSelected ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-gray-700 hover:border-orange-500'
        }`}
      >
        <div className="relative h-40 bg-gray-950 overflow-hidden">
          {theme.imageUrl && !imageError ? (
            <>
              <img 
                src={theme.imageUrl} 
                alt={theme.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={() => setImageError(true)}
                referrerPolicy="no-referrer"
              />
              {isSelected && (
                <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
          )}
        </div>
        <div className="p-3 space-y-2">
          <h4 className="text-white font-bold text-sm truncate">{theme.name}</h4>
          <div className="flex gap-2 flex-wrap">
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
              isSelected ? 'bg-orange-600 text-white' : 'bg-blue-600/80 text-white'
            }`}>
              {theme.systemDisplayName}
            </span>
            {theme.archiveFormat && (
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                theme.archiveFormat === 'ZIP' ? 'bg-green-600/80 text-white' :
                theme.archiveFormat === '7Z' ? 'bg-purple-600/80 text-white' :
                theme.archiveFormat === 'RAR' ? 'bg-orange-600/80 text-white' :
                'bg-gray-600/80 text-white'
              }`}>
                {theme.archiveFormat}
              </span>
            )}
            <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-[10px] font-semibold">
              {theme.size}
            </span>
          </div>
          <div className={`text-xs ${theme.creator !== 'Unknown' ? 'text-green-400 font-semibold' : 'text-gray-500'}`}>
            Par {theme.creator}
          </div>
        </div>
      </div>
    );
  };

  const MetricCard = ({ icon: Icon, label, value, unit, gradient }: any) => (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-5 shadow-xl`}>
      <div className="absolute top-0 right-0 opacity-10">
        <Icon className="w-32 h-32" />
      </div>
      <div className="relative">
        <Icon className="w-7 h-7 text-white mb-3" />
        <div className="text-5xl font-black text-white mb-1">{value}</div>
        <div className="text-white/80 text-sm font-bold uppercase tracking-wider">{label}</div>
        {unit && <div className="text-white/60 text-xs mt-1">{unit}</div>}
      </div>
    </div>
  );

  const SystemProgressCard = ({ system }: { system: SystemProgress }) => {
    const color = getSystemColor(system.name);
    return (
      <div className={`bg-gradient-to-br ${color} rounded-xl p-4 shadow-lg transform hover:scale-105 transition-all duration-200`}>
        <div className="flex items-start justify-between mb-2">
          <div className="text-white font-black text-lg">{system.name}</div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
            <div className="text-white font-black text-2xl">{system.count}</div>
          </div>
        </div>
        <div className="text-white/70 text-xs truncate">{system.lastAdded}</div>
        <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/40 rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>
      </div>
    );
  };

  // ===== RENDER PRINCIPAL =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      {/* HEADER */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 p-1">
        <div className="bg-gray-900 rounded-[22px] p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative bg-gradient-to-br from-orange-500 to-pink-500 p-4 rounded-2xl">
                <Zap className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black text-white mb-1">Analyseur Google Drive</h1>
              <p className="text-gray-400 text-sm font-semibold">✅ ZIP/7Z/RAR • ⏸️ Pause/Reprise • ⚡ Optimisé</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIGURATION */}
      <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 shadow-xl mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">🔑 CLÉ API GOOGLE DRIVE</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
              disabled={isAnalyzing}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">📂 URLS GOOGLE DRIVE</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {driveUrls.slice(0, 4).map((url, i) => (
                <input
                  key={i}
                  type="text"
                  value={url}
                  onChange={(e) => {
                    const newUrls = [...driveUrls];
                    newUrls[i] = e.target.value;
                    setDriveUrls(newUrls);
                  }}
                  placeholder={`Lien Google Drive #${i + 1}`}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-orange-500 transition-all"
                  disabled={isAnalyzing}
                />
              ))}
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
            <p className="text-blue-300 text-sm font-semibold">
              ✨ <strong>Formats supportés :</strong> ZIP ✅ (extraction créateur) • 7Z/RAR ✅ (reconnaissance uniquement) • Timeout 60s • Backoff exponentiel • Pause/Reprise
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              {!isAnalyzing ? (
                <button
                  onClick={startAnalysis}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white rounded-lg font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Lancer l'Analyse Complète
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={togglePause}
                    className={`flex-1 py-3 ${
                      isPaused 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                        : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700'
                    } text-white rounded-lg font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2`}
                  >
                    {isPaused ? (
                      <>
                        <PlayCircle className="w-5 h-5" />
                        Reprendre
                      </>
                    ) : (
                      <>
                        <Pause className="w-5 h-5" />
                        Pause
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelAnalysis}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <StopCircle className="w-5 h-5" />
                    Arrêter
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <div className="bg-gray-900 rounded-lg px-4 py-3 text-center border border-gray-700 min-w-[80px]">
                <div className="text-orange-400 font-black text-lg">×5</div>
                <div className="text-gray-500 text-[10px] font-semibold uppercase">Parallèle</div>
              </div>
              <div className="bg-gray-900 rounded-lg px-4 py-3 text-center border border-gray-700 min-w-[80px]">
                <div className="text-green-400 font-black text-lg">{stats.activeRequests}/5</div>
                <div className="text-gray-500 text-[10px] font-semibold uppercase">Actifs</div>
              </div>
              <div className="bg-gray-900 rounded-lg px-4 py-3 text-center border border-gray-700 min-w-[80px]">
                <div className={`font-black text-lg ${stats.errors > 0 ? 'text-red-400' : 'text-gray-600'}`}>{stats.errors}</div>
                <div className="text-gray-500 text-[10px] font-semibold uppercase">Erreurs</div>
              </div>
              <div className="bg-gray-900 rounded-lg px-4 py-3 text-center border border-green-700 min-w-[100px]">
                <div className="text-green-400 font-black text-lg">{stats.creatorsExtracted}</div>
                <div className="text-gray-500 text-[10px] font-semibold uppercase">Créateurs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MÉTRIQUES */}
      {isAnalyzing && (
        <>
          {isPaused && (
            <div className="bg-yellow-900/20 border-2 border-yellow-600 rounded-2xl p-4 mb-6 flex items-center gap-3 animate-pulse">
              <Pause className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-yellow-300 font-bold text-lg">⏸️ Analyse en pause</div>
                <div className="text-yellow-400 text-sm">Cliquez sur "Reprendre" pour continuer • {pauseResolversRef.current.size} tâche(s) en attente</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard icon={FileArchive} label="Thèmes" value={stats.totalThemes} gradient="from-green-600 to-emerald-600" />
            <MetricCard icon={Zap} label="Vitesse" value={stats.speed.toFixed(1)} unit="thèmes/sec" gradient="from-orange-600 to-pink-600" />
            <MetricCard icon={Layers} label="Requêtes" value={stats.activeRequests} unit="actives" gradient="from-blue-600 to-cyan-600" />
            <MetricCard icon={Clock} label="Temps" value={formatTime(elapsedTime)} gradient="from-purple-600 to-indigo-600" />
          </div>

          {Object.keys(systemsProgress).length > 0 && (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-black text-white">Systèmes ({Object.keys(systemsProgress).length})</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Object.values(systemsProgress).map((system, i) => (
                  <SystemProgressCard key={i} system={system} />
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-black text-white">Logs</h3>
              </div>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  autoScroll 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {autoScroll ? '✅ Auto-scroll ON' : '⏸️ Auto-scroll OFF'}
              </button>
            </div>
            <div className="h-64 overflow-y-auto bg-gray-900 rounded-xl p-4 border border-gray-700 font-mono text-xs space-y-1">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' : 'text-gray-400'
                }`}>
                  <span className="text-gray-600">[{log.time}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </>
      )}

      {/* RÉSULTATS */}
      {themes.length > 0 && !isAnalyzing && (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-6 h-6 text-orange-400" />
              <h3 className="text-xl font-black text-white">
                Résultats ({filteredThemes.length}/{themes.length} thèmes)
              </h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedSystemFilter}
                  onChange={(e) => setSelectedSystemFilter(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-semibold focus:border-orange-500 transition-all"
                >
                  <option value="all">Tous les systèmes ({themes.length})</option>
                  {detectedSystems.map(system => {
                    const count = themes.filter(t => t.systemDisplayName === system).length;
                    return (
                      <option key={system} value={system}>
                        {system} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-semibold focus:border-orange-500 transition-all"
                >
                  <option value="name">Trier par Nom</option>
                  <option value="system">Trier par Système</option>
                  <option value="size">Trier par Taille</option>
                </select>
                
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 hover:border-orange-500 transition-all"
                >
                  <ArrowUpDown className={`w-4 h-4 transition-transform ${sortAsc ? '' : 'rotate-180'}`} />
                </button>
              </div>

              <button 
                onClick={toggleSelectAll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all"
              >
                {selectedThemes.size === filteredThemes.length && filteredThemes.length > 0 ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              <button 
                onClick={handleImport}
                disabled={selectedThemes.size === 0}
                className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                Importer ({selectedThemes.size})
              </button>
            </div>
          </div>

          {selectedSystemFilter !== 'all' && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-300 text-sm font-semibold">
                <Filter className="w-4 h-4" />
                Filtre actif : {selectedSystemFilter} ({filteredThemes.length} thème{filteredThemes.length > 1 ? 's' : ''})
                <button
                  onClick={() => setSelectedSystemFilter('all')}
                  className="ml-auto text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded transition-all"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[600px] overflow-y-auto pr-2">
            {filteredThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isSelected={selectedThemes.has(theme.id)}
                onToggleSelect={() => {
                  setSelectedThemes(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(theme.id)) {
                      newSet.delete(theme.id);
                    } else {
                      newSet.add(theme.id);
                    }
                    return newSet;
                  });
                }}
              />
            ))}
          </div>

          {filteredThemes.length === 0 && (
            <div className="text-center py-12">
              <Filter className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg font-semibold">Aucun thème trouvé avec ce filtre</p>
              <button
                onClick={() => setSelectedSystemFilter('all')}
                className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-all"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DriveTab;