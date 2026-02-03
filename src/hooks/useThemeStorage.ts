// Fichier: src/hooks/useThemeStorage.ts
import { useState, useEffect } from 'react';
import { ThemeItem } from '../types';
import themesData from '../data/themes.json';

interface UseThemeStorageResult {
  themes: ThemeItem[];
  setThemes: React.Dispatch<React.SetStateAction<ThemeItem[]>>;
  isLoading: boolean;
  saveThemes: (newThemes: ThemeItem[]) => Promise<void>;
}

// 🔴 FONCTION HELPER : CLONAGE PROFOND
const deepCloneThemes = (themes: ThemeItem[]): ThemeItem[] => {
  return themes.map(theme => ({
    id: theme.id,
    name: theme.name,
    creator: theme.creator,
    system: theme.system,
    category: theme.category,
    imageUrl: theme.imageUrl,
    downloadUrl: theme.downloadUrl,
    size: theme.size,
    date: theme.date,
    onScreenScraper: theme.onScreenScraper  // ✅ AJOUTÉ
  }));
};

export function useThemeStorage(): UseThemeStorageResult {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 🔴 FONCTION DE SAUVEGARDE : localStorage pour admin uniquement
  const saveThemes = async (newThemes: ThemeItem[]) => {
    try {
      // ✅ CLONER PROFONDÉMENT pour éviter les références partagées
      const clonedThemes = deepCloneThemes(newThemes);
      
      // Sauvegarde dans localStorage (temporaire pour tests admin)
      localStorage.setItem('hyperbat_themes', JSON.stringify(clonedThemes));
      
      console.log('✅ Thèmes sauvegardés dans localStorage (temporaire admin)');
      console.log('💡 Pour mettre à jour le site, téléchargez le JSON et remplacez src/data/themes.json');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // 🎯 CHARGEMENT AVEC NOUVELLE LOGIQUE
  useEffect(() => {
    const loadThemes = async () => {
      setIsLoading(true);
      try {
        // 1️⃣ PRIORITÉ : Fichier JSON bundlé (SOURCE DE VÉRITÉ)
        if (themesData && Array.isArray(themesData)) {
          // Cast explicite pour TypeScript
          const typedThemes = themesData as ThemeItem[];
          // 🔴 CLONER pour éviter les mutations du JSON importé
          const clonedThemes = deepCloneThemes(typedThemes);
          setThemes(clonedThemes);
          console.log(`⚡ ${clonedThemes.length} thème(s) chargé(s) depuis themes.json (source officielle)`);
          
          // 🔄 Nettoyer localStorage si thèmes obsolètes
          // Cela force les visiteurs à toujours voir la version officielle
          const storedThemes = localStorage.getItem('hyperbat_themes');
          if (storedThemes) {
            console.log('🧹 localStorage détecté (probablement admin) - themes.json reste la source');
          }
        } else {
          // Fichier vide ou invalide
          setThemes([]);
          console.log('ℹ️ Aucun thème trouvé dans themes.json (fichier vide ou invalide)');
        }

      } catch (error) {
        console.error('❌ Erreur lors du chargement:', error);
        // En cas d'erreur, initialiser avec tableau vide
        setThemes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemes();
  }, []);

  return { themes, setThemes, isLoading, saveThemes };
}