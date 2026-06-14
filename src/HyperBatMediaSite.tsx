// Fichier: src/HyperBatMediaSite.tsx
// MODIFIÉ : ajout du useEffect de lecture des query params URL (?search=, ?system=, ?category=)
// pour permettre au script hyperbat_theme_finder.py d'ouvrir la vitrine pré-filtrée.

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, Gamepad2, Grid, List, X, LogOut, Sun, Moon, Calendar, SortAsc, Trophy, Monitor, Star, BarChart3, Package, Image, Download } from 'lucide-react';

import { ThemeItem } from './types';
import { categories, CART_MAX } from './constants';
import { useThemeStorage } from './hooks/useThemeStorage';
import { useSystemsLogic } from './hooks/useSystemsLogic';
import { getThemeKey } from './utils/themeUtils';
import Sidebar from './components/Sidebar/Sidebar';
import AdminPanel, { AdminTab } from './components/AdminPanel/AdminPanel';
import ThemeList from './components/ThemeList/ThemeList';
import CartPanel from './components/CartPanel/CartPanel';
import RecapThemesPanel from './components/RecapThemesPanel/RecapThemesPanel';
import bobSystemsData from './data/bob-systems.json';
import { resolveBobSlug } from './data/systemAliases';

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

const GITHUB_OWNER = 'hyperbatmedia';
const GITHUB_REPO = '-hyperbat-media';
const GITHUB_BRANCH = 'main';
const LOCK_PATH = 'admin_lock.json';
const COOLDOWN_CLOSE_SECONDS = 60;
const LOCK_EXPIRES_HOURS = 8;

const writeLock = async (
  token: string,
  adminName: string,
  isLocked: boolean,
  cooldownSeconds?: number
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const lockData = {
      isLocked,
      adminName,
      lockedAt: Date.now(),
      expiresAt: isLocked ? Date.now() + LOCK_EXPIRES_HOURS * 3600 * 1000 : undefined,
      cooldownUntil: cooldownSeconds ? Date.now() + cooldownSeconds * 1000 : undefined,
      isPushCooldown: cooldownSeconds ? (cooldownSeconds > COOLDOWN_CLOSE_SECONDS) : undefined
    };
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(lockData, null, 2))));
    let sha: string | undefined;
    const shaRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${LOCK_PATH}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (shaRes.ok) {
      const shaData = await shaRes.json();
      sha = shaData.sha;
    } else if (shaRes.status !== 404) {
      return { ok: false, error: `Erreur lecture SHA: ${shaRes.status}` };
    }
    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${LOCK_PATH}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Admin lock: ${isLocked ? 'locked by' : 'released by'} ${adminName}`,
          content,
          ...(sha ? { sha } : {}),
          branch: GITHUB_BRANCH
        })
      }
    );
    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return { ok: false, error: `GitHub ${putRes.status}: ${errData.message || 'Erreur inconnue'}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Réseau: ${err instanceof Error ? err.message : 'Erreur inconnue'}` };
  }
};

const readLock = async (): Promise<{ isLocked: boolean; adminName: string; lockedAt: number; cooldownUntil?: number; expiresAt?: number; isPushCooldown?: boolean } | null> => {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${LOCK_PATH}`,
      { headers: { Accept: 'application/vnd.github+json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const lock = JSON.parse(atob(data.content.replace(/\n/g, '')));
    if (lock?.isLocked && lock?.expiresAt && lock.expiresAt < Date.now()) return null;
    return lock;
  } catch { return null; }
};

const AdminLoginModal = ({ onConfirm, onCancel }: {
  onConfirm: (name: string, token: string) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(() => localStorage.getItem('hyperbat_admin_name') || '');
  const [token, setToken] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState<number>(0);
  const [countdownAdmin, setCountdownAdmin] = useState<string>('');
  const [isPush, setIsPush] = useState<boolean>(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [countdown]);

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedToken = token.trim();
    if (!trimmedName || !trimmedToken) return;
    setIsChecking(true);
    setError('');
    try {
      const lock = await readLock();
      if (lock?.isLocked) {
        const elapsed = Math.floor((Date.now() - lock.lockedAt) / 60000);
        const elapsedStr = elapsed < 1 ? "moins d'1 minute" : `${elapsed} minute${elapsed > 1 ? 's' : ''}`;
        setError(`🔒 ${lock.adminName} est déjà dans l'admin depuis ${elapsedStr}. Réessaie plus tard ou force l'accès.`);
        setIsChecking(false);
        return;
      }
      if (lock?.cooldownUntil && lock.cooldownUntil > Date.now()) {
        const remaining = Math.ceil((lock.cooldownUntil - Date.now()) / 1000);
        setCountdownAdmin(lock.adminName);
        setIsPush(lock.isPushCooldown === true);
        setCountdown(remaining);
        setIsChecking(false);
        return;
      }
      const result = await writeLock(trimmedToken, trimmedName, true);
      if (!result.ok) {
        setError(`❌ Impossible d'écrire le verrou : ${result.error}`);
        setIsChecking(false);
        return;
      }
      localStorage.setItem('hyperbat_admin_name', trimmedName);
      onConfirm(trimmedName, trimmedToken);
    } catch {
      setError('❌ Erreur GitHub — vérifie ton token.');
    }
    setIsChecking(false);
  };

  const handleForce = async () => {
    const trimmedName = name.trim();
    const trimmedToken = token.trim();
    if (!trimmedName || !trimmedToken) return;
    setIsChecking(true);
    setError('');
    try {
      const result = await writeLock(trimmedToken, trimmedName, true);
      if (!result.ok) {
        setError(`❌ Impossible d'écrire le verrou : ${result.error}`);
        setIsChecking(false);
        return;
      }
      localStorage.setItem('hyperbat_admin_name', trimmedName);
      onConfirm(trimmedName, trimmedToken);
    } catch {
      setError('❌ Erreur GitHub — vérifie ton token.');
    }
    setIsChecking(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl border-2 border-orange-500 max-w-sm w-full shadow-2xl p-6">
        <h2 className="text-xl font-black text-orange-400 mb-1 flex items-center gap-2">
          🔐 Accès Administration
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Ton prénom sera affiché aux autres admins. Le token sera oublié à la fermeture.
        </p>
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            {['Alain', 'Bob', 'Dav', 'Christophe'].map(n => (
              <button key={n} type="button" onClick={() => { setName(n); setError(''); }}
                className={`py-3 rounded-xl font-black text-lg transition-all border-2 ${
                  name === n
                    ? 'bg-gradient-to-r from-orange-600 to-pink-600 border-orange-400 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-orange-500 hover:text-white'
                }`}>
                {n}
              </button>
            ))}
          </div>
          <input type="password" autoFocus value={token}
            onChange={e => { setToken(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none font-mono text-sm" />
        </div>
        {countdown > 0 && (
          <div className="mb-4 p-4 bg-gray-900 border-2 border-orange-500 rounded-xl text-center">
            <div className="text-sm text-gray-400 mb-1">
              {isPush ? `⏳ ${countdownAdmin} vient de pusher — vitrine en déploiement` : `⏳ ${countdownAdmin} vient de quitter l'admin`}
            </div>
            <div className="text-4xl font-black mb-1" style={{
              background: 'linear-gradient(180deg, #FF8C00 0%, #FFD700 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              {formatCountdown(countdown)}
            </div>
            <div className="text-xs text-gray-500">{isPush ? 'vitrine disponible dans...' : 'Réessaie dans...'}</div>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-500 rounded-xl text-red-300 text-sm">
            {error}
            {error.includes('déjà dans') && (
              <button onClick={handleForce} disabled={isChecking || !name.trim() || !token.trim()}
                className="mt-2 w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-all">
                Forcer l'accès quand même
              </button>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-all">Annuler</button>
          <button onClick={handleSubmit} disabled={!name.trim() || !token.trim() || isChecking || countdown > 0}
            className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2">
            {isChecking ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Vérif...</> : 'Entrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function HyperBatMediaSite(): JSX.Element {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [showRecapPanel, setShowRecapPanel] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('manage');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string>('');
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [showPushFromClose, setShowPushFromClose] = useState<boolean>(false);
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
  const handleCartRemove = useCallback((key: string) => setCart(prev => prev.filter(t => getThemeKey(t) !== key)), []);
  const handleCartClear = useCallback(() => setCart([]), []);

  const { themes: rawThemes, setThemes, isLoading, saveThemes } = useThemeStorage();
  const systemsLogic = useSystemsLogic();
  const colors = useMemo(() => getThemeColors(isDarkMode), [isDarkMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Lecture des query params URL au premier chargement
  // ?system=snes        → filtre sur le système
  // ?search=mario       → pré-remplit la recherche
  // ?category=...       → filtre sur une catégorie
  // ?retrobat=1         → mode RetroBat (affiche bouton "Installer dans RetroBat")
  // ─────────────────────────────────────────────────────────────────────────
  const [isRetrobat, setIsRetrobat] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam   = params.get('search');
    const systemParam   = params.get('system');
    const categoryParam = params.get('category');
    const retrobatParam = params.get('retrobat');

    if (searchParam) setSearchTerm(searchParam);

    if (systemParam) {
      const normalized = systemParam.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const found = systemsLogic.systems.find(s => {
        const parts = s.id.split('-');
        const idTail = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]+/g, '');
        const idFull = s.id.toLowerCase().replace(/[^a-z0-9]+/g, '');
        return idTail === normalized || idFull === normalized;
      });
      if (found) systemsLogic.handleSystemSelect(found.id);
    }

    if (categoryParam) systemsLogic.setSelectedCategory(categoryParam);

    // Mode RetroBat : remplace le bouton Télécharger par "Installer dans RetroBat"
    if (retrobatParam === '1') setIsRetrobat(true);

    // Nettoie l'URL après lecture
    if (searchParam || systemParam || categoryParam || retrobatParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const multiThemes        = themes.filter(t => t.isMulti === true).length;
    const collectionThemes   = themes.filter(t => (t.system === 'collectionspersonnalises' || t.system === 'Collections Personnalisées') && t.category !== 'artwork').length;
    const artworkThemes      = themes.filter(t => t.category === 'artwork').length;
    const gameThemes         = themes.filter(t => t.category === 'game-themes').length;
    const systemThemes       = themes.filter(t => t.category === 'system-themes').length;
    const defaultThemes      = themes.filter(t => t.category === 'default-themes').length;
    const magazineThemes     = themes.filter(t => t.system === 'magazines').length;
    const screenScraperThemes = themes.filter(t => t.category === 'game-themes' && t.onScreenScraper === true).length;
    const gameThemesTotal    = themes.filter(t => t.category === 'game-themes').length;
    const total              = themes.length;
    return { multiThemes, collectionThemes, artworkThemes, gameThemes, systemThemes, defaultThemes, magazineThemes, screenScraperThemes, gameThemesTotal, total };
  }, [themes]);

  const missingSystemsCount = useMemo(() => {
    const bobSystems = bobSystemsData as { slug: string }[];
    const allThemeSlugs = [...new Set(themes.map(t => t.system))];
    const bobSlugToThemeSlugs = new Map<string, string[]>();
    for (const themeSlug of allThemeSlugs) {
      const bobSlug = resolveBobSlug(themeSlug);
      if (!bobSlug) continue;
      if (!bobSlugToThemeSlugs.has(bobSlug)) bobSlugToThemeSlugs.set(bobSlug, []);
      bobSlugToThemeSlugs.get(bobSlug)!.push(themeSlug);
    }
    return bobSystems.filter(sys => {
      const matchingSlugs = bobSlugToThemeSlugs.get(sys.slug) ?? [sys.slug];
      return themes.filter(t => matchingSlugs.includes(t.system)).length === 0;
    }).length;
  }, [themes]);

  const handleSearchChange = (value: string) => {
    if (value.toLowerCase() === 'canafloche') {
      setSearchTerm('');
      setShowLoginModal(true);
    } else {
      setSearchTerm(value);
    }
  };

  const handleLoginConfirm = (_name: string, token: string) => {
    setAdminToken(token);
    setShowLoginModal(false);
    setShowAdminPanel(true);
  };

  const handleLoginCancel = () => setShowLoginModal(false);

  const releaseLock = async (token: string): Promise<boolean> => {
    const adminName = localStorage.getItem('hyperbat_admin_name') || 'Admin';
    const result = await writeLock(token, adminName, false, COOLDOWN_CLOSE_SECONDS);
    if (!result.ok) {
      console.error('releaseLock failed:', result.error);
      alert(`⚠️ Impossible de libérer le verrou :\n${result.error}\n\nLe verrou restera actif sur GitHub.`);
      return false;
    }
    return true;
  };

  const clearCooldown = () => {
    localStorage.removeItem('hyperbat_cooldown');
    window.dispatchEvent(new CustomEvent('hyperbat-close-admin'));
  };

  const filteredThemes = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return themes
      .filter(theme => {
        const systemName = systemsLogic.systems.find(s => s.id === theme.system)?.name || theme.system;
        const matchesSearch =
          theme.name.toLowerCase().includes(searchLower) ||
          theme.creator.toLowerCase().includes(searchLower) ||
          systemName.toLowerCase().includes(searchLower);
        const matchesSystem   = matchSystemId(theme.system, systemsLogic.selectedSystem);
        const matchesCategory =
          systemsLogic.selectedCategory === 'all'          ? true :
          systemsLogic.selectedCategory === 'collection'   ? (theme.system === 'collectionspersonnalises' && theme.category !== 'artwork') :
          systemsLogic.selectedCategory === 'screenscraper'? theme.onScreenScraper === true :
          systemsLogic.selectedCategory === 'multi'        ? theme.isMulti === true :
          systemsLogic.selectedCategory === 'magazines'    ? (theme.system === 'magazines') :
          theme.category === systemsLogic.selectedCategory;
        return matchesSearch && matchesSystem && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const parseDate = (d: string | undefined) => {
            if (!d) return 0;
            if (d.includes('-')) return new Date(d).getTime();
            return new Date(d.split('/').reverse().join('-')).getTime();
          };
          const dA = parseDate(a.date), dB = parseDate(b.date);
          if (dA === 0 && dB === 0) return b.id - a.id;
          if (dA !== dB) { if (dA === 0) return 1; if (dB === 0) return -1; return dB - dA; }
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
  }, [searchTerm, systemsLogic.selectedSystem, systemsLogic.selectedCategory, themes, sortBy, systemsLogic.systems]);

  const paginatedThemes = useMemo(() => {
    const start = (currentPage - 1) * THEMES_PER_PAGE;
    return filteredThemes.slice(start, start + THEMES_PER_PAGE);
  }, [filteredThemes, currentPage]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredThemes.length / THEMES_PER_PAGE)), [filteredThemes.length]);

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
          </div>
        </header>

        {showAdminPanel && (
          <div style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#450a0a', border: '1.5px solid #dc2626', borderRadius: '8px', maxWidth: '600px', margin: '8px auto' }}>
            <div>
              <div style={{ color: 'white', fontSize: '15px', fontWeight: 500 }}>
                {localStorage.getItem('hyperbat_admin_name') || 'Admin'} — mode admin
              </div>
              <div style={{ color: '#fca5a5', fontSize: '12px' }}>⚠ Ne laisse pas l'admin ouvert sans surveillance</div>
            </div>
            <button onClick={() => setShowCloseModal(true)}
              style={{ background: '#dc2626', color: 'white', border: '2px solid #f87171', borderRadius: '8px', padding: '10px 24px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              className="hover:brightness-110 transition-all">
              <LogOut className="w-5 h-5" />Quitter l'admin
            </button>
          </div>
        )}

        <div className="container mx-auto px-4 py-4">
          {!showAdminPanel && (
            <>
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                {[
                  { id: 'multi',          label: 'Multi-région',    count: themeStats.multiThemes,         icon: '🌍' },
                  { id: 'screenscraper',  label: 'ScreenScraper',   count: themeStats.screenScraperThemes, total: themeStats.gameThemesTotal, special: true },
                  { id: 'magazines',      label: 'Magazines',       count: themeStats.magazineThemes,      icon: '📰' },
                  { id: 'collection',     label: 'Collection',      count: themeStats.collectionThemes,    Icon: Package },
                  { id: 'artwork',        label: 'Artwork',         count: themeStats.artworkThemes,       Icon: Image },
                  { id: 'game-themes',    label: 'Thèmes de jeux',  count: themeStats.gameThemes,          Icon: Trophy },
                  { id: 'system-themes',  label: 'Thèmes système',  count: themeStats.systemThemes,        Icon: Monitor },
                  { id: 'default-themes', label: 'Thèmes default',  count: themeStats.defaultThemes,       Icon: Star },
                  { id: 'all',            label: 'Total global',    count: themeStats.total,               Icon: BarChart3 },
                ].map(({ id, label, count, special, icon, Icon, total }) => (
                  <button key={id}
                    onClick={() => { systemsLogic.handleSystemSelect('all'); systemsLogic.setSelectedCategory(id); }}
                    className="px-7 py-0.5 rounded-lg border-2 flex items-center gap-1 transition hover:brightness-110 cursor-pointer"
                    style={{
                      background: special ? '#2a2a2a' : id === 'multi'
                        ? systemsLogic.selectedCategory === 'multi' ? 'linear-gradient(to right, #7e22ce, #be185d)' : 'linear-gradient(to right, #6b21a8, #9d174d)'
                        : '#D97706',
                      borderColor: systemsLogic.selectedCategory === id ? '#FFFF00' : id === 'multi' ? '#c084fc' : '#FFD700',
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
                      <p className="text-xs font-black" style={{ color: '#e0e0e0' }}>{total ? `${count}/${total}` : count}</p>
                    </div>
                  </button>
                ))}
              </div>

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
                  <button onClick={() => setCartOpen(true)}
                    className="relative p-3 rounded-lg transition border-2 flex items-center gap-2 hover:brightness-110"
                    style={{ backgroundColor: cart.length > 0 ? '#FF8C00' : colors.cardBg, borderColor: cart.length > 0 ? '#FFD700' : '#4b5563', color: cart.length > 0 ? 'white' : '#FFA500' }}
                    title="Ouvrir le panier">
                    <Download className="w-5 h-5" />
                    {cart.length > 0 && (
                      <>
                        <span className="text-xs font-bold">{cart.length}/{CART_MAX}</span>
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-black flex items-center justify-center"
                          style={{ backgroundColor: '#FFD700', color: '#1a1a1a' }}>{cart.length}</span>
                      </>
                    )}
                  </button>
                </div>
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

              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-3 border mr-auto w-[360px]"
                style={{ backgroundColor: isDarkMode ? '#0d0d1a' : '#fef2f2', borderColor: isDarkMode ? '#1f2937' : '#fecaca' }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black" style={{ color: '#ef4444' }}>{missingSystemsCount}</span>
                  <span className="text-sm" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    système{missingSystemsCount > 1 ? 's' : ''} sans thème
                  </span>
                </div>
                <button onClick={() => setShowRecapPanel(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs border-2 transition hover:brightness-110"
                  style={{ backgroundColor: '#cc6f00', borderColor: '#b8960a', color: 'white' }}>
                  Voir le récap
                </button>
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
                      {systemsLogic.selectedCategory === 'all'    ? 'Toutes les catégories' :
                       systemsLogic.selectedCategory === 'multi'  ? '🌍 Multi-région' :
                       categories.find(c => c.id === systemsLogic.selectedCategory)?.name || systemsLogic.selectedCategory}
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
                <AdminPanel themes={rawThemes} setThemes={setThemes} saveThemes={saveThemes}
                  systems={systemsLogic.systems} categories={categories}
                  adminTab={adminTab} setAdminTab={setAdminTab} />
              )}
              {!showAdminPanel && (
                <ThemeList viewMode={viewMode} themes={paginatedThemes}
                  allFilteredThemes={filteredThemes} filteredThemesLength={filteredThemes.length}
                  totalPages={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage}
                  themesPerPage={THEMES_PER_PAGE} systems={systemsLogic.systems}
                  cart={cart} onCartAdd={handleCartAdd} onCartRemove={handleCartRemove} onCartOpen={() => setCartOpen(true)}
                  sidebarCollapsed={sidebarCollapsed}
                  isRetrobat={isRetrobat} />
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

      {showCloseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl border-2 border-red-500 max-w-sm w-full shadow-2xl p-6">
            <h2 className="text-xl font-black text-red-400 mb-2 flex items-center gap-2">
              <LogOut className="w-6 h-6" /> Fermer l'administration
            </h2>
            <p className="text-gray-300 text-sm mb-6">Tu as fini tes modifications ?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowCloseModal(false); setShowPushFromClose(true); }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                🚀 Pusher maintenant puis quitter
              </button>
              <button onClick={async () => {
                  setShowCloseModal(false);
                  const ok = await releaseLock(adminToken);
                  if (ok) { clearCooldown(); setAdminToken(''); setShowAdminPanel(false); }
                }}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg font-bold transition-all">
                Quitter sans pusher
              </button>
            </div>
          </div>
        </div>
      )}

      {showPushFromClose && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl border-2 border-purple-500 max-w-md w-full shadow-2xl p-6">
            <h2 className="text-xl font-black text-purple-400 mb-2 flex items-center gap-2">🚀 Push GitHub</h2>
            <p className="text-gray-400 text-sm mb-1">
              Connecté en tant que : <span className="text-orange-400 font-bold">{localStorage.getItem('hyperbat_admin_name') || 'Admin'}</span>
            </p>
            <p className="text-gray-400 text-sm mb-4">Le token entré à l'ouverture sera utilisé. Un cooldown de 3 min démarrera ensuite.</p>
            <div className="flex gap-3">
              <button onClick={async () => {
                  setShowPushFromClose(false);
                  const ok = await releaseLock(adminToken);
                  if (ok) { clearCooldown(); setAdminToken(''); setShowAdminPanel(false); }
                }}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold">
                Quitter sans pusher
              </button>
              <button onClick={() => {
                  setShowPushFromClose(false);
                  setShowAdminPanel(false);
                  window.dispatchEvent(new CustomEvent('hyperbat-push-request', { detail: { token: adminToken } }));
                  setAdminToken('');
                }}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all">
                🚀 Pusher
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && <AdminLoginModal onConfirm={handleLoginConfirm} onCancel={handleLoginCancel} />}

      {cartOpen && (
        <CartPanel cart={cart} onRemove={handleCartRemove} onClear={handleCartClear}
          onClose={() => setCartOpen(false)} systems={systemsLogic.systems} isDarkMode={isDarkMode} />
      )}

      {showRecapPanel && (
        <RecapThemesPanel themes={themes} onClose={() => setShowRecapPanel(false)} isDarkMode={isDarkMode} />
      )}
    </div>
  );
}
