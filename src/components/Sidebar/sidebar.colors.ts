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
    border: '#3163B7',      // Bleu Atlus (extrait du vrai logo)
    hover: '#F0F0F0',
    text: '#3163B7',
    chevronColor: '#ED1C24', // Rouge du "T" (extrait du vrai logo)
    unselectedText: '#3163B7',
    selectedText: '#3163B7'
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
    bg: '#FFFFFF',
    border: '#F36917',        // Orange (extrait du vrai logo)
    hover: '#F0F0F0',
    text: '#F36917',
    chevronColor: '#599B77',  // Vert (extrait du vrai logo)
    unselectedText: '#F36917',
    selectedText: '#F36917'
  },

  nec: {
    keywords: ['nec', 'pc engine', 'turbografx', 'pc-fx', 'supergrafx'],
    bg: '#020202',
    border: '#C61717',        // Rouge PC Engine (extrait du vrai logo)
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#C61717',
    selectedText: '#FFFFFF'
  },

  taito: {
    keywords: ['taito'],
    bg: '#FFFFFF',
    border: '#127BCA',        // Bleu Taito (extrait du vrai logo)
    hover: '#F0F0F0',
    text: '#127BCA',
    chevronColor: '#4F4C4D',
    unselectedText: '#127BCA',
    selectedText: '#127BCA'
  },

  dataeast: {
    keywords: ['data east', 'dataeast'],
    bg: '#0D0D0D',
    border: '#E8B923',         // Or (bas du dégradé chromé du vrai logo)
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#7B93C4',   // Bleu (haut du dégradé chromé du vrai logo)
    selectedText: '#FFFFFF'
  },

  midway: {
    keywords: ['midway'],
    bg: '#000000',
    border: '#D63647',        // Rouge Midway (extrait du vrai logo)
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#D63647',
    selectedText: '#FFFFFF'
  },

  coleco: {
    keywords: ['coleco', 'colecovision'],
    bg: '#001B2E',
    border: '#EE6E5E',        // Corail (extrait du vrai logo ColecoVision)
    hover: '#00121F',
    text: '#FFFFFF',
    chevronColor: '#A3DDF2',  // Turquoise (extrait du vrai logo)
    selectedText: '#FFFFFF'
  },

  amiga: {
    keywords: ['amiga'],
    bg: '#1E2A4E',             // Bleu marine Commodore (marque mère)
    border: '#F04822',         // Orange-rouge (extrait du vrai logo Amiga)
    hover: '#141D38',
    text: '#FFFFFF',
    chevronColor: '#F04822',
    selectedText: '#FFFFFF'
  },

  amstradcpc: {
    keywords: ['amstrad', 'cpc', 'gx4000'],
    bg: '#4D4D4D',
    border: '#9C2249',         // Bordeaux (extrait du vrai logo, pas magenta)
    hover: '#3A3A3A',
    text: '#FFFFFF',
    chevronColor: '#9C2249',
    selectedText: '#FFFFFF'
  },

  apple2: {
    keywords: ['apple ii', 'apple iigs', 'apple 2'],
    bg: '#000000',
    border: '#FF6600',         // Orange (extrait du vrai logo)
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#FFCC00',
    selectedText: '#FFFFFF'
  },

  cave: {
    keywords: ['cave'],
    bg: '#FFFFFF',
    border: '#009944',
    hover: '#F0F0F0',
    text: '#009944',
    chevronColor: '#E60013',
    unselectedText: '#009944',
    selectedText: '#009944'
  },

  psikyo: {
    keywords: ['psikyo'],
    bg: '#000000',
    border: '#FF2100',
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#FF2100',
    selectedText: '#FFFFFF'
  },

  toaplan: {
    keywords: ['toaplan'],
    bg: '#000000',
    border: '#F0B900',
    hover: '#1A1A1A',
    text: '#F0B900',
    chevronColor: '#855700',
    selectedText: '#F0B900'
  },

  seta: {
    keywords: ['seta'],
    bg: '#FFFFFF',
    border: '#0B4199',
    hover: '#F0F0F0',
    text: '#0B4199',
    chevronColor: '#0B4199',
    unselectedText: '#0B4199',
    selectedText: '#0B4199'
  },

  sammy: {
    keywords: ['sammy'],
    bg: '#000000',
    border: '#55D400',
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#217821',
    selectedText: '#FFFFFF'
  },

  jaleco: {
    keywords: ['jaleco'],
    bg: '#FFFFFF',
    border: '#246BBE',
    hover: '#F0F0F0',
    text: '#246BBE',
    chevronColor: '#246BBE',
    unselectedText: '#246BBE',
    selectedText: '#246BBE'
  },

  nichibutsu: {
    keywords: ['nichibutsu'],
    bg: '#000000',
    border: '#FFFF00',
    hover: '#1A1A1A',
    text: '#FFFF00',
    chevronColor: '#FFFF00',
    selectedText: '#FFFF00'
  },

  banpresto: {
    keywords: ['banpresto'],
    bg: '#231F20',
    border: '#ED1C24',
    hover: '#161213',
    text: '#FFFFFF',
    chevronColor: '#ED1C24',
    selectedText: '#FFFFFF'
  },

  tecmo: {
    keywords: ['tecmo'],
    bg: '#FFFFFF',
    border: '#DA2128',
    hover: '#F0F0F0',
    text: '#DA2128',
    chevronColor: '#DA2128',
    unselectedText: '#DA2128',
    selectedText: '#DA2128'
  },

  acclaim: {
    keywords: ['acclaim'],
    bg: '#000000',
    border: '#0019BF',
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#31E1FD',
    selectedText: '#FFFFFF'
  },

  exidy: {
    keywords: ['exidy'],
    bg: '#000000',
    border: '#0105FF',
    hover: '#1A1A1A',
    text: '#FFFFFF',
    chevronColor: '#EF00EB',
    selectedText: '#FFFFFF'
  },

  irem: {
    keywords: ['irem'],
    bg: '#FFFFFF',
    border: '#0055D4',
    hover: '#F0F0F0',
    text: '#0055D4',
    chevronColor: '#00FFCC',
    unselectedText: '#0055D4',
    selectedText: '#0055D4'
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