// Fichier: src/components/ErrorBoundary/ErrorBoundary.tsx
//
// Filet de sécurité autour de toute l'application.
//
// Sans lui, la moindre erreur non gérée dans un composant fait démonter tout
// React : il ne reste que le fond du body (#0f0519), donc une "page noire"
// sans aucune explication. Ici, on affiche à la place un écran clair avec le
// message d'erreur réel (utile pour diagnostiquer) et deux actions.
//
// Cas particulier : erreur de chargement d'un fichier JS (typiquement après
// un nouveau déploiement, quand l'onglet ouvert référence d'anciens fichiers
// qui n'existent plus). Dans ce cas, un simple rechargement règle le problème,
// donc on le fait automatiquement UNE seule fois (garde-fou sessionStorage
// pour ne jamais tourner en boucle).
//
// NB : les styles sont en ligne exprès (pas de dépendance à Tailwind) pour que
// cet écran s'affiche même si le CSS n'a pas pu se charger.

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

const RELOAD_FLAG = 'hyperbat_chunk_reload';

// Clés localStorage de l'admin (éditions locales non poussées, brouillons).
// On garde volontairement 'hyperbat_admin_name' et 'hyperbat_drive_api_key'
// pour ne pas obliger à les ressaisir.
const ADMIN_LOCAL_KEYS = [
  'admin-links',
  'hyperbat_themes',
  'hyperbat_theme_packs',
  'hyperbat_cooldown',
  'driveUrls',
];

const CHUNK_ERROR_PATTERN =
  /dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically/i;

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('❌ Erreur interceptée par ErrorBoundary :', error, info.componentStack);

    if (CHUNK_ERROR_PATTERN.test(error?.message ?? '')) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
        }
      } catch {
        // sessionStorage indisponible : on laisse l'écran d'erreur affiché.
      }
    }
  }

  private handleReload = () => {
    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      /* ignoré */
    }
    window.location.reload();
  };

  private handleResetLocal = () => {
    const ok = window.confirm(
      "Supprimer les modifications de l'admin enregistrées sur cet ordinateur mais pas encore poussées sur GitHub ?\n\nCe qui est déjà publié sur le site n'est pas touché."
    );
    if (!ok) return;
    try {
      ADMIN_LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignoré */
    }
    this.handleReload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isChunkError = CHUNK_ERROR_PATTERN.test(error.message ?? '');

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          background: '#0f0519',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: '100%',
            background: '#1a1a1a',
            border: '2px solid #FF8C00',
            borderRadius: 16,
            padding: 28,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px', color: '#FFA500' }}>
            La page a rencontré une erreur
          </h1>

          <p style={{ margin: '0 0 12px', lineHeight: 1.5, color: '#d1d5db' }}>
            {isChunkError
              ? "Le site a été mis à jour pendant que cette page était ouverte. Recharge la page pour récupérer la dernière version."
              : "Un élément de la page n'a pas pu s'afficher. Recharge la page. Si le problème revient, le détail ci-dessous permet de trouver la cause."}
          </p>

          <p style={{ margin: '0 0 16px', lineHeight: 1.5, color: '#9ca3af', fontSize: 14 }}>
            Si tu étais dans l'admin, le verrou reste posé sur GitHub jusqu'à 8 h. À la prochaine
            connexion, utilise « Forcer l'accès ».
          </p>

          <pre
            style={{
              margin: '0 0 20px',
              padding: 12,
              background: '#0f0519',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#fca5a5',
              fontSize: 12,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 160,
              overflow: 'auto',
            }}
          >
            {error.name}: {error.message}
          </pre>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                background: 'linear-gradient(90deg, #FF8C00, #FFD700)',
                color: '#000',
                fontWeight: 800,
                border: 'none',
                borderRadius: 10,
                padding: '10px 18px',
                cursor: 'pointer',
              }}
            >
              Recharger la page
            </button>
            <button
              type="button"
              onClick={this.handleResetLocal}
              style={{
                background: 'transparent',
                color: '#d1d5db',
                fontWeight: 600,
                border: '1px solid #4b5563',
                borderRadius: 10,
                padding: '10px 18px',
                cursor: 'pointer',
              }}
            >
              Effacer les données locales de l'admin
            </button>
          </div>
        </div>
      </div>
    );
  }
}
