// DriveHelpers.ts - VERSION COMPLÈTE AVEC DÉTECTION CATÉGORIES

import { systemsData } from '../../../constants';

// ===== INTERFACES =====
interface JSZipInterface {
  loadAsync(data: ArrayBuffer | Uint8Array): Promise<any>;
}

const waitForJSZip = async (timeout = 10000): Promise<JSZipInterface> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (typeof window !== 'undefined' && (window as any).JSZip) {
      return (window as any).JSZip;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  throw new Error('⛔ JSZip non disponible. Vérifiez la connexion Internet.');
};

const getJSZip = async (): Promise<JSZipInterface> => {
  return await waitForJSZip();
};

export interface DriveTheme {
  id: string;
  name: string;
  systemDisplayName: string;
  system: string;
  category: string;
  imageUrl: string;
  downloadUrl: string;
  creator: string;
  size: string;
  selected?: boolean;
  archiveFormat?: 'ZIP' | '7Z' | 'RAR' | 'UNKNOWN';
}

export interface Log {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface DriveStats {
  total: number;
  success: number;
  error: number;
}

// ===== CONSTANTES =====
export const MAX_LOGS = 500;
export const REQUEST_TIMEOUT = 60000;
export const MAX_RETRIES = 3;
export const ITEMS_PER_PAGE = 20;
export const DRIVE_API_KEY_STORAGE = 'hyperbat_drive_api_key';
export const QUEUE_DELAY = 5000;
export const MAX_REQUESTS_PER_MINUTE = 60;
export const CREATOR_CACHE_STORAGE = 'hyperbat_creator_cache';

// ===== DÉTECTION FORMAT ARCHIVE =====
export const detectArchiveFormat = (signature: string): 'ZIP' | '7Z' | 'RAR' | 'UNKNOWN' => {
  if (signature.startsWith('504b')) return 'ZIP';
  if (signature.startsWith('377abcaf271c')) return '7Z';
  if (signature.startsWith('526172211a07')) return 'RAR';
  if (signature.startsWith('526172211a070100')) return 'RAR';
  return 'UNKNOWN';
};

// ===== NORMALISATION POUR COMPARAISON =====
/**
 * Normalise une chaîne pour la comparaison (insensible à la casse et accents)
 */
export const normalizeForComparison = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD') // Décompose les accents (é → e + ´)
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]+/g, ''); // Ne garde que lettres et chiffres
};

// ===== DÉTECTION CATÉGORIE PAR CHEMIN =====
/**
 * Détecte la catégorie d'un thème basé sur le dernier segment du chemin (N3)
 * 
 * Structure attendue:
 * - N0: ROOT (Drive racine)
 * - N1: Section (console portable, console salon, arcade, etc.)
 * - N2: Système (PlayStation, CPS1, NES, etc.)
 * - N3: Catégorie (system-themes, game-themes, default-themes, artwork)
 * 
 * @param folderPath - Chemin complet du dossier
 * @returns Catégorie détectée
 */
export const detectCategoryFromPath = (folderPath: string): string => {
  if (!folderPath) {
    console.warn('⚠️ Chemin vide, défaut: game-themes');
    return 'game-themes';
  }
  
  // Découpe le chemin en segments
  const pathSegments = folderPath
    .split('/')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  if (pathSegments.length === 0) {
    console.warn('⚠️ Aucun segment trouvé, défaut: game-themes');
    return 'game-themes';
  }
  
  // Prendre le DERNIER segment (N3 = dossier de catégorie)
  const lastSegment = pathSegments[pathSegments.length - 1];
  const normalized = normalizeForComparison(lastSegment);
  
  console.log('🔍 Détection catégorie:', {
    chemin: folderPath,
    segments: pathSegments,
    dernierSegment: lastSegment,
    normalisé: normalized
  });
  
  // =====================================================
  // 1. SYSTEM-THEMES
  // =====================================================
  const systemPatterns = [
    'systemthemes',
    'systemtheme',
    'themesysteme',
    'themesystemes',
    'themesystem',
    'systemdefault',
    'system'
  ];
  
  for (const pattern of systemPatterns) {
    if (normalized === pattern || normalized.includes(pattern)) {
      console.log('✅ MATCH system-themes:', lastSegment, '→', pattern);
      return 'system-themes';
    }
  }
  
  // =====================================================
  // 2. DEFAULT-THEMES
  // =====================================================
  const defaultPatterns = [
    'defaultthemes',
    'defaulttheme',
    'themedefault',
    'themesdefault',
    'default',
    'defaut'
  ];
  
  for (const pattern of defaultPatterns) {
    if (normalized === pattern || normalized.includes(pattern)) {
      console.log('✅ MATCH default-themes:', lastSegment, '→', pattern);
      return 'default-themes';
    }
  }
  
  // =====================================================
  // 3. ARTWORK
  // =====================================================
  const artworkPatterns = [
    'artwork',
    'artworks',
    'screenshot',
    'screenshots',
    'art',
    'arts',
    'capture',
    'captures'
  ];
  
  for (const pattern of artworkPatterns) {
    if (normalized === pattern || normalized.includes(pattern)) {
      console.log('✅ MATCH artwork:', lastSegment, '→', pattern);
      return 'artwork';
    }
  }
  
  // =====================================================
  // 4. GAME-THEMES (par défaut et patterns spécifiques)
  // =====================================================
  const gamePatterns = [
    'gamethemes',
    'gametheme',
    'themedejeux',
    'themedejeu',
    'themejeux',
    'themejeu',
    'themesjeux',
    'themesjeu',
    'jeux',
    'jeu',
    'games',
    'game'
  ];
  
  for (const pattern of gamePatterns) {
    if (normalized === pattern || normalized.includes(pattern)) {
      console.log('✅ MATCH game-themes:', lastSegment, '→', pattern);
      return 'game-themes';
    }
  }
  
  // =====================================================
  // 5. PAR DÉFAUT
  // =====================================================
  console.log('⚠️ Aucun pattern trouvé pour:', lastSegment, '→ défaut: game-themes');
  return 'game-themes';
};

// ===== GESTION CLÉ API =====
export const saveDriveApiKey = (apiKey: string): void => {
  if (apiKey && apiKey.length >= 39) {
    localStorage.setItem(DRIVE_API_KEY_STORAGE, apiKey);
  }
};

export const loadDriveApiKey = (): string => {
  return localStorage.getItem(DRIVE_API_KEY_STORAGE) || '';
};

// ===== GESTION CACHE CRÉATEURS =====
export const saveCreatorCache = (cache: Map<string, string>): void => {
  try {
    const array = Array.from(cache.entries());
    localStorage.setItem(CREATOR_CACHE_STORAGE, JSON.stringify(array));
  } catch (error) {
    console.warn('Erreur sauvegarde cache créateurs:', error);
  }
};

export const loadCreatorCache = (): Map<string, string> => {
  try {
    const stored = localStorage.getItem(CREATOR_CACHE_STORAGE);
    if (stored) {
      const array = JSON.parse(stored);
      return new Map(array);
    }
  } catch (error) {
    console.warn('Erreur chargement cache créateurs:', error);
  }
  return new Map();
};

// ===== EXTRACTION ID GOOGLE DRIVE =====
export const extractDriveFileId = (url?: string): string => {
  if (!url?.trim()) return '';
  
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (match) return match[1];
  
  match = url.match(/\/folders\/([a-zA-Z0-9_-]{25,})/);
  if (match) return match[1];
  
  match = url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (match) return match[1];
  
  match = url.match(/\/uc\?[^&]*id=([a-zA-Z0-9_-]{25,})/);
  if (match) return match[1];
  
  match = url.match(/\/thumbnail\?[^&]*id=([a-zA-Z0-9_-]{25,})/);
  if (match) return match[1];
  
  match = url.match(/open\?id=([a-zA-Z0-9_-]{25,})/);
  if (match) return match[1];
  
  if (/^[a-zA-Z0-9_-]{25,40}$/.test(url.trim())) {
    return url.trim();
  }
  
  match = url.match(/([a-zA-Z0-9_-]{25,})/);
  return match ? match[1] : '';
};

// ===== NORMALISATION CRÉATEURS =====
export const isUnknownCreator = (creator?: string): boolean => {
  if (!creator?.trim()) return true;
  const normalized = creator.toLowerCase().trim();
  return ['unknown', 'inconnu', 'n/a', 'none'].includes(normalized);
};

// ===== GÉNÉRATION DU MAPPING SYSTÈME =====
export const generateSystemMapping = (): Record<string, string> => {
  const mapping: Record<string, string> = {};
  
  Object.values(systemsData).forEach((section: any) => {
    Object.values(section).forEach((subsection: any) => {
      if (subsection.systems) {
        subsection.systems.forEach((systemName: string) => {
          const normalized = systemName.toLowerCase().replace(/[^a-z0-9]+/g, '');
          const variations = [
            systemName.toLowerCase(),
            systemName.toLowerCase().replace(/\s+/g, '-'),
            systemName.toLowerCase().replace(/\s+/g, ''),
            normalized
          ];
          variations.forEach(variant => {
            mapping[variant] = normalized;
          });
        });
      }
    });
  });
  
  return mapping;
};

// ===== MATCHING SYSTÈME INTELLIGENT =====
export const findMatchingSystem = (
  folderName: string,
  systemMapping: Record<string, string>,
  addLog: (message: string) => void
): { systemId: string; systemName: string } => {
  const cleanName = folderName.toLowerCase().trim();
  
  const arcadeMappings: Record<string, { id: string; name: string }> = {
    'mame': { id: 'mame', name: 'MAME' },
    'hbmame': { id: 'hbmame', name: 'HBMAME' },
    'snk68k': { id: 'snk68k', name: 'SNK 68k' },
    'snk-68k': { id: 'snk68k', name: 'SNK 68k' },
    'alphadenshi': { id: 'alphadenshi', name: 'Alpha Denshi' },
    'alpha-denshi': { id: 'alphadenshi', name: 'Alpha Denshi' },
    'neogeo': { id: 'neogeo', name: 'Neo Geo MVS' },
    'neogeo-mvs': { id: 'neogeo', name: 'Neo Geo MVS' },
    'neogeomvs': { id: 'neogeo', name: 'Neo Geo MVS' },
    'neogeoaes': { id: 'neogeoaes', name: 'Neo Geo AES' },
    'neo-geo-aes': { id: 'neogeoaes', name: 'Neo Geo AES' },
    'neogeo-aes': { id: 'neogeoaes', name: 'Neo Geo AES' },
    'hyperneogeo64': { id: 'hyperneogeo64', name: 'Hyper Neo Geo 64' },
    'hyper-neo-geo-64': { id: 'hyperneogeo64', name: 'Hyper Neo Geo 64' },
    'capcomclassique': { id: 'capcomclassique', name: 'Capcom Classique' },
    'capcom-classique': { id: 'capcomclassique', name: 'Capcom Classique' },
    'cpsystemdash': { id: 'cpsystemdash', name: 'CP System Dash' },
    'cp-system-dash': { id: 'cpsystemdash', name: 'CP System Dash' },
    'cps1': { id: 'cps1', name: 'CPS1' },
    'cps2': { id: 'cps2', name: 'CPS2' },
    'cps3': { id: 'cps3', name: 'CPS3' },
  };
  
  const cleanArcade = cleanName.replace(/[^a-z0-9]/g, '');
  if (arcadeMappings[cleanArcade]) {
    return {
      systemId: arcadeMappings[cleanArcade].id,
      systemName: arcadeMappings[cleanArcade].name
    };
  }
  
  if (systemMapping[cleanName]) {
    return {
      systemId: systemMapping[cleanName],
      systemName: folderName
    };
  }
  
  const variations = [
    cleanName.replace(/\s+/g, '-'),
    cleanName.replace(/\s+/g, ''),
    cleanName.replace(/[^a-z0-9]+/g, ''),
    cleanName.replace(/[-_]/g, ' ')
  ];
  
  for (const variant of variations) {
    if (systemMapping[variant]) {
      return {
        systemId: systemMapping[variant],
        systemName: folderName
      };
    }
  }
  
  for (const [key, value] of Object.entries(systemMapping)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return {
        systemId: value,
        systemName: folderName
      };
    }
  }
  
  for (const [key, arcadeSystem] of Object.entries(arcadeMappings)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return {
        systemId: arcadeSystem.id,
        systemName: arcadeSystem.name
      };
    }
  }
  
  return {
    systemId: cleanName.replace(/[^a-z0-9]+/g, ''),
    systemName: folderName
  };
};

// ===== EXTRACTION CRÉATEUR (ZIP UNIQUEMENT) =====
export const extractCreatorFromArchive = async (
  fileId: string,
  apiKey: string,
  addLog?: (message: string, type?: 'info' | 'success' | 'error') => void
): Promise<{ creator: string; format: 'ZIP' | '7Z' | 'RAR' | 'UNKNOWN' }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    
    if (addLog) addLog(`📽 Téléchargement ${fileId.slice(0, 8)}...`, 'info');
    const startTime = Date.now();
    
    const response = await fetchWithBackoff(downloadUrl, controller.signal, addLog);
    
    const downloadTime = Date.now() - startTime;
    if (addLog) addLog(`  ⏱️ ${downloadTime}ms`, 'info');
    
    const contentLength = response.headers.get('content-length');
    if (addLog) addLog(`  📦 Taille: ${formatSize(contentLength)}`, 'info');
    
    const arrayBuffer = await response.arrayBuffer();
    if (addLog) addLog(`  ✔ ${formatSize(arrayBuffer.byteLength)} téléchargés`, 'success');
    
    const header = new Uint8Array(arrayBuffer.slice(0, 8));
    const signature = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const format = detectArchiveFormat(signature);
    
    if (addLog) addLog(`  📦 Format détecté: ${format}`, 'info');
    
    if (format !== 'ZIP') {
      if (addLog) addLog(`  ⚠️ Format ${format} non décompressable`, 'error');
      clearTimeout(timeoutId);
      return { creator: 'Unknown', format };
    }
    
    if (addLog) addLog(`  🗜️ Décompression ZIP...`, 'info');
    
    let xmlContent: string | null = null;
    
    try {
      const JSZip = await getJSZip();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      if (addLog) addLog(`  📂 ${Object.keys(zip.files).length} fichiers`, 'info');
      
      const xmlNames = ['theme.xml', 'systeme.xml', 'system.xml'];
      
      for (const fileName of Object.keys(zip.files)) {
        const file = zip.files[fileName];
        
        if (fileName.includes('/')) continue;
        
        const lowerName = fileName.toLowerCase();
        if (xmlNames.includes(lowerName)) {
          xmlContent = await file.async('string');
          if (addLog) addLog(`  ✔ XML: ${fileName}`, 'success');
          break;
        }
      }
      
    } catch (jszipError: any) {
      if (addLog) addLog(`  ❌ Erreur JSZip: ${jszipError.message}`, 'error');
      clearTimeout(timeoutId);
      return { creator: 'Unknown', format: 'ZIP' };
    }
    
    if (!xmlContent) {
      if (addLog) addLog(`  ⚠️ Aucun XML à la racine`, 'error');
      clearTimeout(timeoutId);
      return { creator: 'Unknown', format: 'ZIP' };
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      if (addLog) addLog(`  ⚠️ Erreur parsing XML`, 'error');
      clearTimeout(timeoutId);
      return { creator: 'Unknown', format: 'ZIP' };
    }
    
    const authorTags = [
      xmlDoc.querySelector('text[name="gamethemeauthor"]'),
      xmlDoc.querySelector('text[name="systhemeauthor"]'),
      xmlDoc.querySelector('creator'),
      xmlDoc.querySelector('author')
    ];
    
    let creatorText = '';
    
    for (const tag of authorTags) {
      if (tag) {
        const textElement = tag.querySelector('text');
        if (textElement?.textContent?.trim()) {
          creatorText = textElement.textContent.trim();
          break;
        }
        
        if (tag.textContent?.trim()) {
          creatorText = tag.textContent.trim();
          break;
        }
      }
    }
    
    if (!creatorText) {
      const allTextElements = xmlDoc.querySelectorAll('text[name]');
      for (const element of Array.from(allTextElements)) {
        const name = element.getAttribute('name')?.toLowerCase() || '';
        if (name.includes('author') || name.includes('creator') || name.includes('theme')) {
          const innerText = element.querySelector('text');
          if (innerText?.textContent?.trim()) {
            creatorText = innerText.textContent.trim();
            break;
          }
          if (element.textContent?.trim()) {
            creatorText = element.textContent.trim();
            break;
          }
        }
      }
    }
    
    if (!creatorText) {
      if (addLog) addLog(`  ⚠️ Créateur non trouvé`, 'error');
      clearTimeout(timeoutId);
      return { creator: 'Unknown', format: 'ZIP' };
    }
    
    let creator = creatorText
      .replace(/^Theme by\s*:\s*/i, '')
      .replace(/^System Theme By\s*:\s*/i, '')
      .replace(/^By\s*:\s*/i, '')
      .replace(/^Author\s*:\s*/i, '')
      .replace(/^Creator\s*:\s*/i, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    if (isUnknownCreator(creator)) {
      clearTimeout(timeoutId);
      return { creator: 'Unknown', format: 'ZIP' };
    }
    
    if (addLog) addLog(`  ✅ Créateur: ${creator}`, 'success');
    clearTimeout(timeoutId);
    return { creator, format: 'ZIP' };
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      if (addLog) addLog(`  ⏱️ Timeout (${REQUEST_TIMEOUT / 1000}s)`, 'error');
    } else {
      if (addLog) addLog(`  ❌ Erreur: ${error.message}`, 'error');
    }
    
    return { creator: 'Unknown', format: 'UNKNOWN' };
  }
};

// ===== FETCH AVEC BACKOFF =====
const fetchWithBackoff = async (
  url: string,
  signal: AbortSignal,
  addLog?: (message: string, type?: 'info' | 'success' | 'error') => void,
  retries = 0
): Promise<Response> => {
  try {
    const response = await fetch(url, { signal });
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : Math.min(2000 * Math.pow(2, retries), 60000);
      
      if (addLog) addLog(`  ⏸️ Rate limit (429), pause ${(delay / 1000).toFixed(0)}s...`, 'error');
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (retries < MAX_RETRIES) {
        return fetchWithBackoff(url, signal, addLog, retries + 1);
      } else {
        throw new Error('Quota Google Drive dépassé');
      }
    }
    
    if (!response.ok) {
      if (addLog) addLog(`  ❌ HTTP ${response.status}`, 'error');
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response;
    
  } catch (error: any) {
    if (signal.aborted) throw error;
    
    if (retries < MAX_RETRIES) {
      const delay = Math.min(2000 * Math.pow(2, retries), 30000);
      if (addLog) addLog(`  🔄 Retry ${retries + 1}/${MAX_RETRIES}...`, 'error');
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithBackoff(url, signal, addLog, retries + 1);
    }
    
    throw error;
  }
};

// ===== FORMATAGE TAILLE =====
export const formatSize = (bytes: any): string => {
  if (!bytes) return 'N/A';
  
  const size = parseInt(bytes.toString());
  
  if (isNaN(size)) return 'N/A';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// ===== EXTRACTION ID DOSSIER =====
export const extractFolderId = (url: string): string | null => {
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

// ===== CONVERSION LIEN DIRECT =====
export const convertToDirectLink = (
  fileId: string,
  key: string,
  isImage = false
): string => {
  if (isImage) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }
  return `https://drive.google.com/uc?id=${fileId}&export=download`;
};

// ===== CONVERSION URL DISPLAYABLE =====
export const ensureDisplayableUrl = (url: string, isImage: boolean): string => {
  if (!url?.trim()) return url;
  
  if (url.includes('/thumbnail?') || url.includes('/uc?')) {
    return url;
  }
  
  const fileId = extractDriveFileId(url);
  
  if (!fileId) {
    console.warn('❌ Impossible d\'extraire l\'ID Google Drive de:', url);
    return url;
  }
  
  if (isImage) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  } else {
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }
};

// ===== REVERSE CONVERSION URL =====
export const reverseConvertUrl = (url: string): string => {
  if (!url?.trim()) return url;
  if (url.includes('/file/d/')) return url;
  
  const fileId = extractDriveFileId(url);
  
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  }
  
  return url;
};

// ===== TROUVER IMAGE =====
export const findMatchingImage = (
  archiveName: string,
  imageFiles: any[],
  addLog?: (message: string) => void
): any | null => {
  if (!imageFiles || imageFiles.length === 0) {
    return null;
  }

  const baseName = archiveName.replace(/\.(zip|7z|7zip|rar)$/i, '').toLowerCase();
  
  const exactMatch = imageFiles.find(img => {
    const imgName = img.name.replace(/\.(jpg|jpeg|png)$/i, '').toLowerCase();
    return imgName === baseName;
  });
  
  if (exactMatch) {
    return exactMatch;
  }
  
  const partialMatch = imageFiles.find(img => {
    const imgName = img.name.replace(/\.(jpg|jpeg|png)$/i, '').toLowerCase();
    const lengthDiff = Math.abs(baseName.length - imgName.length);
    
    if (lengthDiff <= 3) {
      if (baseName.includes(imgName) && imgName.length >= baseName.length * 0.8) {
        return true;
      }
      if (imgName.includes(baseName) && baseName.length >= imgName.length * 0.8) {
        return true;
      }
    }
    
    return false;
  });
  
  if (partialMatch && addLog) {
    addLog(`ℹ️ Match partiel: "${archiveName}" → "${partialMatch.name}"`);
  }
  
  return partialMatch || null;
};

// ===== FETCH AVEC TIMEOUT =====
export const fetchWithTimeout = async (
  url: string,
  signal: AbortSignal
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  const abortHandler = () => controller.abort();
  signal.addEventListener('abort', abortHandler);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    signal.removeEventListener('abort', abortHandler);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    signal.removeEventListener('abort', abortHandler);
    
    if (error.name === 'AbortError') {
      throw new Error(`Timeout (${REQUEST_TIMEOUT / 1000}s)`);
    }
    
    throw error;
  }
};

// ===== FETCH AVEC RETRY =====
export const fetchWithRetry = async (
  url: string,
  signal: AbortSignal,
  addLog: (message: string) => void,
  retries = MAX_RETRIES
): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    if (signal.aborted) throw new Error('Annulé');
    
    try {
      const response = await fetchWithTimeout(url, signal);
      return await response.json();
    } catch (error: any) {
      if (i === retries - 1 || signal.aborted) {
        throw error;
      }
      
      addLog(`⚠️ Tentative ${i + 1}/${retries} échouée`);
      
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Échec');
};

// ===== SAUVEGARDE/CHARGEMENT URLs =====
export const saveUrls = (urls: string[]): void => {
  localStorage.setItem('driveUrls', JSON.stringify(urls));
};

export const loadUrls = (): string[] => {
  const saved = localStorage.getItem('driveUrls');
  return saved ? JSON.parse(saved) : ['', '', '', '', ''];
};

// ===== VALIDATION =====
export const getValidationIssues = (themes: DriveTheme[]) => {
  return {
    noImage: themes.filter(t => !t.imageUrl).length,
    unknownSystem: themes.filter(t => t.system === 'unknown').length,
    noCreator: themes.filter(t => isUnknownCreator(t.creator)).length
  };
};