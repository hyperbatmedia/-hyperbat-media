import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Download, Edit2, Trash2, Eye, X, AlertCircle, ImageOff, User, CheckSquare, Square, Upload, Filter, ArrowUpDown, Zap, ChevronDown, Users } from 'lucide-react';
import { ensureDisplayableUrl, reverseConvertUrl, isUnknownCreator } from './DriveTab/DriveHelpers';

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
  name: string;
  isHeader?: boolean;
  isSubHeader?: boolean;
}

interface Category {
  id: string;
  name?: string;
}

interface ManageTabProps {
  themes: ThemeItem[];
  setThemes: React.Dispatch<React.SetStateAction<ThemeItem[]>>;
  saveThemes: (themes: ThemeItem[]) => Promise<void>;
  systems: SystemRow[];
  categories: Category[];
}

const isInvalidUrl = (url: string): boolean => {
  if (!url?.trim()) return true;
  try {
    const parsed = new URL(url);
    return !['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return true;
  }
};

const matchSystemId = (themeSystem: string, selectedSystemId: string): boolean => {
  if (selectedSystemId === 'all' || selectedSystemId === '') return true;
  
  if (['tools', 'tutorials', 'main-themes'].includes(selectedSystemId)) {
    return false;
  }
  
  const parts = selectedSystemId.split('-');
  const systemIdPart = parts[parts.length - 1];
  
  const normalizedSelected = systemIdPart.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const normalizedTheme = themeSystem.toLowerCase().replace(/[^a-z0-9]+/g, '');
  
  return normalizedTheme === normalizedSelected;
};

const downloadJson = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

const AutocompleteSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Rechercher...",
  emptyLabel = "Tous"
}: {
  options: SystemRow[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const search = searchTerm.toLowerCase();
    return options.filter(opt => 
      opt.name.toLowerCase().includes(search) ||
      opt.id.toLowerCase().includes(search)
    );
  }, [options, searchTerm]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const selectedName = useMemo(() => {
    if (!value) return emptyLabel;
    const found = options.find(opt => opt.id === value);
    return found?.name || value;
  }, [value, options, emptyLabel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : selectedName}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none cursor-pointer transition-all pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
              title="Réinitialiser"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-900 border-2 border-orange-500 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          <div
            onClick={() => handleSelect('')}
            onMouseEnter={() => setHighlightedIndex(-1)}
            className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-2 border-b border-gray-700 ${
              highlightedIndex === -1 ? 'bg-orange-500/20' : 'hover:bg-gray-800'
            }`}
          >
            <span className="text-white font-semibold">🎮 {emptyLabel}</span>
          </div>

          {filteredOptions.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucun système trouvé</p>
            </div>
          ) : (
            <>
              {filteredOptions.map((option, index) => (
                <div
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    highlightedIndex === index 
                      ? 'bg-orange-500/20 border-l-4 border-orange-500' 
                      : 'hover:bg-gray-800'
                  } ${value === option.id ? 'bg-orange-500/10' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{option.name}</span>
                    {value === option.id && (
                      <span className="text-orange-400 text-xs font-bold">✓ Sélectionné</span>
                    )}
                  </div>
                </div>
              ))}
              <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 text-center">
                {filteredOptions.length} système{filteredOptions.length > 1 ? 's' : ''} disponible{filteredOptions.length > 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const Toast = ({ message, type, onClose }: { 
  message: string; 
  type: 'success' | 'error'; 
  onClose: () => void 
}) => (
  <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 ${
    type === 'success' ? 'bg-green-600/95 border-green-400' : 'bg-red-600/95 border-red-400'
  }`}>
    {type === 'success' ? (
      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-green-600 font-bold">✓</div>
    ) : (
      <AlertCircle className="w-6 h-6 text-white" />
    )}
    <span className="text-white font-bold">{message}</span>
    <button onClick={onClose} className="ml-2 hover:opacity-70">
      <X className="w-5 h-5 text-white" />
    </button>
  </div>
);

const BulkCreatorEditModal = ({ 
  selectedThemes, 
  onSave, 
  onClose 
}: {
  selectedThemes: ThemeItem[];
  onSave: (newCreator: string) => void;
  onClose: () => void;
}) => {
  const [newCreator, setNewCreator] = useState('');
  
  const uniqueCreators = useMemo(() => {
    const creators = new Set(selectedThemes.map(t => t.creator));
    return Array.from(creators);
  }, [selectedThemes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCreator.trim()) {
      onSave(newCreator.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-2 border-purple-500 max-w-2xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 p-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-7 h-7" />
            Édition en masse des créateurs
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-bold">Thèmes sélectionnés</span>
            </div>
            <div className="text-white font-semibold mb-2">
              {selectedThemes.length} thème{selectedThemes.length > 1 ? 's' : ''} sélectionné{selectedThemes.length > 1 ? 's' : ''}
            </div>
            
            {uniqueCreators.length > 0 && (
              <div className="mt-3">
                <div className="text-sm text-gray-400 mb-2">Créateurs actuels :</div>
                <div className="flex flex-wrap gap-2">
                  {uniqueCreators.map((creator, idx) => (
                    <span 
                      key={idx}
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        isUnknownCreator(creator) 
                          ? 'bg-red-600/30 text-red-400 border border-red-500/50'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {creator || 'Vide'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              Nouveau créateur *
            </label>
            <input 
              type="text" 
              required 
              value={newCreator} 
              onChange={e => setNewCreator(e.target.value)}
              placeholder="Ex: John Doe"
              className="w-full p-4 bg-gray-950 border border-gray-700 rounded-xl text-white text-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
              autoFocus
            />
            <p className="text-sm text-gray-400 mt-2">
              Ce nom sera appliqué à tous les {selectedThemes.length} thèmes sélectionnés
            </p>
          </div>

          <div className="bg-orange-600/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-300">
                <span className="font-bold">Attention :</span> Cette action remplacera le créateur de tous les thèmes sélectionnés. Cette modification est irréversible.
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-all"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Appliquer à {selectedThemes.length} thème{selectedThemes.length > 1 ? 's' : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Suite de ManageTab.tsx - Composants de cartes et modales

const ThemeCard = ({ 
  theme, 
  systemName,
  categoryName,
  onView, 
  isSelected, 
  onToggleSelect 
}: {
  theme: ThemeItem;
  systemName: string;
  categoryName: string;
  onView: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}) => {
  const [imageError, setImageError] = React.useState(false);
  const missingCreator = isUnknownCreator(theme.creator);
  const invalidUrl = isInvalidUrl(theme.imageUrl);
  const hasProblem = missingCreator || invalidUrl || imageError;

  React.useEffect(() => {
    setImageError(false);
  }, [theme.imageUrl]);

  return (
    <div className={`group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
      isSelected ? 'border-orange-500 ring-4 ring-orange-500/30 shadow-lg shadow-orange-500/20' : 
      hasProblem ? 'border-red-500/70' : 'border-gray-700/50 hover:border-orange-500/50'
    }`}>
      <div className="absolute top-2 left-2 z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={`p-2 rounded-lg transition-all ${
            isSelected ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>
      </div>

      <div onClick={onView} className="cursor-pointer relative h-40 overflow-hidden bg-gray-950">
        {invalidUrl || imageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-900 to-gray-950">
            <ImageOff className="w-12 h-12 text-red-400" />
            <span className="text-red-400 text-xs font-bold">{invalidUrl ? 'URL invalide' : 'Erreur chargement'}</span>
            {imageError && (
              <button 
                onClick={(e) => { e.stopPropagation(); setImageError(false); }}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Réessayer
              </button>
            )}
          </div>
        ) : (
          <>
            <img 
              src={theme.imageUrl}
              alt={theme.name} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => setImageError(true)}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye className="w-12 h-12 text-white" />
            </div>
          </>
        )}
      </div>
      
      <div className="p-3 space-y-2">
        <h3 className="text-white font-bold text-base truncate">{theme.name}</h3>
        <p className={`text-sm font-bold flex items-center gap-1.5 ${missingCreator ? 'text-red-400' : 'text-gray-400'}`}>
          <User className="w-4 h-4" />
          {missingCreator ? 'Créateur manquant' : theme.creator}
        </p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full text-white font-semibold">
            🎮 {systemName}
          </span>
          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold">
            {categoryName}
          </span>
          {theme.size && (
            <span className="px-2 py-0.5 bg-gray-700 rounded-full text-gray-300 font-semibold">
              {theme.size}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const PreviewModal = ({ theme, onClose, onEdit, onDelete, systems, categories }: {
  theme: ThemeItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  systems: SystemRow[];
  categories: Category[];
}) => {
  const systemName = systems.find(s => s.id === theme.system)?.name || theme.system;
  const categoryName = categories.find(c => c.id === theme.category)?.name || theme.category;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-2 border-orange-500 max-w-2xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-black text-white">👁️ Prévisualisation</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="relative h-64 rounded-xl overflow-hidden bg-gray-950">
            {theme.imageUrl && !isInvalidUrl(theme.imageUrl) ? (
              <img src={theme.imageUrl} alt={theme.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-16 h-16 text-red-400" />
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="text-gray-400 text-sm">Nom:</span>
              <p className="text-white font-bold text-xl">{theme.name}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Créateur:</span>
              <p className="text-orange-400 font-semibold">{theme.creator || 'Inconnu'}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                🎮 {systemName}
              </span>
              <span className="px-3 py-1 bg-orange-600 text-white text-sm font-semibold rounded-full">
                {categoryName}
              </span>
              <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm font-semibold rounded-full">
                {theme.size}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button onClick={onEdit}
              className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
              <Edit2 className="w-5 h-5" />
              Modifier
            </button>
            <button onClick={onDelete}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
              <Trash2 className="w-5 h-5" />
              Supprimer
            </button>
            <a href={theme.downloadUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Télécharger
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditModal = ({ theme, onSave, onClose, systems, categories }: {
  theme: ThemeItem;
  onSave: (theme: ThemeItem) => void;
  onClose: () => void;
  systems: SystemRow[];
  categories: Category[];
}) => {
  const [editData, setEditData] = useState<ThemeItem>({ ...theme });
  const availableSystems = systems.filter(s => !s.isHeader && !s.isSubHeader);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...editData,
      name: editData.name.trim(),
      creator: editData.creator.trim(),
      imageUrl: editData.imageUrl.trim(),
      downloadUrl: editData.downloadUrl.trim(),
      size: editData.size.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-2 border-orange-500 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 p-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-black text-white">✏️ Modifier le thème</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Nom du thème *</label>
              <input type="text" required value={editData.name} 
                onChange={e => setEditData({...editData, name: e.target.value})}
                className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Créateur *</label>
              <input type="text" required value={editData.creator} 
                onChange={e => setEditData({...editData, creator: e.target.value})}
                className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Système *</label>
              <select required value={editData.system} onChange={e => setEditData({...editData, system: e.target.value})}
                className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none">
                {availableSystems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Catégorie *</label>
              <select required value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})}
                className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Taille</label>
              <input type="text" value={editData.size} onChange={e => setEditData({...editData, size: e.target.value})}
                className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">URL de l'image</label>
            <input type="url" value={editData.imageUrl} onChange={e => setEditData({...editData, imageUrl: e.target.value})}
              className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">URL de téléchargement</label>
            <input type="url" value={editData.downloadUrl} onChange={e => setEditData({...editData, downloadUrl: e.target.value})}
              className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none" />
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold">
              Annuler
            </button>
            <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 text-white rounded-lg font-bold shadow-lg">
              💾 Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ImportModal = ({ onImport, onClose }: {
  onImport: (themes: Omit<ThemeItem, 'id'>[]) => void;
  onClose: () => void;
}) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(event.target?.result as string);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        setError('Le fichier doit contenir un tableau');
        return;
      }
      onImport(parsed);
      onClose();
    } catch (err) {
      setError('JSON invalide : ' + (err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-2 border-orange-500 max-w-3xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 p-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">📥 Importer des thèmes</h2>
          <button onClick={onClose} className="text-white"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Charger un fichier JSON</label>
            <input type="file" accept=".json" onChange={handleFileUpload}
              className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-gradient-to-r file:from-orange-600 file:to-pink-600 file:text-white hover:file:from-orange-700 hover:file:to-pink-700 cursor-pointer" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Ou coller le JSON directement</label>
            <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setError(''); }} rows={10} placeholder='[{"name":"Theme 1","creator":"John","system":"ps4","category":"gaming",...}]'
              className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none font-mono text-sm" />
          </div>
          
          {error && (
            <div className="p-3 bg-red-600/20 border border-red-500 rounded-xl flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}
          
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold">
              Annuler
            </button>
            <button onClick={handleImport} disabled={!jsonText} 
              className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              Importer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ManageTab.tsx - COMPOSANT PRINCIPAL

export default function ManageTab({ themes, setThemes, saveThemes, systems, categories }: ManageTabProps) {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    system: '',
    onlyInvalidUrls: false,
    onlyMissingCreators: false
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'creator' | 'system'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTheme, setEditingTheme] = useState<ThemeItem | null>(null);
  const [viewTheme, setViewTheme] = useState<ThemeItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkCreatorModal, setShowBulkCreatorModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const itemsPerPage = 12;
  const availableSystems = systems.filter(s => !s.isHeader && !s.isSubHeader);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const stats = useMemo(() => ({
    total: themes.length,
    invalidUrls: themes.filter(t => isInvalidUrl(t.imageUrl)).length,
    missingCreators: themes.filter(t => isUnknownCreator(t.creator)).length
  }), [themes]);

  const themesWithConvertedUrls = useMemo(() => {
    return themes.map(theme => {
      const needsImageConversion = theme.imageUrl && !theme.imageUrl.includes('/thumbnail?');
      const needsDownloadConversion = theme.downloadUrl && !theme.downloadUrl.includes('/uc?');
      
      return {
        ...theme,
        imageUrl: needsImageConversion ? ensureDisplayableUrl(theme.imageUrl, true) : theme.imageUrl,
        downloadUrl: needsDownloadConversion ? ensureDisplayableUrl(theme.downloadUrl, false) : theme.downloadUrl
      };
    });
  }, [themes]);

  const filtered = useMemo(() => {
    return themesWithConvertedUrls.filter(theme => {
      if (filters.search && !theme.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (!matchSystemId(theme.system, filters.system)) return false;
      if (filters.category && theme.category !== filters.category) return false;
      if (filters.onlyInvalidUrls && !isInvalidUrl(theme.imageUrl)) return false;
      if (filters.onlyMissingCreators && !isUnknownCreator(theme.creator)) return false;
      return true;
    });
  }, [themesWithConvertedUrls, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      } else if (sortBy === 'creator') {
        comparison = a.creator.toLowerCase().localeCompare(b.creator.toLowerCase());
      } else if (sortBy === 'system') {
        const aName = availableSystems.find(s => s.id === a.system)?.name || a.system;
        const bName = availableSystems.find(s => s.id === b.system)?.name || b.system;
        comparison = aName.localeCompare(bName);
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [filtered, sortBy, sortAsc, availableSystems]);

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy, sortAsc]);

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const pageIds = paginated.map(t => t.id);
    const allPageSelected = pageIds.every(id => selectedIds.includes(id));
    if (allPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleDelete = (themeId: number) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme && confirm(`Supprimer "${theme.name}" ?`)) {
      const updated = themes.filter(t => t.id !== themeId);
      setThemes(updated);
      saveThemes(updated);
      showToast('🗑️ Thème supprimé', 'success');
      setViewTheme(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Supprimer ${selectedIds.length} thème(s) ?`)) {
      const updated = themes.filter(t => !selectedIds.includes(t.id));
      setThemes(updated);
      saveThemes(updated);
      setSelectedIds([]);
      showToast(`🗑️ ${selectedIds.length} thème(s) supprimé(s)`, 'success');
    }
  };

  const handleBulkCreatorEdit = (newCreator: string) => {
    const updated = themes.map(theme => 
      selectedIds.includes(theme.id) 
        ? { ...theme, creator: newCreator }
        : theme
    );
    
    setThemes(updated);
    saveThemes(updated);
    setSelectedIds([]);
    setShowBulkCreatorModal(false);
    showToast(`✅ Créateur modifié pour ${selectedIds.length} thème(s)`, 'success');
  };

  const handleSaveEdit = async (edited: ThemeItem) => {
    const updated = themes.map(t => t.id === edited.id ? edited : t);
    setThemes(updated);
    await saveThemes(updated);
    setEditingTheme(null);
    showToast('✅ Thème modifié', 'success');
  };

  const handleExport = () => {
    const toExport = selectedIds.length > 0 ? sorted.filter(t => selectedIds.includes(t.id)) : sorted;
    
    const data = toExport.map(theme => ({
      id: theme.id,
      name: theme.name,
      creator: theme.creator,
      system: theme.system,
      category: theme.category,
      imageUrl: reverseConvertUrl(theme.imageUrl),
      downloadUrl: reverseConvertUrl(theme.downloadUrl),
      size: theme.size
    }));
    
    const filename = `themes_${selectedIds.length > 0 ? 'selection' : 'filtered'}_${new Date().toISOString().split('T')[0]}.json`;
    downloadJson(data, filename);
    showToast(`✅ ${data.length} thème(s) exporté(s) avec IDs`, 'success');
  };

  const handleImport = (imported: Omit<ThemeItem, 'id'>[]) => {
    const maxId = themes.length > 0 ? Math.max(...themes.map(t => t.id)) : 0;
    const newThemes = imported.map((t, i) => ({ ...t, id: maxId + i + 1 }));
    const updated = [...themes, ...newThemes];
    setThemes(updated);
    saveThemes(updated);
    showToast(`✅ ${newThemes.length} thème(s) importé(s)`, 'success');
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      system: '',
      onlyInvalidUrls: false,
      onlyMissingCreators: false
    });
  };

  const hasActiveFilters = filters.search || filters.category || filters.system || filters.onlyInvalidUrls || filters.onlyMissingCreators;
  const selectedThemes = themes.filter(t => selectedIds.includes(t.id));

  if (themes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-xl font-medium">Aucun thème disponible</p>
        <button onClick={() => setShowImportModal(true)} className="mt-4 text-orange-500 hover:underline">
          Importer un fichier JSON
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 p-1">
        <div className="bg-gray-900 rounded-[22px] p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 p-4 rounded-2xl">
                  <Zap className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black text-white mb-1">🎮 Gestion des Thèmes</h1>
                <p className="text-gray-400 text-sm font-semibold">Organisez • Modifiez • Exportez</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-xl px-6 py-3 shadow-lg">
              <div className="text-3xl font-black text-white">{stats.total}</div>
              <div className="text-sm text-orange-100 font-semibold">Thèmes totaux</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher un thème..." 
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all" 
            />
          </div>

          <AutocompleteSelect
            options={availableSystems}
            value={filters.system}
            onChange={(value) => setFilters({...filters, system: value})}
            placeholder="🎮 Rechercher un système..."
            emptyLabel="Tous systèmes"
          />

          <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none cursor-pointer transition-all">
            <option value="">🎨 Toutes catégories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilters({...filters, onlyInvalidUrls: !filters.onlyInvalidUrls})}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                filters.onlyInvalidUrls 
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg' 
                  : 'bg-gray-900 border border-gray-700 text-gray-300 hover:border-red-500'
              }`}
            >
              <ImageOff className="w-4 h-4" />
              URLs invalides
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                filters.onlyInvalidUrls ? 'bg-white text-red-600' : 'bg-gray-800 text-white'
              }`}>{stats.invalidUrls}</span>
            </button>

            <button
              onClick={() => setFilters({...filters, onlyMissingCreators: !filters.onlyMissingCreators})}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                filters.onlyMissingCreators 
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg' 
                  : 'bg-gray-900 border border-gray-700 text-gray-300 hover:border-yellow-500'
              }`}
            >
              <User className="w-4 h-4" />
              Créateurs manquants
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                filters.onlyMissingCreators ? 'bg-white text-yellow-600' : 'bg-gray-800 text-white'
              }`}>{stats.missingCreators}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-semibold focus:border-orange-500 transition-all cursor-pointer">
                <option value="name">Par Nom</option>
                <option value="creator">Par Créateur</option>
                <option value="system">Par Système</option>
              </select>
              
              <button onClick={() => setSortAsc(!sortAsc)}
                className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 hover:border-orange-500 transition-all">
                <ArrowUpDown className={`w-4 h-4 transition-transform ${sortAsc ? '' : 'rotate-180'}`} />
              </button>
            </div>

            <button onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all">
              <Upload className="w-4 h-4" />
              Import
            </button>

            <button onClick={handleExport}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all">
              <Download className="w-4 h-4" />
              Export ({selectedIds.length || sorted.length})
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-orange-600/20 via-pink-600/20 to-purple-600/20 border border-orange-500/50 rounded-xl">
            <div className="flex items-center gap-2 text-orange-400 font-semibold">
              <CheckSquare className="w-5 h-5" />
              <span>{selectedIds.length} thème(s) sélectionné(s)</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => setShowBulkCreatorModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg">
                <Users className="w-4 h-4" />
                Modifier créateurs
              </button>
              <button onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
              <button onClick={() => setSelectedIds([])}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all">
                Désélectionner
              </button>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-400 pt-3 border-t border-gray-700">
            <AlertCircle className="w-4 h-4" />
            <span>Filtres actifs - {filtered.length} sur {themes.length} thème(s)</span>
            <button onClick={resetFilters}
              className="ml-auto text-orange-400 hover:text-orange-300 font-semibold px-3 py-1 rounded hover:bg-orange-500/10 transition-all">
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-12 border border-gray-700/50 text-center">
          <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Aucun résultat</h2>
          <p className="text-gray-400">Aucun thème ne correspond aux filtres</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <Zap className="w-6 h-6 text-orange-400" />
              Résultats ({paginated.length} affichés sur {sorted.length})
            </h3>
            
            <button onClick={handleSelectAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2">
              {paginated.every(t => selectedIds.includes(t.id)) && paginated.length > 0 ? (
                <>
                  <Square className="w-4 h-4" />
                  Tout désélectionner
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Tout sélectionner
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">
            {paginated.map(theme => {
              const systemName = availableSystems.find(s => s.id === theme.system)?.name || theme.system;
              const categoryName = categories.find(c => c.id === theme.category)?.name || theme.category;
              
              return (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  systemName={systemName}
                  categoryName={categoryName}
                  onView={() => setViewTheme(theme)}
                  isSelected={selectedIds.includes(theme.id)}
                  onToggleSelect={() => handleToggleSelect(theme.id)}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Affichage <span className="text-white font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> à{' '}
                <span className="text-white font-semibold">{Math.min(currentPage * itemsPerPage, sorted.length)}</span> sur{' '}
                <span className="text-white font-semibold">{sorted.length}</span>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 bg-gray-900 rounded-lg text-white disabled:opacity-30">Premier</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-900 rounded-lg text-white disabled:opacity-30">Précédent</button>
                <div className="px-4 py-2 bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 text-white rounded-lg font-bold">
                  Page {currentPage} / {totalPages}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-900 rounded-lg text-white disabled:opacity-30">Suivant</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-900 rounded-lg text-white disabled:opacity-30">Dernier</button>
              </div>
            </div>
          )}
        </div>
      )}

      {viewTheme && (
        <PreviewModal
          theme={viewTheme}
          onClose={() => setViewTheme(null)}
          onEdit={() => { setEditingTheme(viewTheme); setViewTheme(null); }}
          onDelete={() => handleDelete(viewTheme.id)}
          systems={systems}
          categories={categories}
        />
      )}

      {editingTheme && (
        <EditModal
          theme={editingTheme}
          onSave={handleSaveEdit}
          onClose={() => setEditingTheme(null)}
          systems={systems}
          categories={categories}
        />
      )}

      {showImportModal && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showBulkCreatorModal && selectedThemes.length > 0 && (
        <BulkCreatorEditModal
          selectedThemes={selectedThemes}
          onSave={handleBulkCreatorEdit}
          onClose={() => setShowBulkCreatorModal(false)}
        />
      )}
    </div>
  );
}