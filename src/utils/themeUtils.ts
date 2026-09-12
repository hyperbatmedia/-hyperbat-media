// Fichier: src/utils/themeUtils.ts
import { ThemeItem } from '../types';

/**
 * Génère une clé unique pour un thème, utilisée pour le panier (savoir si un
 * thème y est déjà, le cocher/décocher, l'ajouter/le retirer).
 *
 * Utilise l'id numérique du thème (unique et stable dans les données), pas
 * son nom+système : plusieurs thèmes différents peuvent partager le même nom
 * pour le même système (ex: un thème "système" et un thème "par défaut" tous
 * les deux nommés "atari5200") — les distinguer par nom+système les aurait
 * fait entrer en collision dans le panier.
 */
export const getThemeKey = (theme: ThemeItem): string => 
  String(theme.id);