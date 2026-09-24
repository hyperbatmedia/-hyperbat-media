// DriveHelpers.ts - VERSION COMPLÈTE AVEC DATE + FORMATAGE FR

import { systemsData } from '../../../constants';

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
  date?: string;
  selected?: boolean;
  archiveFormat?: 'ZIP' | '7Z' | 'RAR' | 'UNKNOWN';
}

// ===== CONSTANTES =====
export const REQUEST_TIMEOUT = 60000;
export const MAX_RETRIES = 3;
export const DRIVE_API_KEY_STORAGE = 'hyperbat_drive_api_key';
export const MAX_REQUESTS_PER_MINUTE = 60;

// ===== FORMATAGE DATE FR =====
export const formatDateFR = (dateStr?: string): string => {
  if (!dateStr?.trim()) return '';
  
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn('Erreur formatage date:', dateStr, error);
    return dateStr;
  }
};

// ===== NORMALISATION POUR COMPARAISON =====
export const normalizeForComparison = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
};

// ===== DÉTECTION CATÉGORIE PAR CHEMIN =====
export const detectCategoryFromPath = (folderPath: string): string => {
  if (!folderPath) {
    console.warn('⚠️ Chemin vide, défaut: game-themes');
    return 'game-themes';
  }
  
  const pathSegments = folderPath
    .split('/')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  if (pathSegments.length === 0) {
    console.warn('⚠️ Aucun segment trouvé, défaut: game-themes');
    return 'game-themes';
  }
  
  const lastSegment = pathSegments[pathSegments.length - 1];
  const normalized = normalizeForComparison(lastSegment);

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
      return 'system-themes';
    }
  }
  
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
      return 'default-themes';
    }
  }
  
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
      return 'artwork';
    }
  }
  
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
      return 'game-themes';
    }
  }

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
  systemMapping: Record<string, string>
): { systemId: string; systemName: string } => {
  const cleanName = folderName.toLowerCase().trim();
  
  const arcadeMappings: Record<string, { id: string; name: string }> = {
    'mame': { id: 'mame', name: 'MAME' },
    'hbmame': { id: 'hbmame', name: 'HBMAME' },
    'snk68k': { id: 'snk68k', name: 'SNK 68k' },
    'snk-68k': { id: 'snk68k', name: 'SNK 68k' },
    'alphadenshi': { id: 'alphadenshi', name: 'Alpha Denshi' },
    'alpha-denshi': { id: 'alphadenshi', name: 'Alpha Denshi' },
    'neogeo': { id: 'neogeomvs', name: 'Neo Geo MVS' },
    'neogeo-mvs': { id: 'neogeomvs', name: 'Neo Geo MVS' },
    'neogeomvs': { id: 'neogeomvs', name: 'Neo Geo MVS' },
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
	'aae': { id: 'aae', name: 'AAE' },
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
  _key: string,
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