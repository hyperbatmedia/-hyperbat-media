// Fichier: src/components/AdminPanel/LinksTab.tsx
// Édition de links.json, en grille de cartes façon page d'accueil :
// - Outils / Tutoriels / Autres thèmes de Bob : listes d'items (modal.items)
// - Thèmes HyperBat : un seul "item" porté directement par le Link lui-même
//   (pas de modale multi-items, mais mêmes champs : nom, créateur,
//   description, image, lien, vedette)
// - Discord / ARRM : liens simples (nom + URL seulement, pas de carte/image)
// Cliquer "Modifier" une carte ouvre son formulaire juste en dessous, déjà
// pré-rempli. Mécanisme d'enregistrement local + Push GitHub calqué sur
// ThemePacksTab.tsx.
import React, { useState } from 'react';
import { Star, Sparkles, Flame, Trash2, Plus, Loader2, Globe, HelpCircle, X, Pencil, ChevronDown } from 'lucide-react';
import type { Link, ModalItem } from '../../hooks/useLinksLoader';

const GITHUB_OWNER = 'hyperbatmedia';
const GITHUB_REPO = '-hyperbat-media';
const GITHUB_BRANCH = 'main';
const LINKS_PATH = 'src/data/links.json';

// Listes à items multiples (modal.items), affichées en grille de cartes.
const CARD_LIST_IDS = ['outils', 'tutoriels', 'autres-themes-bob'];
// Lien unique traité comme une carte à lui seul (pas de modale, pas d'ajout/suppression).
const SINGLE_CARD_IDS = ['themes-hyperbat'];
// Liens vraiment simples : juste nom + URL, pas de carte/image.
const SIMPLE_LINK_IDS = ['discord', 'arrm'];

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

// Petit champ de saisie réutilisé dans les formulaires d'édition.
const Field: React.FC<{ placeholder: string; value: string; onChange: (v: string) => void; span2?: boolean; area?: boolean }> = ({ placeholder, value, onChange, span2, area }) => {
  const cls = `bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 ${span2 ? 'sm:col-span-2' : ''}`;
  return area
    ? <textarea placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} rows={2} className={`${cls} resize-none`} />
    : <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className={cls} />;
};

const VedettePicker: React.FC<{ value?: Vedette; onPick: (v: Vedette) => void }> = ({ value, onPick }) => (
  <div className="flex items-center gap-2 pt-1 flex-wrap">
    <span className="text-xs text-gray-500 mr-1">Vedette :</span>
    {VEDETTE_OPTIONS.map(({ value: v, label, Icon }) => {
      const active = value === v;
      return (
        <button
          key={v}
          onClick={() => onPick(v)}
          title={label}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors
            ${active ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}
        >
          <Icon className="w-3.5 h-3.5" /> {label}
        </button>
      );
    })}
  </div>
);

const LinksTab: React.FC<LinksTabProps> = ({ linksData, setLinksData, saveLinks }) => {
  const [draft, setDraft] = useState<Link[]>(() => linksData.map(l => ({ ...l, modal: l.modal ? { ...l.modal, items: [...l.modal.items] } : l.modal })));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  // Carte en cours d'édition (une seule à la fois, id d'item ou de lien).
  const [editingId, setEditingId] = useState<string | null>(null);
  // Liens simples (Discord/ARRM) repliés/dépliés individuellement.
  const [openSimple, setOpenSimple] = useState<Set<string>>(new Set());
  const toggleSimple = (id: string) => setOpenSimple(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const vedetteCount =
    draft.reduce((n, l) => n + (l.modal?.items.filter(i => i.vedette).length ?? 0), 0) +
    draft.filter(l => SINGLE_CARD_IDS.includes(l.id) && l.vedette).length;

  const updateItem = (listId: string, itemId: string, patch: Partial<ModalItem>) => {
    setDraft(prev => prev.map(l => {
      if (l.id !== listId || !l.modal) return l;
      return { ...l, modal: { ...l.modal, items: l.modal.items.map(i => i.id === itemId ? { ...i, ...patch } : i) } };
    }));
  };

  const updateLink = (linkId: string, patch: Partial<Link>) => {
    setDraft(prev => prev.map(l => l.id === linkId ? { ...l, ...patch } : l));
  };

  const toggleVedette = (current: Vedette | undefined, apply: (v: Vedette | undefined) => void, value: Vedette) => {
    const turningOn = current !== value;
    if (turningOn && vedetteCount >= MAX_VEDETTES && current === undefined) {
      alert(`Seulement ${MAX_VEDETTES} mises en avant à la fois. Retire-en une avant d'en ajouter une nouvelle.`);
      return;
    }
    apply(turningOn ? value : undefined);
  };

  const addItem = (listId: string) => {
    const newItem = emptyItem();
    setDraft(prev => prev.map(l => l.id === listId && l.modal
      ? { ...l, modal: { ...l.modal, items: [...l.modal.items, newItem] } }
      : l
    ));
    setEditingId(newItem.id);
  };

  const removeItem = (listId: string, itemId: string) => {
    if (!confirm('Supprimer cet item ?')) return;
    setDraft(prev => prev.map(l => l.id === listId && l.modal
      ? { ...l, modal: { ...l.modal, items: l.modal.items.filter(i => i.id !== itemId) } }
      : l
    ));
    if (editingId === itemId) setEditingId(null);
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

  const cardLists = draft.filter(l => CARD_LIST_IDS.includes(l.id) && l.modal);
  const singleCards = draft.filter(l => SINGLE_CARD_IDS.includes(l.id));
  const simpleLinks = draft.filter(l => SIMPLE_LINK_IDS.includes(l.id));

  // Petite carte réutilisée pour un item de liste ET pour un lien unique
  // (Thèmes HyperBat) — même apparence, mêmes champs.
  const Card: React.FC<{
    id: string; name: string; creator?: string; imageUrl?: string; vedette?: Vedette;
    onEdit: () => void; onDelete?: () => void; isEditing: boolean; children: React.ReactNode;
  }> = ({ name, creator, imageUrl, vedette, onEdit, onDelete, isEditing, children }) => (
    <div className={isEditing ? 'sm:col-span-2' : ''}>
      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
        {!isEditing ? (
          <div className="p-2.5">
            <div className="relative w-full h-16 rounded-lg bg-gray-800 mb-2 overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Star className="w-5 h-5 text-gray-700" />
              )}
              {vedette && (
                <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-600 text-white">
                  {VEDETTE_OPTIONS.find(v => v.value === vedette)?.label}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-white truncate">{name || '(sans nom)'}</p>
            {creator && <p className="text-[10px] text-gray-500 truncate mb-2">par {creator}</p>}
            <button
              onClick={onEdit}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-gray-200 bg-gray-700 hover:bg-gray-600 rounded-lg py-1.5 mt-2 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Modifier
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">Édition — {name || '(sans nom)'}</span>
              <div className="flex items-center gap-1">
                {onDelete && (
                  <button onClick={onDelete} title="Supprimer" className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setEditingId(null)} title="Fermer" className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {children}
          </div>
        )}
      </div>
    </div>
  );

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

      {/* LISTES À ITEMS MULTIPLES (grille de cartes) */}
      {cardLists.map(list => (
        <div key={list.id}>
          <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide mb-2">{list.modal!.title}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {list.modal!.items.map(item => (
              <Card
                key={item.id}
                id={item.id} name={item.name} creator={item.creator} imageUrl={item.imageUrl} vedette={item.vedette}
                isEditing={editingId === item.id}
                onEdit={() => setEditingId(item.id)}
                onDelete={() => removeItem(list.id, item.id)}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field placeholder="Nom" value={item.name} onChange={v => updateItem(list.id, item.id, { name: v })} />
                  <Field placeholder="Créateur" value={item.creator} onChange={v => updateItem(list.id, item.id, { creator: v })} />
                  <Field placeholder="Lien de téléchargement" value={item.downloadUrl ?? ''} onChange={v => updateItem(list.id, item.id, { downloadUrl: v })} span2 />
                  <Field placeholder="Image (URL)" value={item.imageUrl ?? ''} onChange={v => updateItem(list.id, item.id, { imageUrl: v })} span2 />
                  <Field placeholder="Description" value={item.description ?? ''} onChange={v => updateItem(list.id, item.id, { description: v })} span2 area />
                </div>
                <VedettePicker value={item.vedette} onPick={v => toggleVedette(item.vedette, val => updateItem(list.id, item.id, { vedette: val }), v)} />
              </Card>
            ))}

            <button
              onClick={() => addItem(list.id)}
              className="border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-cyan-400 transition-colors py-4"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Ajouter un item</span>
            </button>
          </div>
        </div>
      ))}

      {/* LIENS UNIQUES TRAITÉS COMME UNE CARTE (Thèmes HyperBat) */}
      {singleCards.map(link => (
        <div key={link.id}>
          <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide mb-2">{link.name || 'Thèmes HyperBat'}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Card
              id={link.id} name={link.name} creator={link.creator} imageUrl={link.imageUrl} vedette={link.vedette}
              isEditing={editingId === link.id}
              onEdit={() => setEditingId(link.id)}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field placeholder="Nom" value={link.name} onChange={v => updateLink(link.id, { name: v })} />
                <Field placeholder="Créateur" value={link.creator ?? ''} onChange={v => updateLink(link.id, { creator: v })} />
                <Field placeholder="Lien" value={link.url ?? ''} onChange={v => updateLink(link.id, { url: v })} span2 />
                <Field placeholder="Image (URL)" value={link.imageUrl ?? ''} onChange={v => updateLink(link.id, { imageUrl: v })} span2 />
                <Field placeholder="Description" value={link.description ?? ''} onChange={v => updateLink(link.id, { description: v })} span2 area />
              </div>
              <VedettePicker value={link.vedette} onPick={v => toggleVedette(link.vedette, val => updateLink(link.id, { vedette: val }), v)} />
            </Card>
          </div>
        </div>
      ))}

      {/* LIENS SIMPLES (Discord, ARRM) */}
      <div>
        <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide mb-2">Liens simples</h3>
        <div className="space-y-2">
          {simpleLinks.map(link => {
            const isOpen = openSimple.has(link.id);
            return (
              <div key={link.id} className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSimple(link.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-900 transition-colors text-left"
                >
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  <span className="text-sm font-semibold text-gray-200 flex-1 truncate">{link.name || '(sans nom)'}</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-gray-800 pt-2">
                    <Field placeholder="Nom" value={link.name} onChange={v => updateLink(link.id, { name: v })} />
                    <Field placeholder="URL" value={link.url ?? ''} onChange={v => updateLink(link.id, { url: v })} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
                <p>Éditer les items d'Outils, Tutoriels, Autres thèmes de Bob et Thèmes HyperBat (nom, créateur, description, image, lien), éditer Discord/ARRM, et choisir jusqu'à {MAX_VEDETTES} items à mettre en avant sur la page d'accueil.</p>
              </section>
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Modifier une carte</h4>
                <p>Clique "Modifier" sur une carte : son formulaire s'ouvre à sa place, déjà pré-rempli avec ses vraies valeurs actuelles.</p>
              </section>
              <section>
                <h4 className="text-cyan-400 font-bold mb-1">Mettre en avant</h4>
                <p>{MAX_VEDETTES} maximum en même temps, toutes listes confondues — retire-en un avant d'en ajouter un nouveau si la limite est atteinte.</p>
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
