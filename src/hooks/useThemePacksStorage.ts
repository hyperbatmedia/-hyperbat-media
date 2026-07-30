// Fichier: src/hooks/useThemePacksStorage.ts
import { useState, useEffect } from 'react';
import { ThemePacksData } from '../types';
import themePacksData from '../data/themePacks.json';

interface UseThemePacksStorageResult {
  packsData: ThemePacksData;
  setPacksData: React.Dispatch<React.SetStateAction<ThemePacksData>>;
  isLoading: boolean;
  savePacksData: (newData: ThemePacksData) => Promise<void>;
}

const EMPTY_DATA: ThemePacksData = { featuredMonth: '', packs: [] };

export function useThemePacksStorage(): UseThemePacksStorageResult {
  const [packsData, setPacksData] = useState<ThemePacksData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sauvegarde locale (temporaire, en attendant le Push GitHub depuis l'admin)
  const savePacksData = async (newData: ThemePacksData) => {
    try {
      const cloned: ThemePacksData = {
        featuredMonth: newData.featuredMonth,
        packs: newData.packs.map(p => ({ month: p.month, label: p.label, driveUrl: p.driveUrl, note: p.note ?? '' })),
      };
      localStorage.setItem('hyperbat_theme_packs', JSON.stringify(cloned));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des packs:', error);
      alert('Erreur lors de la sauvegarde des packs');
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        if (themePacksData && Array.isArray((themePacksData as ThemePacksData).packs)) {
          const typed = themePacksData as ThemePacksData;
          setPacksData({
            featuredMonth: typed.featuredMonth,
            packs: typed.packs.map(p => ({ month: p.month, label: p.label, driveUrl: p.driveUrl, note: p.note ?? '' })),
          });
        } else {
          setPacksData(EMPTY_DATA);
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des packs:', error);
        setPacksData(EMPTY_DATA);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return { packsData, setPacksData, isLoading, savePacksData };
}
