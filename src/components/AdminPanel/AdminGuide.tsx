// Fichier: src/components/AdminPanel/AdminGuide.tsx
//
// Bouton "Guide" + fenêtre d'aide réutilisables pour les onglets de l'admin
// (même style que les guides de Gérer, Packs, Mise en avant...). Le texte de
// chaque guide est passé en paramètre : ce composant ne gère que l'affichage.

import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export interface GuideSection {
  title: string;
  /** Paragraphe(s) de texte */
  content?: React.ReactNode;
  /** Étapes numérotées, dans l'ordre */
  steps?: React.ReactNode[];
  /** Mise en évidence (encadré jaune) */
  warning?: boolean;
}

interface AdminGuideProps {
  title: string;
  sections: GuideSection[];
}

const AdminGuide: React.FC<AdminGuideProps> = ({ title, sections }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-colors border border-gray-700"
      >
        <HelpCircle className="w-4 h-4" /> Guide
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h3 className="text-lg font-black text-orange-400">{title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white"
                aria-label="Fermer le guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-300">
              {sections.map((s) => (
                <section
                  key={s.title}
                  className={s.warning ? 'rounded-xl border border-yellow-500/50 bg-yellow-900/20 p-3' : ''}
                >
                  <h4 className={`font-bold mb-1 ${s.warning ? 'text-yellow-400' : 'text-cyan-400'}`}>{s.title}</h4>
                  {s.content && <div className="space-y-2">{s.content}</div>}
                  {s.steps && (
                    <ol className="list-decimal pl-5 space-y-1.5">
                      {s.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminGuide;
