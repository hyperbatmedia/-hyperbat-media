import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, X, ImageOff, Eye, Edit2, Trash2, Save, Search, FileJson, Copy, Grid3x3, List, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AdminTab } from './AdminPanel';

// ============================================================================
// TYPES
// ============================================================================
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

interface SystemRow {
  id: string;
  name?: string; 
  isHeader?: boolean;
  isSubHeader?: boolean;
}

interface Category {
  id: string;
  name?: string; 
}

interface ImportTabProps {
  themes: ThemeItem[];
  setThemes: React.Dispatch<React.SetStateAction<ThemeItem[]>>;
  saveThemes: (themes: ThemeItem[]) => Promise<void>;
  systems: SystemRow[];
  categories: Category[];
  setAdminTab: React.Dispatch<React.SetStateAction<AdminTab>>;
  convertGoogleDriveUrl: (url: string, isImage?: boolean) => string; 
}

interface IndexedTheme extends ThemeItem {
  searchText: string;
}

interface ParsedJsonItem {
  name?: string;
  creator?: string;
  system?: string;
  category?: string;
  imageUrl?: string;
  downloadUrl?: string;
  size?: string;
}

// ============================================================================
// HOOKS
// ============================================================================

const useLazyImage = (src: string) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { 
      isMountedRef.current = false; 
    };
  }, []);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && isMountedRef.current) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && src && isMountedRef.current) {
      setImageSrc(src);
    }
  }, [isVisible, src]);

  return { imgRef, imageSrc };
};

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};



// ============================================================================
// COMPOSANT: Theme Card
// ============================================================================

interface ThemeCardProps {
  theme: IndexedTheme;
  systems: SystemRow[];
  categories: Category[];
  isDuplicate: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: (checked: boolean) => void;
  isSelected: boolean;
}

const ThemeCard = React.memo(({ 
  theme, 
  systems, 
  categories,
  isDuplicate,
  onView,
  onEdit,
  onDelete,
  onSelect,
  isSelected
}: ThemeCardProps) => {
  const [imageError, setImageError] = React.useState(false);
  const { imgRef, imageSrc } = useLazyImage(theme.imageUrl);
  
  const getSystemName = React.useCallback((id: string) => systems?.find((s: SystemRow) => s.id === id)?.name || id, [systems]);
  const getCategoryName = React.useCallback((id: string) => categories?.find((c: Category) => c.id === id)?.name || id, [categories]);
  const isMissingCreator = !theme.creator || theme.creator.trim() === '';

  return (
    <div className={`bg-gray-800 p-4 rounded-xl shadow-2xl flex flex-col space-y-3 border-2 transition group relative ${
      isSelected ? 'border-blue-500 bg-blue-900/20' :
      isDuplicate ? 'border-yellow-500 bg-yellow-900/20' : 
      isMissingCreator ? 'border-red-500/50 bg-red-900/10' :
      'border-gray-700 hover:border-orange-500'
    }`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelect(e.target.checked)}
        className="absolute top-2 left-2 z-20 w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
      />

      <div className="flex gap-2 flex-wrap">
        {isDuplicate && (
          <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />DOUBLON
          </span>
        )}
        {isMissingCreator && !isDuplicate && (
          <span className="text-xs font-bold text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />CRÉATEUR MANQUANT
          </span>
        )}
      </div>
      
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onView} className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition" title="Agrandir">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={onEdit} className="p-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition" title="Modifier">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition" title="Supprimer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <h3 className="text-lg font-bold text-white truncate pr-20">{theme.name}</h3>
      
      <div 
        ref={imgRef}
        className="flex-shrink-0 w-full h-24 bg-gray-900 rounded overflow-hidden border border-gray-700 relative cursor-pointer" 
        onClick={onView}
      >
        {imageError || !imageSrc ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-gray-600" />
          </div>
        ) : (
          <img 
            src={imageSrc} 
            alt={theme.name} 
            className="w-full h-full object-cover" 
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer" 
          />
        )}
      </div>
      
      <div className="text-sm text-gray-400 space-y-1">
        <p><strong>Créateur:</strong> <span className={isMissingCreator ? 'text-red-400 font-bold' : 'text-orange-400'}>{theme.creator || '⚠️ À compléter'}</span></p>
        <p><strong>Système:</strong> {getSystemName(theme.system)}</p>
        <p><strong>Catégorie:</strong> {getCategoryName(theme.category)}</p>
        <p><strong>Taille:</strong> {theme.size}</p>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.theme.id === nextProps.theme.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDuplicate === nextProps.isDuplicate &&
    prevProps.theme.name === nextProps.theme.name &&
    prevProps.theme.imageUrl === nextProps.theme.imageUrl
  );
});

ThemeCard.displayName = 'ThemeCard';

// ============================================================================
// COMPOSANT PRINCIPAL: ImportTab avec Pagination
// ============================================================================
const ImportTab: React.FC<ImportTabProps> = ({ themes, setThemes, saveThemes, systems, categories, setAdminTab, convertGoogleDriveUrl }) => { 
  const [jsonInput, setJsonInput] = useState('');
  const [importPreview, setImportPreview] = useState<ThemeItem[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Set<string>>(new Set());
  const [lightboxTheme, setLightboxTheme] = useState<ThemeItem | null>(null);
  const [editingTheme, setEditingTheme] = useState<ThemeItem | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const toImageUrl = useCallback((url: string) => convertGoogleDriveUrl(url, true), [convertGoogleDriveUrl]);
  const toDownloadUrl = useCallback((url: string) => convertGoogleDriveUrl(url, false), [convertGoogleDriveUrl]);
  
  const getCleanUrl = useCallback((fullUrl: string) => {
      if (fullUrl.includes('drive.google.com/thumbnail') || fullUrl.includes('drive.google.com/uc')) {
          const match = fullUrl.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
          return match ? `https://drive.google.com/file/d/${match[1]}/view?usp=sharing` : fullUrl;
      }
      return fullUrl;
  }, []);

  const availableSystems = useMemo(() => systems?.filter(s => !s.isHeader && !s.isSubHeader) || [], [systems]);
  const lastIdRef = useRef(0);

  // Index des thèmes existants pour détection rapide de doublons (mémorisé)
  const existingThemesIndex = useMemo(() => {
    if (!themes || themes.length === 0) return new Set<string>();
    return new Set(themes.map(t => `${t.name.toLowerCase()}_${t.system}`));
  }, [themes]);

  // Initialiser lastId de manière optimisée (évite le spread avec 10k+ items)
  useEffect(() => {
    if (themes?.length > 0) {
      let maxId = themes[0].id;
      for (let i = 1; i < themes.length; i++) {
        if (themes[i].id > maxId) {
          maxId = themes[i].id;
        }
      }
      lastIdRef.current = maxId;
    }
  }, [themes]);

  // Debounce recherche
  const debouncedSearch = useDebounce(searchFilter, 300);

  // Indexation pour recherche ultra-rapide
  const indexedPreview = useMemo((): IndexedTheme[] | null => {
    if (!importPreview) return null;
    return importPreview.map(t => ({
      ...t,
      searchText: `${t.name} ${t.creator} ${t.system}`.toLowerCase()
    }));
  }, [importPreview]);

  // Filtrage optimisé
  const filteredPreview = useMemo(() => {
    if (!indexedPreview) return null;
    if (!debouncedSearch) return indexedPreview;
    
    const search = debouncedSearch.toLowerCase();
    return indexedPreview.filter(t => t.searchText.includes(search));
  }, [indexedPreview, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil((filteredPreview?.length || 0) / ITEMS_PER_PAGE);
  const paginatedPreview = useMemo(() => {
    if (!filteredPreview) return null;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPreview.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPreview, currentPage]);

  // Reset page quand filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);


  // Parsing JSON
  // ✅ Correction de l'ordre de déclaration
  const handleJsonInputChange = useCallback(async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawText = event.target.value;
    setJsonInput(rawText);
    setImportError(null);
    setImportPreview(null);
    setDuplicates(new Set());
    setSelectedIds(new Set());

    if (!rawText.trim()) return;

    setIsParsing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      
      let cleanedJson = rawText
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');

      const parsed = JSON.parse(cleanedJson);
      
      if (!Array.isArray(parsed)) {
        setImportError("Le JSON doit être un tableau d'objets.");
        return;
      }

      const isValid = parsed.every((item: ParsedJsonItem) => item.name && item.system);
      if (!isValid) {
        setImportError("Chaque objet doit avoir au minimum 'name' et 'system'.");
        return;
      }

      const preview: ThemeItem[] = parsed.map((item: ParsedJsonItem, index: number) => ({
        id: lastIdRef.current + index + 1,
        name: item.name || 'Nouveau Thème',
        creator: item.creator || '',
        system: item.system || 'mame',
        category: item.category || 'game-themes',
        imageUrl: toImageUrl(item.imageUrl || ''),
        downloadUrl: toDownloadUrl(item.downloadUrl || ''),
        size: item.size || '0 MB'
      }));

      // Détection doublons optimisée avec Set (utilise l'index mémorisé)
      const duplicateKeys = new Set<string>();
      preview.forEach(newTheme => {
        const key = `${newTheme.name.toLowerCase()}_${newTheme.system}`;
        if (existingThemesIndex.has(key)) {
          duplicateKeys.add(key);
        }
      });

      setImportPreview(preview);
      setDuplicates(duplicateKeys);
    } catch (e) {
      const error = e as Error;
      setImportError(`JSON invalide: ${error.message}`);
    } finally {
      setIsParsing(false);
    }
  }, [existingThemesIndex, toImageUrl, toDownloadUrl]); // Utilise l'index mémorisé au lieu de themes

  // Drag & Drop
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setJsonInput(content);
        // Créer un événement de changement valide
        const syntheticEvent = {
          target: { value: content }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        handleJsonInputChange(syntheticEvent);
      };
      reader.readAsText(file);
    } else {
      alert('⚠️ Veuillez déposer un fichier JSON valide');
    }
  }, [handleJsonInputChange]);

  // Sélection
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedPreview?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedPreview?.map(t => t.id) || []));
    }
  }, [selectedIds, paginatedPreview]);

  const handleDeleteFromPreview = useCallback((themeId: number) => {
    if (!importPreview) return;
    if (confirm('Supprimer ce thème de l\'aperçu ?')) {
      const updatedPreview = importPreview.filter(t => t.id !== themeId);
      setImportPreview(updatedPreview);
      
      // Recalculer doublons (utilise l'index mémorisé)
      const newDuplicates = new Set<string>();
      updatedPreview.forEach(theme => {
        const key = `${theme.name.toLowerCase()}_${theme.system}`;
        if (existingThemesIndex.has(key)) newDuplicates.add(key);
      });
      setDuplicates(newDuplicates);
      
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(themeId);
        return newSet;
      });
    }
  }, [importPreview, existingThemesIndex]);

  const handleSaveEdit = useCallback(() => {
    if (!editingTheme || !importPreview) return;
    if (!editingTheme.name.trim() || !editingTheme.system.trim()) {
      alert("Le nom et le système sont requis.");
      return;
    }
    setImportPreview(importPreview.map(t => t.id === editingTheme.id ? editingTheme : t));
    setEditingTheme(null);
  }, [editingTheme, importPreview]);

  const handleBulkEdit = useCallback(() => {
    if (selectedIds.size === 0) return;
    const system = prompt("Nouveau système (laisser vide pour ignorer):");
    const category = prompt("Nouvelle catégorie (laisser vide pour ignorer):");
    const creator = prompt("Nouveau créateur (laisser vide pour ignorer):");
    
    if (system || category || creator) {
      setImportPreview(prev => prev?.map(t => {
        if (!selectedIds.has(t.id)) return t;
        return {
          ...t,
          ...(system && { system }),
          ...(category && { category }),
          ...(creator && { creator })
        };
      }) || null);
    }
  }, [selectedIds]);

  const missingCreatorsCount = useMemo(() => 
    importPreview?.filter(t => !t.creator || t.creator.trim() === '').length || 0
  , [importPreview]);

  const duplicatesCount = useMemo(() => {
    if (!importPreview) return 0;
    return importPreview.filter(t => 
      duplicates.has(`${t.name.toLowerCase()}_${t.system}`)
    ).length;
  }, [importPreview, duplicates]);

  const confirmImport = async () => {
    if (!importPreview || importPreview.length === 0 || !themes) return;

    // Utilise l'index mémorisé au lieu de recréer le Set
    const toImport = importPreview.filter(newTheme => 
      !existingThemesIndex.has(`${newTheme.name.toLowerCase()}_${newTheme.system}`)
    );

    if (toImport.length === 0) {
      alert('⚠️ Tous les thèmes sont des doublons !');
      return;
    }

    let confirmMessage = `📊 Résumé de l'importation:\n\n`;
    confirmMessage += `✅ ${toImport.length} nouveau(x) thème(s)\n`;
    if (duplicatesCount > 0) confirmMessage += `⚠️ ${duplicatesCount} doublon(s) ignoré(s)\n`;
    if (missingCreatorsCount > 0) confirmMessage += `⚠️ ${missingCreatorsCount} créateur(s) manquant(s)\n`;
    confirmMessage += `\nContinuer ?`;

    if (!confirm(confirmMessage)) return;

    setIsImporting(true);
    try {
      // Assigner des IDs séquentiels après la dernière ID existante
      let nextId = lastIdRef.current + 1;
      const finalToImport = toImport.map(theme => ({
        ...theme,
        id: nextId++,
      }));

      const updatedThemes = [...themes, ...finalToImport];
      await saveThemes(updatedThemes);
      setThemes(updatedThemes);
      
      // Réinitialisation après succès
      setJsonInput('');
      setImportPreview(null);
      // Mettre à jour lastId de manière optimisée (évite le spread avec 10k+ items)
      if (updatedThemes.length > 0) {
        let maxId = updatedThemes[0].id;
        for (let i = 1; i < updatedThemes.length; i++) {
          if (updatedThemes[i].id > maxId) {
            maxId = updatedThemes[i].id;
          }
        }
        lastIdRef.current = maxId;
      } else {
        lastIdRef.current = 0;
      }
      alert(`✅ ${finalToImport.length} thème(s) importé(s) avec succès !`);
      setAdminTab('manage'); // Revenir à l'onglet de gestion
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des thèmes:", error);
      alert("Une erreur est survenue lors de l'importation et de la sauvegarde.");
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setJsonInput('');
    setImportPreview(null);
    setImportError(null);
    setDuplicates(new Set());
    setSelectedIds(new Set());
    setSearchFilter('');
    setCurrentPage(1);
    setLightboxTheme(null);
    setEditingTheme(null);
  };
  
  const exportTemplate = useCallback(() => {
    const template = [{
      "name": "Nom du thème",
      "creator": "Bob Morane",
      "system": "mame",
      "category": "game-themes",
      "imageUrl": "https://drive.google.com/file/d/...",
      "downloadUrl": "https://drive.google.com/file/d/...",
      "size": "5.2 MB"
    }];
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100); 
  }, []);

  const copyToClipboard = useCallback(() => {
    if (!importPreview) return;
    const data: Omit<ThemeItem, 'id'>[] = importPreview.map(({ id, ...rest }) => rest);
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert('✅ JSON copié dans le presse-papier !');
  }, [importPreview]);

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl space-y-6 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
        <Upload className="w-6 h-6 mr-3 text-orange-400" /> Importer des thèmes via JSON 
        <span className="ml-auto text-sm font-normal text-gray-400"> 
          Optimisé pour 10 000+ thèmes 
        </span> 
      </h2>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-300">Collez ou déposez votre JSON ici</label>
          <div className="flex gap-2">
            <button onClick={exportTemplate} className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1">
              <Download className="w-3 h-3" />Template
            </button>
            {jsonInput && (
              <button onClick={() => navigator.clipboard.writeText(jsonInput)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-1">
                <Copy className="w-3 h-3" />Copier
              </button>
            )}
          </div>
        </div>
        <div onDrop={handleFileDrop} onDragOver={(e) => e.preventDefault()} className="relative" >
          <textarea 
            rows={12} 
            placeholder='[{"name": "Theme A", "system": "mame", "creator": "Bob", ...}] ou déposez un fichier .json' 
            className="w-full p-4 bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition font-mono text-sm" 
            value={jsonInput} 
            onChange={handleJsonInputChange} 
            disabled={isParsing}
          />
          {isParsing && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="flex items-center text-orange-400 font-bold">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                Analyse du JSON...
              </div>
            </div>
          )}
        </div>
      </div>

      {importError && (
        <div className="p-4 bg-red-900 border border-red-700 text-red-300 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="font-semibold">Erreur de parsing:</span> {importError}
        </div>
      )}

      {/* Aperçu de l'importation */}
      {importPreview && filteredPreview && (
        <div className="space-y-4">
          <div className="flex gap-4 p-4 rounded-xl bg-gray-700/50">
            <div className="flex-1 p-3 bg-gray-900 rounded-lg shadow-md">
              <span className="block text-sm font-semibold text-orange-400">Total Thèmes</span>
              <span className="text-2xl font-bold text-white">{importPreview.length}</span>
            </div>
            <div className="flex-1 p-3 bg-gray-900 rounded-lg shadow-md">
              <span className="block text-sm font-semibold text-yellow-400">Doublons (Ignorés)</span>
              <span className="text-2xl font-bold text-yellow-400">{duplicatesCount}</span>
            </div>
            <div className="flex-1 p-3 bg-gray-900 rounded-lg shadow-md">
              <span className="block text-sm font-semibold text-red-400">Créateurs Manquants</span>
              <span className="text-2xl font-bold text-red-400">{missingCreatorsCount}</span>
            </div>
          </div>
          
          {/* Options de Filtre/Affichage */}
          <div className="flex gap-3 items-center bg-gray-700/50 p-3 rounded-xl flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Filtrer..." 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
                className="w-full pl-10 pr-10 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm" 
              />
              {searchFilter && <button onClick={() => setSearchFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>}
            </div>
            <button onClick={toggleSelectAll} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm whitespace-nowrap">
              {selectedIds.size === paginatedPreview?.length ? 'Désélectionner page' : 'Sélectionner page'}
            </button>
            <button onClick={handleBulkEdit} disabled={selectedIds.size === 0} className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-30 text-white rounded-lg text-sm flex items-center gap-1 whitespace-nowrap">
              <Edit2 className="w-4 h-4" />Éditer ({selectedIds.size})
            </button>
            <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-orange-600' : 'hover:bg-gray-700'}`}>
                <Grid3x3 className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-orange-600' : 'hover:bg-gray-700'}`}>
                <List className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Liste des Thèmes */}
          <div className="border border-gray-700 p-4 rounded-xl bg-gray-900">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                Aperçu - Page {currentPage}/{totalPages} ({filteredPreview.length} total)
              </h3>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1} 
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Précédent
                  </button>
                  <span className="text-gray-300">
                    {currentPage} / {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages} 
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
                  >
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className={`gap-4 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'space-y-3'}`}>
              {paginatedPreview?.map((theme) => (
                <ThemeCard 
                  key={theme.id}
                  theme={theme}
                  systems={systems}
                  categories={categories}
                  isDuplicate={duplicates.has(`${theme.name.toLowerCase()}_${theme.system}`)}
                  onView={() => setLightboxTheme(theme)}
                  onEdit={() => setEditingTheme(theme)}
                  onDelete={() => handleDeleteFromPreview(theme.id)}
                  onSelect={(checked) => toggleSelect(theme.id)}
                  isSelected={selectedIds.has(theme.id)}
                />
              ))}
            </div>

            {paginatedPreview?.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Aucun thème trouvé avec les filtres actuels.
              </div>
            )}
          </div>

          {/* Boutons d'Action */}
          <div className="flex gap-4">
            <button 
              onClick={confirmImport} 
              disabled={isImporting} 
              className="flex-1 py-3 rounded-lg font-bold text-white transition flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Confirmer l'importation ({importPreview.length - duplicatesCount})
                </>
              )}
            </button>
            <button onClick={copyToClipboard} className="px-6 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition">
              <Copy className="w-5 h-5 inline-block mr-2" />
              Copier le JSON
            </button>
            <button onClick={resetForm} className="px-6 py-3 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-600">
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
        <h4 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
          <FileJson className="w-4 h-4" />Format JSON attendu 
        </h4>
        <pre className="text-xs text-blue-200 bg-gray-900 p-3 rounded overflow-x-auto">
          {`[
  { 
    "name": "Nom du thème", 
    "creator": "Bob Morane", 
    "system": "mame", 
    "category": "game-themes", 
    "imageUrl": "https://...", 
    "downloadUrl": "https://...", 
    "size": "5.2 MB" 
  }
]`}
        </pre>
      </div>

      {/* Lightbox Modal */}
      {lightboxTheme && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4" onClick={() => setLightboxTheme(null)}>
          <button onClick={() => setLightboxTheme(null)} className="absolute top-4 right-4 p-3 bg-orange-600 hover:bg-orange-700 rounded-full">
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="bg-gray-800 p-6 rounded-xl max-w-4xl w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-orange-400 mb-4 border-b border-gray-700 pb-2">{lightboxTheme.name}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                <img src={lightboxTheme.imageUrl} alt={lightboxTheme.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <p><strong>Créateur:</strong> {lightboxTheme.creator || 'Inconnu'}</p>
                <p><strong>Système:</strong> {systems.find(s => s.id === lightboxTheme.system)?.name || lightboxTheme.system}</p>
                <p><strong>Catégorie:</strong> {categories.find(c => c.id === lightboxTheme.category)?.name || lightboxTheme.category}</p>
                <p><strong>Taille:</strong> {lightboxTheme.size}</p>
                <p className="break-all text-sm"><strong>Image URL:</strong> <a href={lightboxTheme.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition">{getCleanUrl(lightboxTheme.imageUrl)}</a></p>
                <p className="break-all text-sm"><strong>Download URL:</strong> <a href={lightboxTheme.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition">{getCleanUrl(lightboxTheme.downloadUrl)}</a></p>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-700 mt-4">
              <button onClick={() => { setLightboxTheme(null); setEditingTheme(lightboxTheme); }}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                <Edit2 className="w-5 h-5" />
                Modifier
              </button>
              <button onClick={() => { handleDeleteFromPreview(lightboxTheme.id); setLightboxTheme(null); }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                <Trash2 className="w-5 h-5" />
                Supprimer
              </button>
              <a href={lightboxTheme.downloadUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Télécharger
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTheme && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4" onClick={() => setEditingTheme(null)}>
          <div className="bg-gray-800 p-6 rounded-xl max-w-xl w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-orange-400 mb-4 border-b border-gray-700 pb-2">Modifier: {editingTheme.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Nom du thème *</label>
                <input type="text" value={editingTheme.name} onChange={(e) => setEditingTheme({...editingTheme, name: e.target.value})} className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2"> Créateur * {(!editingTheme.creator || editingTheme.creator.trim() === '') && ( <span className="text-red-400 ml-2">(⚠️ À compléter)</span> )} </label>
                <input type="text" value={editingTheme.creator} onChange={(e) => setEditingTheme({...editingTheme, creator: e.target.value})} placeholder="Entrez le créateur..." className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Système *</label>
                <select
                  value={editingTheme.system}
                  onChange={(e) => setEditingTheme({...editingTheme, system: e.target.value})}
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none appearance-none"
                >
                  {availableSystems.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Catégorie</label>
                <select
                  value={editingTheme.category}
                  onChange={(e) => setEditingTheme({...editingTheme, category: e.target.value})}
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none appearance-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Taille</label>
                <input type="text" value={editingTheme.size} onChange={(e) => setEditingTheme({...editingTheme, size: e.target.value})} placeholder="5.2 MB" className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
              </div>
              
              <hr className="border-gray-700"/>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">URL Image (Brute ou Drive)</label>
                <input 
                  type="url" 
                  value={getCleanUrl(editingTheme.imageUrl)}
                  onChange={(e) => setEditingTheme({...editingTheme, imageUrl: toImageUrl(e.target.value)})}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">URL Téléchargement (Brute ou Drive)</label>
                <input 
                  type="url" 
                  value={getCleanUrl(editingTheme.downloadUrl)}
                  onChange={(e) => setEditingTheme({...editingTheme, downloadUrl: toDownloadUrl(e.target.value)})}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setEditingTheme(null)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editingTheme.name || !editingTheme.system}
                  className={`flex-1 py-3 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 
                    ${(!editingTheme.name || !editingTheme.system) 
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-orange-600 hover:bg-orange-700'}`}
                >
                  <Save className="w-5 h-5" />
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportTab;