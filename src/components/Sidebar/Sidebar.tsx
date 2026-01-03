import React, { useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { SystemRow, Category } from '../../types';
import { getSystemColors } from './sidebar.colors';
import {
  TOP_BUTTON_IDS,
  SIDEBAR_COLORS,
  EXTERNAL_LINKS,
  SIDEBAR_INLINE_STYLES,
  SIDEBAR_TEXTS
} from './sidebar.constants';
import { useLinksLoader } from '../../hooks/useLinksLoader';

interface Link {
  id: string;
  name: string;
  url: string;
  location: 'header' | 'list';
  position?: number;
}

interface SidebarProps {
  systems: SystemRow[];
  categories: Category[];
  sidebarSearch: string;
  setSidebarSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedSystem: string;
  selectedCategory: string;
  handleSystemSelect: (systemId: string) => void;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  expandedSubsections: Record<string, boolean>;
  toggleSubsection: (subsection: string) => void;
  expandedSystems: Record<string, boolean>;
  toggleSystemCategories: (systemId: string) => void;
  allThemes?: Array<{ id: number; system: string; [key: string]: any }>;
  isDarkMode: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  systems, sidebarSearch, setSidebarSearch, selectedSystem, selectedCategory,
  handleSystemSelect, setSelectedCategory, expandedSections, toggleSection,
  expandedSubsections, toggleSubsection, expandedSystems, toggleSystemCategories,
  allThemes = [],
  isDarkMode
}) => {
  const { links, isLoading: isLoadingLinks } = useLinksLoader();
  
  const headerLinks = useMemo(() => 
    links.filter(l => l.location === 'header').sort((a, b) => (a.position || 0) - (b.position || 0)),
    [links]
  );
  
  const listLinks = useMemo(() => 
    links.filter(l => l.location === 'list').sort((a, b) => (a.position || 0) - (b.position || 0)),
    [links]
  );
  
  const linksBySystemId = useMemo(() => {
    const map: Record<string, typeof links[0] | undefined> = {};
    map['tools'] = listLinks.find(l => l.id === 'outils' || l.name.toLowerCase().includes('outil'));
    map['tutorials'] = listLinks.find(l => l.id === 'tutoriels' || l.name.toLowerCase().includes('tutoriel'));
    map['main-themes'] = listLinks.find(l => l.id === 'themes-hyperbat' || l.name.toLowerCase().includes('theme'));
    return map;
  }, [listLinks]);
  
  useEffect(() => {
    if (listLinks.length > 0) {
      console.log('🗺️ MAP DES LIENS CHARGÉE:', {
        tools: linksBySystemId['tools']?.name || 'NON TROUVÉ',
        tutorials: linksBySystemId['tutorials']?.name || 'NON TROUVÉ',
        'main-themes': linksBySystemId['main-themes']?.name || 'NON TROUVÉ',
        total: listLinks.length
      });
    }
  }, [listLinks.length, linksBySystemId]);
  
  const normalizedSearch = useMemo(() => sidebarSearch.trim().toLowerCase(), [sidebarSearch]);
  const isSearchActive = normalizedSearch.length > 0;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const systemButtonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const hasOpenSections = useMemo(() => {
    return Object.values(expandedSections).some(v => v) || 
           Object.values(expandedSubsections).some(v => v);
  }, [expandedSections, expandedSubsections]);

  const themeCountBySystem = useMemo(() => {
    if (!allThemes || allThemes.length === 0) {
      return {};
    }
    
    const counts: Record<string, number> = {};
    
    allThemes.forEach(theme => {
      if (!theme.system) return;
      const normalized = theme.system.toLowerCase().replace(/[^a-z0-9]+/g, '');
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    
    return counts;
  }, [allThemes]);

  const themeCountBySection = useMemo(() => {
    const sectionCounts: Record<string, number> = {};
    const subsectionCounts: Record<string, number> = {};
    
    systems.forEach(system => {
      if (system.isHeader || system.isSubHeader || TOP_BUTTON_IDS.includes(system.id as any)) {
        return;
      }
      
      const systemIdParts = system.id.split('-');
      const normalizedSystemId = systemIdParts[systemIdParts.length - 1].toLowerCase().replace(/[^a-z0-9]+/g, '');
      const themeCount = themeCountBySystem[normalizedSystemId] || 0;
      
      if (system.section) {
        sectionCounts[system.section] = (sectionCounts[system.section] || 0) + themeCount;
      }
      
      if (system.subsection && system.subsection !== 'collections') {
        subsectionCounts[system.subsection] = (subsectionCounts[system.subsection] || 0) + themeCount;
      }
    });
    
    return { sectionCounts, subsectionCounts };
  }, [systems, themeCountBySystem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'Escape' && isSearchActive) {
        e.preventDefault();
        setSidebarSearch('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchActive, setSidebarSearch]);

  const visibleSystems = useMemo(() => {
    const topButtons = systems.filter(s => TOP_BUTTON_IDS.includes(s.id as any));
    
    if (!isSearchActive) return systems;
    
    const filtered = systems.filter(system => {
      if (TOP_BUTTON_IDS.includes(system.id as any)) return false;
      if (system.isHeader || system.isSubHeader) return false;
      
      const nameLower = system.name?.toLowerCase() || '';
      const words = nameLower.split(/[\s\-\/&()]+/).filter(w => w.length > 0);
      
      return nameLower.startsWith(normalizedSearch) || words.some(word => word.startsWith(normalizedSearch));
    });
    
    const sorted = filtered.sort((a, b) => {
      const aName = a.name?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';
      
      const aStartsExact = aName.startsWith(normalizedSearch);
      const bStartsExact = bName.startsWith(normalizedSearch);
      
      if (aStartsExact !== bStartsExact) return aStartsExact ? -1 : 1;
      
      const aWords = aName.split(/[\s\-\/]+/);
      const bWords = bName.split(/[\s\-\/]+/);
      const aWordStarts = aWords.some(w => w.startsWith(normalizedSearch));
      const bWordStarts = bWords.some(w => w.startsWith(normalizedSearch));
      
      if (aWordStarts !== bWordStarts) return aWordStarts ? -1 : 1;
      
      return aName.localeCompare(bName);
    });
    
    return [...topButtons, ...sorted];
  }, [systems, normalizedSearch, isSearchActive]);

  const clearSearch = () => setSidebarSearch('');

  const renderHeader = (system: SystemRow) => {
    if (isSearchActive) return null;
    
    const isExpanded = expandedSections[system.section || ''];
    const sectionCount = themeCountBySection.sectionCounts[system.section || ''] || 0;
    
    return (
      <button 
        onClick={() => toggleSection(system.section || '')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSection(system.section || '');
          }
        }}
        className={`w-full text-left pt-3 pb-1 px-2 rounded transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-500 ${
          isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
        }`}
        aria-expanded={isExpanded}
        aria-label={`${system.name} section${sectionCount > 0 ? `, ${sectionCount} thèmes` : ''}`}
      >
        <h4 className="font-bold text-sm tracking-wider flex items-center gap-2 whitespace-nowrap overflow-hidden" style={{ color: '#FFD700' }}>
          <span className="truncate">{system.name}</span>
          {sectionCount > 0 && (
            <span 
              className="text-xs opacity-80 font-normal flex-shrink-0"
              style={{ 
                color: 'rgba(255,215,0,0.85)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              ({sectionCount})
            </span>
          )}
        </h4>
        <ChevronDown className={`w-4 h-4 chevron-icon flex-shrink-0 ${isExpanded ? 'open' : 'closed'}`} style={{ color: '#FFA500' }} />
      </button>
    );
  };

  const renderSubHeader = (system: SystemRow) => {
    if (isSearchActive || !system.name || system.name.trim() === '') return null;
    if (system.section && !expandedSections[system.section]) return null;
    
    const isExpanded = expandedSubsections[system.subsection || ''];
    const subsectionCount = themeCountBySection.subsectionCounts[system.subsection || ''] || 0;
    
    return (
      <button 
        onClick={() => toggleSubsection(system.subsection || '')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSubsection(system.subsection || '');
          }
        }}
        className={`w-full text-left pt-2 pb-1 px-3 ml-2 rounded transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-500 ${
          isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
        }`}
        aria-expanded={isExpanded}
        aria-label={`${system.name} subsection${subsectionCount > 0 ? `, ${subsectionCount} thèmes` : ''}`}
      >
        <h5 className="font-bold text-sm tracking-normal flex items-center gap-1 whitespace-nowrap overflow-hidden" style={{ color: '#FF8C00' }}>
          <span className="truncate">{system.name}</span>
          {subsectionCount > 0 && (
            <span 
              className="text-xs opacity-80 font-normal flex-shrink-0"
              style={{ 
                color: 'rgba(255,140,0,0.85)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              ({subsectionCount})
            </span>
          )}
        </h5>
        <ChevronDown className={`w-3 h-3 chevron-icon flex-shrink-0 ${isExpanded ? 'open' : 'closed'}`} style={{ color: '#FFA500' }} />
      </button>
    );
  };

  const renderSystem = (system: SystemRow) => {
    const searchActive = isSearchActive;
    
    if (!searchActive) {
      if (system.section && !expandedSections[system.section]) return null;
      if (system.subsection && system.subsection !== 'collections' && !expandedSubsections[system.subsection]) return null;
    }

    const colors = getSystemColors(system.id, system.name || '');
    const isSelected = selectedSystem === system.id;
    const hasCategories = system.categories && system.categories.length > 0;
    const isTopButton = TOP_BUTTON_IDS.includes(system.id as any);
    const correspondingLink = isTopButton && system.id !== 'all' ? linksBySystemId[system.id] : null;
    
    const systemIdParts = system.id.split('-');
    const normalizedSystemId = systemIdParts[systemIdParts.length - 1].toLowerCase().replace(/[^a-z0-9]+/g, '');
    const themeCount = themeCountBySystem[normalizedSystemId] || 0;
    
    const defaultBg = isDarkMode ? 'bg-gray-800' : 'bg-gray-100';
    const defaultBorder = isDarkMode ? 'border-gray-700' : 'border-gray-300';
    const defaultHoverBg = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200';
    const defaultHoverBorder = isDarkMode ? 'hover:border-gray-600' : 'hover:border-gray-400';
    const defaultTextColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
    const defaultHoverText = isDarkMode ? 'hover:text-white' : 'hover:text-gray-900';
	const buttonStyle = isTopButton 
      ? { 
          background: 'linear-gradient(135deg, #FFA500 0%, #FF9E33 100%)',
          borderColor: '#FFD700',
          borderWidth: '2px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }
      : (isSelected ? { backgroundColor: colors.bg, borderColor: colors.border } : {});
      
    const textStyle = isTopButton
      ? { color: '#1F1F1F', fontWeight: '700' }
      : (isSelected 
          ? { color: colors.selectedText || '#FFFFFF' }
          : (colors.unselectedText ? { color: colors.unselectedText } : {}));

    return (
      <div className="px-2 py-1">
        <div
          className={`w-full px-4 py-2 rounded-lg transition-all duration-200 font-semibold border-2 flex items-center justify-between ${system.subsection && system.subsection !== 'collections' && !searchActive ? 'ml-4' : ''} ${isSelected || isTopButton ? 'text-white' : `${defaultBg} ${defaultBorder} ${defaultHoverBg} ${defaultHoverBorder} hover:shadow-lg`} ${isTopButton ? 'hover:shadow-lg hover:brightness-125' : ''}`}
          style={{
            ...buttonStyle,
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSelected && !isTopButton) {
              e.currentTarget.style.boxShadow = `0 0 20px ${colors.bg}80, 0 0 40px ${colors.bg}40`;
              e.currentTarget.style.borderColor = colors.border;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected && !isTopButton) {
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.borderColor = '';
            }
          }}
        >
          {correspondingLink && system.id !== 'all' ? (
            <a
              href={correspondingLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 text-left text-sm min-w-0 pr-2 focus:outline-none rounded ${isSelected || isTopButton ? 'text-white' : `${defaultTextColor} ${defaultHoverText}`}`}
              style={textStyle}
              aria-label={system.name}
              onClick={() => {
                console.log('🔗 Ouverture du lien:', correspondingLink.url);
              }}
            >
              <span className="truncate block">{system.name}</span>
            </a>
          ) : (
            <button
              ref={(el) => {
                if (el) systemButtonsRef.current.set(system.id, el);
                else systemButtonsRef.current.delete(system.id);
              }}
              onClick={(e) => {
                handleSystemSelect(system.id);
                e.currentTarget.blur();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSystemSelect(system.id);
                  e.currentTarget.blur();
                }
              }}
              className={`flex-1 text-left text-sm min-w-0 pr-2 focus:outline-none rounded ${isSelected || isTopButton ? 'text-white' : `${defaultTextColor} ${defaultHoverText}`}`}
              style={textStyle}
              aria-label={`${system.name}${themeCount > 0 ? `, ${themeCount} thèmes` : ''}`}
              aria-current={isSelected ? 'page' : undefined}
            >
              <span className="truncate block">
                {system.name}
                {themeCount > 0 && (
                  <span 
                    className="ml-2 text-xs opacity-80 font-normal"
                    style={{ 
                      color: isSelected || isTopButton ? 'rgba(255,255,255,0.85)' : 'rgba(255,140,0,0.9)',
                      textShadow: isSelected || isTopButton ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                    }}
                  >
                    ({themeCount})
                  </span>
                )}
              </span>
            </button>
          )}

          {hasCategories && (
            <button 
              onClick={() => toggleSystemCategories(system.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSystemCategories(system.id);
                }
              }}
              className="flex-shrink-0 p-1 rounded hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-orange-500" 
              title={expandedSystems[system.id] ? 'Masquer les catégories' : 'Afficher les catégories'}
              aria-label={expandedSystems[system.id] ? 'Masquer les catégories' : 'Afficher les catégories'}
              aria-expanded={expandedSystems[system.id]}
            >
              <ChevronDown 
                className={`w-4 h-4 chevron-icon ${expandedSystems[system.id] ? 'open' : 'closed'}`} 
                style={{ color: isSelected || isTopButton ? 'white' : (colors.chevronColor || colors.bg) }} 
              />
            </button>
          )}
        </div>

        {hasCategories && (
          <div className={`sidebar-section-content ${expandedSystems[system.id] ? 'open' : 'closed'} ml-4 mt-1 space-y-1 border-l-2 pl-2`} style={{ borderColor: colors.bg }}>
            <button 
              onClick={() => setSelectedCategory('all')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedCategory('all');
                }
              }}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                selectedCategory === 'all' 
                  ? 'text-white font-semibold' 
                  : `${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'}`
              }`}
              style={selectedCategory === 'all' ? { backgroundColor: `${colors.bg}80` } : {}}
              aria-label="Toutes les catégories"
              aria-current={selectedCategory === 'all' ? 'true' : undefined}
            >
              Toutes les catégories
            </button>
            {system.categories!.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCategory(cat.id);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  selectedCategory === cat.id 
                    ? 'text-white font-semibold' 
                    : `${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'}`
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: `${colors.bg}80` } : {}}
                aria-label={cat.name}
                aria-current={selectedCategory === cat.id ? 'true' : undefined}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-80 flex-shrink-0">
      <style>{SIDEBAR_INLINE_STYLES}</style>

      <div className={`rounded-lg p-4 border-4 sticky top-4 overflow-visible ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`} style={{ borderColor: '#FF8C00', maxHeight: 'calc(100vh - 2rem)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black" style={{ color: '#FF8C00' }}>SYSTÈMES</h3>
          <div className="flex gap-2">
            {isLoadingLinks ? (
              <div className="text-gray-400 text-xs">Chargement...</div>
            ) : headerLinks.length > 0 ? (
              headerLinks.map(link => {
                const isARRM = link.name.toLowerCase().includes('arrm');
                
                return (
                  <a 
                    key={link.id}
                    href={link.url}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={`rounded-lg transition-all duration-200 border-2 hover:shadow-lg hover:brightness-125 focus:outline-none focus:ring-2 ${
                      isARRM 
                        ? 'px-2.5 py-2 bg-yellow-500 hover:bg-yellow-600 border-yellow-600 hover:border-yellow-700 focus:ring-yellow-400' 
                        : 'p-2 bg-[#5865F2] hover:bg-[#4752C4] border-[#5865F2] hover:border-[#4752C4] focus:ring-blue-400'
                    }`}
                    title={link.name}
                    aria-label={link.name}
                  >
                    {isARRM ? (
                      <span className="text-sm font-bold flex items-center justify-center" style={{ color: '#0091bd' }}>
                        ARRM
                      </span>
                    ) : (
                      <svg className="w-5 h-5" fill="#FFFFFF" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                    )}
                  </a>
                );
              })
            ) : (
              <>
                <a 
                  href={EXTERNAL_LINKS.discord}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] transition-all duration-200 border-2 border-[#5865F2] hover:border-[#4752C4] hover:shadow-lg hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-blue-400" 
                  title="Rejoindre notre Discord"
                  aria-label="Rejoindre notre Discord"
                >
                  <svg className="w-5 h-5" fill="#FFFFFF" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </a>
                <a 
                  href={EXTERNAL_LINKS.arrm}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-2.5 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 transition-all duration-200 border-2 border-yellow-600 hover:border-yellow-700 flex items-center justify-center hover:shadow-lg hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                  title="ARRM"
                  aria-label="ARRM"
                >
                  <span className="text-sm font-bold" style={{ color: '#0091bd' }}>ARRM</span>
                </a>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1 overflow-y-auto pr-2 pl-2 custom-scrollbar" style={{ 
          maxHeight: 'calc(100vh - 180px)',
          overflowY: 'auto',
          overflowX: 'visible' 
        }}>
          {visibleSystems.length === 0 && isSearchActive ? (
            <div className="text-center py-8 px-4">
              <p className="text-gray-300 text-sm mb-3">
                Aucun système trouvé pour <span className="text-orange-400 font-semibold">"{sidebarSearch}"</span>
              </p>
              <button 
                onClick={clearSearch} 
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-400"
                aria-label="Effacer la recherche"
              >
                Effacer la recherche
              </button>
            </div>
          ) : (
            <>
              {visibleSystems.map((system, index) => {
                const showSearchAfter = index === 3 && system.id === 'main-themes';
                const isTopBtn = TOP_BUTTON_IDS.includes(system.id as any);
                const hasLink = isTopBtn && system.id !== 'all' && linksBySystemId[system.id];
                const uniqueKey = hasLink ? `${system.id}-link-${linksBySystemId[system.id]?.url}` : system.id;
                
                return (
                  <React.Fragment key={uniqueKey}>
                    {system.isHeader && renderHeader(system)}
                    {system.isSubHeader && renderSubHeader(system)}
                    {!system.isHeader && !system.isSubHeader && renderSystem(system)}
                    
                    {showSearchAfter && (
                      <div className="my-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#FFA500' }} />
                          <input 
                            ref={searchInputRef}
                            id="sidebar-search"
                            name="sidebar-search"
                            type="text" 
                            placeholder="Rechercher un système... (Ctrl+K)"
                            value={sidebarSearch} 
                            onChange={(e) => setSidebarSearch(e.target.value)} 
                            className={`w-full rounded-lg pl-10 pr-10 py-2 text-sm border-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500 ${
                              isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'
                            }`}
                            aria-label="Rechercher un système"
                            autoComplete="off"
                          />
                          {isSearchActive && (
                            <button 
                              onClick={clearSearch} 
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded transition focus:outline-none focus:ring-2 focus:ring-orange-500" 
                              title="Effacer la recherche"
                              aria-label="Effacer la recherche"
                            >
                              <X className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;