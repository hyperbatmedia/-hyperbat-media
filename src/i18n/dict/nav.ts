// Fichier: src/i18n/dict/nav.ts
// Menu de gauche (sidebar) : rubriques et libellés. Les noms de systèmes et de
// marques (SNES, SEGA, NINTENDO...) ne changent pas : seuls les mots français
// sont listés ici (clé = "sys." + libellé français tel qu'il est dans constants.ts).
import { registerDict } from '../core';

registerDict({
  fr: {
    'nav.expandCats': 'Afficher les catégories',
    'nav.collapseCats': 'Masquer les catégories',
    'nav.allCats': 'Toutes les catégories',
    'nav.themesCount': '{n} thèmes',
    'nav.expandBar': 'Étendre la sidebar',
    'nav.collapseBar': 'Réduire la sidebar',
    'nav.systems': 'SYSTÈMES',
    'nav.noSystem': 'Aucun système trouvé pour',
    'nav.clear': 'Effacer la recherche',
    'nav.searchAria': 'Rechercher un système',
    'nav.joinDiscord': 'Rejoindre notre Discord',
  },
  en: {
    'nav.expandCats': 'Show categories',
    'nav.collapseCats': 'Hide categories',
    'nav.allCats': 'All categories',
    'nav.themesCount': '{n} themes',
    'nav.expandBar': 'Expand the sidebar',
    'nav.collapseBar': 'Collapse the sidebar',
    'nav.systems': 'SYSTEMS',
    'nav.noSystem': 'No system found for',
    'nav.clear': 'Clear the search',
    'nav.searchAria': 'Search a system',
    'nav.joinDiscord': 'Join our Discord',

    'sys.Tout réinitialiser': 'Reset everything',
    'sys.Outils': 'Tools',
    'sys.Tutoriels': 'Tutorials',
    'sys.THÈMES HYPERBAT': 'HYPERBAT THEMES',
    'sys.AUTRES THÈMES DE BOB': "BOB'S OTHER THEMES",
    'sys.Collections Personnalisées': 'Custom Collections',
    'sys.📦 COLLECTIONS': '📦 COLLECTIONS',
    'sys.🏠 CONSOLES DE SALON': '🏠 HOME CONSOLES',
    'sys.🎮 CONSOLES PORTABLES': '🎮 HANDHELDS',
    'sys.💻 ORDINOSAURE': '💻 VINTAGE COMPUTERS',
    'sys.🎯 FLIPPER': '🎯 PINBALL',
    'sys.AUTRES CONSTRUCTEURS': 'OTHER MANUFACTURERS',
    'sys.CONSTRUCTEURS DIVERS': 'MISCELLANEOUS MANUFACTURERS',
    'sys.AUTRES PORTS': 'OTHER PORTS',
    'sys.SIMULATEURS': 'SIMULATORS',
    'sys.Ports (divers)': 'Ports (misc)',
  },
});
