// Fichier: src/components/AdminPanel/SubmissionsTab.tsx
//
// Onglet "Soumissions" : liste les dépôts en attente envoyés depuis la page
// publique "Proposer un thème". Reprend le style de ManageTab (cartes,
// modale d'édition) pour rester cohérent avec le reste de l'admin.
//
// - "Modifier" ouvre une modale identique à celle de ManageTab, pour
//   corriger nom/système/catégorie/créateur avant validation.
// - "Approuver" déplace les fichiers dans le bon dossier définitif (le
//   robot s'en charge) et ajoute le thème au catalogue via onApprove.
// - "Supprimer" (avec confirmation) supprime réellement le dépôt : fichiers
//   envoyés à la corbeille Drive, ligne retirée de la feuille — ce n'est
//   plus un simple statut "rejeté" avec fichiers laissés en place.
//
// RAPPEL IMPORTANT (bandeau fixe ci-dessous) : approuver un thème ne le
// publie PAS sur le site tout seul — il faut ensuite aller dans l'onglet
// "Gérer" et cliquer sur Push, sinon le thème reste invisible pour les
// visiteurs même s'il a l'air "fait" ici.

import { useEffect, useState } from 'react';
import { RefreshCw, Edit2, X, Check, Trash2, Inbox, AlertTriangle } from 'lucide-react';
import { SystemRow, Category, NewThemeForm } from '../../types';
import { AutocompleteSelect } from '../shared/AutocompleteSelect';
import { ROBOT_ENDPOINT } from '../../config/robotEndpoint';

type PendingSubmission = {
  id: string;
  date: string;
  nom: string;
  systeme: string;
  famille: string;
  categorie: string;
  createur: string;
  drive: string;
  imageUrl: string;
};

interface SubmissionsTabProps {
  systems: SystemRow[];
  categories: Category[];
  existingThemesCount: number;
  onApprove: (theme: NewThemeForm) => Promise<void>;
}

export default function SubmissionsTab({ systems, categories, onApprove }: SubmissionsTabProps) {
  const [items, setItems] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PendingSubmission | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PendingSubmission | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const availableSystems = systems.filter((s) => !s.isHeader && !s.isSubHeader);

  const configured = ROBOT_ENDPOINT.indexOf('À_REMPLIR') !== 0;

  const loadItems = async () => {
    if (!configured) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${ROBOT_ENDPOINT}?action=list`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Erreur inconnue.');
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les dépôts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (item: PendingSubmission) => {
    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch(ROBOT_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          action: 'approve',
          id: item.id,
          nom: item.nom,
          systeme: item.systeme,
          categorie: item.categorie,
          createur: item.createur,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Approbation impossible.');

      // Important : theme.system doit être la forme COURTE normalisée
      // (ex: "nes"), exactement comme le fait DriveTab via
      // generateSystemMapping() — PAS l'identifiant long de generateSystems()
      // (ex: "home-nintendo-nes"), qui casserait le filtre par système sur
      // la vitrine puisque le reste du catalogue utilise la forme courte.
      const normalizedSystem = item.systeme.toLowerCase().replace(/[^a-z0-9]+/g, '');

      await onApprove({
        name: data.theme.name,
        creator: data.theme.creator,
        system: normalizedSystem,
        category: data.theme.category,
        imageUrl: data.theme.imageUrl,
        downloadUrl: data.theme.downloadUrl,
        size: data.theme.size,
        // formatDateFR() (utilisé partout ailleurs pour l'affichage) attend
        // un simple "YYYY-MM-DD" et le découpe avec split('-') — un
        // toISOString() complet ("...T19:42:32.147Z") casse cet affichage.
        date: new Date().toISOString().slice(0, 10),
      });

      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur pendant l\'approbation.');
    } finally {
      setBusyId(null);
      loadItems(); // toujours se resynchroniser sur l'état réel du serveur
    }
  };

  // Appelée seulement après confirmation (voir ConfirmDeleteModal). Supprime
  // vraiment le dépôt : fichiers à la corbeille Drive + ligne retirée du Sheet
  // (c'est Code.gs qui fait ce travail, ici on ne fait que déclencher l'appel).
  const handleDelete = async (item: PendingSubmission) => {
    setConfirmDelete(null);
    setBusyId(item.id);
    setError('');
    try {
      const res = await fetch(ROBOT_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ action: 'reject', id: item.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Suppression impossible.');
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur pendant la suppression.');
    } finally {
      setBusyId(null);
      loadItems(); // toujours se resynchroniser sur l'état réel du serveur
    }
  };

  const handleSaveEdit = (edited: PendingSubmission) => {
    setItems((prev) => prev.map((i) => (i.id === edited.id ? edited : i)));
    setEditing(null);
  };

  if (!configured) {
    return (
      <div className="bg-gray-800 border-2 border-yellow-500/50 rounded-xl p-6 text-center">
        <p className="text-yellow-400 font-bold mb-2">⚠️ Robot pas encore branché</p>
        <p className="text-gray-300 text-sm">
          Renseigne l'URL du robot dans <code className="bg-gray-950 px-1.5 py-0.5 rounded">src/config/robotEndpoint.ts</code> une fois qu'il est déployé, pour voir apparaître les dépôts ici.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Bandeau fixe — toujours visible tant que l'onglet Soumissions est
          ouvert, pas seulement après une action. Non fermable, exprès. */}
      <div className="flex items-start gap-3 bg-amber-900/30 border-2 border-amber-500/60 rounded-xl p-4 mb-6">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-amber-300 text-sm font-semibold">
          Rappel : approuver un thème ici ne le publie pas tout seul sur le site.
          Une fois tes approbations faites, va dans l'onglet <span className="font-black">"Gérer"</span> et
          clique sur <span className="font-black">Push</span> pour les rendre visibles pour les visiteurs.
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-300 font-bold">
          {items.length} dépôt{items.length > 1 ? 's' : ''} en attente
        </p>
        <button
          onClick={loadItems}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full font-bold text-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border-2 border-red-500/50 rounded-xl p-4 mb-6 text-red-300 text-sm font-semibold">
          {error}
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div className="bg-gray-800/50 border-2 border-gray-700/50 rounded-xl p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-semibold">Aucun dépôt en attente pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((item) => (
            <SubmissionCard
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onEdit={() => setEditing(item)}
              onApprove={() => handleApprove(item)}
              onRequestDelete={() => setConfirmDelete(item)}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditSubmissionModal
          item={editing}
          systems={availableSystems}
          categories={categories}
          onSave={handleSaveEdit}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          item={confirmDelete}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── SubmissionCard ────────────────────────────────────────────────────────────
const SubmissionCard = ({
  item,
  busy,
  onEdit,
  onApprove,
  onRequestDelete,
}: {
  item: PendingSubmission;
  busy: boolean;
  onEdit: () => void;
  onApprove: () => void;
  onRequestDelete: () => void;
}) => (
  <div className="group relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-xl overflow-hidden border-2 border-gray-700/50 hover:border-orange-500/50 transition-all duration-300">
    <div className="relative h-40 overflow-hidden bg-gray-950">
      <img src={item.imageUrl} alt={item.nom} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    </div>

    <div className="p-3 space-y-2">
      <h3 className="text-white font-bold text-base truncate">{item.nom}</h3>
      <p className="text-sm font-bold text-gray-400">Par {item.createur || 'Créateur inconnu'}</p>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full text-white font-semibold">
          🎮 {item.systeme}
        </span>
        <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold">
          {item.categorie}
        </span>
      </div>

      <div className="flex gap-1.5 pt-2">
        <button
          onClick={onEdit}
          disabled={busy}
          title="Modifier avant validation"
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onApprove}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          Approuver
        </button>
        <button
          onClick={onRequestDelete}
          disabled={busy}
          className="p-2 bg-transparent border border-red-500 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

// ── ConfirmDeleteModal ────────────────────────────────────────────────────────
// Confirmation avant suppression réelle : fichiers à la corbeille Drive +
// ligne retirée du Sheet. Action plus définitive qu'un simple "rejeté", donc
// on demande confirmation avant de déclencher l'appel au robot.
const ConfirmDeleteModal = ({
  item,
  onConfirm,
  onCancel,
}: {
  item: PendingSubmission;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onCancel}>
    <div
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-2 border-red-500 max-w-sm w-full shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white mb-1">Supprimer ce dépôt ?</h2>
          <p className="text-gray-400 text-sm">
            <span className="font-bold text-white">"{item.nom}"</span> par {item.createur || 'un créateur inconnu'} —
            le zip et l'image partiront à la corbeille Drive, et la ligne sera retirée de la feuille Soumissions.
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-sm">
            Annuler
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ── EditSubmissionModal ───────────────────────────────────────────────────────
// Reprend exactement le style de l'EditModal de ManageTab (même dégradé
// d'en-tête, mêmes classes d'input) pour ne pas introduire une variante visuelle.
const EditSubmissionModal = ({
  item,
  systems,
  categories,
  onSave,
  onClose,
}: {
  item: PendingSubmission;
  systems: SystemRow[];
  categories: Category[];
  onSave: (item: PendingSubmission) => void;
  onClose: () => void;
}) => {
  const [editData, setEditData] = useState<PendingSubmission>({ ...item });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-2 border-orange-500 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 p-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Modifier avant validation
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(editData);
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Nom du thème *</label>
            <input
              type="text"
              required
              value={editData.nom}
              onChange={(e) => setEditData({ ...editData, nom: e.target.value })}
              className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Créateur *</label>
            <input
              type="text"
              required
              value={editData.createur}
              onChange={(e) => setEditData({ ...editData, createur: e.target.value })}
              className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Système *</label>
            <AutocompleteSelect
              options={systems}
              value={systems.find((s) => s.name === editData.systeme)?.id ?? ''}
              onChange={(id) => {
                const found = systems.find((s) => s.id === id);
                setEditData({ ...editData, systeme: found?.name ?? editData.systeme });
              }}
              placeholder="Écris un système…"
              emptyLabel={editData.systeme}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Catégorie *</label>
            <select
              required
              value={editData.categorie}
              onChange={(e) => setEditData({ ...editData, categorie: e.target.value })}
              className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold">
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 text-white rounded-lg font-bold shadow-lg"
            >
              💾 Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};