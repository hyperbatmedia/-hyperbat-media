// screenScraperUtils.ts - Utilitaires pour la synchronisation ScreenScraper

import { ThemeItem } from '../../../types';
import { systemsData } from '../../../constants';

// ===== INTERFACES =====
export interface ScreenScraperTheme {
  system: string;
  game: string;
  url: string;
  datevalidation: string;
  creator: string;
}

export interface MatchResult {
  screenScraperTheme: ScreenScraperTheme;
  matchedTheme?: ThemeItem;
  score: number;
  matched: boolean;
}

export interface SyncStats {
  totalScreenScraper: number;
  exactMatches: number;
  fuzzyMatches: number;
  noMatches: number;
  totalMarked: number;
}

// ===== MAPPING MANUEL COMPLET SCREENSCRAPER → VOTRE APP =====
// Note: Vos IDs sont SANS TIRETS (ex: "daphnelaserdisc" pas "daphne-laserdisc")
const SCREENSCRAPER_TO_APP_MAPPING: Record<string, string | null> = {
  // === ARCADE ===
  'Mame': 'mame',
  'MAME': 'mame',
  
  // SNK
  'SNK Classics': 'snk68k',
  'Alpha Denshi Co.': 'alphadenshi',
  'Neo-Geo': 'neogeo',
  
  // Capcom
  'Capcom Classics': 'capcomclassique',
  'Capcom Play System': 'cps1',
  'Capcom Play System 2': 'cps2',
  
  // Sega
  'Sega Classics': 'segag80',
  'Sega ST-V': 'stv',
  'Naomi': 'naomi',
  'Naomi 2': 'naomi2',
  'Naomi GD-ROM': 'naomi',
  
  // Namco
  'Namco Classics': 'namcoclassique',
  
  // Konami
  'Konami Classics': 'konamiclassique',
  
  // Taito
  'Taito Classics': 'taitoclassique',
  
  // Nintendo
  'Nintendo Classics': 'vssystem',
  'PlayChoice': 'playchoice10',
  
  // Atari
  'Atari Classics': 'atariclassique',
  
  // Cave
  'Cave': 'cave',
  
  // Psikyo
  'Psikyo': 'psikyo',
  
  // Toaplan
  'Toaplan': 'toaplan',
  
  // NMK
  'NMK': 'nmk',
  
  // Raizing
  'Eighting / Raizing': 'raizing',
  
  // Kaneko
  'Kaneko': 'kaneko',
  
  // Data East
  'Data East Classics': 'dataeast',
  
  // Irem
  'Irem Classics': 'irem',
  
  // Technos
  'Technos': 'technos',
  
  // Midway
  'Midway Classics': 'midway',
  
  // Jaleco
  'Jaleco': 'jaleco',
  
  // Visco
  'Visco': 'visco',
  
  // Seibu
  'Seibu Kaihatsu': 'seibukaihatsu',
  
  // Nichibutsu
  'Nichibutsu': 'nichibutsu',
  
  // Banpresto
  'Banpresto': 'banpresto',
  
  // Atlus
  'Atlus': 'atlus',
  
  // Exidy
  'Exidy': 'sorcerer',
  
  // Gaelco
  'Gaelco': 'gaelco',
  
  // Constructeurs dans FBNeo
  'Universal': 'fbneo',
  'SemiCom': 'fbneo',
  'Seta': 'fbneo',
  
  // Tecmo
  'Tecmo': 'tecmo',
  
  // === LASERDISC ===
  'Daphne': 'daphnelaserdisc',  // ⚠️ SANS TIRET !
  
  // === PORTABLE ===
  'Nintendo DS': 'ds',
  
  // === AUTRES ===
  'non Jeu': null, // Ignorer les non-jeux
};

// ===== GÉNÉRATION AUTOMATIQUE DU MAPPING DEPUIS CONSTANTS =====
const generateSystemMapping = (): Record<string, string> => {
  const mapping: Record<string, string> = {};
  
  // Parcourir toutes les sections de systemsData
  for (const section of Object.values(systemsData)) {
    for (const subsectionData of Object.values(section)) {
      // Pour chaque système dans la subsection
      for (const systemName of subsectionData.systems) {
        // Créer l'ID normalisé SANS TIRETS (comme dans votre base réelle)
        const systemId = systemName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
          .replace(/[^a-z0-9]/g, ''); // ENLEVER TOUS les caractères non alphanumériques (pas de tirets !)
        
        // Mapper le nom exact vers l'ID
        mapping[systemName] = systemId;
        
        // Ajouter aussi une version lowercase pour flexibilité
        mapping[systemName.toLowerCase()] = systemId;
      }
    }
  }
  
  return mapping;
};

// Générer le mapping une seule fois
const AUTO_SYSTEM_MAPPING = generateSystemMapping();

// ===== NORMALISATION AMÉLIORÉE =====
// Convertir les chiffres romains en chiffres arabes
const romanToArabic: Record<string, string> = {
  'i': '1',
  'ii': '2',
  'iii': '3',
  'iv': '4',
  'v': '5',
  'vi': '6',
  'vii': '7',
  'viii': '8',
  'ix': '9',
  'x': '10',
  'xi': '11',
  'xii': '12',
  'xiii': '13',
  'xiv': '14',
  'xv': '15',
};

export const normalizeString = (str: string): string => {
  let normalized = str
    .toLowerCase()
    .trim()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, ''); // Supprime les accents
  
  // Enlever tous les types de parenthèses/crochets et leur contenu
  normalized = normalized
    .replace(/\s*\([^)]*\)/g, '') // (USA), (Europe), etc.
    .replace(/\s*\[[^\]]*\]/g, '') // [Version], etc.
    .replace(/\s*\{[^}]*\}/g, ''); // {Special}, etc.
  
  // Enlever la ponctuation AVANT de traiter les caractères spéciaux
  normalized = normalized.replace(/[!?.:,;'"]/g, ' ');
  
  // Remplacer tirets et underscores par des espaces
  normalized = normalized.replace(/[-_]/g, ' ');
  
  // Enlever les caractères spéciaux (maintenant que tirets sont des espaces)
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
  
  // Remplacer les chiffres romains par des chiffres arabes
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  const convertedWords = words.map(word => {
    if (romanToArabic[word]) {
      return romanToArabic[word];
    }
    return word;
  });
  
  normalized = convertedWords.join(' ');
  
  // Enlever les articles et mots courants
  normalized = normalized
    .replace(/\b(the|a|an)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Enlever les suffixes courants en fin de chaîne
  normalized = normalized
    .replace(/\s+(version|edition|remastered|hd|remake|deluxe|special|ultimate|gold|goty|complete|enhanced)$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
};

// ===== MAPPING DE SYSTÈME AMÉLIORÉ =====
export const mapSystemToId = (screenScraperSystem: string): string | null => {
  // Ignorer les lignes d'en-tête ou non-systèmes
  if (screenScraperSystem === 'system' || screenScraperSystem === 'non Jeu') {
    return null;
  }
  
  // 1. Vérifier d'abord le mapping manuel ScreenScraper (PRIORITÉ ABSOLUE)
  if (SCREENSCRAPER_TO_APP_MAPPING[screenScraperSystem] !== undefined) {
    return SCREENSCRAPER_TO_APP_MAPPING[screenScraperSystem];
  }
  
  // 2. Essayer une correspondance exacte dans le mapping auto
  if (AUTO_SYSTEM_MAPPING[screenScraperSystem]) {
    return AUTO_SYSTEM_MAPPING[screenScraperSystem];
  }
  
  // 3. Essayer en lowercase
  const lowerSystem = screenScraperSystem.toLowerCase();
  if (AUTO_SYSTEM_MAPPING[lowerSystem]) {
    return AUTO_SYSTEM_MAPPING[lowerSystem];
  }
  
  // 4. Essayer de trouver une correspondance partielle intelligente
  const normalized = normalizeString(screenScraperSystem);
  
  // Chercher dans le mapping auto
  for (const [systemName, systemId] of Object.entries(AUTO_SYSTEM_MAPPING)) {
    if (normalizeString(systemName) === normalized) {
      return systemId;
    }
  }
  
  // Pas de correspondance trouvée
  console.warn(`⚠️ Système ScreenScraper non mappé: "${screenScraperSystem}"`);
  return null;
};

// ===== ALGORITHME DE LEVENSHTEIN (Distance d'édition) =====
const levenshteinDistance = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
};

// ===== CALCUL DE SIMILARITÉ =====
export const calculateSimilarity = (str1: string, str2: string): number => {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  // Match exact
  if (normalized1 === normalized2) {
    return 100;
  }
  
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  if (maxLength === 0) return 0;
  
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity);
};

// ===== PARSER CSV =====
export const parseScreenScraperCSV = (csvContent: string): ScreenScraperTheme[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Ignorer la première ligne (en-têtes)
  const dataLines = lines.slice(1);
  
  const themes: ScreenScraperTheme[] = [];
  
  for (const line of dataLines) {
    // Parser CSV avec tabulations
    const parts = line.split('\t');
    
    if (parts.length >= 5) {
      const system = parts[0].trim();
      
      // Ignorer les systèmes non mappables
      if (system === 'system' || system === 'non Jeu') {
        continue;
      }
      
      themes.push({
        system: system,
        game: parts[1].trim(),
        url: parts[2].trim(),
        datevalidation: parts[3].trim(),
        creator: parts[4].trim()
      });
    }
  }
  
  return themes;
};

// ===== MATCHING DES THÈMES =====
export const matchThemes = (
  screenScraperThemes: ScreenScraperTheme[],
  userThemes: ThemeItem[],
  threshold: number = 95
): MatchResult[] => {
  const results: MatchResult[] = [];
  
  for (const ssTheme of screenScraperThemes) {
    const systemId = mapSystemToId(ssTheme.system);
    
    if (!systemId) {
      // Système non mappé
      results.push({
        screenScraperTheme: ssTheme,
        score: 0,
        matched: false
      });
      continue;
    }
    
    // Chercher dans les thèmes de l'utilisateur
    let bestMatch: ThemeItem | undefined;
    let bestScore = 0;
    
    for (const userTheme of userThemes) {
      // Vérifier d'abord que le système correspond
      if (userTheme.system !== systemId) {
        continue;
      }
      
      // Calculer la similarité des noms
      const score = calculateSimilarity(ssTheme.game, userTheme.name);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = userTheme;
      }
    }
    
    // Ajouter le résultat
    results.push({
      screenScraperTheme: ssTheme,
      matchedTheme: bestMatch,
      score: bestScore,
      matched: bestScore >= threshold
    });
  }
  
  return results;
};

// ===== APPLIQUER LES MATCHS =====
export const applyMatches = (
  userThemes: ThemeItem[],
  matchResults: MatchResult[],
  threshold: number = 95
): ThemeItem[] => {
  const updatedThemes = [...userThemes];
  const themeMap = new Map(updatedThemes.map(t => [t.id, t]));
  
  for (const result of matchResults) {
    if (result.matched && result.matchedTheme && result.score >= threshold) {
      const theme = themeMap.get(result.matchedTheme.id);
      if (theme) {
        theme.onScreenScraper = true;
      }
    }
  }
  
  return Array.from(themeMap.values());
};

// ===== CALCULER LES STATS =====
export const calculateStats = (
  matchResults: MatchResult[],
  threshold: number = 95
): SyncStats => {
  const exactMatches = matchResults.filter(r => r.score === 100).length;
  const fuzzyMatches = matchResults.filter(r => r.matched && r.score < 100 && r.score >= threshold).length;
  const noMatches = matchResults.filter(r => !r.matched).length;
  
  return {
    totalScreenScraper: matchResults.length,
    exactMatches,
    fuzzyMatches,
    noMatches,
    totalMarked: exactMatches + fuzzyMatches
  };
};

// ===== FONCTION UTILITAIRE POUR DIAGNOSTIQUER LES PROBLÈMES =====
export const diagnoseMappingIssues = (csvContent: string): void => {
  const themes = parseScreenScraperCSV(csvContent);
  const uniqueSystems = new Set(themes.map(t => t.system));
  
  console.log('\n📊 DIAGNOSTIC DES MAPPINGS SCREENSCRAPER\n');
  console.log(`Total systèmes uniques: ${uniqueSystems.size}\n`);
  
  const mapped: string[] = [];
  const unmapped: string[] = [];
  
  for (const system of Array.from(uniqueSystems).sort()) {
    const id = mapSystemToId(system);
    if (id) {
      mapped.push(`✅ ${system} → ${id}`);
    } else {
      unmapped.push(`❌ ${system} → (non mappé)`);
    }
  }
  
  console.log('=== SYSTÈMES MAPPÉS ===');
  mapped.forEach(m => console.log(m));
  
  if (unmapped.length > 0) {
    console.log('\n=== SYSTÈMES NON MAPPÉS ===');
    unmapped.forEach(m => console.log(m));
  }
  
  console.log(`\n✅ ${mapped.length} mappés | ❌ ${unmapped.length} non mappés`);
};
