// Fichier: src/components/ThemeSubmission/ThemeSubmissionPage.tsx
//
// Page publique "Proposer un thème". Remplace le dépôt manuel sur Discord :
// le créateur remplit ses infos et dépose son .zip + son image lui-même.
// Tout part vers le robot (Apps Script), qui range le fichier dans le bon
// Drive et ajoute une ligne dans la liste d'attente. Rien n'est jamais
// publié directement — l'admin valide ensuite depuis l'onglet Soumissions.
//
// Palette reprise telle quelle de getThemeColors() dans HyperBatMediaSite.tsx
// (la page publique, pas l'AdminPanel) : fond #0f0519, cartes #1a1a1a,
// accent flamme #FF8C00 / #FFA500 / #FFD700 — les mêmes couleurs que les
// boutons de ThemeList, CartPanel, RecapThemesPanel, Tutoriels/Outils, etc.

import { useEffect, useMemo, useState } from 'react';
import { generateSystems } from '../../hooks/useSystemsLogic';
import { systemsData, sectionIcons, categories } from '../../constants';
import { SystemRow } from '../../types';
import { AutocompleteSelect } from '../shared/AutocompleteSelect';
import { ROBOT_ENDPOINT } from '../../config/robotEndpoint';
import { robotFetch, generateClientId, RobotFetchError } from '../../utils/robotFetch';

const EXCLUDED_IDS = ['all', 'tools', 'tutorials', 'main-themes', 'other-themes'];

// Reprise exacte de getThemeColors() (HyperBatMediaSite.tsx), mode sombre
// uniquement : cette page n'a pas besoin du bouton clair/sombre du site.
const COLORS = {
  bg: '#0f0519',
  cardBg: '#1a1a1a',
  text: 'white',
  textSecondary: '#d1d5db',
  border: '#FF8C00',
  inputBg: '#1f2937',
};

const flameGradient = 'linear-gradient(180deg, #FF8C00 0%, #FFD700 100%)';

// Retour à l'accueil : ce site n'a pas de vraies routes (GitHub Pages ne sert
// qu'un seul index.html), la page de soumission est affichée via le
// paramètre d'URL "?soumettre" (voir src/main.tsx). Revenir à l'accueil
// consiste donc simplement à retirer ce paramètre.
function goHome() {
  window.location.href = window.location.pathname;
}

type ThemeEntry = {
  key: string;
  clientId: string;
  nom: string;
  systemId: string;
  categorie: string;
  zipFile: File | null;
  imageFile: File | null;
};

function createEmptyTheme(): ThemeEntry {
  return {
    key: Math.random().toString(36).slice(2),
    // Identifiant anti-doublon : généré une seule fois ici, à la création de
    // la ligne, et jamais régénéré ensuite — même si l'envoi est réessayé
    // automatiquement (voir handleSubmit), le robot recevra toujours le même
    // clientId pour ce thème précis, ce qui lui permet de reconnaître un
    // renvoi et de ne jamais créer de doublon (voir Code.gs).
    clientId: generateClientId(),
    nom: '',
    systemId: '',
    categorie: '',
    zipFile: null,
    imageFile: null,
  };
}

// Point 1 (limite de taille) : les fichiers partent en base64 (+33% de
// volume) dans UN SEUL envoi JSON regroupant tous les thèmes du formulaire —
// pas un par un. Le plafond officieux d'Apps Script pour le corps d'une
// requête POST tourne autour de 50 Mo. On bloque l'envoi avant, avec de la
// marge, plutôt que de laisser échouer après 30 secondes d'attente (et,
// comme on l'a découvert, un dépassement de cette taille peut produire
// exactement le même genre d'erreur non-JSON que les ralentissements
// Apps Script — sans lien avec eux).
const MAX_TOTAL_BYTES = 35 * 1024 * 1024; // ~35 Mo bruts ≈ 46-47 Mo en base64

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// Point 2 (prévisualisation) : composant dédié pour créer/détruire l'URL
// d'aperçu au bon moment (à chaque changement de fichier, et au démontage),
// sans quoi les URL créées par URL.createObjectURL() ne sont jamais
// libérées et s'accumulent en mémoire.
function ImagePreviewThumbnail({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!previewUrl) return null;
  return (
    <img
      src={previewUrl}
      alt=""
      className="w-16 h-16 rounded-lg object-cover shrink-0"
    />
  );
}

// Convertit un fichier en base64 (sans le préfixe "data:...;base64,")
// pour pouvoir l'envoyer au robot dans un simple JSON.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ThemeSubmissionPage() {
  const allSystems = useMemo<SystemRow[]>(
    () => generateSystems(categories, systemsData, sectionIcons),
    []
  );

  const realSystems = useMemo(
    () => allSystems.filter((s) => !s.isHeader && !s.isSubHeader && !EXCLUDED_IDS.includes(s.id)),
    [allSystems]
  );

  // "Collections Personnalisées" (id 'collection') n'est pas une vraie
  // catégorie de thème : c'est le système "Collections Personnalisées"
  // (voir realSystems / systemsData) qui apparaît aussi dans `categories`
  // uniquement pour servir d'onglet de filtre sur le site principal
  // (HyperBatMediaSite.tsx). Aucun thème n'a jamais "category": "collection"
  // dans les données — la vraie catégorie reste game-themes / artwork / etc.
  // On l'exclut donc du menu "Catégorie" du formulaire pour éviter la
  // confusion avec le menu "Système", où "Collections Personnalisées" est
  // déjà proposée.
  const submissionCategories = useMemo(
    () => categories.filter((c) => c.id !== 'collection'),
    []
  );

  // Id du système "Collections Personnalisées" dans realSystems — utilisé
  // pour présélectionner automatiquement sa catégorie (voir onChange du
  // menu Système ci-dessous).
  const collectionSystemId = useMemo(
    () => realSystems.find((s) => s.name === 'Collections Personnalisées')?.id,
    [realSystems]
  );

  const [pseudo, setPseudo] = useState('');
  const [themes, setThemes] = useState<ThemeEntry[]>([createEmptyTheme()]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [sendingMessage, setSendingMessage] = useState('Envoi en cours…');
  // Conserve le pseudo utilisé pour le dernier envoi réussi, pour pouvoir
  // personnaliser le message de remerciement même après que le champ
  // "pseudo" ait été réinitialisé (voir handleSubmit).
  const [lastPseudo, setLastPseudo] = useState('');

  const updateTheme = (key: string, patch: Partial<ThemeEntry>) => {
    setThemes((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  };

  const addTheme = () => setThemes((prev) => [...prev, createEmptyTheme()]);

  const removeTheme = (key: string) =>
    setThemes((prev) => (prev.length > 1 ? prev.filter((t) => t.key !== key) : prev));

  const isThemeValid = (t: ThemeEntry) =>
    t.nom.trim().length > 0 && !!t.systemId && !!t.categorie && !!t.zipFile && !!t.imageFile;

  // Point 1 : taille totale cumulée de tous les fichiers du formulaire (tous
  // thèmes confondus, puisqu'ils partent dans un seul envoi).
  const totalBytes = useMemo(
    () => themes.reduce((sum, t) => sum + (t.zipFile?.size ?? 0) + (t.imageFile?.size ?? 0), 0),
    [themes]
  );
  const sizeExceeded = totalBytes > MAX_TOTAL_BYTES;

  const canSubmit =
    pseudo.trim().length > 0 &&
    themes.length > 0 &&
    themes.every(isThemeValid) &&
    !sizeExceeded &&
    status !== 'sending';

  // Point 4 : avertir avant de quitter la page si des fichiers (potentiellement
  // lourds) sont déjà sélectionnés, ou si un envoi est en cours — le moment où
  // fermer fait le plus de dégâts (requête interrompue). Se désactive tout
  // seul dès que le formulaire est vide (y compris après un envoi réussi,
  // puisque handleSubmit réinitialise déjà themes à ce moment-là) ou après une
  // erreur si les fichiers ont depuis été retirés.
  const hasSelectedFiles = themes.some((t) => t.zipFile || t.imageFile);
  useEffect(() => {
    const shouldWarn = hasSelectedFiles || status === 'sending';
    if (!shouldWarn) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasSelectedFiles, status]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('sending');
    setErrorMsg('');
    setSendingMessage('Envoi en cours…');

    try {
      const payload = {
        action: 'submit',
        pseudo: pseudo.trim(),
        themes: await Promise.all(
          themes.map(async (t) => {
            const system = realSystems.find((s) => s.id === t.systemId);
            return {
              clientId: t.clientId,
              nom: t.nom.trim(),
              systeme: system?.name ?? '',
              famille: system?.section ?? '',
              categorie: t.categorie,
              zipBase64: t.zipFile ? await fileToBase64(t.zipFile) : '',
              zipFilename: t.zipFile?.name ?? '',
              imageBase64: t.imageFile ? await fileToBase64(t.imageFile) : '',
              imageFilename: t.imageFile?.name ?? '',
            };
          })
        ),
      };

      // Important : pas de header "Content-Type: application/json" ici.
      // Apps Script gère très bien un corps texte brut, et ça évite un
      // aller-retour de vérification (preflight) que les Web Apps Google
      // ne gèrent pas correctement.
      //
      // robotFetch réessaie une fois automatiquement en cas d'échec (le
      // robot peut ponctuellement mettre du temps à répondre, ou renvoyer
      // une erreur HTML au lieu du JSON attendu). Comme chaque thème garde
      // le même clientId d'une tentative à l'autre, un renvoi ne crée
      // jamais de doublon : le robot reconnaît qu'il a déjà reçu ce dépôt
      // (voir Code.gs) et ne recrée rien.
      const data = await robotFetch(
        ROBOT_ENDPOINT,
        { method: 'POST', body: JSON.stringify(payload) },
        () => setSendingMessage('Ça prend un peu plus de temps que prévu, nouvel essai en cours…')
      );

      if (!data.ok) throw new Error(data.error || 'Erreur inconnue du robot.');

      setStatus('done');
      setLastPseudo(pseudo.trim());
      setThemes([createEmptyTheme()]);
      setPseudo('');
    } catch (err) {
      if (err instanceof RobotFetchError) {
        // L'envoi complet a échoué deux fois. Avant d'abandonner, on pose
        // une question beaucoup plus légère au robot (aucun fichier à
        // renvoyer, juste "as-tu déjà reçu CES clientId ?") pour donner une
        // réponse CERTAINE au visiteur plutôt que de le laisser dans le
        // flou — lui ne peut pas vérifier lui-même (pas d'accès à la
        // feuille/Drive), mais le robot le sait avec certitude.
        setSendingMessage('Vérification en cours…');
        try {
          const clientIds = themes.map((t) => t.clientId);
          const checkData = await robotFetch(ROBOT_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ action: 'checkStatus', ids: clientIds }),
          });

          if (checkData.ok && clientIds.every((id: string) => checkData.existingIds?.[id])) {
            // Bonne nouvelle confirmée : le dépôt était bien arrivé malgré
            // l'erreur affichée juste avant. On termine comme une réussite.
            setStatus('done');
            setLastPseudo(pseudo.trim());
            setThemes([createEmptyTheme()]);
            setPseudo('');
            return;
          }

          setStatus('error');
          if (checkData.ok) {
            // Réponse certaine, cette fois : rien n'est arrivé, en confiance.
            setErrorMsg("Ton dépôt n'est pas passé. Tu peux cliquer sur Envoyer à nouveau, en toute sécurité.");
          } else {
            setErrorMsg(
              "Le robot ne répond pas normalement pour l'instant (ça arrive, c'est ponctuel). " +
              'Pas d\'inquiétude : tu peux cliquer sur Envoyer à nouveau, ça ne créera jamais de doublon.'
            );
          }
        } catch {
          // Même cette vérification légère a échoué : on retombe sur le
          // message honnête, sans certitude, mais toujours sans risque.
          setStatus('error');
          setErrorMsg(
            "Le robot ne répond pas normalement pour l'instant (ça arrive, c'est ponctuel). " +
            'Pas d\'inquiétude : tu peux cliquer sur Envoyer à nouveau, ça ne créera jamais de doublon.'
          );
        }
        return;
      }

      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue, réessaie.');
    }
  };

  const primaryButtonStyle = {
    backgroundColor: COLORS.border,
    borderColor: '#FFD700',
    borderWidth: 2,
    color: 'white',
  };

  if (status === 'done') {
    return (
      <div
        className="relative min-h-screen flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: COLORS.bg, color: COLORS.text }}
      >
        <button
          type="button"
          onClick={goHome}
          className="absolute top-6 left-4 sm:left-8 text-sm font-bold hover:opacity-80 transition-opacity"
          style={{ color: COLORS.textSecondary }}
        >
          ← Retour à l'accueil
        </button>

        <div className="max-w-md text-center">
          <p
            className="text-xs font-black tracking-widest mb-2 hyperbat-highscore-blink"
            style={{ color: '#FFD700' }}
          >
            ★ HIGH SCORE ★
          </p>

          <p
            className="text-3xl font-black mb-3"
            style={{
              background: flameGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Merci{lastPseudo ? ` ${lastPseudo}` : ''} !
          </p>
          <p style={{ color: COLORS.textSecondary }} className="font-medium mb-6">
            Ton thème(s) a/ont bien été envoyé(s) — il(s) sera(ont) vérifié(s) avant
            d'apparaître sur le site.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="rounded-lg px-6 py-3 text-sm font-bold shadow-lg border"
              style={primaryButtonStyle}
            >
              Proposer un autre thème
            </button>
            <button
              type="button"
              onClick={goHome}
              className="rounded-lg px-6 py-3 text-sm font-bold border"
              style={{ borderColor: `${COLORS.border}55`, color: COLORS.text }}
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: COLORS.bg, color: COLORS.text }}>
      <div className="max-w-xl mx-auto">
        <button
          type="button"
          onClick={goHome}
          className="text-sm font-bold hover:opacity-80 transition-opacity mb-4"
          style={{ color: COLORS.textSecondary }}
        >
          ← Retour à l'accueil
        </button>

        <h1 className="text-3xl font-extrabold mb-1" style={{ color: COLORS.border }}>
          Proposer des thèmes
        </h1>
        <p
          className="text-sm mb-6 pb-4"
          style={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}33` }}
        >
          HyperBat Media — ton dépôt sera vérifié avant de rejoindre le site.
        </p>

        <label className="block text-sm font-bold mb-2" style={{ color: COLORS.textSecondary }} htmlFor="pseudo">
          Ton pseudo *
        </label>
        <input
          id="pseudo"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="ex: Dav"
          className="w-full p-3 rounded-xl text-white mb-6 focus:outline-none"
          style={{ backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.border}55` }}
        />

        <div className="space-y-4 mb-4">
          {themes.map((t, index) => (
            <div
              key={t.key}
              className="rounded-xl p-4"
              style={{ backgroundColor: COLORS.cardBg, border: `2px solid ${COLORS.border}55` }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold" style={{ color: COLORS.text }}>
                  Thème {index + 1}
                </p>
                {themes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTheme(t.key)}
                    className="text-xs font-bold hover:opacity-80"
                    style={{ color: '#f87171' }}
                    aria-label="Retirer ce thème"
                  >
                    ✕ Retirer
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: COLORS.textSecondary }}>
                    Système *
                  </label>
                  {/* Composant partagé avec l'admin : recherche au clavier parmi
                      tous les systèmes, pas de longue liste à faire défiler. */}
                  <AutocompleteSelect
                    options={realSystems}
                    value={t.systemId}
                    onChange={(systemId) => {
                      const patch: Partial<ThemeEntry> = { systemId };
                      // Les thèmes soumis ici pour "Collections
                      // Personnalisées" sont toujours des collections
                      // classiques (comme 24 des 25 déjà en ligne pour ce
                      // système), jamais des artworks — on présélectionne
                      // donc directement la bonne catégorie.
                      if (systemId === collectionSystemId) {
                        patch.categorie = 'game-themes';
                      } else if (t.systemId === collectionSystemId) {
                        // On quitte "Collections Personnalisées" pour un
                        // autre système : la catégorie qui était verrouillée
                        // n'a plus de raison d'être conservée, on la vide
                        // pour forcer un vrai choix.
                        patch.categorie = '';
                      }
                      updateTheme(t.key, patch);
                    }}
                    placeholder="Écris un système…"
                    emptyLabel="Choisir un système"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: COLORS.textSecondary }}>
                    Catégorie *
                  </label>
                  <select
                    value={t.categorie}
                    onChange={(e) => updateTheme(t.key, { categorie: e.target.value })}
                    disabled={t.systemId === collectionSystemId}
                    className="w-full p-3 rounded-xl text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.border}55` }}
                    title={t.systemId === collectionSystemId ? 'Fixée automatiquement pour les Collections Personnalisées' : undefined}
                  >
                    <option value="" disabled>Choisir une catégorie</option>
                    {submissionCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="flex items-center gap-2 rounded-xl px-3 py-4 mb-3 transition-colors"
                style={{ border: `2px dashed ${COLORS.textSecondary}66`, color: COLORS.textSecondary }}
              >
                <label className="flex-1 flex items-center justify-center gap-2 text-center text-sm font-semibold cursor-pointer min-w-0">
                  {t.zipFile ? (
                    <span className="truncate">📦 {t.zipFile.name}</span>
                  ) : (
                    'Fichier .zip du thème *'
                  )}
                  <input
                    type="file"
                    accept=".zip,.7z,.rar"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      // Le nom du thème n'est plus saisi à la main : c'est
                      // toujours le nom du .zip (extension retirée, sans
                      // aucun nettoyage) qui fait foi. "sonic_v2.zip" donne
                      // "sonic_v2". On resynchronise à chaque nouveau fichier
                      // choisi, y compris pour remplacer un fichier précédent.
                      const patch: Partial<ThemeEntry> = { zipFile: file };
                      patch.nom = file ? file.name.replace(/\.[^/.]+$/, '') : '';
                      updateTheme(t.key, patch);
                    }}
                  />
                </label>
                {t.zipFile && (
                  <button
                    type="button"
                    onClick={() => updateTheme(t.key, { zipFile: null })}
                    className="text-xs font-bold shrink-0 hover:opacity-80"
                    style={{ color: '#f87171' }}
                    aria-label="Retirer ce fichier"
                    title="Retirer ce fichier"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div
                className="flex items-center gap-2 rounded-xl px-3 py-4 transition-colors"
                style={{ border: `2px dashed ${COLORS.border}`, color: '#FFA500' }}
              >
                {t.imageFile && <ImagePreviewThumbnail file={t.imageFile} />}
                <label className="flex-1 flex items-center justify-center gap-2 text-center text-sm font-semibold cursor-pointer min-w-0">
                  {t.imageFile ? (
                    <span className="truncate">🖼️ {t.imageFile.name}</span>
                  ) : (
                    'Image — obligatoire *'
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => updateTheme(t.key, { imageFile: e.target.files?.[0] ?? null })}
                  />
                </label>
                {t.imageFile && (
                  <button
                    type="button"
                    onClick={() => updateTheme(t.key, { imageFile: null })}
                    className="text-xs font-bold shrink-0 hover:opacity-80"
                    style={{ color: '#f87171' }}
                    aria-label="Retirer cette image"
                    title="Retirer cette image"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addTheme}
          className="w-full font-bold rounded-xl py-3 text-sm mb-6 transition-colors hover:opacity-90"
          style={{ border: `2px dashed ${COLORS.border}`, color: COLORS.text }}
        >
          + Ajouter un autre thème
        </button>

        {totalBytes > 0 && (
          <p
            className="text-xs text-center mb-2"
            style={{ color: sizeExceeded ? '#f87171' : COLORS.textSecondary }}
          >
            {sizeExceeded
              ? `Le total de tes fichiers est trop volumineux (${formatMB(totalBytes)} Mo / ${formatMB(MAX_TOTAL_BYTES)} Mo max) — essaie de les envoyer en plusieurs fois.`
              : `Taille totale : ${formatMB(totalBytes)} Mo / ${formatMB(MAX_TOTAL_BYTES)} Mo`}
          </p>
        )}

        {status === 'error' && (
          <p className="font-semibold text-sm mb-3 text-center" style={{ color: '#f87171' }}>
            {errorMsg}
          </p>
        )}

        {status === 'sending' && (
          <p className="text-xs text-center mb-2" style={{ color: COLORS.textSecondary }}>
            Ça peut prendre jusqu'à 45 secondes, merci de ne pas fermer cette page.
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-lg py-3 text-sm font-bold shadow-lg transition-all border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={canSubmit ? primaryButtonStyle : { ...primaryButtonStyle, backgroundColor: '#4b5563', borderColor: '#6b7280' }}
        >
          {status === 'sending' && (
            <span
              className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0"
              aria-hidden="true"
            />
          )}
          {status === 'sending'
            ? sendingMessage
            : `Envoyer ${themes.length > 1 ? `mes ${themes.length} thèmes` : 'mon thème'}`}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: COLORS.textSecondary }}>
          Vérifié{themes.length > 1 ? 's' : ''} avant d'apparaître sur le site
        </p>
      </div>
    </div>
  );
}
