// Fichier: src/HyperBatMediaSite.tsx 
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Gamepad2, Grid, List, X, LogOut, Sun, Moon, Calendar, SortAsc, Trophy, Monitor, Star, BarChart3, Package, Image, Download } from 'lucide-react';

import { NewThemeForm, ThemeItem } from './types';
import { categories, CART_MAX } from './constants';
import { useThemeStorage } from './hooks/useThemeStorage';
import { useSystemsLogic } from './hooks/useSystemsLogic';
import { getThemeKey } from './utils/themeUtils';
import Sidebar from './components/Sidebar/Sidebar';
import AdminPanel, { AdminTab } from './components/AdminPanel/AdminPanel'; 
import ThemeList from './components/ThemeList/ThemeList';
import CartPanel from './components/CartPanel/CartPanel';

const THEMES_PER_PAGE = 20;

const convertGoogleDriveUrl = (url: string, isImage: boolean = false): string => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('/thumbnail?') || url.includes('/uc?') || url.includes('lh3.googleusercontent.com')) return url;
  let fileId = '';
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (match) fileId = match[1];
  if (!fileId) { match = url.match(/\/(?:folders|d)\/([a-zA-Z0-9_-]{25,})/); if (match) fileId = match[1]; }
  if (!fileId) { match = url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/); if (match) fileId = match[1]; }
  if (!fileId) { match = url.match(/open\?id=([a-zA-Z0-9_-]{25,})/); if (match) fileId = match[1]; }
  if (!fileId && /^[a-zA-Z0-9_-]{25,40}$/.test(url.trim())) fileId = url.trim();
  if (!fileId) return url;
  if (isImage) return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
  return `https://drive.google.com/uc?id=${fileId}&export=download`;
};

const matchSystemId = (themeSystem: string, selectedSystemId: string): boolean => {
  if (selectedSystemId === 'all') return true;
  if (['tools', 'tutorials', 'main-themes', 'other-themes'].includes(selectedSystemId)) return false;
  const parts = selectedSystemId.split('-');
  const systemIdPart = parts[parts.length - 1];
  const normalizedSelected = systemIdPart.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const normalizedTheme = themeSystem.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return normalizedTheme === normalizedSelected;
};

const getThemeColors = (isDarkMode: boolean) => ({
  bg: isDarkMode ? '#0f0519' : '#f3f4f6',
  cardBg: isDarkMode ? '#1a1a1a' : '#ffffff',
  text: isDarkMode ? 'white' : '#1f2937',
  textSecondary: isDarkMode ? '#d1d5db' : '#6b7280',
  border: '#FF8C00',
  headerBg: isDarkMode ? 'from-gray-900' : 'from-gray-200',
  inputBg: isDarkMode ? '#1f2937' : '#ffffff'
});

export default function HyperBatMediaSite(): JSX.Element {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('add');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });

  // ── Panier ────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<ThemeItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const handleCartAdd = useCallback((theme: ThemeItem) => {
    setCart(prev => {
      if (prev.length >= CART_MAX) return prev;
      const key = getThemeKey(theme);
      if (prev.find(t => getThemeKey(t) === key)) return prev;
      return [...prev, theme];
    });
  }, []);

  const handleCartRemove = useCallback((key: string) => {
    setCart(prev => prev.filter(t => getThemeKey(t) !== key));
  }, []);

  const handleCartClear = useCallback(() => {
    setCart([]);
  }, []);

  // ── Thèmes ────────────────────────────────────────────────────────────────
  const { themes: rawThemes, setThemes, isLoading, saveThemes } = useThemeStorage();
  const systemsLogic = useSystemsLogic();

  const [newTheme, setNewTheme] = useState<NewThemeForm>({
    name: '', system: 'mame', category: 'game-themes',
    imageUrl: '', downloadUrl: '', creator: '', size: ''
  });

  const colors = useMemo(() => getThemeColors(isDarkMode), [isDarkMode]);

  const themes = useMemo(() => {
    return rawThemes.map(theme => {
      const needsImageConversion = theme.imageUrl && !theme.imageUrl.includes('/thumbnail?');
      const needsDownloadConversion = theme.downloadUrl && !theme.downloadUrl.includes('/uc?');
      return {
        ...theme,
        imageUrl: needsImageConversion ? convertGoogleDriveUrl(theme.imageUrl, true) : theme.imageUrl,
        downloadUrl: needsDownloadConversion ? convertGoogleDriveUrl(theme.downloadUrl, false) : theme.downloadUrl
      };
    });
  }, [rawThemes]);

  const themeStats = useMemo(() => {
    const collectionThemes = themes.filter(t => (t.system === 'collectionspersonnalises' || t.system === 'Collections Personnalisées') && t.category !== 'artwork').length;
    const artworkThemes = themes.filter(t => t.category === 'artwork').length;
    const gameThemes = themes.filter(t => t.category === 'game-themes').length;
    const systemThemes = themes.filter(t => t.category === 'system-themes').length;
    const defaultThemes = themes.filter(t => t.category === 'default-themes').length;
    const magazineThemes = themes.filter(t => t.system === 'magazines').length;
    const screenScraperThemes = themes.filter(t => t.onScreenScraper === true).length;
    const total = themes.length;
    return { collectionThemes, artworkThemes, gameThemes, systemThemes, defaultThemes, magazineThemes, screenScraperThemes, total };
  }, [themes]);

  const handleSearchChange = (value: string) => {
    if (value.toLowerCase() === 'canafloche') { setShowAdminPanel(true); setSearchTerm(''); }
    else setSearchTerm(value);
  };

  const handleAddTheme = async () => {
    if (!newTheme.name || !newTheme.creator) { alert('Veuillez remplir les champs obligatoires'); return; }
    const theme: ThemeItem = {
      id: Date.now(), ...newTheme,
      imageUrl: convertGoogleDriveUrl(newTheme.imageUrl, true),
      downloadUrl: convertGoogleDriveUrl(newTheme.downloadUrl, false),
      size: newTheme.size || 'N/A'
    };
    const updatedThemes = [...rawThemes, theme];
    setThemes(updatedThemes);
    await saveThemes(updatedThemes);
    setNewTheme({ name: '', system: 'mame', category: 'game-themes', imageUrl: '', downloadUrl: '', creator: '', size: '' });
    alert('Thème ajouté !');
  };

  const handleDeleteTheme = async (themeKey: string) => {
    if (window.confirm('Supprimer ce thème ?')) {
      const themeToDelete = rawThemes.find(t => getThemeKey(t) === themeKey);
      if (!themeToDelete) return;
      const updatedThemes = rawThemes.filter(t => getThemeKey(t) !== themeKey);
      setThemes(updatedThemes);
      await saveThemes(updatedThemes);
    }
  };

  const filteredThemes = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return themes
      .filter(theme => {
        const systemName = systemsLogic.systems.find(s => s.id === theme.system)?.name || theme.system;
        const matchesSearch = theme.name.toLowerCase().includes(searchLower) ||
          theme.creator.toLowerCase().includes(searchLower) ||
          systemName.toLowerCase().includes(searchLower);
        const matchesSystem = matchSystemId(theme.system, systemsLogic.selectedSystem);
        const matchesCategory = systemsLogic.selectedCategory === 'all' ? true
          : systemsLogic.selectedCategory === 'collection' ? (theme.system === 'collectionspersonnalises' && theme.category !== 'artwork')
          : systemsLogic.selectedCategory === 'screenscraper' ? theme.onScreenScraper === true
          : systemsLogic.selectedCategory === 'magazines' ? (theme.system === 'magazines')
          : theme.category === systemsLogic.selectedCategory;
        return matchesSearch && matchesSystem && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const parseDate = (dateStr: string | undefined) => {
            if (!dateStr) return 0;
            if (dateStr.includes('-')) return new Date(dateStr).getTime();
            return new Date(dateStr.split('/').reverse().join('-')).getTime();
          };
          const dateA = parseDate(a.date); const dateB = parseDate(b.date);
          if (dateA === 0 && dateB === 0) return b.id - a.id;
          if (dateA !== dateB) { if (dateA === 0) return 1; if (dateB === 0) return -1; return dateB - dateA; }
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
  }, [searchTerm, systemsLogic.selectedSystem, systemsLogic.selectedCategory, themes, sortBy, systemsLogic.systems]);

  const paginatedThemes = useMemo(() => {
    const startIndex = (currentPage - 1) * THEMES_PER_PAGE;
    return filteredThemes.slice(startIndex, startIndex + THEMES_PER_PAGE);
  }, [filteredThemes, currentPage]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredThemes.length / THEMES_PER_PAGE)),
    [filteredThemes.length]
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm, systemsLogic.selectedSystem, systemsLogic.selectedCategory, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.text }}>
        <div className="text-center">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 animate-pulse" style={{ color: '#FF8C00' }} />
          <p className="text-xl font-bold" style={{ color: '#FF8C00' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-300" style={{ backgroundColor: colors.bg, color: colors.text }}>
      <div className="relative" style={{ zIndex: 1 }}>

        <header className={`bg-gradient-to-b ${colors.headerBg} to-transparent border-b-4`} style={{ borderColor: '#FF8C00' }}>
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col items-center justify-center mb-4">
              <div className="flex items-center gap-4">
                <Gamepad2 className="w-12 h-12" style={{ color: '#FF8C00' }} />
                <div className="text-center">
                  <h1 className="text-5xl font-black tracking-wider" style={{
                    background: 'linear-gradient(180deg, #FF8C00 0%, #FFA500 30%, #FFFF00 50%, #FFA500 70%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(2px 2px 0px #000)'
                  }}>HYPERBAT MEDIA</h1>
                  <p className="text-red-500 font-bold text-sm mt-1">
                    A RetroBat & Batocera theme inspired by <span className="text-yellow-400">HyperSpin</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>à la sauce Bob Morane</p>
                </div>
                <Gamepad2 className="w-12 h-12" style={{ color: '#FF8C00' }} />
              </div>
            </div>
            {showAdminPanel && (
              <div className="flex justify-center">
                <button onClick={() => setShowAdminPanel(false)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border-2 transition hover:brightness-110 bg-red-600 border-red-400 text-white">
                  <LogOut className="w-3 h-3" />Fermer Admin
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="container mx-auto px-4 py-4">
          {!showAdminPanel && (
            <>
              {/* Statistiques */}
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                {[
                  { id: 'screenscraper', label: 'ScreenScraper', count: themeStats.screenScraperThemes, special: true },
                  { id: 'magazines', label: 'Magazines', count: themeStats.magazineThemes, icon: '📰' },
                  { id: 'collection', label: 'Collection', count: themeStats.collectionThemes, Icon: Package },
                  { id: 'artwork', label: 'Artwork', count: themeStats.artworkThemes, Icon: Image },
                  { id: 'game-themes', label: 'Thèmes de jeux', count: themeStats.gameThemes, Icon: Trophy },
                  { id: 'system-themes', label: 'Thèmes système', count: themeStats.systemThemes, Icon: Monitor },
                  { id: 'default-themes', label: 'Thèmes default', count: themeStats.defaultThemes, Icon: Star },
                  { id: 'all', label: 'Total global', count: themeStats.total, Icon: BarChart3 },
                ].map(({ id, label, count, special, icon, Icon }) => (
                  <button key={id}
                    onClick={() => { systemsLogic.handleSystemSelect('all'); systemsLogic.setSelectedCategory(id); }}
                    className="px-7 py-0.5 rounded-lg border-2 flex items-center gap-1 transition hover:brightness-110 cursor-pointer"
                    style={{
                      background: special ? '#2a2a2a' : '#D97706',
                      borderColor: systemsLogic.selectedCategory === id ? '#FFFF00' : '#FFD700',
                      borderWidth: systemsLogic.selectedCategory === id ? '3px' : '2px',
                      boxShadow: systemsLogic.selectedCategory === id ? '0 0 10px rgba(255,215,0,0.3)' : 'none'
                    }}>
                    {icon && <span style={{ fontSize: '10px' }}>{icon}</span>}
                    {Icon && <Icon className="w-2.5 h-2.5" style={{ color: '#e0e0e0' }} />}
                    <div>
                      {special ? (
                        <p className="text-xs font-black">
                          <span style={{ color: '#FFD700' }}>SCREEN</span>
                          <span style={{ background: 'linear-gradient(180deg, #6abf00 0%, #2d6a00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SCRAPER</span>
                        </p>
                      ) : (
                        <p className="text-xs font-semibold" style={{ color: '#e0e0e0' }}>{label}</p>
                      )}
                      <p className="text-xs font-black" style={{ color: '#e0e0e0' }}>{count}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* ── Barre de contrôles avec bouton panier ── */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setViewMode('grid')} className="p-3 rounded-lg transition border-2"
                    style={viewMode === 'grid' ? { backgroundColor: '#FF8C00', borderColor: '#FFD700' } : { backgroundColor: colors.cardBg, borderColor: '#4b5563' }}>
                    <Grid className="w-5 h-5" />
                  </button>
                  <button onClick={() => setViewMode('list')} className="p-3 rounded-lg transition border-2"
                    style={viewMode === 'list' ? { backgroundColor: '#FF8C00', borderColor: '#FFD700' } : { backgroundColor: colors.cardBg, borderColor: '#4b5563' }}>
                    <List className="w-5 h-5" />
                  </button>
                  <button onClick={() => setSortBy(sortBy === 'name' ? 'date' : 'name')}
                    className="p-3 rounded-lg transition border-2 flex items-center gap-2"
                    style={sortBy === 'date' ? { backgroundColor: '#FF8C00', borderColor: '#FFD700' } : { backgroundColor: colors.cardBg, borderColor: '#4b5563' }}
                    title={sortBy === 'name' ? 'Trier par date' : 'Trier par nom'}>
                    {sortBy === 'name' ? <SortAsc className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                    <span className="text-xs font-bold">{sortBy === 'name' ? 'A-Z' : 'DATE'}</span>
                  </button>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-lg transition border-2"
                    style={{ backgroundColor: colors.cardBg, borderColor: '#4b5563', color: '#FFA500' }}
                    title={isDarkMode ? 'Mode clair' : 'Mode sombre'}>
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>

                  {/* ── Bouton Panier ── */}
                  <button
                    onClick={() => setCartOpen(true)}
                    className="relative p-3 rounded-lg transition border-2 flex items-center gap-2 hover:brightness-110"
                    style={{
                      backgroundColor: cart.length > 0 ? '#FF8C00' : colors.cardBg,
                      borderColor: cart.length > 0 ? '#FFD700' : '#4b5563',
                      color: cart.length > 0 ? 'white' : '#FFA500'
                    }}
                    title="Ouvrir le panier">
                    <Download className="w-5 h-5" />
                    {cart.length > 0 && (
                      <>
                        <span className="text-xs font-bold">{cart.length}/{CART_MAX}</span>
                        <span
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-black flex items-center justify-center"
                          style={{ backgroundColor: '#FFD700', color: '#1a1a1a' }}>
                          {cart.length}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Barre de recherche */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#FFA500' }} />
                  <input type="text" placeholder="Rechercher un thème, un jeu, un créateur, un système..." value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full rounded-lg pl-12 pr-12 py-3 border-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    style={{ backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }} />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 transition hover:brightness-110"
                      style={{ color: colors.textSecondary }} title="Effacer la recherche">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {showAdminPanel && (
            <div className="flex justify-end mb-6">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-lg transition border-2"
                style={{ backgroundColor: colors.cardBg, borderColor: '#4b5563', color: '#FFA500' }}
                title={isDarkMode ? 'Mode clair' : 'Mode sombre'}>
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          )}

          <div className="flex gap-6">
            {!showAdminPanel && (
              <div style={{ paddingTop: '52px' }}>
                <Sidebar
                  systems={systemsLogic.systems}
                  sidebarSearch={sidebarSearch} setSidebarSearch={setSidebarSearch}
                  selectedSystem={systemsLogic.selectedSystem} selectedCategory={systemsLogic.selectedCategory}
                  handleSystemSelect={systemsLogic.handleSystemSelect} setSelectedCategory={systemsLogic.setSelectedCategory}
                  expandedSections={systemsLogic.expandedSections} toggleSection={systemsLogic.toggleSection}
                  expandedSubsections={systemsLogic.expandedSubsections} toggleSubsection={systemsLogic.toggleSubsection}
                  expandedSystems={systemsLogic.expandedSystems} toggleSystemCategories={systemsLogic.toggleSystemCategories}
                  allThemes={themes} isDarkMode={isDarkMode}
                  onCollapsedChange={setSidebarCollapsed}
                />
              </div>
            )}

            <main className="flex-1 min-w-0">
              {!showAdminPanel && (
                <div className="mb-6 flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" style={{ color: '#FFA500' }} />
                    <span style={{ color: colors.textSecondary }}>Système:</span>
                    <span className="font-bold" style={{ color: '#FFA500' }}>
                      {systemsLogic.selectedSystem === 'all' ? 'Tous les systèmes' : systemsLogic.systems.find(s => s.id === systemsLogic.selectedSystem)?.name || systemsLogic.selectedSystem}
                    </span>
                  </div>
                  <span style={{ color: colors.textSecondary }}>•</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: colors.textSecondary }}>Catégorie:</span>
                    <span className="font-bold" style={{ color: '#FFA500' }}>
                      {systemsLogic.selectedCategory === 'all' ? 'Toutes les catégories' : categories.find(c => c.id === systemsLogic.selectedCategory)?.name || systemsLogic.selectedCategory}
                    </span>
                  </div>
                  <span style={{ color: colors.textSecondary }}>•</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg" style={{ color: '#FFD700' }}>{filteredThemes.length}</span>
                    <span style={{ color: colors.textSecondary }}>{filteredThemes.length > 1 ? 'thèmes' : 'thème'}</span>
                  </div>
                  <span style={{ color: colors.textSecondary }}>•</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: colors.textSecondary }}>Tri:</span>
                    <span className="font-bold" style={{ color: '#FFA500' }}>{sortBy === 'name' ? 'Nom' : 'Date'}</span>
                  </div>
                </div>
              )}

              {showAdminPanel && (
                <AdminPanel
                  themes={rawThemes} setThemes={setThemes} saveThemes={saveThemes}
                  systems={systemsLogic.systems} categories={categories}
                  adminTab={adminTab} setAdminTab={setAdminTab}
                  newTheme={newTheme} setNewTheme={setNewTheme}
                  handleAddTheme={handleAddTheme} handleDeleteTheme={handleDeleteTheme}
                  convertGoogleDriveUrl={convertGoogleDriveUrl}
                />
              )}

              {!showAdminPanel && (
                <ThemeList
                  viewMode={viewMode} themes={paginatedThemes}
                  allFilteredThemes={filteredThemes} filteredThemesLength={filteredThemes.length}
                  totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage}
                  themesPerPage={THEMES_PER_PAGE} systems={systemsLogic.systems}
                  cart={cart} onCartAdd={handleCartAdd} onCartRemove={handleCartRemove} onCartOpen={() => setCartOpen(true)}
                  sidebarCollapsed={sidebarCollapsed}
                />
              )}
            </main>
          </div>
        </div>

        <footer className={`bg-gradient-to-t ${colors.headerBg} to-transparent border-t-4 mt-20 py-4`} style={{ borderColor: '#FF8C00' }}>
          <div className="container mx-auto px-4 text-center text-sm" style={{ color: colors.textSecondary }}>
            <p className="font-black text-lg mb-1" style={{
              background: 'linear-gradient(180deg, #FF8C00 0%, #FFA500 30%, #FFFF00 50%, #FFA500 70%, #FF8C00 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(2px 2px 0px #000)'
            }}>HYPERBAT MEDIA</p>
            <p className="mt-1">
              Thème HYPERBAT créé par <span className="font-bold" style={{ background: 'linear-gradient(180deg, #FF8C00 0%, #FFA500 30%, #FFFF00 50%, #FFA500 70%, #FF8C00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(1px 1px 0px #000)' }}>Bob Morane</span> | 
              Vitrine crée par <span className="font-bold" style={{ background: 'linear-gradient(180deg, #FF8C00 0%, #FFA500 30%, #FFFF00 50%, #FFA500 70%, #FF8C00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(1px 1px 0px #000)' }}>Christophe</span> | 
              Mise à jour par <span className="font-bold" style={{ background: 'linear-gradient(180deg, #FF8C00 0%, #FFA500 30%, #FFFF00 50%, #FFA500 70%, #FF8C00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(1px 1px 0px #000)' }}>Alain et Christophe</span>
            </p>
            <p className="mt-2 text-sm">
              Merci à tous les créateurs de thèmes : <span className="font-bold" style={{ background: 'linear-gradient(180deg, #FF8C00 0%, #FFA500 30%, #FFFF00 50%, #FFA500 70%, #FF8C00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(1px 1px 0px #000)' }}>Bob,Dav,Roni,Alain,Huhe8554,Finch,KevoBatoYT,Akeshi,Arcanjohack,CrazyYann,Kairos182,Krakerman,Mrfomt,pento5185,qbertaddict,Sk0ney,Virtual Postman,yanni9867 et tous les autres</span>
            </p>
          </div>
        </footer>
      </div>

      {/* ── Panier lightbox ── */}
      {cartOpen && (
        <CartPanel
          cart={cart}
          onRemove={handleCartRemove}
          onClear={handleCartClear}
          onClose={() => setCartOpen(false)}
          systems={systemsLogic.systems}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
