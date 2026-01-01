import React from 'react';
import {
  Plus,
  Edit2,
  FileJson,
  FolderOpen,
  LucideIcon
} from 'lucide-react';
import { ThemeItem, SystemRow, Category, NewThemeForm } from '../../types';
import AddTab from './AddTab';
import ManageTab from './ManageTab';
import ImportTab from './ImportTab';
import DriveTab from './DriveTab';

export type AdminTab =
  | 'add'
  | 'manage'
  | 'import'
  | 'drive-import';

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
  handleDeleteTheme: (themeKey: string) => Promise<void>;
  convertGoogleDriveUrl: (url: string, isImage?: boolean) => string;
}

interface TabButtonProps {
  tab: AdminTab;
  currentTab: AdminTab;
  setAdminTab: React.Dispatch<React.SetStateAction<AdminTab>>;
  icon: LucideIcon;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({
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
  convertGoogleDriveUrl
}) => {
  /**
   * ✅ VERSION CORRIGÉE COMPLÈTE AVEC GESTION INTELLIGENTE DES IDS
   * 
   * Logique de merge :
   * 1. Détection par clé (name + system + downloadUrl) ET par ID
   * 2. Préservation des corrections manuelles (créateurs édités)
   * 3. Enrichissement automatique des créateurs manquants
   * 4. Gestion des conflits avec priorité aux données existantes
   */
  const handleImportThemes = async (
    newThemes: ThemeItem[]
  ): Promise<void> => {
    console.log('🚀 Début import:', newThemes.length, 'thèmes');
    
    // ✅ 1️⃣ Calculer le prochain ID disponible
    let maxId = 0;
    if (themes.length > 0) {
      for (let i = 0; i < themes.length; i++) {
        if (themes[i].id > maxId) {
          maxId = themes[i].id;
        }
      }
    }
    console.log('📊 Max ID actuel:', maxId);
    
    // ✅ 2️⃣ Clé d'unicité : name + system + downloadUrl
    const makeKey = (t: ThemeItem) =>
      `${t.name.toLowerCase()}|${t.system}|${t.downloadUrl}`;

    // ✅ 3️⃣ Double indexation : par clé ET par ID
    const themeMap = new Map<string, ThemeItem>();
    const idMap = new Map<number, ThemeItem>();

    // Indexer les thèmes existants
    for (const theme of themes) {
      themeMap.set(makeKey(theme), theme);
      if (theme.id) {
        idMap.set(theme.id, theme);
      }
    }
    console.log('📇 Thèmes existants indexés:', themeMap.size);

    // ✅ 4️⃣ Traiter les thèmes importés avec logique intelligente
    let nextId = maxId + 1;
    let newCount = 0;
    let enrichedCount = 0;
    let preservedCount = 0;
    let conflictCount = 0;
    
    for (const incoming of newThemes) {
      const key = makeKey(incoming);
      
      // Vérifier existence par clé OU par ID
      const existingByKey = themeMap.get(key);
      const existingById = incoming.id ? idMap.get(incoming.id) : null;
      
      // Priorité à l'ID si disponible (plus fiable)
      const existing = existingById || existingByKey;

      if (!existing) {
        // ✅ NOUVEAU THÈME
        const newTheme: ThemeItem = {
          ...incoming,
          id: incoming.id || nextId++ // Garde l'ID si fourni, sinon génère
        };
        themeMap.set(key, newTheme);
        if (newTheme.id) idMap.set(newTheme.id, newTheme);
        newCount++;
        console.log('➕ Nouveau:', newTheme.name, '(ID:', newTheme.id, ')');
        
      } else {
        // ✅ THÈME EXISTANT - Merge intelligent
        
        // 🔍 Analyser les créateurs
        const existingCreator = existing.creator?.trim().toLowerCase();
        const incomingCreator = incoming.creator?.trim().toLowerCase();
        
        const existingIsValid = existingCreator && 
          existingCreator !== 'unknown' && 
          existingCreator !== 'inconnu' &&
          existingCreator.length > 0;
        
        const incomingIsValid = incomingCreator && 
          incomingCreator !== 'unknown' && 
          incomingCreator !== 'inconnu' &&
          incomingCreator.length > 0;
        
        let finalCreator = existing.creator;
        let action = 'keep';
        
        if (existingIsValid && !incomingIsValid) {
          // L'existant a un créateur valide, le nouveau non → GARDER
          finalCreator = existing.creator;
          action = 'preserve';
          preservedCount++;
          console.log('🛡️ Préservé:', existing.name, '→', existing.creator);
          
        } else if (!existingIsValid && incomingIsValid) {
          // Le nouveau a un créateur valide, l'existant non → ENRICHIR
          finalCreator = incoming.creator;
          action = 'enrich';
          enrichedCount++;
          console.log('✨ Enrichi:', existing.name, '→', incoming.creator);
          
        } else if (existingIsValid && incomingIsValid && existingCreator !== incomingCreator) {
          // CONFLIT : Les deux ont un créateur différent
          // → PRIORITÉ à l'existant (correction manuelle préservée)
          finalCreator = existing.creator;
          action = 'conflict';
          conflictCount++;
          console.warn('⚠️ Conflit:', existing.name, '| Gardé:', existing.creator, '| Ignoré:', incoming.creator);
          
        } else {
          // Même créateur ou les deux vides → Garder l'existant
          finalCreator = existing.creator;
        }
        
        // Merge final avec préservation de l'ID existant
        const merged: ThemeItem = {
          ...existing,
          creator: finalCreator,
          // Mettre à jour autres champs si nécessaire (mais garder ID existant)
          size: incoming.size || existing.size,
          imageUrl: incoming.imageUrl || existing.imageUrl,
          downloadUrl: incoming.downloadUrl || existing.downloadUrl,
          category: incoming.category || existing.category
        };
        
        themeMap.set(key, merged);
        if (merged.id) idMap.set(merged.id, merged);
      }
    }

    // ✅ 5️⃣ Sauvegarde finale
    const updatedThemes = Array.from(themeMap.values());

    console.log('📊 Résumé import:');
    console.log('  ➕ Nouveaux:', newCount);
    console.log('  ✨ Enrichis:', enrichedCount);
    console.log('  🛡️ Préservés:', preservedCount);
    console.log('  ⚠️ Conflits:', conflictCount);
    console.log('  📦 Total final:', updatedThemes.length);

    await saveThemes(updatedThemes);
    setThemes(updatedThemes);
    
    // Afficher un résumé à l'utilisateur
    const summary = [
      newCount > 0 ? `✅ ${newCount} nouveau(x)` : null,
      enrichedCount > 0 ? `✨ ${enrichedCount} enrichi(s)` : null,
      preservedCount > 0 ? `🛡️ ${preservedCount} préservé(s)` : null,
      conflictCount > 0 ? `⚠️ ${conflictCount} conflit(s) résolu(s)` : null
    ].filter(Boolean).join(' • ');
    
    console.log('✅ Import terminé:', summary);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-6 border-b border-gray-700 pb-3 text-orange-400">
          Panneau d&apos;Administration
        </h1>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-700 pb-4">
          <TabButton tab="add" currentTab={adminTab} setAdminTab={setAdminTab} icon={Plus} label="Ajouter" />
          <TabButton tab="manage" currentTab={adminTab} setAdminTab={setAdminTab} icon={Edit2} label="Gérer" />
          <TabButton tab="import" currentTab={adminTab} setAdminTab={setAdminTab} icon={FileJson} label="Importer JSON" />
          <TabButton tab="drive-import" currentTab={adminTab} setAdminTab={setAdminTab} icon={FolderOpen} label="Import Drive" />
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
            onImportThemes={handleImportThemes}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;