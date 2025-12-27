import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Check, ExternalLink, AlertCircle, Save, Loader, Download } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
interface Item {
  id: string;
  name: string;
  url?: string;
  location?: 'header' | 'list';
  position?: number;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning';
}

// ============================================================================
// CONSTANTES
// ============================================================================
const DEFAULT_LINKS: Item[] = [
  { id: 'discord', name: 'Discord', url: 'https://discord.gg/votre-serveur', location: 'header', position: 1 },
  { id: 'arrm', name: 'ARRM', url: 'https://www.arrm-reborn.fr', location: 'header', position: 2 },
  { id: 'tutoriel', name: 'Tutoriel', url: 'https://example.com/tutoriel', location: 'header', position: 3 },
  { id: 'outil', name: 'Outil', url: 'https://example.com/outil', location: 'header', position: 4 },
  { id: 'theme', name: 'THEME HYPERBAT', url: 'https://example.com/theme', location: 'header', position: 5 }
];

const STORAGE_KEY = 'hyperbat-admin-links';
const TOAST_DURATION = 3000;

// ============================================================================
// UTILS
// ============================================================================
const isValidUrl = (url: string): boolean => {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const validateLink = (link: Partial<Item>): { valid: boolean; error?: string } => {
  if (!link.name?.trim()) {
    return { valid: false, error: 'Le nom est requis' };
  }
  if (link.name.length > 100) {
    return { valid: false, error: 'Le nom est trop long (max 100 caractères)' };
  }
  if (link.url && !isValidUrl(link.url)) {
    return { valid: false, error: 'URL invalide (doit commencer par http:// ou https://)' };
  }
  return { valid: true };
};

const downloadJson = (data: Item[], filename: string) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

// ============================================================================
// COMPOSANT TOAST
// ============================================================================
const ToastNotification = React.memo(({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  const bgColors = {
    success: 'bg-green-600/95 border-green-400',
    error: 'bg-red-600/95 border-red-400',
    warning: 'bg-yellow-600/95 border-yellow-400'
  };

  const icons = {
    success: <Check className="w-6 h-6 text-white" />,
    error: <AlertCircle className="w-6 h-6 text-white" />,
    warning: <AlertCircle className="w-6 h-6 text-white" />
  };

  return (
    <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 ${bgColors[toast.type]} animate-in slide-in-from-right`}>
      {icons[toast.type]}
      <span className="text-white font-bold">{toast.message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition">
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
});

ToastNotification.displayName = 'ToastNotification';

// ============================================================================
// COMPOSANT LINK ROW OPTIMISÉ
// ============================================================================
const LinkRow = React.memo(({ 
  item, 
  isEditing, 
  editData,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onUpdateUrl,
  onRemove,
  onEditDataChange
}: {
  item: Item;
  isEditing: boolean;
  editData: Pick<Item, 'name' | 'url'> | null;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUpdateUrl: (url: string) => void;
  onRemove: () => void;
  onEditDataChange: (field: 'name' | 'url', value: string) => void;
}) => {
  const [urlError, setUrlError] = useState(false);

  const handleUrlBlur = useCallback((url: string) => {
    if (url && !isValidUrl(url)) {
      setUrlError(true);
      setTimeout(() => setUrlError(false), 2000);
    }
  }, []);

  if (isEditing && editData) {
    return (
      <div className="relative group">
        <div className="flex gap-2 p-3 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg border-2 border-orange-500 shadow-lg">
          <div className="flex-1 space-y-2">
            <input
              value={editData.name}
              onChange={(e) => onEditDataChange('name', e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
              placeholder="Nom du lien..."
              autoFocus
              maxLength={100}
            />
            <input
              value={editData.url || ''}
              onChange={(e) => onEditDataChange('url', e.target.value)}
              onBlur={(e) => handleUrlBlur(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
              placeholder="https://example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={onSaveEdit} 
              disabled={!editData.name?.trim()}
              className="p-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
              title="Enregistrer"
            >
              <Check className="w-5 h-5" />
            </button>
            <button 
              onClick={onCancelEdit} 
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              title="Annuler"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {urlError && (
          <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-600/90 text-white text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            URL invalide (doit commencer par http:// ou https://)
          </div>
        )}
      </div>
    );
  }

  const hasValidUrl = item.url && isValidUrl(item.url);
  const urlWarning = item.url && !hasValidUrl;

  return (
    <div className="relative group">
      <div className={`flex items-center gap-2 p-3 bg-gray-800 rounded-lg border transition-all hover:border-orange-500/50 ${
        urlWarning ? 'border-yellow-500/50' : 'border-gray-700'
      }`}>
        <ExternalLink className={`w-4 h-4 flex-shrink-0 ${urlWarning ? 'text-yellow-500' : 'text-orange-600'}`} />
        
        <span className="min-w-[160px] text-sm text-white font-medium truncate" title={item.name}>
          {item.name}
        </span>
        
        <input
          value={item.url || ''}
          onChange={(e) => onUpdateUrl(e.target.value)}
          onBlur={(e) => handleUrlBlur(e.target.value)}
          className={`flex-1 bg-gray-900 border rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition ${
            urlWarning ? 'border-yellow-500' : 'border-gray-600'
          }`}
          placeholder="https://example.com"
        />
        
        {hasValidUrl && (
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-2 text-blue-400 hover:text-blue-300 transition"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-white transition opacity-0 group-hover:opacity-100"
          title="Modifier"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        
        <button 
          onClick={onRemove} 
          className="p-2 text-red-400 hover:text-red-300 transition opacity-0 group-hover:opacity-100"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {urlWarning && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-yellow-600/90 text-white text-xs rounded-lg flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <AlertCircle className="w-3 h-3" />
          URL invalide - elle ne s'ouvrira pas
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.url === nextProps.item.url &&
    prevProps.isEditing === nextProps.isEditing &&
    JSON.stringify(prevProps.editData) === JSON.stringify(nextProps.editData)
  );
});

LinkRow.displayName = 'LinkRow';

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================
const SystemsTab: React.FC = () => {
  const [links, setLinks] = useState<Item[]>(DEFAULT_LINKS);
  const [editing, setEditing] = useState<{ id: string; data: Pick<Item, 'name' | 'url'> } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isMountedRef = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  useEffect(() => {
    isMountedRef.current = true;
    loadData();
    return () => { 
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // UTILS CALLBACKS
  // ============================================================================
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    if (!isMountedRef.current) return;
    setToast({ message, type });
    setTimeout(() => {
      if (isMountedRef.current) setToast(null);
    }, TOAST_DURATION);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => item.id && item.name)) {
          if (isMountedRef.current) {
            setLinks(parsed);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Initialisation avec valeurs par défaut
      if (isMountedRef.current) {
        setLinks(DEFAULT_LINKS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LINKS));
        setIsLoading(false);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setLinks(DEFAULT_LINKS);
        setIsLoading(false);
        showToast('⚠️ Erreur de chargement, valeurs par défaut utilisées', 'warning');
      }
    }
  }, [showToast]);

  const saveLinks = useCallback(async (newLinks: Item[]) => {
    if (!isMountedRef.current) return;
    
    setIsSaving(true);
    setLinks(newLinks);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newLinks));
        
        if (isMountedRef.current) {
          setIsSaving(false);
          showToast('✅ Sauvegardé', 'success');
        }
      } catch (error) {
        if (isMountedRef.current) {
          setIsSaving(false);
          showToast('❌ Erreur de sauvegarde', 'error');
        }
      }
    }, 500);
  }, [showToast]);

  // ============================================================================
  // HANDLERS OPTIMISÉS
  // ============================================================================
  const addLink = useCallback(async () => {
    const newLink: Item = { 
      id: `link-${Date.now()}`, 
      name: `Nouveau lien ${links.length + 1}`, 
      url: 'https://example.com', 
      location: 'header',
      position: links.length + 1 
    };
    await saveLinks([...links, newLink]);
    showToast('➕ Lien ajouté', 'success');
  }, [links, saveLinks, showToast]);

  const removeLink = useCallback(async (id: string) => {
    const link = links.find(l => l.id === id);
    if (!link) return;
    
    if (!confirm(`Supprimer "${link.name}" ?\n\nCette action est irréversible.`)) return;
    
    await saveLinks(links.filter(l => l.id !== id));
    showToast('🗑️ Lien supprimé', 'success');
  }, [links, saveLinks, showToast]);

  const updateLink = useCallback(async (id: string) => {
    if (!editing?.data) return;
    
    const validation = validateLink(editing.data);
    if (!validation.valid) {
      showToast(`⚠️ ${validation.error}`, 'warning');
      return;
    }
    
    await saveLinks(links.map(l => l.id === id ? { ...l, ...editing.data } : l));
    setEditing(null);
    showToast('✏️ Lien modifié', 'success');
  }, [editing, links, saveLinks, showToast]);

  const updateLinkUrl = useCallback(async (id: string, url: string) => {
    await saveLinks(links.map(l => l.id === id ? { ...l, url } : l));
  }, [links, saveLinks]);

  const handleEditDataChange = useCallback((id: string, field: 'name' | 'url', value: string) => {
    setEditing(prev => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, data: { ...prev.data, [field]: value } };
    });
  }, []);

  const startEdit = useCallback((id: string, name: string, url?: string) => {
    setEditing({ id, data: { name, url } });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  // ============================================================================
  // STATS MÉMORISÉES
  // ============================================================================
  const stats = useMemo(() => ({
    total: links.length,
    withValidUrls: links.filter(l => l.url && isValidUrl(l.url)).length,
    withInvalidUrls: links.filter(l => l.url && !isValidUrl(l.url)).length
  }), [links]);

  // ============================================================================
  // RENDER
  // ============================================================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}

      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 p-1">
        <div className="bg-gray-900 rounded-[22px] p-6">
            <div className="flex items-center justify-between gap-5">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl blur-xl opacity-50" />
                  <div className="relative bg-gradient-to-br from-orange-500 to-pink-500 p-4 rounded-2xl">
                    <ExternalLink className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-black text-white mb-1">Gestion des Liens</h1>
                  <p className="text-gray-400 text-sm font-semibold">Configuration • Liens externes • Header</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadJson(links, 'hyperbat-links.json')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
                  title="Télécharger le JSON"
                >
                  <Download className="w-4 h-4" />
                  Télécharger JSON
                </button>
                
                {isSaving && (
                  <div className="flex items-center gap-2 bg-orange-600/20 border border-orange-500 rounded-lg px-4 py-2">
                    <Save className="w-4 h-4 text-orange-400 animate-pulse" />
                    <span className="text-orange-400 text-sm font-semibold">Sauvegarde...</span>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
            <div className="text-3xl font-black text-white mb-1">{stats.total}</div>
            <div className="text-sm text-gray-400">Liens totaux</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-gray-900 rounded-xl p-4 border border-green-700/50">
            <div className="text-3xl font-black text-green-400 mb-1">{stats.withValidUrls}</div>
            <div className="text-sm text-gray-400">URLs valides</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/30 to-gray-900 rounded-xl p-4 border border-yellow-700/50">
            <div className="text-3xl font-black text-yellow-400 mb-1">{stats.withInvalidUrls}</div>
            <div className="text-sm text-gray-400">URLs invalides</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 p-1">
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Liens configurés ({links.length})
              </h2>
              
              {stats.withInvalidUrls > 0 && (
                <div className="flex items-center gap-2 bg-yellow-600/20 border border-yellow-500 rounded-lg px-3 py-1">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-semibold">
                    {stats.withInvalidUrls} URL{stats.withInvalidUrls > 1 ? 's' : ''} à corriger
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto mb-4 pr-2 custom-scrollbar">
              {links.length === 0 ? (
                <div className="text-center py-12">
                  <ExternalLink className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 font-semibold">Aucun lien configuré</p>
                  <p className="text-gray-500 text-sm">Ajoutez votre premier lien</p>
                </div>
              ) : (
                links.map((item) => (
                  <LinkRow 
                    key={item.id} 
                    item={item}
                    isEditing={editing?.id === item.id}
                    editData={editing?.id === item.id ? editing.data : null}
                    onEdit={() => startEdit(item.id, item.name, item.url)}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={() => updateLink(item.id)}
                    onUpdateUrl={(url) => updateLinkUrl(item.id, url)}
                    onRemove={() => removeLink(item.id)}
                    onEditDataChange={(field, value) => handleEditDataChange(item.id, field, value)}
                  />
                ))
              )}
            </div>
            
            <button 
              onClick={addLink} 
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" /> 
              Ajouter un nouveau lien
            </button>
          </div>
        </div>

        <div className="mt-6 bg-blue-900/30 border border-blue-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-1">💡 Conseils</p>
              <ul className="space-y-1 text-blue-300">
                <li>• Les URLs doivent commencer par <code className="bg-blue-950 px-1 rounded">http://</code> ou <code className="bg-blue-950 px-1 rounded">https://</code></li>
                <li>• Les modifications sont sauvegardées automatiquement dans localStorage</li>
                <li>• Survolez un lien pour voir les actions disponibles</li>
                <li>• Utilisez "Télécharger JSON" pour exporter vos liens</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.7);
        }
        @keyframes slide-in-from-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-in {
          animation: slide-in-from-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SystemsTab;