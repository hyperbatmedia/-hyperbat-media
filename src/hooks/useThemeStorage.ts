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
    onScreenScraper: theme.onScreenScraper,  // ✅ AJOUTÉ
    isMulti: theme.isMulti
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
        } else {
          // Fichier vide ou invalide
          setThemes([]);
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