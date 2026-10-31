// Fichier: src/components/LanguageSwitch/LanguageSwitch.tsx
//
// Petit sélecteur FR | EN. Styles en ligne (comme l'écran d'erreur) pour qu'il
// s'affiche partout sans dépendre d'une page particulière.
import { useLang } from '../../i18n';
import type { Lang } from '../../i18n';

const LANGS: { id: Lang; label: string }[] = [
  { id: 'fr', label: 'FR' },
  { id: 'en', label: 'EN' },
];

const LanguageSwitch = () => {
  const { lang, setLang, t } = useLang();
  return (
    <div
      role="group"
      aria-label={t('lang.switch')}
      translate="no"
      style={{
        position: 'fixed',
        top: 14,
        right: 14,
        zIndex: 9999,
        display: 'flex',
        gap: 4,
        padding: 4,
        alignItems: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,140,0,0.25)',
        borderRadius: 9999,
        background: 'rgba(15,5,25,0.95)',
        border: '2px solid #FF8C00',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16, padding: '0 2px 0 8px' }}>🌐</span>
      {LANGS.map((l) => {
        const active = lang === l.id;
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => setLang(l.id)}
            aria-pressed={active}
            style={{
              padding: '7px 16px',
              borderRadius: 9999,
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 0.5,
              background: active ? '#FF8C00' : 'transparent',
              color: active ? '#0f0519' : '#d1d5db',
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitch;
