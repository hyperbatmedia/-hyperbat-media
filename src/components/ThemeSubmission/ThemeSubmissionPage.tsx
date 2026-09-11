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

import { useMemo, useState } from 'react';
import { generateSystems } from '../../hooks/useSystemsLogic';
import { systemsData, sectionIcons, categories } from '../../constants';
import { SystemRow } from '../../types';
import { AutocompleteSelect } from '../shared/AutocompleteSelect';
import { ROBOT_ENDPOINT } from '../../config/robotEndpoint';

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
  nom: string;
  systemId: string;
  categorie: string;
  zipFile: File | null;
  imageFile: File | null;
};

function createEmptyTheme(): ThemeEntry {
  return {
    key: Math.random().toString(36).slice(2),
    nom: '',
    systemId: '',
    categorie: categories[0]?.id ?? '',
    zipFile: null,
    imageFile: null,
  };
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

  const [pseudo, setPseudo] = useState('');
  const [themes, setThemes] = useState<ThemeEntry[]>([createEmptyTheme()]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
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

  const canSubmit =
    pseudo.trim().length > 0 &&
    themes.length > 0 &&
    themes.every(isThemeValid) &&
    status !== 'sending';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('sending');
    setErrorMsg('');

    try {
      const payload = {
        action: 'submit',
        pseudo: pseudo.trim(),
        themes: await Promise.all(
          themes.map(async (t) => {
            const system = realSystems.find((s) => s.id === t.systemId);
            return {
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
      const res = await fetch(ROBOT_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Erreur inconnue du robot.');

      setStatus('done');
      setLastPseudo(pseudo.trim());
      setThemes([createEmptyTheme()]);
      setPseudo('');
    } catch (err) {
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
            Ton/tes thème(s) a/ont bien été envoyé(s) — il(s) sera(ont) vérifié(s) avant
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
          placeholder="ex: Akeshi"
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

              <div className="mb-3">
                <label className="block text-sm font-bold mb-2" style={{ color: COLORS.textSecondary }}>
                  Nom du thème *
                </label>
                <input
                  value={t.nom}
                  onChange={(e) => updateTheme(t.key, { nom: e.target.value })}
                  placeholder="ex: Back to the Future"
                  className="w-full p-3 rounded-xl text-white focus:outline-none"
                  style={{ backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.border}55` }}
                />
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
                    onChange={(systemId) => updateTheme(t.key, { systemId })}
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
                    className="w-full p-3 rounded-xl text-white focus:outline-none"
                    style={{ backgroundColor: COLORS.inputBg, border: `1px solid ${COLORS.border}55` }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-4 text-center text-sm font-semibold mb-3 cursor-pointer transition-colors"
                style={{ border: `2px dashed ${COLORS.textSecondary}66`, color: COLORS.textSecondary }}
              >
                {t.zipFile ? `📦 ${t.zipFile.name}` : 'Fichier .zip du thème *'}
                <input
                  type="file"
                  accept=".zip,.7z,.rar"
                  className="hidden"
                  onChange={(e) => updateTheme(t.key, { zipFile: e.target.files?.[0] ?? null })}
                />
              </label>

              <label
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-4 text-center text-sm font-semibold cursor-pointer transition-colors"
                style={{ border: `2px dashed ${COLORS.border}`, color: '#FFA500' }}
              >
                {t.imageFile ? `🖼️ ${t.imageFile.name}` : 'Image — obligatoire *'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => updateTheme(t.key, { imageFile: e.target.files?.[0] ?? null })}
                />
              </label>
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

        {status === 'error' && (
          <p className="font-semibold text-sm mb-3 text-center" style={{ color: '#f87171' }}>
            {errorMsg}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-lg py-3 text-sm font-bold shadow-lg transition-all border disabled:opacity-50 disabled:cursor-not-allowed"
          style={canSubmit ? primaryButtonStyle : { ...primaryButtonStyle, backgroundColor: '#4b5563', borderColor: '#6b7280' }}
        >
          {status === 'sending'
            ? 'Envoi en cours…'
            : `Envoyer ${themes.length > 1 ? `mes ${themes.length} thèmes` : 'mon thème'}`}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: COLORS.textSecondary }}>
          Vérifié{themes.length > 1 ? 's' : ''} avant d'apparaître sur le site
        </p>
      </div>
    </div>
  );
}
