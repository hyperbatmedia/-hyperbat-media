// Fichier: src/HyperBatMediaSite.tsx 
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Gamepad2, Grid, List, X, LogOut, Sun, Moon } from 'lucide-react';

// --- Importations ---
import { NewThemeForm, ThemeItem } from './types';
import { categories } from './constants';
import { useThemeStorage } from './hooks/useThemeStorage';
import { useSystemsLogic } from './hooks/useSystemsLogic';
import { getThemeKey } from './utils/themeUtils'; // ✅ IMPORT
import Sidebar from './components/Sidebar/Sidebar';
import AdminPanel, { AdminTab } from './components/AdminPanel/AdminPanel'; 
import ThemeList from './components/ThemeList/ThemeList';

// --- Constantes ---
const THEMES_PER_PAGE = 20;

// --- Utilitaires ---
/**
 * ✅ Convertit une URL Google Drive en lien direct utilisable
 */
const convertGoogleDriveUrl = (url: string, isImage: boolean = false): string => {
  if (!url || typeof url !== 'string') return url;
  
  if (url.includes('uc?id=') || url.includes('thumbnail?id=')) {
    return url;
  }
  
  let fileId = '';
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (match) fileId = match[1];
  
  if (!fileId) {
    match = url.match(/\/(?:folders|d)\/([a-zA-Z0-9_-]{25,})/);
    if (match) fileId = match[1];
  }
  
  if (!fileId) {
    match = url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
    if (match) fileId = match[1];
  }
  
  if (!fileId) {
    match = url.match(/open\?id=([a-zA-Z0-9_-]{25,})/);
    if (match) fileId = match[1];
  }
  
  if (!fileId && /^[a-zA-Z0-9_-]{25,40}$/.test(url.trim())) {
    fileId = url.trim();
  }
  
  if (!fileId) {
    return url;
  }
  
  if (isImage) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000&authuser=0`;
  } else {
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }
};

/**
 * ✅ Compare l'ID de la sidebar avec le system du thème
 */
const matchSystemId = (themeSystem: string, selectedSystemId: string): boolean => {
  if (selectedSystemId === 'all') return true;
  
  if (['tools', 'tutorials', 'main-themes'].includes(selectedSystemId)) {
    return false;
  }
  
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
  // --- States ---
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Admin
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('add');

  // Hooks
  const { themes: rawThemes, setThemes, isLoading, saveThemes } = useThemeStorage();
  const systemsLogic = useSystemsLogic(); 
  
  const [newTheme, setNewTheme] = useState<NewThemeForm>({
    name: '', system: 'mame', category: 'game-themes',
    imageUrl: '', downloadUrl: '', creator: '', size: ''
  });

  const colors = useMemo(() => getThemeColors(isDarkMode), [isDarkMode]);

  // ✅ Les URLs sont déjà converties dans themes.json
  const themes = useMemo(() => {
    return rawThemes.map(theme => ({
      ...theme,
      imageUrl: theme.imageUrl || '',
      downloadUrl: theme.downloadUrl || ''
    }));
  }, [rawThemes]);

  // --- Handler spécial pour la recherche (détection "canafloche") ---
  const handleSearchChange = (value: string) => {
    if (value.toLowerCase() === 'canafloche') {
      setShowAdminPanel(true);
      setSearchTerm('');
    } else {
      setSearchTerm(value);
    }
  };

  // --- Handlers ---
  const handleAddTheme = async () => {
    if (!newTheme.name || !newTheme.creator) {
      alert('Veuillez remplir les champs obligatoires');
      return;
    }
    const theme: ThemeItem = {
      id: Date.now(),
      ...newTheme,
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
      
      if (!themeToDelete) {
        return;
      }
      
      const updatedThemes = rawThemes.filter(t => getThemeKey(t) !== themeKey);
      setThemes(updatedThemes);
      await saveThemes(updatedThemes);
    }
  };

  // --- Filtering & Pagination ---
  const filteredThemes = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return themes
      .filter(theme => {
        const matchesSearch = theme.name.toLowerCase().includes(searchLower) || 
                            theme.creator.toLowerCase().includes(searchLower);
        
        const matchesSystem = matchSystemId(theme.system, systemsLogic.selectedSystem);
        
        const matchesCategory = systemsLogic.selectedCategory === 'all' || theme.category === systemsLogic.selectedCategory;
        return matchesSearch && matchesSystem && matchesCategory;
      })
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [searchTerm, systemsLogic.selectedSystem, systemsLogic.selectedCategory, themes]);

  const paginatedThemes = useMemo(() => {
    const startIndex = (currentPage - 1) * THEMES_PER_PAGE;
    return filteredThemes.slice(startIndex, startIndex + THEMES_PER_PAGE);
  }, [filteredThemes, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredThemes.length / THEMES_PER_PAGE));

  useEffect(() => { setCurrentPage(1); }, [searchTerm, systemsLogic.selectedSystem, systemsLogic.selectedCategory]);

  // --- Render ---
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
      {/* Particules (mode sombre uniquement) */}
      {isDarkMode && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                backgroundColor: ['#FF8C00', '#FFD700', '#FFA500'][i % 3],
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                opacity: Math.random() * 0.5 + 0.2,
                animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite ${Math.random() * 2}s, float ${Math.random() * 10 + 10}s linear infinite`,
                boxShadow: `0 0 ${Math.random() * 10 + 5}px currentColor`
              }}
            />
          ))}
        </div>
      )}

      <div className="relative" style={{ zIndex: 1 }}>
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 0px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: transparent; }
          @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.8; } }
          @keyframes float { 0% { transform: translateY(0px) translateX(0px); } 25% { transform: translateY(-20px) translateX(10px); } 50% { transform: translateY(-40px) translateX(-10px); } 75% { transform: translateY(-20px) translateX(10px); } 100% { transform: translateY(0px) translateX(0px); } }
        `}</style>

        {/* HEADER */}
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
                <button onClick={() => { setShowAdminPanel(false); }} 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs border-2 transition hover:brightness-110 bg-red-600 border-red-400 text-white">
                  <LogOut className="w-3 h-3" />Fermer Admin
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* BOUTONS ET RECHERCHE - Masqué en mode admin */}
          {!showAdminPanel && (
            <div className="flex items-center" style={{ marginTop: '40px', marginBottom: '32px' }}>
              <div className="flex gap-2" style={{ width: '320px', justifyContent: 'center' }}>
                <button onClick={() => setViewMode('grid')} className="p-3 rounded-lg transition border-2"
                  style={viewMode === 'grid' ? { backgroundColor: '#FF8C00', borderColor: '#FFD700' } : { backgroundColor: colors.cardBg, borderColor: '#4b5563' }}>
                  <Grid className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('list')} className="p-3 rounded-lg transition border-2"
                  style={viewMode === 'list' ? { backgroundColor: '#FF8C00', borderColor: '#FFD700' } : { backgroundColor: colors.cardBg, borderColor: '#4b5563' }}>
                  <List className="w-5 h-5" />
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-lg transition border-2"
                  style={{ backgroundColor: colors.cardBg, borderColor: '#4b5563', color: '#FFA500' }}
                  title={isDarkMode ? 'Mode clair' : 'Mode sombre'}>
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>

              <div style={{ width: '43px' }}></div>

              <div className="relative" style={{ width: '800px', maxWidth: '100%' }}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#FFA500' }} />
                <input type="text" placeholder="Rechercher un thème, un jeu, un créateur..." value={searchTerm}
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
          )}

          {/* Bouton thème uniquement en mode admin */}
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
                  categories={categories} 
                  sidebarSearch={sidebarSearch}
                  setSidebarSearch={setSidebarSearch} 
                  selectedSystem={systemsLogic.selectedSystem}
                  selectedCategory={systemsLogic.selectedCategory} 
                  handleSystemSelect={systemsLogic.handleSystemSelect}
                  setSelectedCategory={systemsLogic.setSelectedCategory} 
                  expandedSections={systemsLogic.expandedSections}
                  toggleSection={systemsLogic.toggleSection} 
                  expandedSubsections={systemsLogic.expandedSubsections}
                  toggleSubsection={systemsLogic.toggleSubsection} 
                  expandedSystems={systemsLogic.expandedSystems}
                  toggleSystemCategories={systemsLogic.toggleSystemCategories}
                  allThemes={themes}
                />
              </div>
            )}

            <main className="flex-1">
              {!showAdminPanel && (
                <div className="mb-6 flex items-center gap-4 text-sm" style={{ marginLeft: '150px', width: '800px', maxWidth: '100%' }}>
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
                </div>
              )}

              {showAdminPanel && (
                <AdminPanel themes={rawThemes} setThemes={setThemes} saveThemes={saveThemes} systems={systemsLogic.systems}
                  categories={categories} adminTab={adminTab} setAdminTab={setAdminTab} newTheme={newTheme}
                  setNewTheme={setNewTheme} handleAddTheme={handleAddTheme} handleDeleteTheme={handleDeleteTheme}
                  convertGoogleDriveUrl={convertGoogleDriveUrl} />
              )}

              {!showAdminPanel && (
                <ThemeList 
                  viewMode={viewMode} 
                  themes={paginatedThemes} 
                  allFilteredThemes={filteredThemes}
                  filteredThemesLength={filteredThemes.length}
                  totalPages={totalPages} 
                  currentPage={currentPage} 
                  setCurrentPage={setCurrentPage}
                  themesPerPage={THEMES_PER_PAGE}
                  isAuthenticated={showAdminPanel}
                  handleDeleteTheme={handleDeleteTheme} 
                  systems={systemsLogic.systems} 
                />
              )}
            </main>
          </div>
        </div>

        {/* FOOTER */}
        <footer className={`bg-gradient-to-t ${colors.headerBg} to-transparent border-t-4 mt-20 py-4`} style={{ borderColor: '#FF8C00' }}>
          <div className="container mx-auto px-4 text-center text-sm" style={{ color: colors.textSecondary }}>
            <p className="font-black text-lg mb-1" style={{ color: '#FF8C00' }}>HYPERBAT MEDIA</p>
            <p className="mt-1">Thème HYPERBAT créé par <span className="font-bold" style={{ color: '#FFA500' }}>Bob Morane</span></p>
          </div>
        </footer>
      </div>
    </div>
  );
}