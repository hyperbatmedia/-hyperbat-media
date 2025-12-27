// Fichier: src/utils/themeUtils.ts
import { ThemeItem } from '../types';

/**
 * Génère une clé unique pour un thème basée sur son nom et son système
 */
export const getThemeKey = (theme: ThemeItem): string => 
  `${theme.name}-${theme.system}`;