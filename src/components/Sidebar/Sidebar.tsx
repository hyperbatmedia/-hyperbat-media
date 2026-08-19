import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Search, ChevronDown, X, Star, BookOpen } from 'lucide-react';
import { SystemRow } from '../../types';
import { getSystemColors } from './sidebar.colors';
import {
  TOP_BUTTON_IDS,
  EXTERNAL_LINKS,
  SIDEBAR_INLINE_STYLES,
} from './sidebar.constants';
import { useLinksLoader } from '../../hooks/useLinksLoader';
import type { ModalConfig } from '../../hooks/useLinksLoader';
import ContentModal from '../ContentModal/ContentModal';
import { isKioskNavigableSidebarSystem, kioskFocusStyle } from '../../kioskNavConfig';

import arcadeImg from '../../assets/icons/arcade.png';
import portableImg from '../../assets/icons/console_portable.png';
import fantasyImg from '../../assets/icons/phantasy_console.png';
import ordinosaureImg from '../../assets/icons/Ordinosaure.png';
import flipperImg from '../../assets/icons/flipper.png';

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
  /** Ref partagée avec ThemeList (navigation manette → recherche systèmes).
   *  MutableRefObject (pas RefObject) : on doit pouvoir écrire .current. */
  searchInputRef?: React.MutableRefObject<HTMLInputElement | null>;
  /** Contour blanc quand le D-Pad a focusé ce champ (?retrobat=1). */
  searchGamepadFocused?: boolean;
  /** Placeholder du champ recherche systèmes. */
  searchPlaceholder?: string;
  /** Mode kiosque (?retrobat=1) — navigation manette. */
  isRetrobat?: boolean;
  /** ID système sidebar avec contour manette. */
  kioskFocusedSystemId?: string | null;
  /** Liste ordonnée des systèmes navigables (ThemeList). */
  onKioskNavigableSystemIdsChange?: (ids: string[]) => void;
}

// ── Icône Discord réutilisable ────────────────────────────────────────────────
const DiscordIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} fill="#FFFFFF" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

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
  searchGamepadFocused = false,
  searchPlaceholder = 'Rechercher un système... (Ctrl+K)',
  isRetrobat = false,
  kioskFocusedSystemId = null,
  onKioskNavigableSystemIdsChange,
}) => {
  const { links, isLoading: isLoadingLinks } = useLinksLoader();

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const openModal = (config: ModalConfig) => {
    setModalConfig(config);
    setModalOpen(true);
  };

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

  // ── Liens ─────────────────────────────────────────────────────────────────
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
    map['tools']        = listLinks.find(l => l.id === 'outils'            || l.name.toLowerCase().includes('outil'));
    map['tutorials']    = listLinks.find(l => l.id === 'tutoriels'         || l.name.toLowerCase().includes('tutoriel'));
    map['main-themes']  = listLinks.find(l => l.id === 'themes-hyperbat'   || l.name.toLowerCase().includes('theme'));
    map['other-themes'] = listLinks.find(l => l.id === 'autres-themes-bob' || l.name.toLowerCase().includes('autres thèmes'));
    return map;
  }, [listLinks]);

  // ── Recherche ─────────────────────────────────────────────────────────────
  const normalizedSearch = useMemo(() => sidebarSearch.trim().toLowerCase(), [sidebarSearch]);
  const isSearchActive   = normalizedSearch.length > 0;
  // Ref locale (Ctrl+K). Callback ref pour aussi remplir la ref parent (manette)
  // sans conflit de types RefObject<HTMLInputElement | null> vs LegacyRef.
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
    const topButtons = systems.filter(s => TOP_BUTTON_IDS.includes(s.id as any));
    if (!isSearchActive) return systems;
    const filtered = systems.filter(system => {
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

  const kioskNavigableSystemIds = useMemo(() => {
    if (!isRetrobat || collapsed) return [];
    return visibleSystems
      .filter(system => {
        if (system.isHeader || system.isSubHeader) return false;
        const isTopButton = TOP_BUTTON_IDS.includes(system.id as any);
        const link = isTopButton && system.id !== 'all' ? linksBySystemId[system.id] : undefined;
        return isKioskNavigableSidebarSystem(system, link);
      })
      .map(system => system.id);
  }, [isRetrobat, collapsed, visibleSystems, linksBySystemId]);

  useEffect(() => {
    onKioskNavigableSystemIdsChange?.(kioskNavigableSystemIds);
  }, [kioskNavigableSystemIds, onKioskNavigableSystemIdsChange]);

  // ── Renderers ─────────────────────────────────────────────────────────────
  const renderHeader = (system: SystemRow) => {
    if (isSearchActive) return null;
    const sectionKey   = system.section || '';
    const isExpanded   = expandedSections[sectionKey];
    const sectionCount = themeCountBySection.sectionCounts[sectionKey] || 0;
    const label        = stripEmoji(system.name);

    if (collapsed) {
      return (
        <button
          onClick={() => handleCollapsedSectionClick(sectionKey)}
          title={label}
          className={`w-full flex items-center justify-center py-1 px-0 rounded transition ${
            isExpanded ? 'bg-orange-500/20' : isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
          }`}
          style={{ borderLeft: isExpanded ? '2px solid #FF8C00' : '2px solid transparent' }}
        >
          <SectionIcon section={sectionKey} size={34} imgSize={46} isDarkMode={isDarkMode} />
        </button>
      );
    }

    return (
      <button
        onClick={() => toggleSection(sectionKey)}
        className={`w-full text-left pt-3 pb-1 px-2 rounded transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-500 ${
          isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
        }`}
        aria-expanded={isExpanded}
      >
        <h4 className="font-bold text-sm tracking-wider flex items-center gap-2 min-w-0" style={{ color: '#FFD700' }}>
          <SectionIcon section={sectionKey} size={32} isDarkMode={isDarkMode} />
          <span className="truncate">{label}</span>
          {sectionCount > 0 && (
            <span className="text-xs opacity-80 font-normal flex-shrink-0" style={{ color: 'rgba(255,215,0,0.85)' }}>
              ({sectionCount})
            </span>
          )}
        </h4>
        <ChevronDown className={`w-4 h-4 chevron-icon flex-shrink-0 ${isExpanded ? 'open' : 'closed'}`} style={{ color: '#FFA500' }} />
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
        className={`w-full text-left pt-2 pb-1 px-3 ml-2 rounded transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-500 ${
          isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
        }`}
        aria-expanded={isExpanded}
      >
        <h5 className="font-bold text-sm tracking-normal flex items-center gap-1 min-w-0" style={{ color: '#FF8C00' }}>
          <span className="truncate">{system.name}</span>
          {subsectionCount > 0 && (
            <span className="text-xs opacity-80 font-normal flex-shrink-0" style={{ color: 'rgba(255,140,0,0.85)' }}>
              ({subsectionCount})
            </span>
          )}
        </h5>
        <ChevronDown className={`w-3 h-3 chevron-icon flex-shrink-0 ${isExpanded ? 'open' : 'closed'}`} style={{ color: '#FFA500' }} />
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
    const correspondingLink = isTopButton && system.id !== 'all' ? linksBySystemId[system.id] : null;
    const kioskNavigable = isRetrobat && isKioskNavigableSidebarSystem(system, correspondingLink ?? undefined);
    const kioskFocused = kioskNavigable && kioskFocusedSystemId === system.id;

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
      ? { background: 'linear-gradient(135deg, #FFA500 0%, #FF9E33 100%)', borderColor: '#FFD700', borderWidth: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }
      : isSelected ? { backgroundColor: colors.bg, borderColor: colors.border } : {};

    const textStyle = isTopButton
      ? { color: '#1F1F1F', fontWeight: '700' }
      : isSelected
        ? { color: colors.selectedText || '#FFFFFF' }
        : colors.unselectedText ? { color: colors.unselectedText } : {};

    const indented = system.subsection && system.subsection !== 'collections' && !isSearchActive;

    return (
      <div className="px-2 py-1">
        <div
          className={`w-full px-4 py-2 rounded-lg transition-all duration-200 font-semibold border-2 flex items-center justify-between
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
          {correspondingLink ? (
            correspondingLink.modal ? (
              // ── Bouton modal (Tutoriels, Outils, Autres thèmes Bob) ──
              <button
                onClick={() => openModal(correspondingLink.modal!)}
                tabIndex={isRetrobat ? -1 : undefined}
                className={`flex-1 text-left text-sm min-w-0 pr-2 focus:outline-none rounded
                  ${isSelected || isTopButton ? 'text-white' : `${defaultTextColor} ${defaultHoverText}`}`}
                style={textStyle}
                aria-label={system.name}
              >
                <span className="truncate block">{system.name}</span>
              </button>
            ) : (
              // ── Lien externe classique (Thèmes HyperBat → GitHub) ──
              <a href={correspondingLink.url} target="_blank" rel="noopener noreferrer"
                tabIndex={isRetrobat ? -1 : undefined}
                className={`flex-1 text-left text-sm min-w-0 pr-2 focus:outline-none rounded
                  ${isSelected || isTopButton ? 'text-white' : `${defaultTextColor} ${defaultHoverText}`}`}
                style={textStyle} aria-label={system.name}>
                <span className="truncate block">{system.name}</span>
              </a>
            )
          ) : (
            <button
              ref={el => { if (el) systemButtonsRef.current.set(system.id, el); else systemButtonsRef.current.delete(system.id); }}
              data-kiosk-sidebar-system={kioskNavigable ? system.id : undefined}
              tabIndex={isRetrobat && !kioskNavigable ? -1 : undefined}
              onClick={e => { handleSystemSelect(system.id); e.currentTarget.blur(); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSystemSelect(system.id); e.currentTarget.blur(); } }}
              className={`flex-1 text-left text-sm min-w-0 pr-2 focus:outline-none rounded
                ${isSelected || isTopButton ? 'text-white' : `${defaultTextColor} ${defaultHoverText}`}`}
              style={{
                ...textStyle,
                ...kioskFocusStyle(!!kioskFocused),
              }}
              aria-label={`${system.name}${themeCount > 0 ? `, ${themeCount} thèmes` : ''}`}
              aria-current={isSelected ? 'page' : undefined}
            >
              <span className="truncate block">
                {system.name}
                {themeCount > 0 && (
                  <span className="ml-2 text-xs opacity-80 font-normal"
                    style={{ color: isSelected || isTopButton ? 'rgba(255,255,255,0.85)' : 'rgba(255,140,0,0.9)' }}>
                    ({themeCount})
                  </span>
                )}
              </span>
            </button>
          )}

          {hasCategories && (
            <button
              onClick={() => toggleSystemCategories(system.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSystemCategories(system.id); } }}
              className="flex-shrink-0 p-1 rounded hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-orange-500"
              title={expandedSystems[system.id] ? 'Masquer les catégories' : 'Afficher les catégories'}
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
          <div
            className={`sidebar-section-content ${expandedSystems[system.id] ? 'open' : 'closed'} ml-4 mt-1 space-y-1 border-l-2 pl-2`}
            style={{ borderColor: colors.bg }}
          >
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition focus:outline-none focus:ring-2 focus:ring-orange-500
                ${selectedCategory === 'all' ? 'text-white font-semibold' : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'}`}
              style={selectedCategory === 'all' ? { backgroundColor: `${colors.bg}80` } : {}}
            >
              <span className="flex items-center gap-1">
                Toutes les catégories
                {themeCount > 0 && (
                  <span className="text-xs opacity-80 font-normal"
                    style={{ color: selectedCategory === 'all' ? 'rgba(255,255,255,0.85)' : 'rgba(255,140,0,0.9)' }}>
                    ({themeCount})
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
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition focus:outline-none focus:ring-2 focus:ring-orange-500
                      ${selectedCategory === cat.id ? 'text-white font-semibold' : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'}`}
                    style={selectedCategory === cat.id ? { backgroundColor: `${colors.bg}80` } : {}}
                  >
                    <span className="flex items-center gap-1">
                      {cat.name}
                      {categoryCount > 0 && (
                        <span className="text-xs opacity-80 font-normal"
                          style={{ color: selectedCategory === cat.id ? 'rgba(255,255,255,0.85)' : 'rgba(255,140,0,0.9)' }}>
                          ({categoryCount})
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
        title={collapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
        aria-label={collapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
        style={{
          position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)',
          width: 14, height: 48, background: '#FF8C00', border: 'none',
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
      <div className={`rounded-lg border-4 sticky top-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
        style={{ borderColor: '#FF8C00', height: 'calc(100vh - 2rem)', display: 'flex', flexDirection: 'column' }}>

        {/* Header titre + Discord/ARRM — mode étendu */}
        {!collapsed && (
          <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
            <h3 className="text-xl font-black" style={{ color: '#FF8C00' }}>SYSTÈMES</h3>
            <div className="flex gap-2">
              {isLoadingLinks ? (
                <div className="text-gray-400 text-xs">Chargement...</div>
              ) : headerLinks.length > 0 ? (
                headerLinks.map(link => {
                  const isARRM = link.name.toLowerCase().includes('arrm');
                  return (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                      tabIndex={isRetrobat ? -1 : undefined}
                      className={`rounded-lg transition-all duration-200 border-2 hover:shadow-lg hover:brightness-125 focus:outline-none focus:ring-2
                        ${isARRM ? 'px-2.5 py-2 bg-yellow-500 hover:bg-yellow-600 border-yellow-600 focus:ring-yellow-400' : 'p-2 bg-[#5865F2] hover:bg-[#4752C4] border-[#5865F2] focus:ring-blue-400'}`}
                      title={link.name}>
                      {isARRM ? (
                        <span className="text-sm font-bold flex items-center justify-center" style={{ color: '#0091bd' }}>ARRM</span>
                      ) : (
                        <DiscordIcon size={20} />
                      )}
                    </a>
                  );
                })
              ) : (
                <>
                  <a href={EXTERNAL_LINKS.discord} target="_blank" rel="noopener noreferrer"
                    tabIndex={isRetrobat ? -1 : undefined}
                    className="p-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] transition-all duration-200 border-2 border-[#5865F2] hover:border-[#4752C4] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Rejoindre notre Discord">
                    <DiscordIcon size={20} />
                  </a>
                  <a href={EXTERNAL_LINKS.arrm} target="_blank" rel="noopener noreferrer"
                    tabIndex={isRetrobat ? -1 : undefined}
                    className="px-2.5 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 transition-all duration-200 border-2 border-yellow-600 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    title="ARRM">
                    <span className="text-sm font-bold" style={{ color: '#0091bd' }}>ARRM</span>
                  </a>
                </>
              )}
            </div>
          </div>
        )}

        {/* Discord + ARRM — mode réduit */}
        {collapsed && (
          <div className="flex flex-col items-center gap-2 pt-3 pb-2 flex-shrink-0">
            {isLoadingLinks ? null : headerLinks.length > 0 ? (
              headerLinks.map(link => {
                const isARRM = link.name.toLowerCase().includes('arrm');
                return (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                    tabIndex={isRetrobat ? -1 : undefined}
                    title={link.name}
                    className={`flex items-center justify-center rounded-lg transition-all duration-200 hover:brightness-125 focus:outline-none focus:ring-2
                      ${isARRM ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400' : 'bg-[#5865F2] hover:bg-[#4752C4] focus:ring-blue-400'}`}
                    style={{ width: 36, height: isARRM ? 28 : 36 }}>
                    {isARRM ? (
                      <span className="text-xs font-black" style={{ color: '#0091bd' }}>ARRM</span>
                    ) : (
                      <DiscordIcon size={20} />
                    )}
                  </a>
                );
              })
            ) : (
              <>
                <a href={EXTERNAL_LINKS.discord} target="_blank" rel="noopener noreferrer"
                  tabIndex={isRetrobat ? -1 : undefined}
                  title="Rejoindre notre Discord"
                  className="flex items-center justify-center rounded-lg bg-[#5865F2] hover:bg-[#4752C4] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ width: 36, height: 36 }}>
                  <DiscordIcon size={20} />
                </a>
                <a href={EXTERNAL_LINKS.arrm} target="_blank" rel="noopener noreferrer"
                  tabIndex={isRetrobat ? -1 : undefined}
                  title="ARRM"
                  className="flex items-center justify-center rounded-lg bg-yellow-500 hover:bg-yellow-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  style={{ width: 36, height: 28 }}>
                  <span className="text-xs font-black" style={{ color: '#0091bd' }}>ARRM</span>
                </a>
              </>
            )}
            {/* Séparateur */}
            <div style={{ width: 36, height: 1, background: '#374151', marginTop: 2 }} />
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="pr-1 pl-1 custom-scrollbar flex-1" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {visibleSystems.length === 0 && isSearchActive ? (
            <div className="text-center py-8 px-4">
              <p className="text-gray-300 text-sm mb-3">
                Aucun système trouvé pour{' '}
                <span className="text-orange-400 font-semibold">"{sidebarSearch}"</span>
              </p>
              <button onClick={clearSearch}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-orange-400">
                Effacer la recherche
              </button>
            </div>
          ) : (
            <>
              {visibleSystems.map((system, index) => {
                const showSearchAfter = !collapsed && index === 4 && system.id === 'other-themes';
                const isTopBtn  = TOP_BUTTON_IDS.includes(system.id as any);
                const hasLink   = isTopBtn && system.id !== 'all' && linksBySystemId[system.id];
                const uniqueKey = hasLink ? `${system.id}-link-${linksBySystemId[system.id]?.id}` : system.id;

                return (
                  <React.Fragment key={uniqueKey}>
                    {system.isHeader    && renderHeader(system)}
                    {system.isSubHeader && renderSubHeader(system)}
                    {!system.isHeader && !system.isSubHeader && renderSystem(system)}

                    {showSearchAfter && (
                      <div className="my-2 px-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#FFA500' }} />
                          <input
                            ref={setSearchInputNode}
                            data-hbat-sidebar-search=""
                            id="sidebar-search"
                            name="sidebar-search"
                            type="text"
                            placeholder={searchPlaceholder}
                            value={sidebarSearch}
                            onChange={e => setSidebarSearch(e.target.value)}
                            className={`w-full rounded-lg pl-10 pr-10 py-2 text-sm border-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500
                              ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'}`}
                            style={searchGamepadFocused ? kioskFocusStyle(true) : undefined}
                            aria-label="Rechercher un système"
                            autoComplete="off"
                          />
                          {isSearchActive && (
                            <button onClick={clearSearch}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded transition focus:outline-none focus:ring-2 focus:ring-orange-500"
                              title="Effacer la recherche">
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

      {/* ── Modal contenu ── */}
      {modalConfig && (
        <ContentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          config={modalConfig}
          isDarkMode={isDarkMode}
        />
      )}
    </aside>
  );
};

export default Sidebar;
