// Utilitaires pour optimiser le chargement des images Google Drive

/**
 * Génère plusieurs formats d'URL pour une image Google Drive
 * Permet de fallback si une URL ne fonctionne pas
 */
export function getImageUrlVariants(fileId: string): string[] {
  if (!fileId || fileId.length < 25) return [];
  
  return [
    // Format 1: Thumbnail avec authuser (le plus fiable)
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w400&authuser=0`,
    // Format 2: Thumbnail standard
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
    // Format 3: UC avec export=view
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    // Format 4: UC avec export=download (fallback)
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ];
}

/**
 * Charge une image avec retry automatique sur plusieurs formats d'URL
 */
export function loadImageWithRetry(
  imageUrl: string,
  onSuccess: (url: string) => void,
  onError: () => void,
  maxRetries: number = 3
): void {
  // Si l'URL n'est pas Google Drive, charger directement
  if (!imageUrl.includes('drive.google.com')) {
    const img = new Image();
    img.onload = () => onSuccess(imageUrl);
    img.onerror = onError;
    img.src = imageUrl;
    return;
  }

  // Extraire l'ID Google Drive
  const extractId = (url: string): string | null => {
    if (!url) return null;
    
    // Si c'est déjà un ID
    if (/^[a-zA-Z0-9_-]{25,}$/.test(url.trim())) {
      return url.trim();
    }
    
    // Patterns pour extraire l'ID
    const patterns = [
      /[?&]id=([a-zA-Z0-9_-]{25,})/,
      /\/d\/([a-zA-Z0-9_-]{25,})/,
      /\/file\/d\/([a-zA-Z0-9_-]{25,})/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  const fileId = extractId(imageUrl);
  
  if (!fileId) {
    // Si on ne peut pas extraire l'ID, essayer l'URL telle quelle
    const img = new Image();
    img.onload = () => onSuccess(imageUrl);
    img.onerror = onError;
    img.src = imageUrl;
    return;
  }

  // Obtenir les variantes d'URL
  const urlVariants = getImageUrlVariants(fileId);
  let currentIndex = 0;
  let retryCount = 0;

  const tryLoadImage = (url: string) => {
    const img = new Image();
    
    // Ajouter un timeout pour éviter les attentes infinies
    const timeout = setTimeout(() => {
      img.src = ''; // Annuler le chargement
      retryCount++;
      if (retryCount < maxRetries && currentIndex < urlVariants.length - 1) {
        currentIndex++;
        console.log(`⏱️ Timeout, essai avec une autre URL (${currentIndex + 1}/${urlVariants.length})...`);
        setTimeout(() => tryLoadImage(urlVariants[currentIndex]), 100);
      } else {
        console.error(`❌ Timeout après ${retryCount} tentatives`);
        onError();
      }
    }, 10000); // 10 secondes max
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`✅ Image chargée avec succès: ${url.substring(0, 60)}...`);
      onSuccess(url);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      retryCount++;
      
      if (retryCount < maxRetries && currentIndex < urlVariants.length - 1) {
        // Essayer l'URL suivante
        currentIndex++;
        console.log(`⚠️ Échec, essai avec une autre URL (${currentIndex + 1}/${urlVariants.length})...`);
        setTimeout(() => tryLoadImage(urlVariants[currentIndex]), 100);
      } else {
        // Toutes les tentatives ont échoué
        console.error(`❌ Impossible de charger l'image après ${retryCount} tentatives`);
        onError();
      }
    };
    
    img.src = url;
  };

  // Commencer avec la première URL
  tryLoadImage(urlVariants[0]);
}

/**
 * Vérifie si une URL d'image est valide
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Vérifier que c'est une URL valide
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

