// Fichier: src/components/Sidebar/sidebar.colors.ts

export interface SystemColorConfig {
  keywords: string[];
  excludeKeywords?: string[];
  bg: string;
  border: string;
  hover: string;
  text?: string;
  chevronColor?: string;
  unselectedText?: string;
  selectedText?: string;  // Couleur du texte quand sélectionné
}

/**
 * Configuration des couleurs par constructeur/système
 * Chaque config définit les mots-clés de matching et le thème de couleur
 */
export const SYSTEM_COLORS: Record<string, SystemColorConfig> = {
  capcom: { 
    keywords: ['capcom', 'cps', 'cp system'], 
    bg: '#003D7A',        // Bleu Capcom
    border: '#FFD700',    // Or
    hover: '#002D5C', 
    text: '#FFFFFF', 
    chevronColor: '#FFD700',
    selectedText: '#FFFFFF'  // Blanc quand sélectionné
  },
  
  hbmame: {
    keywords: ['hbmame'],
    bg: '#00FF00',        // Vert vif HBMAME
    border: '#7FFF00',    // Vert chartreuse (bordure)
    hover: '#00CC00',     // Vert moyen au survol
    text: '#000000',      // Texte NOIR pour contraste sur fond vert vif
    chevronColor: '#000000',
    selectedText: '#000000',  // Texte noir quand sélectionné
    unselectedText: '#00FF00' // Vert quand non sélectionné
  },
  
  mame: { 
    keywords: ['mame'], 
    excludeKeywords: ['hbmame'], 
    bg: '#003D82',        // Bleu MAME
    border: '#00A3FF',    // Bleu clair
    hover: '#002D5C', 
    text: '#FFFFFF', 
    chevronColor: '#00A3FF',
    selectedText: '#FFFFFF'  // Blanc quand sélectionné
  },
  
  namco: { 
    keywords: [
      'namco', 'namcosystem2x6', 'namcosystem10', 'namcosystem11', 
      'namcosystem12', 'namcosystem21', 'namcosystem22', 'namcosystem23', 
      'namcosystem246', 'namcosystem256', 'namcosystemsuper256', 
      'namcosystem357', 'namcosystem369', 'namcosystemes1', 'namcosystemes2', 
      'namcosystemes3', 'namcosystemfl', 'namcosystemna1', 'namcosystemna2'
    ], 
    bg: '#FFFFFF',        // Blanc
    border: '#FFFFFF', 
    hover: '#F0F0F0', 
    text: '#E30613',      // Rouge Namco
    chevronColor: '#E30613', 
    unselectedText: '#E30613',  // Rouge quand NON sélectionné
    selectedText: '#E30613'     // Rouge quand sélectionné (FIX!)
  },
  
  sega: { 
    keywords: [
      'sega', 'g80', 'g-80', 'system 1', 'system 2', 'system 8', 'system 16', 
      'system 16a', 'system 16b', 'system 18', 'system 24', 'system 32', 
      'multi 32', 'system1', 'system2', 'system8', 'system16', 'system18', 
      'system24', 'system32', 'multi32', 'x board', 'y board', 'outrun', 
      'xboard', 'yboard', 'hang-on', 'space harrier', 'super scaler', 
      'model 1', 'model 2', 'model 3', 'model1', 'model2', 'model3', 
      'st-v', 'titan', 'stv', 'saturn arcade', 'naomi', 'naomi 2', 
      'naomi gd-rom', 'naomi2', 'naomigd', 'hikaru', 'chihiro', 'lindbergh', 
      'ringedge', 'ring edge', 'ringwide', 'ring wide', 'sega nu', 'nu system', 
      'seganu', 'alls', 'all.net', 'allnet', 'system sp', 'systemsp', 
      'system e', 'systeme', 'system c', 'systemc', 'system c-2', 'system c2', 
      'europa', 'europa-r', 'europar', 'genesis', 'megadrive', 'mega drive', 
      'saturn', 'dreamcast', 'master system', 'game gear', 'sg-1000', 'sg1000', 
      'sc-3000', 'sc3000', 'pico', 'beena', 'advanced pico', '32x', 'mega cd', 
      'sega cd', 'megacd', 'segacd', 'nomad'
    ], 
    excludeKeywords: ['atari'], 
    bg: '#001F5C',        // Bleu Sega
    border: '#00B0FF',    // Bleu clair Sega
    hover: '#001040', 
    text: '#FFFFFF', 
    chevronColor: '#00B0FF',
    selectedText: '#FFFFFF'  // Blanc quand sélectionné
  },
  
  nintendo: { 
    keywords: [
      'playchoice', 'vs system', 'nintendo', 'nes', 'famicom', 'snes', 'n64', 
      'gamecube', 'wii', 'switch', 'sufami', 'satellaview', 'msu1', 'game boy', 
      'gameboy', 'gba', 'gbc', 'virtual boy', 'pokémon mini', 'pokemon mini', 
      'ds', '3ds', 'game & watch', 'game and watch', 'game&watch'
    ], 
    excludeKeywords: ['mega drive', 'mega cd', 'megadrive', 'megacd', 'dragon'], 
    bg: '#FFFFFF',        // Blanc
    border: '#E60012',    // Rouge Nintendo
    hover: '#F0F0F0', 
    text: '#E60012', 
    chevronColor: '#E60012', 
    unselectedText: '#E60012',  // Rouge quand NON sélectionné
    selectedText: '#E60012'     // Rouge quand sélectionné (FIX!)
  }
};

/**
 * Couleurs par défaut pour les systèmes non configurés
 */
export const DEFAULT_COLORS: SystemColorConfig = { 
  keywords: [], 
  bg: '#FF8C00',        // Orange
  border: '#FFD700',    // Or
  hover: '#E67E00', 
  text: '#FFFFFF',
  selectedText: '#FFFFFF'  // Blanc par défaut quand sélectionné
};

/**
 * Détermine les couleurs à appliquer pour un système donné
 * @param systemId - ID du système (ex: 'nes', 'mame')
 * @param systemName - Nom du système (ex: 'Nintendo Entertainment System')
 * @returns Configuration de couleur correspondante
 */
export const getSystemColors = (systemId: string, systemName: string): SystemColorConfig => {
  const nameLower = systemName.toLowerCase();
  const idLower = systemId.toLowerCase();

  // Recherche d'une configuration correspondante
  for (const config of Object.values(SYSTEM_COLORS)) {
    const hasMatch = config.keywords.some(
      kw => nameLower.includes(kw.toLowerCase()) || idLower.includes(kw.toLowerCase())
    );
    
    if (!hasMatch) continue;
    
    // Vérifier les exclusions (ex: éviter 'atari' pour les systèmes Sega)
    if (config.excludeKeywords?.some(
      kw => nameLower.includes(kw.toLowerCase()) || idLower.includes(kw.toLowerCase())
    )) {
      continue;
    }
    
    return { 
      ...DEFAULT_COLORS, 
      ...config, 
      text: config.text || '#FFFFFF',
      selectedText: config.selectedText || '#FFFFFF'  // Assurer une valeur par défaut
    };
  }
  
  return DEFAULT_COLORS;
};