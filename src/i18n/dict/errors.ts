// Fichier: src/i18n/dict/errors.ts
// Écran d'erreur (ErrorBoundary).
import { registerDict } from '../core';

registerDict({
  fr: {
    'err.title': 'La page a rencontré une erreur',
    'err.chunk': 'Le site a été mis à jour pendant que cette page était ouverte. Recharge la page pour récupérer la dernière version.',
    'err.generic': "Un élément de la page n'a pas pu s'afficher. Recharge la page. Si le problème revient, le détail ci-dessous permet de trouver la cause.",
    'err.adminLock': "Si tu étais dans l'admin, le verrou reste posé sur GitHub jusqu'à 8 h. À la prochaine connexion, utilise « Forcer l'accès ».",
    'err.reload': 'Recharger la page',
    'err.resetLocal': "Effacer les données locales de l'admin",
    'err.resetConfirm': "Supprimer les modifications de l'admin enregistrées sur cet ordinateur mais pas encore poussées sur GitHub ?\n\nCe qui est déjà publié sur le site n'est pas touché.",
  },
  en: {
    'err.title': 'The page ran into an error',
    'err.chunk': 'The site was updated while this page was open. Reload the page to get the latest version.',
    'err.generic': 'Part of the page could not be displayed. Reload the page. If the problem comes back, the details below help find the cause.',
    'err.adminLock': 'If you were in the admin area, the lock stays on GitHub for up to 8 hours. Next time you log in, use "Force access".',
    'err.reload': 'Reload the page',
    'err.resetLocal': 'Clear the admin local data',
    'err.resetConfirm': 'Delete the admin changes saved on this computer but not yet pushed to GitHub?\n\nWhat is already published on the site is not affected.',
  },
});
