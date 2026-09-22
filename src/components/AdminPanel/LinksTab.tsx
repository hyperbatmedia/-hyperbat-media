// Fichier: src/components/AdminPanel/LinksTab.tsx
// Édition des 3 listes "modale" de links.json (Outils, Tutoriels, Autres
// thèmes de Bob) : ajouter/modifier/supprimer un item, et choisir jusqu'à
// 2 items "en vedette" (badge Nouveau / À la une / À ne pas manquer),
// affichés en haut de la page d'accueil. Calqué sur ThemePacksTab.tsx pour
// le mécanisme d'enregistrement local + Push GitHub.
import React, { useState } from 'react';
import { Star, Sparkles, Flame, Trash2, Plus, Loader2, Globe, HelpCircle, X } from 'lucide-react';
import type { Link, ModalItem } from '../../hooks/useLinksLoader';

const GITHUB_OWNER = 'hyperbatmedia';
const GITHUB_REPO = '-hyperbat-media';
const GITHUB_BRANCH = 'main';
const LINKS_PATH = 'src/data/links.json';

// Les 3 listes éditables ici (les autres entrées de links.json — Discord,
// ARRM, Thèmes HyperBat — sont de simples liens externes sans items, donc
// hors sujet pour cet onglet).
const EDITABLE_LIST_IDS = ['outils', 'tutoriels', 'autres-themes-bob'];

type Vedette = NonNullable<ModalItem['vedette']>;

const VEDETTE_OPTIONS: { value: Vedette; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: 'nouveau', label: 'Nouveau', Icon: Sparkles },
  { value: 'a-la-une', label: 'À la une', Icon: Star },
  { value: 'a-ne-pas-manquer', label: 'À ne pas manquer', Icon: Flame },
];

const MAX_VEDETTES = 2;

interface LinksTabProps {
  linksData: Link[];
  setLinksData: React.Dispatch<React.SetStateAction<Link[]>>;
  saveLinks: (links: Link[]) => Promise<void>;
}

const emptyItem = (): ModalItem => ({
  id: `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  name: '',
  creator: '',
  description: '',
  imageUrl: '',
  downloadUrl: '',
});

const LinksTab: React.FC<LinksTabProps> = ({ linksData, setLinksData, saveLinks }) => {
  const [draft, setDraft] = useState<Link[]>(() => linksData.map(l => ({ ...l, modal: l.modal ? { ...l.modal, items: [...l.modal.items] } : l.modal })));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const vedetteCount = draft.reduce(
    (n, l) => n + (l.modal?.items.filter(i => i.vedette).length ?? 0),
    0
  );

  const updateItem = (listId: string, itemId: string, patch: Partial<ModalItem>) => {
    setDraft(prev => prev.map(l => {
      if (l.id !== listId || !l.modal) return l;
      return { ...l, modal: { ...l.modal, items: l.modal.items.map(i => i.id === itemId ? { ...i, ...patch } : i) } };
    }));
  };

  const toggleVedette = (listId: string, itemId: string, value: Vedette) => {
    const item = draft.find(l => l.id === listId)?.modal?.items.find(i => i.id === itemId);
    const turningOn = item?.vedette !== value;
    if (turningOn && vedetteCount >= MAX_VEDETTES && item?.vedette === undefined) {
      alert(`Seulement ${MAX_VEDETTES} mises en avant à la fois. Retire-en une avant d'en ajouter une nouvelle.`);
      return;
    }
    updateItem(listId, itemId, { vedette: turningOn ? value : undefined });
  };

  const addItem = (listId: string) => {
    setDraft(prev => prev.map(l => l.id === listId && l.modal
      ? { ...l, modal: { ...l.modal, items: [...l.modal.items, emptyItem()] } }
      : l
    ));
  };

  const removeItem = (listId: string, itemId: string) => {
    if (!confirm('Supprimer cet item ?')) return;
    setDraft(prev => prev.map(l => l.id === listId && l.modal
      ? { ...l, modal: { ...l.modal, items: l.modal.items.filter(i => i.id !== itemId) } }
      : l
    ));
  };

  const handleSave = async () => {
    setLinksData(draft);
    await saveLinks(draft);
    setSaveMessage('✅ Enregistré localement — pense à Push GitHub pour publier.');
    setTimeout(() => setSaveMessage(null), 4000);
  };

  const handleGithubPush = async (token: string) => {
    setIsPushing(true);
    setPushMessage(null);
    try {
      setLinksData(draft);
      await saveLinks(draft);

      const content = btoa(unescape(encodeURIComponent(JSON.stringify(draft, null, 2))));

      const getRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${LINKS_PATH}?ref=${GITHUB_BRANCH}&_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
      });
      if (!getRes.ok) throw new Error(`Erreur récupération SHA: ${getRes.status}`);
      const fileData = await getRes.json();
      const sha = fileData.sha;

      const pushRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${LINKS_PATH}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Update links.json - ${new Date().toLocaleDateString('fr-FR')}`,
          content,
          sha,
          branch: GITHUB_BRANCH
        })
      });
      if (!pushRes.ok) throw new Error(`Erreur push: ${pushRes.status}`);

      setPushMessage('✅ Liens publiés sur GitHub avec succès.');
      setGithubTokenInput('');
    } catch (err) {
      console.error(err);
      setPushMessage('❌ Erreur lors du push. Vérifie ton token et réessaie.');
    } finally {
      setIsPushing(false);
    }
  };

  const lists = draft.filter(l => EDITABLE_LIST_IDS.includes(l.id) && l.modal);

  return (
    <div className="text-white space-y-6">

      {/* HEADER */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3">
          <Star className="w-8 h-8 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black text-orange-400 tracking-tight">Outils, tutoriels &amp; mise en avant</h2>
          <p className="text-gray-500 text-sm mt-0.5">{vedetteCount} / {MAX_VEDETTES} emplacement(s) vedette utilisé(s)</p>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-colors border border-gray-700"
        >
          <HelpCircle className="w-4 h-4" /> Guide
        </button>
      </div>

      {/* LISTES */}
      {lists.map(list => (
        <div key={list.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide">{list.modal!.title}</h3>

          {list.modal!.items.map(item => (
            <div key={item.id} className="bg-gray-950 border border-gray-800 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text" placeholder="Nom" value={item.name}
                    onChange={e => updateItem(list.id, item.id, { name: e.target.value })}
                    className="bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text" placeholder="Créateur" value={item.creator}
                    onChange={e => updateItem(list.id, item.id, { creator: e.target.value })}
                    className="bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text" placeholder="Lien de téléchargement" value={item.downloadUrl ?? ''}
                    onChange={e => updateItem(list.id, item.id, { downloadUrl: e.target.value })}
                    className="bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 sm:col-span-2"
                  />
                  <input
                    type="text" placeholder="Image (URL)" value={item.imageUrl ?? ''}
                    onChange={e => updateItem(list.id, item.id, { imageUrl: e.target.value })}
                    className="bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 sm:col-span-2"
                  />
                  <textarea
                    placeholder="Description" value={item.description ?? ''}
                    onChange={e => updateItem(list.id, item.id, { description: e.target.value })}
                    rows={2}
                    className="bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 sm:col-span-2 resize-none"
                  />
                </div>
                <button
                  onClick={() => removeItem(list.id, item.id)}
                  title="Supprimer"
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-gray-500 mr-1">Vedette :</span>
                {VEDETTE_OPTIONS.map(({ value, label, Icon }) => {
                  const active = item.vedette === value;
                  return (
                    <button
                      key={value}
                      onClick={() => toggleVedette(list.id, item.id, value)}
                      title={label}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors
                        ${active ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={() => addItem(list.id)}
            className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-1"
          >
            <Plus className="w-4 h-4" /> Ajouter un item
          </button>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
        >
          Enregistrer les modifications
        </button>
        {saveMessage && <span className="text-xs text-green-400">{saveMessage}</span>}
      </div>

      {/* PUSH GITHUB */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2"><Globe className="w-4 h-4 text-purple-400" /> Publier sur GitHub</h3>
        <p className="text-xs text-gray-400">Publie directement ce qui est affiché ci-dessus sur le site (inutile de cliquer "Enregistrer" avant).</p>
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

      {/* GUIDE */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowGuide(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h3 className="text-lg font-black text-orange-400">Guide — Outils &amp; mise en avant</h3>
              <button onClick={() => setShowGuide(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 text-sm text-gray-300">
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">À quoi ça sert</h4>
                <p>Éditer les items des modales Outils, Tutoriels et Autres thèmes de Bob (nom, description, image, lien), et choisir jusqu'à {MAX_VEDETTES} items à mettre en avant sur la page d'accueil.</p>
              </section>
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Mettre en avant</h4>
                <p>Clique sur Nouveau / À la une / À ne pas manquer sous un item. {MAX_VEDETTES} maximum en même temps, tous types et toutes listes confondus — retire-en un avant d'en ajouter un nouveau si la limite est atteinte.</p>
              </section>
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Publier</h4>
                <p>"Push GitHub" publie directement ce que tu vois à l'écran. Laisse le temps à GitHub Pages de reconstruire après un push.</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinksTab;
