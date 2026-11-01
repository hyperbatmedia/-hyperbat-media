// Fichier: src/components/AdminPanel/ApplicationsTab.tsx
// Onglet "Applications" : ajout MANUEL de thèmes dont les fichiers sont sur un
// autre Drive (ex. celui de Bob) — ils ne passent donc ni par l'import Drive
// ni par le robot. On colle les liens Google Drive, on vérifie, on publie.
import { FC, useMemo, useState } from 'react';
import { Plus, Trash2, Send } from 'lucide-react';
import { ThemeItem, Category } from '../../types';
import { systemsData } from '../../constants';
import { extractDriveFileId, ensureDisplayableUrl, isUnknownCreator } from './DriveTab/DriveHelpers';
import { addUnpushedThemes } from '../../hooks/useUnpushedThemes';

interface ApplicationsTabProps {
  themes: ThemeItem[];
  categories: Category[];
  onImportThemes: (newThemes: ThemeItem[]) => Promise<void>;
}

// Même calcul que generateSystems() (useSystemsLogic) : indispensable pour que
// le thème apparaisse bien sous son système sur la vitrine.
const creatorKey = (s: string) => (s || '').trim().toLowerCase();
// Si le nom existe déjà (majuscules/espaces près), on reprend l'orthographe déjà utilisée (comme dans « Gérer »).
const canonicalCreator = (input: string, known: string[]): string => {
  const t = (input || '').trim();
  return known.find((k) => creatorKey(k) === creatorKey(t)) || t;
};

const slugOf = (systemName: string) => systemName.toLowerCase().replace(/[^a-z0-9]+/g, '');

// Pour ces systèmes il n'y a pas de choix de catégorie : c'est toujours "Thèmes système".
const FIXED_CATEGORY_SYSTEMS = ['Émulateurs RetroBat'];
const FIXED_CATEGORY = 'system-themes';

// Kodi n'apparaît pas ici : cet onglet sert aux thèmes d'émulateurs (fichiers sur le Drive de Bob).
const HIDDEN_SYSTEMS = ['Kodi'];
const APP_SYSTEMS: string[] = Object.values(systemsData.applications ?? {})
  .flatMap((g) => g.systems)
  .filter((s) => !HIDDEN_SYSTEMS.includes(s));

interface Draft {
  key: number;
  name: string;
  creator: string;
  systemName: string;
  category: string;
  imageUrl: string;
  downloadUrl: string;
  size: string;
  date: string;
}

const inputCls = 'w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500';
const labelCls = 'block text-xs font-bold text-gray-400 mb-1';

const checkLink = (url: string, what: string): string => {
  const u = url.trim();
  if (!u) return `${what} : lien manquant.`;
  if (u.includes('/folders/')) return `${what} : c'est un lien de DOSSIER, il faut le lien du fichier.`;
  if (!extractDriveFileId(u)) return `${what} : lien Google Drive non reconnu.`;
  return '';
};

const ApplicationsTab: FC<ApplicationsTabProps> = ({ themes, categories, onImportThemes }) => {
  const defaultCategory = categories.find((c) => c.id === 'system-themes')?.id ?? categories[0]?.id ?? '';
  const [form, setForm] = useState({
    name: '',
    creator: 'Bob',
    systemName: APP_SYSTEMS[APP_SYSTEMS.length - 1] ?? '',
    category: defaultCategory,
    imageUrl: '',
    downloadUrl: '',
    size: '',
    date: '',
  });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [nextKey, setNextKey] = useState(1);

  const existing = useMemo(() => {
    const slugs = new Set(APP_SYSTEMS.map(slugOf));
    return themes.filter((t) => slugs.has(t.system));
  }, [themes]);

  // Créateurs déjà connus : une seule orthographe par pseudo (la plus utilisée), comme dans « Gérer ».
  const knownCreators = useMemo(() => {
    const byKey = new Map<string, Map<string, number>>();
    for (const t of themes) {
      if (!t.creator || isUnknownCreator(t.creator)) continue;
      const k = creatorKey(t.creator);
      const m = byKey.get(k) || new Map<string, number>();
      const name = t.creator.trim();
      m.set(name, (m.get(name) || 0) + 1);
      byKey.set(k, m);
    }
    return Array.from(byKey.values())
      .map((m) => Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0][0])
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [themes]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const addDraft = () => {
    setStatus(null);
    const errors: string[] = [];
    if (!form.name.trim()) errors.push('Nom du thème manquant.');
    if (!form.creator.trim()) errors.push('Créateur manquant.');
    const e1 = checkLink(form.imageUrl, 'Image');
    const e2 = checkLink(form.downloadUrl, 'Téléchargement');
    if (e1) errors.push(e1);
    if (e2) errors.push(e2);
    if (errors.length) {
      setFormError(errors.join(' '));
      return;
    }
    setFormError('');
    const category = FIXED_CATEGORY_SYSTEMS.includes(form.systemName) ? FIXED_CATEGORY : form.category;
    setDrafts((d) => [...d, { key: nextKey, ...form, category, name: form.name.trim(), creator: canonicalCreator(form.creator, knownCreators) }]);
    setNextKey((n) => n + 1);
    // On garde système / catégorie / créateur : Bob enchaîne les thèmes.
    setForm((f) => ({ ...f, name: '', imageUrl: '', downloadUrl: '', size: '', date: '' }));
  };

  const duplicateInfo = (d: Draft): string => {
    const slug = slugOf(d.systemName);
    const dlId = extractDriveFileId(d.downloadUrl);
    const same = existing.find(
      (t) => t.system === slug && t.name.toLowerCase().trim() === d.name.toLowerCase() && extractDriveFileId(t.downloadUrl) === dlId,
    );
    if (same) return 'Déjà dans le catalogue : sera mis à jour, pas dupliqué.';
    const sameName = existing.find((t) => t.system === slug && t.name.toLowerCase().trim() === d.name.toLowerCase());
    if (sameName) return 'Un thème du même nom existe déjà (autre fichier) : il sera ajouté en plus.';
    return '';
  };

  const publish = async () => {
    if (!drafts.length) return;
    setBusy(true);
    setStatus(null);
    try {
      // Date du jour à l'heure locale (toISOString donnerait la veille entre minuit et 1h/2h en France).
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const newThemes: ThemeItem[] = drafts.map((d) => ({
        id: 0,
        name: d.name,
        creator: d.creator,
        system: slugOf(d.systemName),
        category: d.category,
        imageUrl: ensureDisplayableUrl(d.imageUrl.trim(), true),
        downloadUrl: ensureDisplayableUrl(d.downloadUrl.trim(), false),
        size: d.size.trim(),
        date: d.date || today,
        onScreenScraper: false,
        isMulti: false,
      }));
      await onImportThemes(newThemes);
      addUnpushedThemes(newThemes.length);
      setStatus({ type: 'ok', text: `${newThemes.length} thème${newThemes.length > 1 ? 's' : ''} ajouté${newThemes.length > 1 ? 's' : ''} dans l'admin. Dernière étape : onglet « Gérer » puis « Push GitHub » pour les mettre en ligne.` });
      setDrafts([]);
    } catch (err) {
      setStatus({ type: 'err', text: `Échec de l'enregistrement : ${err instanceof Error ? err.message : 'erreur inconnue'}. Rien n'a été perdu, tu peux réessayer.` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-sm text-gray-300">
        Pour les thèmes dont les fichiers sont sur un autre Drive (celui de Bob, par exemple) : ils ne passent ni par l&apos;import Drive ni par le robot.
        Colle le lien Google Drive du <b>fichier</b> (pas du dossier) pour l&apos;image et pour le zip, ajoute à la liste, puis clique sur « Publier ». Pour mettre en ligne sur la vitrine, fais ensuite <b>Push GitHub</b> dans l&apos;onglet « Gérer » (un seul push, quand tu as fini).
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">
        <h2 className="font-bold text-orange-400">Nouveau thème</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Système</label>
            <select className={inputCls} value={form.systemName} onChange={(e) => set('systemName', e.target.value)}>
              {APP_SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {FIXED_CATEGORY_SYSTEMS.includes(form.systemName) ? (
            <div>
              <label className={labelCls}>Catégorie</label>
              <p className="text-sm text-gray-400 py-2">Pas de choix : toujours « Thèmes système ».</p>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Catégorie</label>
              <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Nom du thème (le nom de l&apos;émulateur)</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="ex : RetroArch" />
          </div>
          <div>
            <label className={labelCls}>Créateur</label>
            <input className={inputCls} list="app-known-creators" value={form.creator} onChange={(e) => set('creator', e.target.value)} placeholder="Suggestions dès que tu tapes" />
            <datalist id="app-known-creators">{knownCreators.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className={labelCls}>Lien de l&apos;image (Google Drive)</label>
            <input className={inputCls} value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://drive.google.com/file/d/…" />
          </div>
          <div>
            <label className={labelCls}>Lien du zip (Google Drive)</label>
            <input className={inputCls} value={form.downloadUrl} onChange={(e) => set('downloadUrl', e.target.value)} placeholder="https://drive.google.com/file/d/…" />
          </div>
          <div>
            <label className={labelCls}>Date (facultatif, sinon : aujourd&apos;hui)</label>
            <input type="date" className={inputCls} value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Taille (facultatif)</label>
            <input className={inputCls} value={form.size} onChange={(e) => set('size', e.target.value)} placeholder="ex : 2.6 MB" />
          </div>
        </div>
        {formError && <p className="text-sm text-red-400">{formError}</p>}
        <button
          type="button"
          onClick={addDraft}
          className="px-4 py-2 rounded-full font-bold bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Ajouter à la liste
        </button>
      </div>

      {drafts.length > 0 && (
        <div className="bg-gray-800 border border-orange-600/50 rounded-xl p-4 space-y-3">
          <h2 className="font-bold text-orange-400">À publier ({drafts.length})</h2>
          <ul className="space-y-2">
            {drafts.map((d) => {
              const info = duplicateInfo(d);
              return (
                <li key={d.key} className="flex items-start justify-between gap-3 bg-gray-900 rounded-lg px-3 py-2">
                  <div className="min-w-0 text-sm">
                    <div className="font-bold text-white truncate">{d.name}</div>
                    <div className="text-gray-400 truncate">{d.systemName} · {d.creator}{d.size ? ` · ${d.size}` : ''}{d.date ? ` · ${d.date}` : ''}</div>
                    {info && <div className="text-yellow-400 text-xs mt-1">{info}</div>}
                  </div>
                  <button
                    type="button"
                    aria-label={`Retirer ${d.name} de la liste`}
                    onClick={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}
                    className="text-gray-400 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={publish}
            className="px-5 py-2 rounded-full font-bold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white flex items-center gap-2"
          >
            <Send className="w-5 h-5" /> {busy ? 'Enregistrement…' : `Publier ${drafts.length} thème${drafts.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {status && (
        <p className={`text-sm font-bold ${status.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{status.text}</p>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h2 className="font-bold text-orange-400 mb-2">Déjà dans le catalogue ({existing.length})</h2>
        {existing.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun thème pour l&apos;instant. Pour en modifier ou en supprimer un, utilise l&apos;onglet « Gérer ».</p>
        ) : (
          <>
            <ul className="text-sm text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              {existing.map((t) => (
                <li key={t.id} className="truncate">{t.name} <span className="text-gray-500">· {t.system} · {t.creator}</span></li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mt-2">Pour en modifier ou en supprimer un, utilise l&apos;onglet « Gérer ».</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ApplicationsTab;
