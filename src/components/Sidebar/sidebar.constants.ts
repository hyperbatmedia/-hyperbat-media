// Fichier: src/components/Sidebar/sidebar.constants.ts

/**
 * IDs des boutons spéciaux affichés en haut de la sidebar
 */
export const TOP_BUTTON_IDS = ['all', 'tools', 'tutorials', 'main-themes'] as const;

/**
 * Configuration de la position de la barre de recherche
 */
export const SEARCH_CONFIG = {
  /** Index après lequel insérer la recherche */
  insertAfterIndex: 3,
  /** ID du système après lequel insérer la recherche */
  insertAfterId: 'main-themes',
} as const;

/**
 * Palette de couleurs de la sidebar
 */
export const SIDEBAR_COLORS = {
  primary: '#FF8C00',           // Orange principal
  primaryLight: '#FFA500',      // Orange clair
  primaryGold: '#FFD700',       // Or
  headerGold: '#FFD700',        // Or pour les headers (sections principales)
  subHeaderOrange: '#FF8C00',   // Orange pour les sous-headers
  sectionYellow: '#FFD700',     // JAUNE pour les sections (comme dans l'original)
  discord: '#5865F2',           // Bleu Discord
  discordHover: '#4752C4',      // Bleu Discord hover
  arrm: '#0091bd',              // Bleu ARRM
  arrmBg: '#eab308',            // Jaune fond ARRM (yellow-500)
  arrmBgHover: '#ca8a04',       // Jaune hover ARRM (yellow-600)
} as const;

/**
 * Liens externes
 */
export const EXTERNAL_LINKS = {
  discord: 'https://discord.gg/votre-serveur',  // ⚠️ À REMPLACER
  arrm: 'https://www.arm.com',                   // ⚠️ À REMPLACER par le bon lien
} as const;

/**
 * Configuration du scroll
 */
export const SCROLL_CONFIG = {
  /** Hauteur max de la sidebar quand des sections sont ouvertes */
  maxHeight: '88vh',
  /** Largeur de la scrollbar personnalisée */
  scrollbarWidth: '8px',
} as const;

/**
 * Styles CSS pour la scrollbar personnalisée
 * Compatible Chrome/Safari/Edge (webkit)
 */
export const SCROLLBAR_STYLES = `
  .custom-scrollbar::-webkit-scrollbar {
    width: ${SCROLL_CONFIG.scrollbarWidth};
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1a1a1a;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: ${SIDEBAR_COLORS.primary};
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: ${SIDEBAR_COLORS.primaryLight};
  }
`;

/**
 * Styles CSS pour les animations de la sidebar
 * - Transitions smooth pour l'ouverture/fermeture des sections
 * - Rotation des chevrons
 */
export const ANIMATION_STYLES = `
  .sidebar-section-content {
    overflow: hidden;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
  }
  .sidebar-section-content.open {
    max-height: 2000px;
    opacity: 1;
  }
  .sidebar-section-content.closed {
    max-height: 0;
    opacity: 0;
  }
  .chevron-icon {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .chevron-icon.open {
    transform: rotate(0deg);
  }
  .chevron-icon.closed {
    transform: rotate(-90deg);
  }
`;

/**
 * Styles combinés pour injection dans le composant
 */
export const SIDEBAR_INLINE_STYLES = SCROLLBAR_STYLES + ANIMATION_STYLES;

/**
 * Textes de la sidebar (pour faciliter l'i18n future)
 */
export const SIDEBAR_TEXTS = {
  title: 'SYSTÈMES',
  searchPlaceholder: 'Rechercher un système...',
  searchClearTitle: 'Effacer la recherche',
  noResultsPrefix: 'Aucun système trouvé pour',
  clearSearchButton: 'Effacer la recherche',
  allCategories: 'Toutes les catégories',
  showCategories: 'Afficher les catégories',
  hideCategories: 'Masquer les catégories',
  discordTitle: 'Rejoindre notre Discord',
  arrmTitle: 'ARRM',
  collapseAllTitle: 'Replier tout',
} as const;