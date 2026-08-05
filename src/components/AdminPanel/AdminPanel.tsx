import { Dispatch, SetStateAction, FC } from 'react';
import {
  Edit2,
  FolderOpen,
  RefreshCw,
  Database,
  Package,
  LucideIcon
} from 'lucide-react';
import { ThemeItem, SystemRow, Category, ThemePacksData } from '../../types';
import ManageTab from './ManageTab';
import DriveTab from './DriveTab';
import SyncTab from './SyncTab';
import ScreenScraperSyncTab from './ScreenScraperSyncTab';
import ThemePacksTab from './ThemePacksTab';
import { extractDriveFileId, isUnknownCreator } from './DriveTab/DriveHelpers';

export type AdminTab = 'manage' | 'drive-import' | 'sync' | 'screenscraper-sync' | 'theme-packs';

interface AdminPanelProps {
  themes: ThemeItem[];
  setThemes: Dispatch<SetStateAction<ThemeItem[]>>;
  saveThemes: (themes: ThemeItem[]) => Promise<void>;
  systems: SystemRow[];
  categories: Category[];
  adminTab: AdminTab;
  setAdminTab: Dispatch<SetStateAction<AdminTab>>;
  packsData: ThemePacksData;
  setPacksData: Dispatch<SetStateAction<ThemePacksData>>;
  savePacksData: (data: ThemePacksData) => Promise<void>;
}

interface TabButtonProps {
  tab: AdminTab;
  currentTab: AdminTab;
  setAdminTab: Dispatch<SetStateAction<AdminTab>>;
  icon: LucideIcon;
  label: string;
}

const TabButton: FC<TabButtonProps> = ({
  tab,
  currentTab,
  setAdminTab,
  icon: Icon,
  label
}) => (
  <button
    type="button"
    onClick={() => setAdminTab(tab)}
    className={`
      px-4 py-2 rounded-full font-bold transition-all flex items-center gap-2
      ${
        currentTab === tab
          ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/50'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
      }
    `}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

const AdminPanel: FC<AdminPanelProps> = ({
  themes,
  setThemes,
  saveThemes,
  systems,
  categories,
  adminTab,
  setAdminTab,
  packsData,
  setPacksData,
  savePacksData,
}) => {

  const handleImportThemes = async (newThemes: ThemeItem[]): Promise<void> => {
    let maxId = 0;
    for (const t of themes) {
      if (t.id > maxId) maxId = t.id;
    }
    let nextId = maxId + 1;

    const makeKey = (t: ThemeItem) =>
      `${t.name.toLowerCase().trim()}|${t.system}|${extractDriveFileId(t.downloadUrl)}`;

    const themeMap = new Map<string, ThemeItem>();
    const idMap = new Map<number, ThemeItem>();

    for (const theme of themes) {
      const key = makeKey(theme);
      themeMap.set(key, theme);
      idMap.set(theme.id, theme);
    }

    for (const incoming of newThemes) {
      const key = makeKey(incoming);
      const existing = themeMap.get(key);

      if (existing) {
        const existingIsValid = !isUnknownCreator(existing.creator);
        const incomingIsValid = !isUnknownCreator(incoming.creator);

        let finalCreator = existing.creator;

        if (!existingIsValid && incomingIsValid) {
          finalCreator = incoming.creator;
        }

        const merged: ThemeItem = {
          ...existing,
          creator: finalCreator,
          size: incoming.size || existing.size,
          imageUrl: incoming.imageUrl || existing.imageUrl,
          category: incoming.category || existing.category,
          downloadUrl: incoming.downloadUrl || existing.downloadUrl,
          // On garde la date déjà connue une fois posée : "date" = date d'ajout au
          // catalogue, pas "dernière modif du fichier sur Drive" (qui bouge si le
          // fichier est remplacé en place, ex: thèmes défaut retouchés à la main).
          date: existing.date || incoming.date,
          onScreenScraper: incoming.onScreenScraper ?? existing.onScreenScraper ?? false,
          isMulti: incoming.isMulti ?? existing.isMulti ?? false,
        };

        themeMap.set(key, merged);
        idMap.set(merged.id, merged);
        continue;
      }

      const safeId = incoming.id && !idMap.has(incoming.id) ? incoming.id : nextId++;

      const newTheme: ThemeItem = {
        ...incoming,
        id: safeId
      };

      themeMap.set(key, newTheme);
      idMap.set(safeId, newTheme);
    }

    const updatedThemes = Array.from(themeMap.values());

    await saveThemes(updatedThemes);
    setThemes(updatedThemes);
  };

  const handleDeleteThemes = async (themeIds: number[]): Promise<void> => {
    const updatedThemes = themes.filter(theme => !themeIds.includes(theme.id));
    await saveThemes(updatedThemes);
    setThemes(updatedThemes);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 border-b border-gray-700 pb-3 text-orange-400">
          Panneau d&apos;Administration
        </h1>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-700 pb-4">
          <TabButton tab="manage" currentTab={adminTab} setAdminTab={setAdminTab} icon={Edit2} label="Gérer" />
          <TabButton tab="drive-import" currentTab={adminTab} setAdminTab={setAdminTab} icon={FolderOpen} label="Import Drive" />
          <TabButton tab="sync" currentTab={adminTab} setAdminTab={setAdminTab} icon={RefreshCw} label="Synchronisation" />
          <TabButton tab="screenscraper-sync" currentTab={adminTab} setAdminTab={setAdminTab} icon={Database} label="ScreenScraper Sync" />
          <TabButton tab="theme-packs" currentTab={adminTab} setAdminTab={setAdminTab} icon={Package} label="Packs mensuels" />
        </div>

        {adminTab === 'theme-packs' && (
          <ThemePacksTab
            packsData={packsData}
            setPacksData={setPacksData}
            savePacksData={savePacksData}
          />
        )}

        {adminTab === 'manage' && (
          <ManageTab
            themes={themes}
            setThemes={setThemes}
            saveThemes={saveThemes}
            systems={systems}
            categories={categories}
          />
        )}

        {adminTab === 'drive-import' && (
          <DriveTab
            onImportThemes={handleImportThemes}
            existingThemes={themes}
          />
        )}

        {adminTab === 'sync' && (
          <SyncTab
            existingThemes={themes}
            onDeleteThemes={handleDeleteThemes}
          />
        )}

        {adminTab === 'screenscraper-sync' && (
          <ScreenScraperSyncTab
            themes={themes}
            onUpdateThemes={async (updatedThemes) => {
              await saveThemes(updatedThemes);
              setThemes(updatedThemes);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
