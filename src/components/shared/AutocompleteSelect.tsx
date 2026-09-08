// Fichier: src/components/shared/AutocompleteSelect.tsx
//
// Extrait de ManageTab.tsx pour être réutilisé ailleurs (formulaire de dépôt,
// onglet Soumissions) sans dupliquer le code. Comportement et style
// strictement identiques à l'original : recherche au clavier, flèches
// haut/bas, Entrée pour valider, Échap pour fermer.

import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { SystemRow } from '../../types';

export const AutocompleteSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Rechercher...',
  emptyLabel = 'Tous',
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
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const search = searchTerm.toLowerCase();
    return options.filter(
      (opt) => opt.name.toLowerCase().includes(search) || opt.id.toLowerCase().includes(search)
    );
  }, [options, searchTerm]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const selectedName = useMemo(() => {
    if (!value) return emptyLabel;
    const found = options.find((opt) => opt.id === value);
    return found?.name || value;
  }, [value, options, emptyLabel]);

  const handleKeyDown = (e: KeyboardEvent) => {
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
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) handleSelect(filteredOptions[highlightedIndex].id);
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
              type="button"
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
              title="Réinitialiser"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button type="button" onClick={() => setIsOpen(!isOpen)} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
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
                    highlightedIndex === index ? 'bg-orange-500/20 border-l-4 border-orange-500' : 'hover:bg-gray-800'
                  } ${value === option.id ? 'bg-orange-500/10' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{option.name}</span>
                    {value === option.id && <span className="text-orange-400 text-xs font-bold">✓ Sélectionné</span>}
                  </div>
                </div>
              ))}
              <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 text-center">
                {filteredOptions.length} système{filteredOptions.length > 1 ? 's' : ''} disponible
                {filteredOptions.length > 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteSelect;
