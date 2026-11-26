import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useLang } from '../../i18n';
import { Search, ChevronDown, X, Star, BookOpen } from 'lucide-react';
import { SystemRow } from '../../types';
import { getSystemColors } from './sidebar.colors';
import {
  TOP_BUTTON_IDS,
  SIDEBAR_INLINE_STYLES,
  SIDEBAR_COLORS,
} from './sidebar.constants';

import arcadeImg from '../../assets/icons/arcade.png';
import portableImg from '../../assets/icons/console_portable.png';
import fantasyImg from '../../assets/icons/phantasy_console.png';
import ordinosaureImg from '../../assets/icons/Ordinosaure.png';
import flipperImg from '../../assets/icons/flipper.png';


const HIDDEN_SIDEBAR_IDS: string[] = ['tools', 'tutorials', 'main-themes', 'other-themes'];

interface SidebarProps {
  systems: SystemRow[];
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
  allThemes?: Array<{ id: number; system: string; category: string; [key: string]: any }>;
  isDarkMode: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Ref optionnelle (Ctrl+K). MutableRefObject : on doit pouvoir écrire .current. */
  searchInputRef?: React.MutableRefObject<HTMLInputElement | null>;
  /** Placeholder du champ recherche systèmes. */
  searchPlaceholder?: string;
  /** Mode kiosque (?retrobat=1) — tabIndex=-1 sur liens exclus. */
}

// ── Icône Discord réutilisable ────────────────────────────────────────────────

// ── Icônes de section ─────────────────────────────────────────────────────────
type SectionIconDef =
  | { type: 'img';   src: string }
  | { type: 'svg';   component: React.ReactNode }
  | { type: 'emoji'; char: string };

const SECTION_ICONS: Record<string, SectionIconDef> = {
  collections: { type: 'svg',   component: <Star     className="w-6 h-6" style={{ stroke: '#00A3FF', fill: 'none' }} /> },
  arcade:      { type: 'img',   src: arcadeImg },
  home:        { type: 'emoji', char: '🎮' },
  portable:    { type: 'img',   src: portableImg },
  ports:       { type: 'emoji', char: '📦' },
  fantasy:     { type: 'img',   src: fantasyImg },
  ordinosaure: { type: 'img',   src: ordinosaureImg },
  flipper:     { type: 'img',   src: flipperImg },
  applications: { type: 'emoji', char: '🧩' },
  magazines:   { type: 'svg',   component: <BookOpen className="w-6 h-6" style={{ stroke: '#00A3FF', fill: 'none' }} /> },
};

const SectionIcon: React.FC<{ section: string; size?: number; imgSize?: number; isDarkMode?: boolean }> = ({ section, size = 24, imgSize, isDarkMode = true }) => {
  const icon = SECTION_ICONS[section];
  if (!icon) return null;
  const pngSize = imgSize ?? size;
  if (icon.type === 'img') {
    return (
      <img src={icon.src} alt={section}
        style={{ width: pngSize, height: pngSize, minWidth: pngSize, minHeight: pngSize, objectFit: 'contain', mixBlendMode: isDarkMode ? 'screen' : 'normal', flexShrink: 0 }} />
    );
  }
  if (icon.type === 'emoji') {
    return <span style={{ fontSize: size * 0.85, lineHeight: 1, flexShrink: 0 }}>{icon.char}</span>;
  }
  return (
    <span style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon.component}
    </span>
  );
};

// Retire l'emoji de début : "🕹️ ARCADE" → "ARCADE"
const stripEmoji = (name: string): string =>
  name.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u, '').trim();

const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH  = 320;
const LS_KEY = 'sidebar-collapsed';

// ── Composant ─────────────────────────────────────────────────────────────────
const Sidebar: React.FC<SidebarProps> = ({
  systems, sidebarSearch, setSidebarSearch, selectedSystem, selectedCategory,
  handleSystemSelect, setSelectedCategory, expandedSections, toggleSection,
  expandedSubsections, toggleSubsection, expandedSystems, toggleSystemCategories,
  allThemes = [], isDarkMode, onCollapsedChange,
  searchInputRef: searchInputRefProp,
  searchPlaceholder: searchPlaceholderProp,
}) => {
  const { t: tr, label: trLabel } = useLang();
  const searchPlaceholder = searchPlaceholderProp ?? tr('site.sidebarSearch');
  // Nom affiché : seuls les libellés français connus sont traduits (les noms de systèmes restent tels quels).
  const dn = (name: string) => trLabel(name, 'sys.');
  // ── Rétractable ───────────────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(LS_KEY, String(next)); } catch { return next; }
      return next;
    });
  };

  const handleCollapsedSectionClick = (sectionKey: string) => {
    setCollapsed(false);
    try { localStorage.setItem(LS_KEY, 'false'); } catch { return; }
    toggleSection(sectionKey);
  };

  // ── Recherche ─────────────────────────────────────────────────────────────
  const normalizedSearch = useMemo(() => sidebarSearch.trim().toLowerCase(), [sidebarSearch]);
  const isSearchActive   = normalizedSearch.length > 0;
  // Ref locale (Ctrl+K). Callback ref pour aussi remplir la ref parent si fournie.
  const searchInputRefLocal = useRef<HTMLInputElement | null>(null);
  const setSearchInputNode = useCallback((node: HTMLInputElement | null) => {
    searchInputRefLocal.current = node;
    if (searchInputRefProp) {
      searchInputRefProp.current = node;
    }
  }, [searchInputRefProp]);
  const systemButtonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const clearSearch      = () => setSidebarSearch('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        searchInputRefLocal.current?.focus();
        return;
      }
      if (e.key === 'Escape' && isSearchActive) {
        e.preventDefault();
        setSidebarSearch('');
        searchInputRefLocal.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchActive, setSidebarSearch]);

  // ── Compteurs ─────────────────────────────────────────────────────────────
  const themeCountBySystem = useMemo(() => {
    if (!allThemes?.length) return {};
    const counts: Record<string, number> = {};
    allThemes.forEach(t => {
      if (!t.system) return;
      const k = t.system.toLowerCase().replace(/[^a-z0-9]+/g, '');
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [allThemes]);

  const themeCountBySystemAndCategory = useMemo(() => {
    if (!allThemes?.length) return {};
    const counts: Record<string, Record<string, number>> = {};
    allThemes.forEach(t => {
      if (!t.system || !t.category) return;
      const k = t.system.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (!counts[k]) counts[k] = {};
      counts[k][t.category] = (counts[k][t.category] || 0) + 1;
    });
    return counts;
  }, [allThemes]);

  const themeCountBySection = useMemo(() => {
    const sectionCounts: Record<string, number>    = {};
    const subsectionCounts: Record<string, number> = {};
    systems.forEach(system => {
      if (system.isHeader || system.isSubHeader || TOP_BUTTON_IDS.includes(system.id as any)) return;
      const parts = system.id.split('-');
      const k     = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]+/g, '');
      const count = themeCountBySystem[k] || 0;
      if (system.section) sectionCounts[system.section] = (sectionCounts[system.section] || 0) + count;
      if (system.subsection && system.subsection !== 'collections') {
        // ✅ FIX : inclure la section dans la clé pour éviter les collisions
        // ex: "arcade-snk" et "home-snk" étaient tous deux stockés sous "snk"
        const subKey = `${system.section}-${system.subsection}`;
        subsectionCounts[subKey] = (subsectionCounts[subKey] || 0) + count;
      }
    });
    return { sectionCounts, subsectionCounts };
  }, [systems, themeCountBySystem]);

  // ── Systèmes visibles ─────────────────────────────────────────────────────
  const visibleSystems = useMemo(() => {
    // Outils, tutoriels, thèmes HYPERBAT et thèmes de Bob sont déjà sur le site principal
    // et inaccessibles depuis l'add-on : on ne les répète pas dans la vitrine.
    const baseSystems = systems.filter(s => !HIDDEN_SIDEBAR_IDS.includes(s.id as string));
    const topButtons = baseSystems.filter(s => TOP_BUTTON_IDS.includes(s.id as any));
    if (!isSearchActive) return baseSystems;
    const filtered = baseSystems.filter(system => {
      if (TOP_BUTTON_IDS.includes(system.id as any) || system.isHeader || system.isSubHeader) return false;
      const nameLower       = system.name?.toLowerCase()       || '';
      const labelLower      = system.label?.toLowerCase()      || '';
      const subsectionLower = system.subsection?.toLowerCase() || '';
      const nameWords  = nameLower.split(/[\s/&()-]+/).filter(w => w.length > 0);
      const labelWords = labelLower.split(/[\s/&()-]+/).filter(w => w.length > 0);
      return nameLower.startsWith(normalizedSearch) ||
        nameWords.some(w => w.startsWith(normalizedSearch)) ||
        labelLower.includes(normalizedSearch) ||
        labelWords.some(w => w.startsWith(normalizedSearch)) ||
        subsectionLower.includes(normalizedSearch);
    });
    const sorted = [...filtered].sort((a, b) => {
      const aName  = a.name?.toLowerCase() || '';
      const bName  = b.name?.toLowerCase() || '';
      const aExact = aName.startsWith(normalizedSearch);
      const bExact = bName.startsWith(normalizedSearch);
      if (aExact !== bExact) return aExact ? -1 : 1;
      const aWord = aName.split(/[\s/-]+/).some(w => w.startsWith(normalizedSearch));
      const bWord = bName.split(/[\s/-]+/).some(w => w.startsWith(normalizedSearch));
      if (aWord !== bWord) return aWord ? -1 : 1;
      return aName.localeCompare(bName);
    });
    return [...topButtons, ...sorted];
  }, [systems, normalizedSearch, isSearchActive]);

  // ── Renderers ─────────────────────────────────────────────────────────────
  const renderHeader = (system: SystemRow) => {
    if (isSearchActive) return null;
    const sectionKey   = system.section || '';
    const isExpanded   = expandedSections[sectionKey];
    const sectionCount = themeCountBySection.sectionCounts[sectionKey] || 0;
    const label        = stripEmoji(dn(system.name));

    if (collapsed) {
      return (
        <button
          onClick={() => handleCollapsedSectionClick(sectionKey)}
          title={label}
          className={`w-full flex items-center justify-center py-1 px-0 rounded transition ${
            isExpanded ? 'bg-orange-500/20' : isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
          }`}
          style={{ borderLeft: isExpanded ? '2px solid #3d7be0' : '2px solid transparent' }}
        >
          <SectionIcon section={sectionKey} size={34} imgSize={46} isDarkMode={isDarkMode} />
        </button>
      );
    }

    return (
      <button
        onClick={() => toggleSection(sectionKey)}
        className={`w-full text-left pt-3 pb-1 pl-2 pr-3 rounded transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 ${
          isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
        }`}
        aria-expanded={isExpanded}
      >
        <h4 className="font-semibold text-xs uppercase tracking-[0.12em] flex items-center gap-2 min-w-0 flex-1" style={{ color: '#9db0d0' }}>
          <SectionIcon section={sectionKey} size={22} isDarkMode={isDarkMode} />
          <span className="truncate">{label}</span>
          {sectionCount > 0 && (
            <span className="text-xs opacity-80 font-normal flex-shrink-0 ml-auto mr-2" style={{ color: '#9db0d0' }}>
              {sectionCount}
            </span>
          )}
        </h4>
        <ChevronDown className={`w-4 h-4 chevron-icon flex-shrink-0 ${isExpanded ? 'open' : 'closed'}`} style={{ color: SIDEBAR_COLORS.primaryLight }} />
      </button>
    );
  };

  const renderSubHeader = (system: SystemRow) => {
    if (collapsed) return null;
    if (isSearchActive || !system.name?.trim()) return null;
    if (system.section && !expandedSections[system.section]) return null;
    const isExpanded      = expandedSubsections[system.subsection || ''];
    // ✅ FIX : utiliser la clé composite "section-subsection" pour éviter les collisions
    // ex: "arcade-snk" au lieu de "snk" seul
    const subKey          = `${system.section || ''}-${system.subsection || ''}`;
    const subsectionCount = themeCountBySection.subsectionCounts[subKey] || 0;
    return (
      <button
        onClick={() => toggleSubsection(system.subsection || '')}
        className={`w-full text-left pt-2 pb-1 pl-3 pr-4 ml-2 rounded transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 ${
          isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
        }`}
        aria-expanded={isExpanded}
      >
        <h5 className="font-semibold text-sm tracking-normal flex items-center gap-2 min-w-0 flex-1" style={{ color: '#e8eefc' }}>
          <span className="truncate">{dn(system.name)}</span>
          {subsectionCount > 0 && (
            <span className="text-xs opacity-80 font-normal flex-shrink-0 ml-auto mr-2" style={{ color: '#9db0d0' }}>
              {subsectionCount}
            </span>
          )}
        </h5>
        <ChevronDown className={`w-3 h-3 chevron-icon flex-shrink-0 ${isExpanded ? 'open' : 'closed'}`} style={{ color: SIDEBAR_COLORS.primaryLight }} />
      </button>
    );
  };

  const renderSystem = (system: SystemRow) => {
    if (collapsed) return null;
    if (!isSearchActive) {
      if (system.section && !expandedSections[system.section]) return null;
      if (
        system.subsection &&
        system.subsection !== 'collections' &&
        system.subsection !== 'magazines' &&
        !expandedSubsections[system.subsection]
      ) return null;
    }

    const colors        = getSystemColors(system.id, system.name || '');
    const isSelected    = selectedSystem === system.id;
    const hasCategories = !!(system.categories?.length);
    const isTopButton   = TOP_BUTTON_IDS.includes(system.id as any);

    const parts              = system.id.split('-');
    const normalizedSystemId = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]+/g, '');
    const themeCount         = themeCountBySystem[normalizedSystemId] || 0;
    const categoryCounts     = themeCountBySystemAndCategory[normalizedSystemId] || {};

    const defaultBg          = isDarkMode ? 'bg-gray-800'       : 'bg-gray-100';
    const defaultBorder      = isDarkMode ? 'border-gray-700'   : 'border-gray-300';
    const defaultHoverBg     = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200';
    const defaultHoverBorder = isDarkMode ? 'hover:border-gray-600' : 'hover:border-gray-400';
    const defaultTextColor   = isDarkMode ? 'text-gray-200'     : 'text-gray-800';
    const defaultHoverText   = isDarkMode ? 'hover:text-white'  : 'hover:text-gray-900';

    const buttonStyle = isTopButton
      ? { backgroundColor: '#1a2f52', borderColor: '#243a5c', borderWidth: '1px', boxShadow: 'none' }
      : isSelected ? { backgroundColor: colors.bg, borderColor: colors.border } : {};

    const textStyle = isTopButton
      ? { color: '#e8eefc', fontWeight: '600' }
      : isSelected
        ? { color: colors.selectedText || '#FFFFFF' }
        : colors.unselectedText ? { color: colors.unselectedText } : {};

    const indented = system.subsection && system.subsection !== 'collections' && !isSearchActive;

    return (
      <div className="px-2 py-1">
        <div
          data-sel={isSelected ? 'true' : 'false'}
          className={`${isTopButton ? '' : 'hb-row'} w-full px-4 py-2 rounded-lg transition-all duration-200 font-semibold border-2 flex items-center justify-between
            ${indented ? 'ml-4' : ''}
            ${isSelected || isTopButton ? 'text-white' : `${defaultBg} ${defaultBorder} ${defaultHoverBg} ${defaultHoverBorder} hover:shadow-lg`}
            ${isTopButton ? 'hover:shadow-lg hover:brightness-125' : ''}`}
          style={{ ...buttonStyle, transition: 'all 0.3s ease' }}
          onMouseEnter={e => {
            if (!isSelected && !isTopButton) {
              e.currentTarget.style.boxShadow   = `0 0 20px ${colors.bg}80, 0 0 40px ${colors.bg}40`;
              e.currentTarget.style.borderColor  = colors.border;
            }
          }}
          onMouseLeave={e => {
            if (!isSelected && !isTopButton) {
              e.currentTarget.style.boxShadow  = '';
              e.currentTarget.style.borderColor = '';
            }
          }}
        >
          <button
              ref={el => { if (el) systemButtonsRef.current.set(system.id, el); else systemButtonsRef.current.delete(system.id); }}
              onClick={e => { handleSystemSelect(system.id); e.currentTarget.blur(); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSystemSelect(system.id); e.currentTarget.blur(); } }}
              className={`flex-1 text-left text-sm min-w-0 pr-2 focus:outline-none rounded
                ${isSelected || isTopButton ? 'text-white' : `${defaultTextColor} ${defaultHoverText}`}`}
              style={textStyle}
              aria-label={`${dn(system.name)}${themeCount > 0 ? `, ${tr('nav.themesCount', { n: themeCount })}` : ''}`}
              aria-current={isSelected ? 'page' : undefined}
            >
              <span className="truncate block">
                {dn(system.name)}
                {themeCount > 0 && (
                  <span className="ml-2 text-xs opacity-80 font-normal"
                    style={{ color: (isSelected || isTopButton) ? (colors.selectedText || 'rgba(255,255,255,0.85)') : '#9db0d0' }}>
                    {themeCount}
                  </span>
                )}
              </span>
            </button>

          {hasCategories && (
            <button
              onClick={() => toggleSystemCategories(system.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSystemCategories(system.id); } }}
              className="flex-shrink-0 p-1 mr-0.5 rounded hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
              title={expandedSystems[system.id] ? tr('nav.collapseCats') : tr('nav.expandCats')}
              aria-expanded={expandedSystems[system.id]}
            >
              <ChevronDown
                className={`w-4 h-4 chevron-icon ${expandedSystems[system.id] ? 'open' : 'closed'}`}
                style={{ color: (isSelected || isTopButton) ? (colors.selectedText || 'white') : (colors.chevronColor || colors.bg) }}
              />
            </button>
          )}
        </div>

        {hasCategories && (
          <div
            className={`sidebar-section-content ${expandedSystems[system.id] ? 'open' : 'closed'} ml-4 mt-1 space-y-1 border-l-2 pl-2`}
            style={{ borderColor: colors.bg }}
          >
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500
                ${selectedCategory === 'all' ? 'text-white font-semibold' : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'}`}
              style={selectedCategory === 'all' ? { backgroundColor: `${colors.bg}80` } : {}}
            >
              <span className="flex items-center gap-1">
                {tr('nav.allCats')}
                {themeCount > 0 && (
                  <span className="text-xs opacity-80 font-normal"
                    style={{ color: selectedCategory === 'all' ? 'rgba(255,255,255,0.85)' : '#9db0d0' }}>
                    {themeCount}
                  </span>
                )}
              </span>
            </button>

            {system.categories!
              .filter(cat => cat.id === 'collection' ? system.section === 'collections' : true)
              .map(cat => {
                const categoryCount = categoryCounts[cat.id] || 0;
                return (
                  <button key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500
                      ${selectedCategory === cat.id ? 'text-white font-semibold' : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'}`}
                    style={selectedCategory === cat.id ? { backgroundColor: `${colors.bg}80` } : {}}
                  >
                    <span className="flex items-center gap-1">
                      {trLabel(cat.name, 'cat.')}
                      {categoryCount > 0 && (
                        <span className="text-xs opacity-80 font-normal"
                          style={{ color: selectedCategory === cat.id ? 'rgba(255,255,255,0.85)' : '#9db0d0' }}>
                          {categoryCount}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  // ── JSX principal ─────────────────────────────────────────────────────────
  return (
    <aside style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH, flexShrink: 0, transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', position: 'relative' }}>
      <style>{SIDEBAR_INLINE_STYLES}</style>

      {/* Onglet flèche toggle */}
      <button
        onClick={toggleCollapsed}
        title={collapsed ? tr('nav.expandBar') : tr('nav.collapseBar')}
        aria-label={collapsed ? tr('nav.expandBar') : tr('nav.collapseBar')}
        style={{
          position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 48, background: SIDEBAR_COLORS.primary, border: 'none',
          borderRadius: '0 6px 6px 0', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, padding: 0,
        }}
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
          {collapsed
            ? <polyline points="2,2 6,6 2,10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            : <polyline points="6,2 2,6 6,10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          }
        </svg>
      </button>

      {/* Container sidebar */}
      <div className={`rounded-xl border sticky top-4 ${isDarkMode ? 'bg-gray-900 hb-glass' : 'bg-white'}`}
        style={{ borderColor: '#243a5c', height: 'calc(100vh - 2rem)', display: 'flex', flexDirection: 'column' }}>

        {/* Header titre — mode étendu */}
        {!collapsed && (
          <div className="hb-panel-head flex items-center justify-between p-4 pb-2 flex-shrink-0">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#9db0d0' }}>{tr('nav.systems')}</h3>
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="pr-3 pl-1 custom-scrollbar flex-1" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {visibleSystems.length === 0 && isSearchActive ? (
            <div className="text-center py-8 px-4">
              <p className="text-gray-300 text-sm mb-3">
                {tr('nav.noSystem')}{' '}
                <span className="text-orange-400 font-semibold">"{sidebarSearch}"</span>
              </p>
              <button onClick={clearSearch}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-400">
                {tr('nav.clear')}
              </button>
            </div>
          ) : (
            <>
              {visibleSystems.map((system) => {
                const showSearchAfter = !collapsed && system.id === 'all';
                const uniqueKey = system.id;

                return (
                  <React.Fragment key={uniqueKey}>
                    {system.isHeader    && renderHeader(system)}
                    {system.isSubHeader && renderSubHeader(system)}
                    {!system.isHeader && !system.isSubHeader && renderSystem(system)}

                    {showSearchAfter && (
                      <div className="my-2 px-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: SIDEBAR_COLORS.primaryLight }} />
                          <input
                            ref={setSearchInputNode}
                            data-hbat-sidebar-search=""
                            id="sidebar-search"
                            name="sidebar-search"
                            type="text"
                            placeholder={searchPlaceholder}
                            value={sidebarSearch}
                            onChange={e => setSidebarSearch(e.target.value)}
                            className={`w-full rounded-lg pl-10 pr-10 py-2 text-sm border focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500
                              ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                            aria-label={tr('nav.searchAria')}
                            autoComplete="off"
                          />
                          {isSearchActive && (
                            <button onClick={clearSearch}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded transition focus:outline-none focus:ring-2 focus:ring-orange-500"
                              title={tr('nav.clear')}>
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
