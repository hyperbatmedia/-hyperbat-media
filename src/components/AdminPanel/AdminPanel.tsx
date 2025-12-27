import React from 'react';
import { Plus, Edit2, FileJson, Gamepad2, FolderOpen, LucideIcon } from 'lucide-react';
import { ThemeItem, SystemRow, Category, NewThemeForm } from '../../types';
import AddTab from './AddTab';
import ManageTab from './ManageTab';
import ImportTab from './ImportTab';
import SystemsTab from './SystemsTab';
import DriveTab from './DriveTab';

export type AdminTab = 'add' | 'manage' | 'systems' | 'import' | 'drive-import';

interface AdminPanelProps {
  themes: ThemeItem[];
  setThemes: React.Dispatch<React.SetStateAction<ThemeItem[]>>;
  saveThemes: (themes: ThemeItem[]) => Promise<void>;
  systems: SystemRow[];
  categories: Category[];
  adminTab: AdminTab;
  setAdminTab: React.Dispatch<React.SetStateAction<AdminTab>>;
  newTheme: NewThemeForm;
  setNewTheme: React.Dispatch<React.SetStateAction<NewThemeForm>>;
  handleAddTheme: () => Promise<void>;
  handleDeleteTheme: (themeKey: string) => Promise<void>; // ✅ CORRIGÉ: string au lieu de number
  convertGoogleDriveUrl: (url: string, isImage?: boolean) => string;
}

interface TabButtonProps {
  tab: AdminTab;
  currentTab: AdminTab;
  setAdminTab: React.Dispatch<React.SetStateAction<AdminTab>>;
  icon: LucideIcon;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, currentTab, setAdminTab, icon: Icon, label }) => (
  <button
    type="button"
    onClick={() => setAdminTab(tab)}
    className={`
      px-4 py-2 rounded-full font-bold transition-all flex items-center gap-2
      ${currentTab === tab
        ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/50'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
      }
    `}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

const AdminPanel: React.FC<AdminPanelProps> = ({
  themes,
  setThemes,
  saveThemes,
  systems,
  categories,
  adminTab,
  setAdminTab,
  newTheme,
  setNewTheme,
  handleAddTheme,
  handleDeleteTheme,
  convertGoogleDriveUrl,
}) => {
  const handleImportThemes = async (newThemes: ThemeItem[]): Promise<void> => {
    const updatedThemes = [...themes, ...newThemes];
    await saveThemes(updatedThemes);
    setThemes(updatedThemes);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 border-b border-gray-700 pb-3 text-orange-400">
          Panneau d'Administration
        </h1>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-700 pb-4">
          <TabButton tab="add" currentTab={adminTab} setAdminTab={setAdminTab} icon={Plus} label="Ajouter" />
          <TabButton tab="manage" currentTab={adminTab} setAdminTab={setAdminTab} icon={Edit2} label="Gérer" />
          <TabButton tab="import" currentTab={adminTab} setAdminTab={setAdminTab} icon={FileJson} label="Importer JSON" />
          <TabButton tab="drive-import" currentTab={adminTab} setAdminTab={setAdminTab} icon={FolderOpen} label="Import Drive" />
          <TabButton tab="systems" currentTab={adminTab} setAdminTab={setAdminTab} icon={Gamepad2} label="Systèmes" />
        </div>

        {adminTab === 'add' && (
          <AddTab
            newTheme={newTheme}
            setNewTheme={setNewTheme}
            handleAddTheme={handleAddTheme}
            systems={systems}
            categories={categories}
            convertGoogleDriveUrl={convertGoogleDriveUrl}
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

        {adminTab === 'import' && (
          <ImportTab
            themes={themes}
            setThemes={setThemes}
            saveThemes={saveThemes}
            systems={systems}
            categories={categories}
            setAdminTab={setAdminTab}
            convertGoogleDriveUrl={convertGoogleDriveUrl}
          />
        )}

        {adminTab === 'systems' && (
          <SystemsTab />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;