// En-tête partagé avec le site principal (même menu, mêmes libellés).
import { useEffect, useState } from 'react';
import { useLang } from '../../i18n';
import LanguageSwitch from '../LanguageSwitch/LanguageSwitch';
import logoNav from '../../assets/logo-nav.webp';
import logoVitrine from '../../assets/logo-vitrine.webp';

export const NAV_LABELS: Record<string, Record<string, string>> = {
  "fr": {
    "home": "Accueil",
    "vitrine": "Vitrine HyperBat Media",
    "resources": "Ressources",
    "tutos": "Tutos",
    "tools": "Outils",
    "bob": "Thèmes de Bob",
    "community": "Communauté",
    "creators": "Créateurs",
    "thanks": "Remerciements",
    "forum": "Forum",
    "legal": "Les marques et personnages cités ou représentés appartiennent à leurs propriétaires respectifs."
  },
  "en": {
    "home": "Home",
    "vitrine": "HyperBat Media Showcase",
    "resources": "Resources",
    "tutos": "Tutorials",
    "tools": "Tools",
    "bob": "Bob’s Themes",
    "community": "Community",
    "creators": "Creators",
    "thanks": "Thanks",
    "forum": "Forum",
    "legal": "Trademarks and characters mentioned or shown belong to their respective owners."
  },
  "es": {
    "home": "Inicio",
    "vitrine": "Escaparate HyperBat Media",
    "resources": "Recursos",
    "tutos": "Tutoriales",
    "tools": "Herramientas",
    "bob": "Temas de Bob",
    "community": "Comunidad",
    "creators": "Creadores",
    "thanks": "Agradecimientos",
    "forum": "Foro",
    "legal": "Las marcas y los personajes mencionados o representados pertenecen a sus respectivos propietarios."
  },
  "pt": {
    "home": "Início",
    "vitrine": "Vitrine HyperBat Media",
    "resources": "Recursos",
    "tutos": "Tutoriais",
    "tools": "Ferramentas",
    "bob": "Temas do Bob",
    "community": "Comunidade",
    "creators": "Criadores",
    "thanks": "Agradecimentos",
    "forum": "Fórum",
    "legal": "As marcas e os personagens citados ou representados pertencem aos seus respectivos proprietários."
  }
};

export default function SiteHeader({ minimal = false }: { minimal?: boolean }): JSX.Element {
  const { lang } = useLang();
  const [navOpen, setNavOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  useEffect(() => {
    const close = () => setOpenMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const NL = NAV_LABELS[lang] ?? NAV_LABELS.fr;

  // Variante réduite (page de dépôt) : seulement le logo de la vitrine et la langue,
  // pour ne pas offrir de sorties qui feraient perdre un formulaire en cours.
  if (minimal) {
    return (
      <header className="hb-top">
        <div className="bar" style={{ justifyContent: 'space-between' }}>
          <a className="logo" href={import.meta.env.BASE_URL} aria-label="HyperBat Media">
            <img src={logoVitrine} alt="HyperBat Media" style={{ height: 40 }} />
          </a>
          <div className="right">
            <LanguageSwitch inline />
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className="hb-top">
      <div className="bar">
            <a className="logo" href="https://hyperbatmedia.github.io/" aria-label="RetroGamingHyperbat"><img src={logoNav} alt="RetroGamingHyperbat" /></a>
            <button type="button" className="burger" aria-label="Menu" aria-expanded={navOpen} onClick={(e) => { e.stopPropagation(); setNavOpen(o => !o); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>
            <nav aria-label="Menu" className={navOpen ? 'open' : ''}>
              <a href="https://hyperbatmedia.github.io/">{NL.home}</a>
              <a href="#" className="active" aria-current="page">{NL.vitrine}</a>
              <div className={'ddn' + (openMenu === 'res' ? ' open' : '')}>
                <button type="button" className="ddn-btn" aria-expanded={openMenu === 'res'} onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'res' ? null : 'res'); }}><span>{NL.resources}</span><svg className="chev" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" /></svg></button>
                <div className="ddn-menu">
                  <a href="https://hyperbatmedia.github.io/#tutos">{NL.tutos}</a>
                  <a href="https://hyperbatmedia.github.io/#outils">{NL.tools}</a>
                  <a href="https://hyperbatmedia.github.io/#bob">{NL.bob}</a>
                </div>
              </div>
              <div className={'ddn' + (openMenu === 'com' ? ' open' : '')}>
                <button type="button" className="ddn-btn" aria-expanded={openMenu === 'com'} onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'com' ? null : 'com'); }}><span>{NL.community}</span><svg className="chev" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" /></svg></button>
                <div className="ddn-menu">
                  <a href="https://hyperbatmedia.github.io/#createurs">{NL.creators}</a>
                  <a href="https://hyperbatmedia.github.io/#remerciements">{NL.thanks}</a>
                </div>
              </div>
              <a href="https://retrogaminghyperbat.forumotion.com/" target="_blank" rel="noopener noreferrer">{NL.forum}</a>
            </nav>
            <div className="right">
              <a className="discord ytl" href="https://www.youtube.com/@BobMoraneRetro" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" /></svg><span>YouTube</span></a>
              <a className="discord" href="https://discord.com/invite/msnaz7Kev7" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" /></svg><span>Discord</span></a>
              <LanguageSwitch inline />
            </div>
          </div>
    </header>
  );
}
