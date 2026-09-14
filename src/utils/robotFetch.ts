// Fichier: src/utils/robotFetch.ts
//
// Le robot (Google Apps Script) peut, ponctuellement, mettre plusieurs
// dizaines de secondes à répondre, voire renvoyer une page d'erreur HTML de
// Google au lieu du JSON attendu (le cas typique : la feuille "Soumissions"
// est ouverte dans un onglet au même moment — Google Sheets peut alors
// bloquer l'accès en écriture/lecture pour le script pendant un moment).
//
// Dans ce cas-là, le script a très souvent DÉJÀ fait le travail demandé
// (fichier créé, ligne écrite) même si la réponse ne nous parvient jamais
// correctement — d'où l'importance de ne jamais renvoyer bêtement le même
// envoi une seconde fois sans protection (voir clientId dans
// ThemeSubmissionPage.tsx, qui rend un renvoi sans danger côté robot).
//
// Cette fonction centralise :
// - un délai maximum raisonnable par tentative (le robot répond normalement
//   en moins d'une seconde ; au-delà de ROBOT_TIMEOUT_MS, quelque chose ne
//   va pas, pas la peine d'attendre indéfiniment)
// - un seul réessai automatique en cas d'échec (réseau coupé, réponse non-
//   JSON, timeout) — pas plus, pour ne pas faire attendre l'utilisateur trop
//   longtemps si le souci n'est vraiment pas passager
// - un parsing JSON qui échoue proprement (avec un message clair) plutôt que
//   de laisser fuiter l'erreur technique "JSON.parse: unexpected character…"
//   jusqu'à l'utilisateur

export const ROBOT_TIMEOUT_MS = 35000;

export class RobotFetchError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'RobotFetchError';
  }
}

async function attemptOnce(url: string, init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ROBOT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    throw new RobotFetchError('Connexion au robot impossible (réseau coupé ou trop lent).', err);
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    // Le robot a répondu, mais pas avec du JSON valide — typiquement une
    // page d'erreur HTML de Google. On ne montre jamais ce texte brut à
    // l'utilisateur, seulement un message clair.
    throw new RobotFetchError('Le robot a répondu de façon inattendue (probablement un souci passager côté Google).', err);
  }
}

/**
 * Appelle le robot avec un seul réessai automatique en cas d'échec.
 * onRetry (optionnel) est appelé juste avant la seconde tentative, pour
 * afficher un message à l'utilisateur ("nouvel essai en cours...").
 */
export async function robotFetch(url: string, init: RequestInit, onRetry?: () => void): Promise<any> {
  try {
    return await attemptOnce(url, init);
  } catch {
    onRetry?.();
    return attemptOnce(url, init);
  }
}

/** Génère un identifiant unique côté navigateur, utilisable comme clé
 * anti-doublon par le robot (voir clientId dans Code.gs). */
export function generateClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Filet de sécurité pour d'anciens navigateurs sans crypto.randomUUID().
  return 'cid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}
