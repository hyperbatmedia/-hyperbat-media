// Fichier: src/agent/AgentInstallFlow.tsx
//
// Fenêtre modale d'installation d'un thème via l'agent local HyperBat
// Media (voir hyperbatAgent.ts). Remplace, côté web, les fenêtres
// AutoHotkey du package Windows historique : choix de la ROM (avec
// suggestion), nom de collection, conflit Remplacer/Renommer/Annuler,
// progression téléchargement/extraction/installation.
//
// NAVIGATION : souris, clavier (flèches / Entrée / Échap) et manette.
// La manette est lue directement via l'API Gamepad, avec les mêmes règles
// que useGamepadGridNav (la navigation de la grille) : D-Pad standard
// indexes 12-15 OU axes 0/1 (nombre de manettes remontent leur croix via
// les axes), boutons considérés appuyés si .pressed ou .value > 0.5,
// répétition automatique quand une direction est maintenue. SUD/EST
// viennent des paramètres d'URL btnSud/btnEst comme le reste du mode
// kiosque, avec repli sur le mapping standard 0/1 - nécessaire sur
// Batocera où aucun paramètre n'est calibré.
//
// ANTI-DOUBLE-DÉCLENCHEMENT : sous Windows, le launcher AHK relaie le
// bouton SUD en VRAIE touche Entrée vers l'élément focusé (mécanisme
// requis par hyperbat://, conservé pour compatibilité). Avec l'agent, la
// lecture Gamepad directe ci-dessous déclenche AUSSI l'élément focusé :
// le même appui produirait donc deux activations. Toutes les actions
// passent par une garde temporelle (ACTION_GUARD_MS) qui absorbe le
// doublon, quelle qu'en soit la source (Entrée AHK, Gamepad API, Entrée
// clavier natif).

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  AgentInfo, AgentJobStatus,
  agentRoms, agentCheckConflict, agentStartInstall, agentStatus, agentReloadEs,
} from './hyperbatAgent';
import GamepadVirtualKeyboard from '../components/ThemeList/GamepadVirtualKeyboard';

/** Sous-ensemble de ThemeItem réellement nécessaire ici (compatible
 *  structurellement : pas d'import de ../../types pour garder ce module
 *  autonome). */
export interface AgentTheme {
  downloadUrl: string;
  system: string;
  category: string;
  name: string;
  gameId?: string | number;
}

interface AgentInstallFlowProps {
  theme: AgentTheme;
  agentInfo: AgentInfo;
  onClose: () => void;
}

type Step =
  | 'init'             // vérifications + chargement éventuel des ROMs
  | 'rom-pick'         // game-themes : choix de la ROM
  | 'collection-name'  // collections : choix du nom de dossier
  | 'conflict'         // un thème existe déjà : Remplacer/Renommer/Annuler
  | 'installing'       // téléchargement/extraction/installation
  | 'done'
  | 'error';

const ACTION_GUARD_MS = 400;
const COLLECTION_SLUG = 'collectionspersonnalises';

/** 0 = champ Filtrer, puis les boutons ROM. Le ⭐ est donc a index+1. */
function romPickFocusIndex(romList: string[], suggested: string, romsFound: boolean): number {
  if (!romsFound || !suggested) return 0;
  const idx = romList.indexOf(suggested);
  return idx >= 0 ? idx + 1 : 0;
}

/** Centre un bouton ROM dans la liste scrollable ; sinon nearest (champs/boutons). */
function scrollFocusableIntoView(el: HTMLElement) {
  el.focus({ preventScroll: true });
  const list = el.closest('[data-hbagent-romlist]') as HTMLElement | null;
  if (!list) {
    el.scrollIntoView({ block: 'nearest' });
    return;
  }
  const elRect = el.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  const elCenter = list.scrollTop + (elRect.top - listRect.top) + elRect.height / 2;
  const maxScroll = Math.max(0, list.scrollHeight - list.clientHeight);
  list.scrollTop = Math.max(0, Math.min(elCenter - list.clientHeight / 2, maxScroll));
}

const errorText = (st: AgentJobStatus): string => {
  switch (st.error) {
    case 'conflict':
      return 'Un thème existe déjà à cet emplacement.';
    case 'download_failed':
      return 'Téléchargement impossible.\nVérifiez votre connexion internet et réessayez.';
    case 'invalid_link':
      return "Le lien pointe vers une page web et non un fichier.\nLe fichier a peut-être été supprimé ou le quota de téléchargement est dépassé.";
    case 'extract_tool_missing':
      return "Cette archive (.7z ou .rar) nécessite un outil d'extraction.\nSous Windows : installez 7-Zip (https://www.7-zip.org/).";
    case 'extract_failed':
      return "Impossible d'extraire l'archive.\nLe fichier est peut-être corrompu.";
    case 'busy':
      return "Une installation est déjà en cours.\nAttendez qu'elle se termine puis réessayez.";
    default:
      return `Erreur inattendue${st.detail ? ` : ${st.detail}` : '.'}`;
  }
};

const AgentInstallFlow: React.FC<AgentInstallFlowProps> = ({ theme, agentInfo, onClose }) => {
  const [step, setStep] = useState<Step>('init');
  const [roms, setRoms] = useState<string[]>([]);
  const [romsFound, setRomsFound] = useState(true);
  const [suggested, setSuggested] = useState('');
  const [filter, setFilter] = useState('');
  const [collectionName, setCollectionName] = useState(theme.name);
  const [jobStatus, setJobStatus] = useState<AgentJobStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [focusIdx, setFocusIdx] = useState(0);
  // Clavier virtuel (filtre ROM / nom manuel / nom collection)
  type OskField = 'filter' | 'collection';
  const [oskOpen, setOskOpen] = useState(false);
  const [oskField, setOskField] = useState<OskField>('filter');
  const [oskInitial, setOskInitial] = useState('');
  const oskOpenRef = useRef(false);
  oskOpenRef.current = oskOpen;
  // Après OK/EST du clavier : ignorer SUD/EST tant qu'ils restent enfoncés.
  const oskWaitReleaseRef = useRef(false);
  const [esReloaded, setEsReloaded] = useState(false);
  const [reloadingEs, setReloadingEs] = useState(false);

  const isCollection = theme.system === COLLECTION_SLUG || theme.category === 'collection';
  const isGameTheme = theme.category === 'game-themes' && theme.system !== COLLECTION_SLUG;

  // Nom (ROM ou collection) retenu au moment où le conflit est détecté,
  // pour relancer l'installation avec la politique choisie par l'utilisateur.
  const pendingRef = useRef<{ romName: string; finalName: string }>({ romName: '', finalName: theme.name });
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // ── Garde anti-double-déclenchement (voir en-tête de fichier) ─────────
  // Initialisée à l'instant du montage : l'appui qui a OUVERT la fenêtre
  // arrive souvent en double (Entrée AHK + Gamepad API) - le doublon, reçu
  // juste après l'ouverture, ne doit pas cliquer le premier élément focusé.
  const lastActionRef = useRef(Date.now());
  const guard = useCallback((fn: () => void) => {
    const now = Date.now();
    if (now - lastActionRef.current < ACTION_GUARD_MS) return;
    lastActionRef.current = now;
    fn();
  }, []);

  // ── Chaîne de focus : query DOM dans la modale (pas un tableau vidé a
  // chaque render — sinon le poll manette 80 ms tombe sur length=0 et
  // move() reste a 0 = bloque sur Remplacer ; seul EST/Annuler marchait).
  const getFocusables = useCallback((): HTMLElement[] => {
    const root = document.querySelector('[data-hbagent-flow]');
    const scope = root || document;
    return Array.from(
      scope.querySelectorAll<HTMLElement>('.hbagent-focusable'),
    ).filter((el) => {
      if ((el as HTMLButtonElement).disabled) return false;
      return el.getClientRects().length > 0;
    });
  }, []);

  const focusIdxRef = useRef(0);
  focusIdxRef.current = focusIdx;
  const stepRef = useRef<Step>(step);
  stepRef.current = step;

  const move = useCallback((delta: number) => {
    setFocusIdx((i) => {
      const max = getFocusables().length - 1;
      if (max < 0) return 0;
      return Math.min(Math.max(i + delta, 0), max);
    });
  }, [getFocusables]);

  useEffect(() => {
    const nodes = getFocusables();
    const el = nodes[focusIdx];
    if (!el) return;
    // rAF : la liste ROM n'a sa vraie hauteur qu'apres layout.
    const id = window.requestAnimationFrame(() => scrollFocusableIntoView(el));
    return () => window.cancelAnimationFrame(id);
  }, [focusIdx, step, filter, roms, getFocusables]);

  // Miroir AHK : ReloadRetroBatThemes() apres fermeture du dialogue succes.
  // Place AVANT le hook manette : SUD/EST sur l'ecran "done" l'appelle.
  // Delai mini d'affichage : sous Batocera /reload-es repond souvent en
  // quelques ms — sans pause, "Rafraichissement…" n'apparait pas et le SUD
  // encore enfonce rebondit sur Installer a la fermeture.
  const RELOAD_UI_MIN_MS = 1200;
  const finishWithReload = useCallback(() => {
    guard(() => {
      if (reloadingEs) return;
      setReloadingEs(true);
      void (async () => {
        const started = Date.now();
        const ok = esReloaded || await agentReloadEs();
        const left = RELOAD_UI_MIN_MS - (Date.now() - started);
        if (left > 0) await new Promise((r) => setTimeout(r, left));
        if (mountedRef.current) setEsReloaded(ok);
        if (mountedRef.current) setReloadingEs(false);
        onClose();
      })();
    });
  }, [guard, reloadingEs, esReloaded, onClose]);

  const handleBack = useCallback(() => {
    // Pendant l'installation : impossible d'annuler (le job continue côté
    // agent de toute façon), on attend la fin pour garder le message final.
    if (stepRef.current === 'installing' || stepRef.current === 'init') return;
    // Sur tous les autres écrans, y compris 'done' : fermeture immédiate
    // sans action supplémentaire. Sur 'done' en particulier, ça ferme SANS
    // recharger EmulationStation (contrairement au bouton OK qui déclenche
    // le rafraîchissement) - retour rapide à la vitrine.
    guard(onClose);
  }, [guard, onClose]);

  // ── Lancement de l'installation + suivi du job ────────────────────────
  const launchInstall = useCallback(async (
    finalName: string, romName: string, onConflict: 'replace' | 'rename' | 'abort',
  ) => {
    setStep('installing');
    setJobStatus(null);
    let jobId = '';
    try {
      const { id } = await agentStartInstall({
        url: theme.downloadUrl,
        system: theme.system,
        category: theme.category,
        name: finalName,
        gameId: theme.gameId !== undefined && theme.gameId !== null ? String(theme.gameId) : undefined,
        romName: romName || undefined,
        onConflict,
      });
      jobId = id;
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'busy') {
        setErrorMsg(errorText({ id: '', state: 'error', error: 'busy' }));
      } else if (code === 'multiple_retrobat_installs') {
        setErrorMsg('Plusieurs installations RetroBat ont été détectées.\nRelancez install-agent.bat pour choisir laquelle utiliser.');
      } else {
        setErrorMsg("Impossible de contacter l'agent HyperBat Media.\nVérifiez qu'il est bien démarré, puis réessayez.");
      }
      setStep('error');
      return;
    }

    let failures = 0;
    for (;;) {
      await new Promise((r) => setTimeout(r, 500));
      if (!mountedRef.current) return;
      let st: AgentJobStatus;
      try {
        st = await agentStatus(jobId);
        failures = 0;
      } catch {
        failures += 1;
        if (failures >= 10) {
          setErrorMsg("La connexion avec l'agent a été perdue pendant l'installation.");
          setStep('error');
          return;
        }
        continue;
      }
      if (!mountedRef.current) return;
      setJobStatus(st);
      if (st.state === 'done') {
        // Comme l'AHK : le F5 se fait au moment du OK (geste utilisateur),
        // pas ici en thread d'arrière-plan. esReloaded côté job reste false
        // sous Windows ; la vitrine appellera agentReloadEs() au OK.
        if (st.esReloaded) setEsReloaded(true);
        setStep('done');
        return;
      }
      if (st.state === 'error') { setErrorMsg(errorText(st)); setStep('error'); return; }
    }
  }, [theme]);

  // ── Vérification de conflit puis installation ─────────────────────────
  const proceedWith = useCallback(async (finalName: string, romName: string) => {
    pendingRef.current = { romName, finalName };
    try {
      const conflict = await agentCheckConflict({
        category: theme.category, system: theme.system,
        romName: romName || undefined, name: finalName,
      });
      if (!mountedRef.current) return;
      if (conflict.exists) {
        setStep('conflict');
      } else {
        await launchInstall(finalName, romName, 'abort');
      }
    } catch {
      if (!mountedRef.current) return;
      setErrorMsg("Impossible de contacter l'agent HyperBat Media.\nVérifiez qu'il est bien démarré, puis réessayez.");
      setStep('error');
    }
  }, [theme, launchInstall]);

  // ── Étape initiale ────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (agentInfo.error === 'multiple_retrobat_installs') {
        const list = (agentInfo.retrobatInstalls || []).map((p) => `• ${p}`).join('\n');
        setErrorMsg(`Plusieurs installations RetroBat ont été détectées :\n${list}\n\nRelancez install-agent.bat (il demande laquelle utiliser) ou renseignez RetroBatPath dans hyperbatmedia-agent.ini, puis redémarrez l'agent.`);
        setStep('error');
        return;
      }
      if (!agentInfo.themesReady) {
        setErrorMsg("L'agent n'a pas trouvé le dossier des thèmes (RetroBat/Batocera introuvable).\nVérifiez sa configuration (hyperbatmedia-agent.ini).");
        setStep('error');
        return;
      }
      if (isGameTheme) {
        try {
          const r = await agentRoms(
            theme.system, theme.name,
            theme.gameId !== undefined && theme.gameId !== null ? String(theme.gameId) : '',
          );
          if (!mountedRef.current) return;
          setRoms(r.roms);
          const found = r.found && r.roms.length > 0;
          setRomsFound(found);
          setSuggested(r.suggested);
          setFilter(found ? '' : (r.suggested || theme.name));
          setFocusIdx(romPickFocusIndex(r.roms, r.suggested, found));
          setStep('rom-pick');
        } catch {
          if (!mountedRef.current) return;
          setErrorMsg("Impossible de contacter l'agent HyperBat Media.\nVérifiez qu'il est bien démarré, puis réessayez.");
          setStep('error');
        }
        return;
      }
      if (isCollection) {
        setStep('collection-name');
        return;
      }
      // default-themes, system-themes, artwork : aucune saisie nécessaire
      await proceedWith(theme.name, '');
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Focus initial à chaque changement d'étape ─────────────────────────
  const filteredRoms = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? roms.filter((r) => r.toLowerCase().includes(f)) : roms;
  }, [roms, filter]);

  useEffect(() => {
    // Nouvelle etape : autoriser un SUD immediat (sinon la garde 400 ms
    // heritee du choix de ROM bloque Remplacer / OK).
    lastActionRef.current = 0;
    if (step === 'rom-pick') {
      setFocusIdx(romPickFocusIndex(filteredRoms, suggested, romsFound));
    } else {
      setFocusIdx(0);
    }
    // Volontairement pas de dépendance sur filteredRoms : on ne veut
    // recadrer le focus SUR LA SUGGESTION qu'au changement d'étape, pas à
    // chaque frappe (sinon on écraserait la position choisie par
    // l'utilisateur). Le recadrage "garde-fou" (borne valide) à chaque
    // frappe est géré séparément ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, suggested]);

  // Le nombre d'éléments focusables de l'étape rom-pick change à chaque
  // frappe dans le champ (la liste se réduit/s'agrandit avec le filtre,
  // le bouton "Utiliser tel quel" apparaît/disparaît). Sans ce recadrage,
  // focusIdx peut se retrouver au-delà du dernier élément existant (plus
  // de surlignage visible) ou, pire, retomber sur un index qui pointe
  // maintenant vers une ROM différente de celle réellement focusée avant
  // la frappe. On borne simplement l'index à la plage valide après
  // chaque rendu : ne déplace le focus que si sa position n'existe plus.
  useEffect(() => {
    if (step !== 'rom-pick') return;
    const max = getFocusables().length - 1;
    setFocusIdx((prev) => Math.min(prev, Math.max(max, 0)));
  }, [filteredRoms, filter, step, getFocusables]);

  // ── Manette : D-Pad + SUD/EST, avec détection de front montant ───────
  const btnCfg = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const num = (key: string, def: number) => {
      const v = p.get(key);
      if (v === null) return def;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 0 ? n : def;
    };
    // Repli W3C (SUD=0, EST=1). Sur Batocera le lanceur envoie souvent
    // une calibration (ex. btnSud=1) via l'URL.
    return { sud: num('btnSud', 0), est: num('btnEst', 1), nord: num('btnNord', 3) };
  }, []);

  // Rempli plus bas quand resolveConflict est declare
  const resolveConflictRef = useRef<(mode: 'replace' | 'rename') => void>(() => {});

  useEffect(() => {
    const AXIS_THRESHOLD = 0.5;
    const REPEAT_FIRST_MS = 350;
    const REPEAT_NEXT_MS = 130;

    const isDown = (gp: Gamepad, i: number) => {
      if (i < 0) return false;
      const b = gp.buttons[i];
      return b ? (b.pressed || b.value > AXIS_THRESHOLD) : false;
    };

    // D-Pad : boutons 12-15, stick axes 0/1, et hat axes 6/7 (souvent
    // sous Linux / Flatpak Chromium).
    const readDir = (gp: Gamepad): 'up' | 'down' | 'left' | 'right' | null => {
      const ax = gp.axes[0] || 0;
      const ay = gp.axes[1] || 0;
      const hx = gp.axes.length > 6 ? (gp.axes[6] || 0) : 0;
      const hy = gp.axes.length > 7 ? (gp.axes[7] || 0) : 0;
      if (isDown(gp, 12) || ay < -AXIS_THRESHOLD || hy < -AXIS_THRESHOLD) return 'up';
      if (isDown(gp, 13) || ay > AXIS_THRESHOLD || hy > AXIS_THRESHOLD) return 'down';
      if (isDown(gp, 14) || ax < -AXIS_THRESHOLD || hx < -AXIS_THRESHOLD) return 'left';
      if (isDown(gp, 15) || ax > AXIS_THRESHOLD || hx > AXIS_THRESHOLD) return 'right';
      return null;
    };

    let prev: boolean[] | null = null;
    let curDir: string | null = null;
    let nextRepeat = 0;

    const actDir = (dir: 'up' | 'down' | 'left' | 'right') => {
      if (oskOpenRef.current) return;
      const s = stepRef.current;
      const hStep = s === 'rom-pick' ? 10 : 1;
      if (dir === 'up') move(-1);
      else if (dir === 'down') move(1);
      else if (dir === 'left') move(-hStep);
      else move(hStep);
    };

    const activateSud = () => {
      if (oskOpenRef.current) return;
      const s = stepRef.current;
      if (s === 'done') {
        finishWithReload();
        return;
      }
      if (s === 'error') {
        guard(onClose);
        return;
      }
      if (s === 'conflict') {
        // Direct (comme OK) : ne pas dependre de .click() + garde du onClick
        const idx = focusIdxRef.current;
        if (idx === 1) guard(() => resolveConflictRef.current('rename'));
        else if (idx === 2) guard(onClose);
        else guard(() => resolveConflictRef.current('replace'));
        return;
      }
      // rom-pick / collection-name : input → clavier virtuel ; sinon .click()
      const nodes = getFocusables();
      const el = nodes[focusIdxRef.current];
      if (el instanceof HTMLInputElement) {
        const field = (el.dataset.hbagentOsk || '') as OskField | '';
        if (field === 'filter' || field === 'collection') {
          setOskField(field);
          setOskInitial(field === 'filter' ? filter : collectionName);
          setOskOpen(true);
          return;
        }
      }
      el?.click();
    };

    const activateNord = () => {
      if (oskOpenRef.current) return;
      const s = stepRef.current;
      if (s !== 'rom-pick' && s !== 'collection-name') return;

      // Un seul champ de saisie par étape désormais (filter en rom-pick,
      // collectionName en collection-name) : NORD l'ouvre directement,
      // quel que soit l'élément actuellement focusé dans la liste -
      // évite d'avoir à remonter tout en haut pour y accéder.
      setFocusIdx(0);
      setOskField(s === 'rom-pick' ? 'filter' : 'collection');
      setOskInitial(s === 'rom-pick' ? filter : collectionName);
      setOskOpen(true);
    };

    const iv = setInterval(() => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of pads) { if (g && g.connected) { gp = g; break; } }
      if (!gp) return;
      const pressed = gp.buttons.map((_, i) => isDown(gp!, i));
      // Pendant le clavier virtuel : snapshot seulement (évite un faux
      // front SUD/EST à la fermeture).
      if (oskOpenRef.current) {
        prev = pressed;
        curDir = readDir(gp);
        return;
      }
      // OK/EST du clavier : le bouton est encore enfoncé au 1er tick après
      // fermeture — attendre le relâchement avant de relire SUD (sinon
      // rebond : clavier se rouvre, ou Valider se déclenche).
      if (oskWaitReleaseRef.current) {
        const sudHeld = btnCfg.sud >= 0 && pressed[btnCfg.sud];
        const estHeld = btnCfg.est >= 0 && pressed[btnCfg.est];
        const nordHeld = btnCfg.nord >= 0 && pressed[btnCfg.nord];
        prev = pressed;
        curDir = readDir(gp);
        if (sudHeld || estHeld || nordHeld) return;
        oskWaitReleaseRef.current = false;
        return;
      }
      // Premier tick apres (re)montage : snapshot sans agir
      if (prev === null) { prev = pressed; curDir = readDir(gp); return; }

      const now = performance.now();
      const dir = readDir(gp);
      if (dir) {
        if (dir !== curDir) {
          curDir = dir;
          nextRepeat = now + REPEAT_FIRST_MS;
          actDir(dir);
        } else if (now >= nextRepeat) {
          nextRepeat = now + REPEAT_NEXT_MS;
          actDir(dir);
        }
      } else {
        curDir = null;
      }

      const before = prev;
      const just = (i: number) => i >= 0 && pressed[i] && !before[i];
      if (just(btnCfg.sud)) activateSud();
      if (just(btnCfg.est)) handleBack();
      if (just(btnCfg.nord)) activateNord();
      prev = pressed;
    }, 80);
    return () => clearInterval(iv);
  }, [btnCfg, move, handleBack, finishWithReload, guard, onClose, step, getFocusables, filter, collectionName]);

  // ── Clavier : flèches / Échap (Entrée est natif sur l'élément focusé) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inInput = e.target instanceof HTMLInputElement;
      if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); move(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); move(1); }
      else if (e.key === 'ArrowLeft' && !inInput) { e.preventDefault(); e.stopPropagation(); move(stepRef.current === 'rom-pick' ? -10 : -1); }
      else if (e.key === 'ArrowRight' && !inInput) { e.preventDefault(); e.stopPropagation(); move(stepRef.current === 'rom-pick' ? 10 : 1); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); handleBack(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [move, handleBack]);

  // ── Actions ───────────────────────────────────────────────────────────
  const chooseRom = (rom: string) => {
    const name = rom.trim();
    if (!name) return;
    void proceedWith(theme.name, name);
    setStep('init'); // écran d'attente le temps du check-conflict
  };

  const validateCollection = () => {
    const name = collectionName.trim();
    if (!name) return;
    void proceedWith(name, '');
    setStep('init');
  };

  const resolveConflict = (mode: 'replace' | 'rename') => {
    const { romName, finalName } = pendingRef.current;
    void launchInstall(finalName, romName, mode);
  };
  resolveConflictRef.current = resolveConflict;

  // ── Styles partagés (palette du site) ─────────────────────────────────

  const btnStyle: React.CSSProperties = {
    padding: '10px 16px', borderRadius: '8px', border: '2px solid #FFD700',
    backgroundColor: '#FF8C00', color: 'white', fontWeight: 700, fontSize: '13px',
    cursor: 'pointer',
  };
  const btnAltStyle: React.CSSProperties = {
    ...btnStyle, backgroundColor: '#1f2937', borderColor: '#555', color: '#ddd',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '2px solid #555', backgroundColor: '#111827', color: 'white',
    fontSize: '13px', outline: 'none',
  };

  // Icones manette (meme style que le bandeau bas de ThemeList)
  const FaceBtn = ({ dir, color, label, action }: {
    dir: 'sud' | 'est' | 'nord'; color: string; label: string; action: string;
  }) => {
    const dx = { sud: 0, est: 9, nord: 0 };
    const dy = { sud: 9, est: 0, nord: -9 };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true">
          <circle cx="0" cy="0" r="15" fill="#1a1a1a" stroke="#555" strokeWidth="1.5" />
          <circle cx="0" cy="-9" r="2.8" fill={dir === 'nord' ? color : '#444'} />
          <circle cx="0" cy="9" r="2.8" fill={dir === 'sud' ? color : '#444'} />
          <circle cx="-9" cy="0" r="2.8" fill="#444" />
          <circle cx="9" cy="0" r="2.8" fill={dir === 'est' ? color : '#444'} />
          <circle cx="0" cy="0" r="2" fill="#333" />
          <circle cx={dx[dir]} cy={dy[dir]} r="4" fill={color} opacity="0.95" />
        </svg>
        <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{label}</span>
        <span style={{ fontSize: '9px', color: '#aaa', lineHeight: 1 }}>{action}</span>
      </div>
    );
  };

  const DPadIcon = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true">
        <circle cx="0" cy="0" r="15" fill="#1a1a1a" stroke="#555" strokeWidth="1.5" />
        <rect x="-2.5" y="-11" width="5" height="22" rx="1.5" fill="#666" />
        <rect x="-11" y="-2.5" width="22" height="5" rx="1.5" fill="#666" />
        <circle cx="0" cy="0" r="4" fill="#3a3a3a" stroke="#555" strokeWidth="1" />
      </svg>
      <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>D-PAD</span>
      <span style={{ fontSize: '9px', color: '#aaa', lineHeight: 1 }}>Naviguer</span>
    </div>
  );

  const KeyBadge = ({ label }: { label: string }) => (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: '34px', height: '22px', padding: '0 6px', borderRadius: '5px',
      backgroundColor: '#2a2a2a', border: '1.5px solid #666',
      fontSize: '9px', fontWeight: 700, color: '#fff',
    }}>{label}</div>
  );

  const Sep = () => (
    <div style={{ width: '1px', height: '52px', backgroundColor: '#2a2a2a', margin: '0 6px' }} />
  );

  const stateLabel = (): string => {
    if (!jobStatus || jobStatus.state === 'starting') return 'Préparation…';
    if (jobStatus.state === 'downloading') return `Téléchargement… ${jobStatus.progress ?? 0}%`;
    if (jobStatus.state === 'extracting') return "Extraction de l'archive…";
    return 'Installation du thème…';
  };

  return (
    <div data-hbagent-flow style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`
        .hbagent-focusable:focus {
          outline: 3px solid #FFD700 !important;
          outline-offset: 2px;
        }
        .hbagent-rom-item:focus {
          outline: none !important;
        }
        [data-hbagent-romlist] {
          scrollbar-width: thin;
          scrollbar-color: #FF8C00 #1a1a1a;
        }
        [data-hbagent-romlist]::-webkit-scrollbar {
          width: 8px;
        }
        [data-hbagent-romlist]::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        [data-hbagent-romlist]::-webkit-scrollbar-thumb {
          background-color: #FF8C00;
          border-radius: 4px;
        }
        [data-hbagent-romlist]::-webkit-scrollbar-thumb:hover {
          background-color: #FFA733;
        }
      `}</style>
      <div style={{
        width: 'min(600px, 94vw)', maxHeight: '82vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#1a1a1a', borderRadius: '16px',
        border: '2px solid #FF8C00', padding: '20px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
      }}>
        {/* ── Titre ── */}
        <h2 style={{ color: '#F8D470', fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>
          {step === 'done' ? 'Installation réussie !' : step === 'error' ? 'Installation impossible' : 'Installer dans ' + (agentInfo.platform === 'batocera' ? 'Batocera' : 'RetroBat')}
        </h2>
        {/* Rappel du thème choisi dans la vitrine, affiché pendant toute
            la procédure (utile si l'utilisateur enchaîne plusieurs
            installations et peut oublier quel thème est en cours). */}
        <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '14px' }}>
          <span style={{ color: '#777' }}>Nom sur la vitrine : </span>{theme.name}
        </p>

        {/* ── Étape : attente ── */}
        {step === 'init' && (
          <p style={{ color: 'white', fontSize: '13px' }}>Veuillez patienter…</p>
        )}

        {/* ── Étape : choix de la ROM (game-themes) ── */}
        {step === 'rom-pick' && (() => {
          // L'élément actuellement surligné/focusé dans la liste (focusIdx
          // pointe dessus dès l'ouverture, sur la suggestion par défaut).
          // Valider doit d'abord confirmer CET élément si aucun texte n'a
          // été tapé pour le remplacer - sinon le bouton ne fait rien
          // quand rien n'a été saisi mais qu'une ligne est déjà surlignée.
          const selectedRom = filteredRoms[focusIdx - 1];
          const validateTarget = filter.trim() ? filter : selectedRom;
          return (
          <>
            <p style={{ color: 'white', fontSize: '13px', marginBottom: '10px' }}>
              {romsFound
                ? <>Choisissez ou saisissez la ROM{suggested ? ' (⭐ = suggestion)' : ''} :</>
                : <>Dossier ROMs introuvable — saisissez le nom manuellement :</>}
            </p>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                type="text"
                value={filter}
                placeholder="Rechercher ou saisir le nom…"
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && validateTarget) guard(() => chooseRom(validateTarget)); }}
                className="hbagent-focusable"
                data-hbagent-osk="filter"
                style={{ ...inputStyle, marginBottom: 0, paddingRight: '34px' }}
              />
              <span
                title="SUD ou NORD = clavier virtuel"
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '14px', color: '#888', pointerEvents: 'none',
                }}>
                ⌨
              </span>
            </div>
            {romsFound && filteredRoms.length > 0 && (
              <div data-hbagent-romlist style={{
                overflowY: 'auto', maxHeight: '34vh', marginBottom: '10px',
                border: '1px solid #333', borderRadius: '8px',
              }}>
                {filteredRoms.map((rom, romIdx) => {
                  const isFav = rom === suggested;
                  const isSel = focusIdx === romIdx + 1;
                  return (
                  <button
                    key={rom}
                    className="hbagent-focusable hbagent-rom-item"
                    onClick={() => guard(() => chooseRom(rom))}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', fontSize: '12px', cursor: 'pointer',
                      backgroundColor: isSel
                        ? 'rgba(255,140,0,0.42)'
                        : isFav
                          ? 'rgba(255,140,0,0.18)'
                          : 'transparent',
                      color: isFav || isSel ? '#FFD700' : '#ddd',
                      border: 'none', borderBottom: '1px solid #3f3f3f',
                    }}>
                    {isFav ? '⭐ ' : ''}{rom}
                  </button>
                  );
                })}
              </div>
            )}
            {filteredRoms.length === 0 && (
              <>
                {romsFound && filter.trim() && (
                  <p style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>Aucune ROM ne correspond.</p>
                )}
                {filter.trim() && (
                  <button
                    className="hbagent-focusable"
                    onClick={() => guard(() => chooseRom(filter))}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', fontSize: '12px', cursor: 'pointer',
                      backgroundColor: 'rgba(255,140,0,0.12)',
                      color: '#FFD700', marginBottom: '10px',
                      border: '1px dashed #FF8C00', borderRadius: '8px',
                    }}>
                    + Utiliser « {filter.trim()} » tel quel
                  </button>
                )}
              </>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="hbagent-focusable"
                style={{
                  ...btnStyle,
                  opacity: validateTarget ? 1 : 0.4,
                  cursor: validateTarget ? 'pointer' : 'default',
                }}
                disabled={!validateTarget}
                onClick={() => validateTarget && guard(() => chooseRom(validateTarget))}>
                Valider
              </button>
              <button className="hbagent-focusable" style={btnAltStyle}
                onClick={() => guard(onClose)}>
                Annuler
              </button>
            </div>
          </>
          );
        })()}

        {/* ── Étape : nom de la collection ── */}
        {step === 'collection-name' && (
          <>
            <p style={{ color: 'white', fontSize: '13px', marginBottom: '10px' }}>
              Nom de la collection (SUD ou NORD = clavier) :
            </p>
            <input
              type="text" value={collectionName}
              className="hbagent-focusable"
              data-hbagent-osk="collection"
              onChange={(e) => setCollectionName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') guard(validateCollection); }}
              style={{ ...inputStyle, marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="hbagent-focusable" style={btnStyle}
                onClick={() => guard(validateCollection)}>
                Valider
              </button>
              <button className="hbagent-focusable" style={btnAltStyle}
                onClick={() => guard(onClose)}>
                Annuler
              </button>
            </div>
          </>
        )}

        {/* ── Étape : conflit ── */}
        {step === 'conflict' && (
          <>
            <p style={{ color: 'white', fontSize: '13px', marginBottom: '4px' }}>
              Un thème existe déjà pour « {pendingRef.current.romName || pendingRef.current.finalName} ».
            </p>
            <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '14px' }}>
              Que voulez-vous faire ?
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="hbagent-focusable" style={btnStyle}
                onClick={() => guard(() => resolveConflict('replace'))}>
                Remplacer
              </button>
              <button className="hbagent-focusable" style={btnStyle}
                onClick={() => guard(() => resolveConflict('rename'))}>
                Renommer l'ancien
              </button>
              <button className="hbagent-focusable" style={btnAltStyle}
                onClick={() => guard(onClose)}>
                Annuler
              </button>
            </div>
            <p style={{ color: '#666', fontSize: '11px', marginTop: '10px' }}>
              « Renommer l'ancien » conserve le thème actuel en « _original ».
            </p>
          </>
        )}

        {/* ── Étape : installation en cours ── */}
        {step === 'installing' && (
          <>
            <p style={{ color: 'white', fontSize: '13px', marginBottom: '12px' }}>{stateLabel()}</p>
            <div style={{ height: '10px', borderRadius: '5px', backgroundColor: '#111827', overflow: 'hidden', border: '1px solid #333' }}>
              <div style={{
                height: '100%',
                width: jobStatus?.state === 'downloading' ? `${jobStatus.progress ?? 0}%`
                  : jobStatus?.state === 'extracting' ? '80%'
                  : jobStatus?.state === 'installing' ? '95%' : '10%',
                background: 'linear-gradient(90deg, #FF8C00, #FFD700)',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ color: '#666', fontSize: '11px', marginTop: '10px' }}>Veuillez patienter, ne fermez pas la vitrine…</p>
          </>
        )}

        {/* ── Étape : terminé ── */}
        {step === 'done' && (
          <>
            <p style={{ color: '#2ecc71', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
              ✓ « {pendingRef.current.romName || pendingRef.current.finalName} » installé avec succès !
            </p>
            <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '14px' }}>
              {reloadingEs
                ? 'Rafraîchissement d’EmulationStation…'
                : esReloaded
                  ? 'Les listes EmulationStation ont été rechargées automatiquement.'
                  : 'Validez pour rafraîchir EmulationStation (comme F5) et fermer.'}
            </p>
            <button className="hbagent-focusable" style={btnStyle}
              onClick={finishWithReload}
              disabled={reloadingEs}>
              {reloadingEs ? 'Rafraîchissement…' : 'OK'}
            </button>
          </>
        )}

        {/* ── Étape : erreur ── */}
        {step === 'error' && (
          <>
            <p style={{ color: '#e74c3c', fontSize: '13px', whiteSpace: 'pre-line', marginBottom: '14px' }}>
              {errorMsg}
            </p>
            <button className="hbagent-focusable" style={btnStyle}
              onClick={() => guard(onClose)}>
              Fermer
            </button>
          </>
        )}

        {/* ── Rappel des contrôles (meme icones que le bandeau de la vitrine) ── */}
        {step !== 'installing' && (
          <div style={{
            marginTop: '16px', borderTop: '1px solid #333', paddingTop: '12px',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            gap: '4px', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <DPadIcon />
              <KeyBadge label="↑↓←→" />
            </div>
            <Sep />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <FaceBtn dir="sud" color="#2ecc71" label="SUD" action="Valider / Clavier" />
              <KeyBadge label="Entrée" />
            </div>
            <Sep />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <FaceBtn dir="est" color="#e74c3c" label="EST" action="Annuler" />
              <KeyBadge label="Échap" />
            </div>
            <Sep />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <FaceBtn dir="nord" color="#f1c40f" label="NORD" action="Clavier" />
            </div>
          </div>
        )}
      </div>

      <GamepadVirtualKeyboard
        open={oskOpen}
        initialValue={oskInitial}
        title={oskField === 'filter' ? 'ROM (rechercher ou saisir)' : 'Nom de la collection'}
        onChange={(value: string) => {
          if (oskField === 'filter') setFilter(value);
          else setCollectionName(value);
        }}
        onConfirm={() => {
          oskOpenRef.current = false;
          oskWaitReleaseRef.current = true;
          lastActionRef.current = Date.now();
          setOskOpen(false);
        }}
        onCancel={() => {
          oskOpenRef.current = false;
          oskWaitReleaseRef.current = true;
          lastActionRef.current = Date.now();
          setOskOpen(false);
        }}
      />
    </div>
  );
};

export default AgentInstallFlow;
