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
    bg: '#0060A8',         // Bleu Sega officiel (international)
    border: '#008DD0',     // Bleu Sega officiel (Japon) - utilisé comme accent
    hover: '#004D87', 
    text: '#FFFFFF', 
    chevronColor: '#008DD0',
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
  },

  snk: {
    keywords: ['snk'],
    bg: '#0D0D0D',        // Noir (identité Neo Geo)
    border: '#0096DF',    // Bleu SNK officiel
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#0096DF',
    selectedText: '#FFFFFF'
  },

  konami: {
    keywords: ['konami'],
    bg: '#FFFFFF',        // Blanc
    border: '#BF0021',    // Rouge Konami officiel (Pantone 485 C)
    hover: '#F0F0F0',
    text: '#BF0021',
    chevronColor: '#BF0021',
    unselectedText: '#BF0021',
    selectedText: '#BF0021'
  },

  microsoft: {
    keywords: ['microsoft', 'xbox'],
    bg: '#000000',        // Noir (identité Xbox)
    border: '#107C10',    // Vert Xbox officiel
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#107C10',
    selectedText: '#FFFFFF'
  },

  sony: {
    keywords: ['sony', 'playstation'],
    bg: '#003791',        // Bleu PlayStation officiel (logo historique)
    border: '#0070D1',
    hover: '#002960',
    text: '#FFFFFF',
    chevronColor: '#0070D1',
    selectedText: '#FFFFFF'
  },

  actionmax: {
    keywords: ['action max', 'actionmax'],
    bg: '#0A1929',         // Bleu nuit métallique (fond du logo original)
    border: '#40C4FF',     // Bleu laser (rayon du logo)
    hover: '#132F45',
    text: '#FFFFFF',
    chevronColor: '#40C4FF',
    selectedText: '#FFFFFF'
  },

  atari: {
    keywords: ['atari'],
    bg: '#0D0D0D',          // Noir (identité cabinet arcade vintage)
    border: '#E4202E',      // Rouge Atari officiel
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#E4202E',
    selectedText: '#FFFFFF'
  },

  dragon: {
    keywords: ['dragon 32', 'dragon 64', 'dragon data'],
    bg: '#000000',          // Noir (étiquette d'origine Dragon 32/64)
    border: '#E31E24',      // Rouge du dragon stylisé sur le logo
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#E31E24',
    selectedText: '#FFFFFF'
  },

  atlus: {
    keywords: ['atlus'],
    bg: '#FFFFFF',
    border: '#2E5AAC',      // Bleu Atlus
    hover: '#F0F0F0',
    text: '#2E5AAC',
    chevronColor: '#ED1C24', // Rouge du "T"
    unselectedText: '#2E5AAC',
    selectedText: '#2E5AAC'
  },

  acorn: {
    keywords: ['acorn', 'atom', 'archimedes', 'bbc micro'],
    bg: '#FFFFFF',
    border: '#4A9B3E',      // Vert Acorn
    hover: '#F0F0F0',
    text: '#2E7D32',
    chevronColor: '#4A9B3E',
    unselectedText: '#2E7D32',
    selectedText: '#2E7D32'
  },

  atomiswave: {
    keywords: ['atomiswave'],
    bg: '#FFFFFF',            // Blanc, comme le vrai logo (fond transparent)
    border: '#C6641E',        // Orange-brun du dégradé du texte
    hover: '#F0F0F0',
    text: '#C6641E',
    chevronColor: '#8FD9C4',  // Vert menthe de l'accent diagonal
    unselectedText: '#C6641E',
    selectedText: '#C6641E'
  },

  nec: {
    keywords: ['nec', 'pc engine', 'turbografx', 'pc-fx', 'supergrafx'],
    bg: '#1414A0',            // Bleu/indigo officiel NEC
    border: '#FFFFFF',
    hover: '#0F0F78',
    text: '#FFFFFF',
    chevronColor: '#FFFFFF',
    selectedText: '#FFFFFF'
  },

  commodore64: {
    keywords: ['commodore 64', 'c64'],
    bg: '#000000',           // Noir (nod à l'écran de démarrage sombre)
    border: '#29ABE2',       // Bleu du bandeau arc-en-ciel C64
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#29ABE2',
    selectedText: '#FFFFFF'
  }
};

/**
 * Couleurs par défaut pour les systèmes non configurés
 */
export const DEFAULT_COLORS: SystemColorConfig = { 
  keywords: [],  // non utilisé pour le fallback, requis par l'interface
  bg: '#FF8C00',        // Orange
  border: '#FFD700',    // Or
  hover: '#E67E00', 
  text: '#FFFFFF',
  selectedText: '#FFFFFF'  // Blanc par défaut quand sélectionné
};

/**
 * Échappe les caractères spéciaux regex d'un mot-clé (utile pour les mots-clés
 * contenant des espaces, ex: 'game boy', 'x board')
 */
const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Teste si `text` contient `keyword` comme mot/segment isolé, et non comme
 * simple sous-chaîne. Empêche les faux positifs du type :
 *  - 'ds' (Nintendo DS) matchant à l'intérieur de "worlds" (home-worlds-actionmax)
 *  - 'n64' (Nintendo 64) matchant à l'intérieur de "dragon64" (Dragon 64)
 * \b s'appuie sur les frontières \w/non-\w : les tirets, espaces et underscores
 * utilisés dans les IDs (ex: "home-worlds-actionmax") créent bien ces frontières.
 */
const matchesKeyword = (text: string, keyword: string): boolean => {
  const pattern = new RegExp(`\\b${escapeRegExp(keyword.toLowerCase())}\\b`, 'i');
  return pattern.test(text);
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
      kw => matchesKeyword(nameLower, kw) || matchesKeyword(idLower, kw)
    );
    
    if (!hasMatch) continue;
    
    // Vérifier les exclusions (ex: éviter 'atari' pour les systèmes Sega)
    if (config.excludeKeywords?.some(
      kw => matchesKeyword(nameLower, kw) || matchesKeyword(idLower, kw)
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