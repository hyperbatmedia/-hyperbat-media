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

export function useThemeStorage(): UseThemeStorageResult {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fonction de sauvegarde: localStorage uniquement (pour édition temporaire)
  const saveThemes = async (newThemes: ThemeItem[]) => {
    try {
      // ✅ SÉCURISÉ : Sauvegarde uniquement dans localStorage
      // Pour mettre à jour le site, utilisez le bouton "Télécharger JSON" dans l'admin
      localStorage.setItem('hyperbat_themes', JSON.stringify(newThemes));
      console.log('✅ Thèmes sauvegardés dans localStorage');
      console.log('💡 Pour mettre à jour le site, téléchargez le JSON et remplacez src/data/themes.json');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Chargement initial des thèmes
  useEffect(() => {
    const loadThemes = async () => {
      setIsLoading(true);
      try {
        // 1️⃣ PRIORITÉ : localStorage (éditions temporaires en admin)
        const storedThemes = localStorage.getItem('hyperbat_themes');
        if (storedThemes) {
          const parsedThemes: ThemeItem[] = JSON.parse(storedThemes);
          setThemes(parsedThemes);
          console.log(`📦 ${parsedThemes.length} thème(s) chargé(s) depuis localStorage (édition admin)`);
          setIsLoading(false);
          return;
        }

        // 2️⃣ FALLBACK : Fichier JSON bundlé (source de vérité)
        if (themesData && Array.isArray(themesData)) {
          // Cast explicite pour TypeScript
          const typedThemes = themesData as ThemeItem[];
          setThemes(typedThemes);
          console.log(`⚡ ${typedThemes.length} thème(s) chargé(s) depuis themes.json (instantané)`);
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