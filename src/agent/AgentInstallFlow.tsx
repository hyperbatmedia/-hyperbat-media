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
  const [manualName, setManualName] = useState('');
  const [collectionName, setCollectionName] = useState(theme.name);
  const [jobStatus, setJobStatus] = useState<AgentJobStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [focusIdx, setFocusIdx] = useState(0);
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

  // ── Chaîne de focus : les éléments s'enregistrent dans l'ordre du
  // rendu ; le D-Pad / les flèches déplacent focusIdx dans cette liste et
  // le vrai focus DOM suit (indispensable pour que l'Entrée relayée par
  // l'AHK Windows active le bon élément).
  const focusablesRef = useRef<HTMLElement[]>([]);
  focusablesRef.current = [];
  const reg = (el: HTMLElement | null) => { if (el) focusablesRef.current.push(el); };

  const focusIdxRef = useRef(0);
  focusIdxRef.current = focusIdx;
  const stepRef = useRef<Step>(step);
  stepRef.current = step;

  const move = useCallback((delta: number) => {
    setFocusIdx((i) => {
      const max = focusablesRef.current.length - 1;
      if (max < 0) return 0;
      return Math.min(Math.max(i + delta, 0), max);
    });
  }, []);

  useEffect(() => {
    const el = focusablesRef.current[focusIdx];
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [focusIdx, step, filter, roms]);

  const handleBack = useCallback(() => {
    // Pendant l'installation : impossible d'annuler (le job continue côté
    // agent de toute façon), on attend la fin pour garder le message final.
    if (stepRef.current === 'installing' || stepRef.current === 'init') return;
    // Succès : EST = même chose que OK (rafraîchir ES puis fermer), comme
    // l'unique bouton du dialogue AHK.
    if (stepRef.current === 'done') {
      guard(() => {
        setReloadingEs(true);
        void (async () => {
          const ok = await agentReloadEs();
          if (mountedRef.current) {
            setEsReloaded(ok);
            setReloadingEs(false);
            onClose();
          }
        })();
      });
      return;
    }
    guard(onClose);
  }, [guard, onClose]);

  // Miroir AHK : ReloadRetroBatThemes() apres fermeture du dialogue succes.
  // Place AVANT le hook manette : SUD sur l'ecran "done" l'appelle directement.
  const finishWithReload = useCallback(() => {
    guard(() => {
      if (reloadingEs) return;
      setReloadingEs(true);
      void (async () => {
        const ok = esReloaded || await agentReloadEs();
        if (mountedRef.current) setEsReloaded(ok);
        if (mountedRef.current) setReloadingEs(false);
        onClose();
      })();
    });
  }, [guard, reloadingEs, esReloaded, onClose]);

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
          setRomsFound(r.found && r.roms.length > 0);
          setSuggested(r.suggested);
          setManualName(r.suggested || theme.name);
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
    if (step === 'rom-pick' && suggested) {
      const idx = filteredRoms.indexOf(suggested);
      setFocusIdx(idx >= 0 ? idx : 0);
    } else {
      setFocusIdx(0);
    }
    // Volontairement pas de dépendance sur filteredRoms : on ne veut
    // recadrer le focus qu'au changement d'étape, pas à chaque frappe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, suggested]);

  // ── Manette : D-Pad + SUD/EST, avec détection de front montant ───────
  const btnCfg = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const num = (key: string, def: number) => {
      const v = p.get(key);
      if (v === null) return def;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 0 ? n : def;
    };
    // Repli sur le "standard gamepad" W3C (SUD=0, EST=1) : cas Batocera,
    // où le lanceur n'envoie aucun paramètre de calibration.
    return { sud: num('btnSud', 0), est: num('btnEst', 1) };
  }, []);

  useEffect(() => {
    const AXIS_THRESHOLD = 0.5;
    const REPEAT_FIRST_MS = 350; // délai avant répétition (direction maintenue)
    const REPEAT_NEXT_MS = 130;  // cadence de répétition ensuite

    // Bouton appuyé : .pressed OU .value > 0.5 (gâchettes analogiques et
    // certains pilotes ne mettent pas .pressed à true).
    const isDown = (gp: Gamepad, i: number) => {
      if (i < 0) return false;
      const b = gp.buttons[i];
      return b ? (b.pressed || b.value > AXIS_THRESHOLD) : false;
    };

    // Direction courante : D-Pad boutons 12-15 OU axes 0/1, exactement
    // comme useGamepadGridNav (beaucoup de manettes remontent la croix
    // via les axes plutôt que les boutons standard).
    const readDir = (gp: Gamepad): 'up' | 'down' | 'left' | 'right' | null => {
      const ax = gp.axes[0] || 0;
      const ay = gp.axes[1] || 0;
      if (isDown(gp, 12) || ay < -AXIS_THRESHOLD) return 'up';
      if (isDown(gp, 13) || ay > AXIS_THRESHOLD) return 'down';
      if (isDown(gp, 14) || ax < -AXIS_THRESHOLD) return 'left';
      if (isDown(gp, 15) || ax > AXIS_THRESHOLD) return 'right';
      return null;
    };

    let prev: boolean[] | null = null;
    let curDir: string | null = null;
    let nextRepeat = 0;

    const actDir = (dir: 'up' | 'down' | 'left' | 'right') => {
      const hStep = stepRef.current === 'rom-pick' ? 10 : 1;
      if (dir === 'up') move(-1);
      else if (dir === 'down') move(1);
      else if (dir === 'left') move(-hStep);
      else move(hStep);
    };

    const iv = setInterval(() => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of pads) { if (g && g.connected) { gp = g; break; } }
      if (!gp) return;
      const pressed = gp.buttons.map((_, i) => isDown(gp!, i));
      // Premier tick : mémorise l'état SANS agir. La fenêtre vient d'être
      // ouverte par un appui SUD probablement encore enfoncé - sans ça, il
      // serait pris pour un nouvel appui et validerait aussitôt le premier
      // élément focusé.
      if (prev === null) { prev = pressed; curDir = readDir(gp); return; }

      // Directions : déclenchement immédiat puis répétition si maintenue.
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

      // SUD / EST : front montant uniquement.
      // Sur 'done' / 'error', appeler l'action directement (comme EST) :
      // le .click() sur l'élément focusé rate souvent juste après le
      // passage installing→done (focusables pas encore synchronisés).
      const before = prev;
      const just = (i: number) => i >= 0 && pressed[i] && !before[i];
      if (just(btnCfg.sud)) {
        const s = stepRef.current;
        if (s === 'done') finishWithReload();
        else if (s === 'error') guard(onClose);
        else focusablesRef.current[focusIdxRef.current]?.click();
      }
      if (just(btnCfg.est)) handleBack();
      prev = pressed;
    }, 80);
    return () => clearInterval(iv);
  }, [btnCfg, move, handleBack, finishWithReload, guard, onClose]);

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
    dir: 'sud' | 'est'; color: string; label: string; action: string;
  }) => {
    const dx = { sud: 0, est: 9 };
    const dy = { sud: 9, est: 0 };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <svg width="34" height="34" viewBox="-17 -17 34 34" aria-hidden="true">
          <circle cx="0" cy="0" r="15" fill="#1a1a1a" stroke="#555" strokeWidth="1.5" />
          <circle cx="0" cy="-9" r="2.8" fill="#444" />
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

  const KeyBadge = ({ label, action }: { label: string; action: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: '34px', height: '22px', padding: '0 6px', borderRadius: '5px',
        backgroundColor: '#2a2a2a', border: '1.5px solid #666',
        fontSize: '9px', fontWeight: 700, color: '#fff',
      }}>{label}</div>
      <span style={{ fontSize: '9px', color: '#aaa', lineHeight: 1 }}>{action}</span>
    </div>
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`
        .hbagent-focusable:focus {
          outline: 3px solid #FFD700 !important;
          outline-offset: 2px;
        }
      `}</style>
      <div style={{
        width: 'min(600px, 94vw)', maxHeight: '82vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#1a1a1a', borderRadius: '12px',
        border: '2px solid #FF8C00', padding: '20px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
      }}>
        {/* ── Titre ── */}
        <h2 style={{ color: '#F8D470', fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>
          {step === 'done' ? 'Installation réussie !' : step === 'error' ? 'Installation impossible' : 'Installer dans ' + (agentInfo.platform === 'batocera' ? 'Batocera' : 'RetroBat')}
        </h2>
        <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '14px' }}>{theme.name}</p>

        {/* ── Étape : attente ── */}
        {step === 'init' && (
          <p style={{ color: 'white', fontSize: '13px' }}>Veuillez patienter…</p>
        )}

        {/* ── Étape : choix de la ROM (game-themes) ── */}
        {step === 'rom-pick' && (
          <>
            <p style={{ color: 'white', fontSize: '13px', marginBottom: '10px' }}>
              {romsFound
                ? <>Choisissez la ROM correspondante{suggested ? ' (⭐ = suggestion)' : ''} :</>
                : <>Dossier ROMs introuvable — saisissez le nom manuellement :</>}
            </p>
            {romsFound && (
              <>
                <input
                  type="text" value={filter} placeholder="Filtrer la liste… (clavier/souris)"
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '8px' }}
                />
                <div style={{
                  overflowY: 'auto', maxHeight: '34vh', marginBottom: '10px',
                  border: '1px solid #333', borderRadius: '8px',
                }}>
                  {filteredRoms.map((rom) => (
                    <button
                      key={rom}
                      ref={reg}
                      className="hbagent-focusable"
                      onClick={() => guard(() => chooseRom(rom))}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 12px', fontSize: '12px', cursor: 'pointer',
                        backgroundColor: rom === suggested ? 'rgba(255,140,0,0.18)' : 'transparent',
                        color: rom === suggested ? '#FFD700' : '#ddd',
                        border: 'none', borderBottom: '1px solid #262626',
                      }}>
                      {rom === suggested ? '⭐ ' : ''}{rom}
                    </button>
                  ))}
                  {filteredRoms.length === 0 && (
                    <p style={{ color: '#888', fontSize: '12px', padding: '10px' }}>Aucune ROM ne correspond au filtre.</p>
                  )}
                </div>
              </>
            )}
            <input
              type="text" value={manualName}
              ref={reg}
              className="hbagent-focusable"
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') guard(() => chooseRom(manualName)); }}
              placeholder="…ou saisissez le nom exact de la ROM (sans extension)"
              style={{ ...inputStyle, marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button ref={reg} className="hbagent-focusable" style={btnStyle}
                onClick={() => guard(() => chooseRom(manualName))}>
                Valider la saisie
              </button>
              <button ref={reg} className="hbagent-focusable" style={btnAltStyle}
                onClick={() => guard(onClose)}>
                Annuler
              </button>
            </div>
          </>
        )}

        {/* ── Étape : nom de la collection ── */}
        {step === 'collection-name' && (
          <>
            <p style={{ color: 'white', fontSize: '13px', marginBottom: '10px' }}>
              Nom de la collection (ex : Sonic, Mario, Castlevania…) :
            </p>
            <input
              type="text" value={collectionName}
              ref={reg}
              className="hbagent-focusable"
              onChange={(e) => setCollectionName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') guard(validateCollection); }}
              style={{ ...inputStyle, marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button ref={reg} className="hbagent-focusable" style={btnStyle}
                onClick={() => guard(validateCollection)}>
                Valider
              </button>
              <button ref={reg} className="hbagent-focusable" style={btnAltStyle}
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
              <button ref={reg} className="hbagent-focusable" style={btnStyle}
                onClick={() => guard(() => resolveConflict('replace'))}>
                Remplacer
              </button>
              <button ref={reg} className="hbagent-focusable" style={btnStyle}
                onClick={() => guard(() => resolveConflict('rename'))}>
                Renommer l'ancien
              </button>
              <button ref={reg} className="hbagent-focusable" style={btnAltStyle}
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
            <button ref={reg} className="hbagent-focusable" style={btnStyle}
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
            <button ref={reg} className="hbagent-focusable" style={btnStyle}
              onClick={() => guard(onClose)}>
              Fermer
            </button>
          </>
        )}

        {/* ── Rappel des contrôles (meme icones que le bandeau de la vitrine) ── */}
        {step !== 'installing' && (
          <div style={{
            marginTop: '16px', borderTop: '1px solid #333', paddingTop: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '4px', flexWrap: 'wrap',
          }}>
            <DPadIcon />
            <Sep />
            <FaceBtn dir="sud" color="#2ecc71" label="SUD" action="Valider" />
            <Sep />
            <FaceBtn dir="est" color="#e74c3c" label="EST" action="Annuler" />
            <Sep />
            <KeyBadge label="↑↓←→" action="Clavier" />
            <KeyBadge label="Entrée" action="Valider" />
            <KeyBadge label="Échap" action="Annuler" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentInstallFlow;
