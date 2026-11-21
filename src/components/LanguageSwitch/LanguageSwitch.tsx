// Fichier: src/components/LanguageSwitch/LanguageSwitch.tsx
//
// Sélecteur de langue : quatre drapeaux (France, Royaume-Uni, Espagne, Brésil)
// en haut à droite.
// Les drapeaux sont dessinés en SVG (et non en emoji) : Windows n'affiche pas
// les drapeaux emoji, il montrerait juste les lettres « FR » et « GB ».
// Styles en ligne pour qu'il s'affiche partout sans dépendre d'une page.
import { useEffect, useRef, useState } from 'react';
import { useLang } from '../../i18n';
import type { Lang } from '../../i18n';

const FlagFR = () => (
  <svg width="26" height="18" viewBox="0 0 3 2" aria-hidden="true" style={{ display: 'block', borderRadius: 2 }}>
    <rect width="1" height="2" x="0" fill="#0055A4" />
    <rect width="1" height="2" x="1" fill="#FFFFFF" />
    <rect width="1" height="2" x="2" fill="#EF4135" />
  </svg>
);

const FlagGB = () => (
  <svg width="26" height="18" viewBox="0 0 60 40" aria-hidden="true" style={{ display: 'block', borderRadius: 2 }}>
    <rect width="60" height="40" fill="#012169" />
    <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
    <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3" />
    <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="13" />
    <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8" />
  </svg>
);

const FlagES = () => (
  <svg width="26" height="18" viewBox="0 0 4 3" aria-hidden="true" style={{ display: 'block', borderRadius: 2 }}>
    <rect width="4" height="3" fill="#AA151B" />
    <rect y="0.75" width="4" height="1.5" fill="#F1BF00" />
  </svg>
);

const FlagBR = () => (
  <svg width="26" height="18" viewBox="0 0 20 14" aria-hidden="true" style={{ display: 'block', borderRadius: 2 }}>
    <rect width="20" height="14" fill="#009C3B" />
    <path d="M10,1.6 L18.2,7 L10,12.4 L1.8,7 Z" fill="#FFDF00" />
    <circle cx="10" cy="7" r="3.1" fill="#002776" />
    <path d="M7,6.4 Q10,5.6 13,7.8" stroke="#FFFFFF" strokeWidth="0.5" fill="none" />
  </svg>
);

const LANGS: { id: Lang; name: string; Flag: () => JSX.Element }[] = [
  { id: 'fr', name: 'Français', Flag: FlagFR },
  { id: 'en', name: 'English', Flag: FlagGB },
  { id: 'es', name: 'Español', Flag: FlagES },
  { id: 'pt', name: 'Português', Flag: FlagBR },
];

const LanguageSwitch = ({ inline = false }: { inline?: boolean }) => {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!inline) return;
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [inline]);

  // Variante « en-tête » : menu déroulant identique à celui du site principal.
  if (inline) {
    const current = LANGS.find(l => l.id === lang) ?? LANGS[1];
    return (
      <div className={'langs' + (open ? ' open' : '')} ref={boxRef} role="group" aria-label={t('lang.switch')} translate="no">
        <button type="button" className="cur" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <current.Flag /><span>{current.id.toUpperCase()}</span>
          <svg className="chev" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" /></svg>
        </button>
        {open && (
          <div className="menu" role="listbox">
            {LANGS.map(({ id, name, Flag }) => (
              <button key={id} type="button" role="option" aria-selected={lang === id} onClick={() => { setLang(id); setOpen(false); }}>
                <Flag /><span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

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
        gap: 2,
        padding: 3,
        alignItems: 'center',
        borderRadius: 9999,
        background: 'rgba(15,28,50,0.95)',
        border: '2px solid #3d7be0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 0 2px rgba(61,123,224,0.25)',
      }}
    >
      {LANGS.map(({ id, name, Flag }) => {
        const active = lang === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLang(id)}
            aria-pressed={active}
            aria-label={name}
            title={name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 11px',
              borderRadius: 9999,
              border: 'none',
              cursor: 'pointer',
              background: active ? '#3d7be0' : 'transparent',
              opacity: active ? 1 : 0.65,
            }}
          >
            <Flag />
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitch;
