// Fichier: src/i18n/dict/common.ts
// Textes communs à plusieurs écrans (sélecteur de langue, listes déroulantes,
// noms des catégories de thèmes).
import { registerDict } from '../core';

registerDict({
  fr: {
    'lang.switch': 'Langue',
    'select.search': 'Rechercher...',
    'select.all': 'Tous',
    'select.reset': 'Réinitialiser',
    'select.none': 'Aucun système trouvé',
    'select.selected': '✓ Sélectionné',
    'select.count.one': '{n} système disponible',
    'select.count.many': '{n} systèmes disponibles',
  },
  en: {
    'lang.switch': 'Language',
    'select.search': 'Search...',
    'select.all': 'All',
    'select.reset': 'Reset',
    'select.none': 'No system found',
    'select.selected': '✓ Selected',
    'select.count.one': '{n} system available',
    'select.count.many': '{n} systems available',

    // Noms des catégories (venant de constants.ts, clé = "cat." + nom français)
    'cat.Collections Personnalisées': 'Custom Collections',
    'cat.Artwork': 'Artwork',
    'cat.Thèmes de jeux': 'Game Themes',
    'cat.Thèmes système': 'System Themes',
    'cat.Thème default': 'Default Theme',
  },
});
