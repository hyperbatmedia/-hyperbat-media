// Fichier: src/components/AdminPanel/ThemePacksTab.tsx
// 12 lignes fixes (une par mois), tout est éditable directement en ligne.
// Une ligne vide (sans date ni lien) n'apparaît pas sur la vitrine.
import React, { useState } from 'react';
import { Star, Package, HelpCircle, Loader2, X, Save, Globe } from 'lucide-react';
import { ThemePack, ThemePacksData } from '../../types';

const GITHUB_OWNER = 'hyperbatmedia';
const GITHUB_REPO = '-hyperbat-media';
const GITHUB_BRANCH = 'main';
const PACKS_PATH = 'src/data/themePacks.json';

const SLOT_COUNT = 12;

interface ThemePacksTabProps {
  packsData: ThemePacksData;
  setPacksData: React.Dispatch<React.SetStateAction<ThemePacksData>>;
  savePacksData: (data: ThemePacksData) => Promise<void>;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// Construit toujours exactement 12 lignes (slot-1 à slot-12), en réutilisant
// les packs déjà enregistrés qui correspondent à ces slots. Une ligne encore
// vide est pré-remplie avec le nom du mois correspondant (slot-1 = Janvier,
// slot-2 = Février...) — il ne reste plus qu'à ajouter l'année.
const buildSlots = (packs: ThemePack[]): ThemePack[] => {
  const byMonth = new Map(packs.map(p => [p.month, p]));
  const slots: ThemePack[] = [];
  for (let i = 1; i <= SLOT_COUNT; i++) {
    const id = `slot-${i}`;
    slots.push(byMonth.get(id) ?? { month: id, label: MONTH_NAMES[i - 1], driveUrl: '', note: '' });
  }
  return slots;
};

const ThemePacksTab: React.FC<ThemePacksTabProps> = ({ packsData, setPacksData, savePacksData }) => {
  const [draft, setDraft] = useState<ThemePack[]>(() => buildSlots(packsData.packs));
  const [featuredMonth, setFeaturedMonth] = useState<string>(packsData.featuredMonth);
  const [showGuide, setShowGuide] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const updateSlot = (month: string, field: 'label' | 'driveUrl' | 'note', value: string) => {
    setDraft(prev => prev.map(p => p.month === month ? { ...p, [field]: value } : p));
  };

  // ── Enregistrer (local, avant push) ──────────────────────────────────────
  const handleSave = async () => {
    // On ne garde que les lignes réellement remplies (date + lien) pour la vitrine
    const filled = draft.filter(p => p.label.trim() && p.driveUrl.trim());
    const updated: ThemePacksData = {
      featuredMonth: filled.some(p => p.month === featuredMonth) ? featuredMonth : (filled[0]?.month ?? ''),
      packs: filled.map(p => ({ ...p, note: p.note?.trim() || undefined })),
    };
    setPacksData(updated);
    await savePacksData(updated);
    setSaveMessage('✅ Enregistré localement — pense à Push GitHub pour publier.');
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // ── Push GitHub ──────────────────────────────────────────────────────────
  const handleGithubPush = async (token: string) => {
    setIsPushing(true);
    setPushMessage(null);
    try {
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(packsData, null, 2))));

      const getRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${PACKS_PATH}?ref=${GITHUB_BRANCH}&_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
      });
      if (!getRes.ok) throw new Error(`Erreur récupération SHA: ${getRes.status}`);
      const fileData = await getRes.json();
      const sha = fileData.sha;

      const pushRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${PACKS_PATH}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Update themePacks.json (${packsData.packs.length} pack(s)) - ${new Date().toLocaleDateString('fr-FR')}`,
          content,
          sha,
          branch: GITHUB_BRANCH
        })
      });
      if (!pushRes.ok) throw new Error(`Erreur push: ${pushRes.status}`);

      setPushMessage('✅ Packs publiés sur GitHub avec succès.');
      setGithubTokenInput('');
    } catch (err) {
      console.error(err);
      setPushMessage('❌ Erreur lors du push. Vérifie ton token et réessaie.');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="text-white space-y-5">

      {/* HEADER */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3">
          <Package className="w-8 h-8 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black text-orange-400 tracking-tight">Packs de thèmes par mois</h2>
          <p className="text-gray-500 text-sm mt-0.5">{packsData.packs.length} / {SLOT_COUNT} mois remplis</p>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-colors border border-gray-700"
        >
          <HelpCircle className="w-4 h-4" /> Guide
        </button>
      </div>

      {/* 12 LIGNES */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid gap-3 p-3 bg-gray-950 border-b border-gray-800 text-xs text-gray-300 font-bold uppercase tracking-wide"
             style={{ gridTemplateColumns: '40px 1fr 1.4fr 1.2fr' }}>
          <div className="text-center">★</div>
          <div>Date</div>
          <div>Lien Drive</div>
          <div>Note (optionnel)</div>
        </div>

        {draft.map(slot => {
          const isFeatured = slot.month === featuredMonth;
          return (
            <div
              key={slot.month}
              className="grid gap-3 p-3 border-b border-gray-800/60 last:border-b-0 items-center"
              style={{ gridTemplateColumns: '40px 1fr 1.4fr 1.2fr' }}
            >
              <div className="flex justify-center">
                <button
                  onClick={() => setFeaturedMonth(slot.month)}
                  title="Mettre en avant"
                  className="p-1.5 rounded-lg transition-colors"
                >
                  <Star className={`w-5 h-5 ${isFeatured ? 'fill-orange-500 text-orange-500' : 'text-gray-500 hover:text-orange-400'}`} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Juillet 2026"
                value={slot.label}
                onChange={e => updateSlot(slot.month, 'label', e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="https://drive.google.com/..."
                value={slot.driveUrl}
                onChange={e => updateSlot(slot.month, 'driveUrl', e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="Ex : 45 thèmes arcade et Nintendo"
                value={slot.note ?? ''}
                onChange={e => updateSlot(slot.month, 'note', e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" /> Enregistrer les modifications
        </button>
        {saveMessage && <span className="text-xs text-green-400">{saveMessage}</span>}
      </div>

      {/* PUSH GITHUB */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2"><Globe className="w-4 h-4 text-purple-400" /> Publier sur GitHub</h3>
        <p className="text-xs text-gray-400">Les changements restent locaux tant que tu n'as pas pushé (et enregistré juste au-dessus).</p>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={githubTokenInput}
            onChange={e => setGithubTokenInput(e.target.value)}
            className="flex-1 p-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none font-mono text-sm"
          />
          <button
            onClick={() => githubTokenInput.trim() && handleGithubPush(githubTokenInput.trim())}
            disabled={!githubTokenInput.trim() || isPushing}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-3 rounded-xl transition-colors"
          >
            {isPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {isPushing ? 'Envoi...' : 'Push GitHub'}
          </button>
        </div>
        {pushMessage && <p className="text-xs font-semibold">{pushMessage}</p>}
      </div>

      {/* MODALE GUIDE */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowGuide(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h3 className="text-lg font-black text-orange-400">Guide — Packs de thèmes par mois</h3>
              <button onClick={() => setShowGuide(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 text-sm text-gray-300">
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">À quoi ça sert</h4>
                <p>Regrouper chaque mois les nouveaux thèmes dans un .zip que tu héberges toi-même sur Drive, et le rendre visible sur la page d'accueil.</p>
              </section>
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Remplir une ligne</h4>
                <p>12 lignes fixes, une par mois. Tape la date (ex "Juillet 2026"), colle le lien Drive du .zip, ajoute une note si tu veux. Une ligne vide n'apparaît pas sur le site.</p>
              </section>
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Mettre en avant</h4>
                <p>Clique sur l'étoile ★ à gauche de la ligne à mettre en avant sur la page d'accueil. Une seule à la fois.</p>
              </section>
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Enregistrer puis publier</h4>
                <p>Clique "Enregistrer les modifications" pour sauvegarder tes changements, puis "Push GitHub" pour les rendre visibles sur le site (laisse le temps à GitHub Pages de reconstruire après).</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemePacksTab;
