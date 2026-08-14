// Fichier: src/agent/hyperbatAgent.ts
//
// Client de l'agent local HyperBat Media (hyperbatmedia-agent.py / .exe),
// le remplaçant multiplateforme (Windows RetroBat + Batocera Linux) du
// protocole hyperbat://. Voir API-VITRINE.md dans le package
// "HYPERBAT-MEDIA-Agent-Windows-Batocera" pour la spécification complète.
//
// PRINCIPE : l'agent tourne en arrière-plan sur la machine de jeu et
// écoute en HTTP local (http://127.0.0.1:8195 par défaut). La vitrine le
// sonde avec detectAgent() ; s'il répond, le bouton "Installer" passe par
// fetch() (aucun geste "trusted" requis, contrairement à hyperbat://) ;
// sinon, comportement historique hyperbat:// inchangé.
//
// Ce module ne doit être sollicité qu'en mode kiosque (?retrobat=1) :
// aucun fetch vers localhost ne doit partir pour un visiteur web normal.

export interface AgentInfo {
  app: string;
  version: string;
  platform: 'windows' | 'batocera' | 'linux';
  themesReady: boolean;
  useBobMedia: boolean;
  retrobatPath?: string;
  /** "multiple_retrobat_installs" si plusieurs RetroBat détectés sans
   *  chemin configuré : l'agent refuse alors de choisir. */
  error?: string;
  retrobatInstalls?: string[];
}

export interface AgentRomsResult {
  system: string;
  romsDir: string;
  found: boolean;
  roms: string[];
  /** ROM pré-sélectionnée (gamelist.xml via gameId, sinon correspondance
   *  approximative sur le nom du thème). Chaîne vide si rien de probant. */
  suggested: string;
}

export interface AgentConflictResult {
  exists: boolean;
  destPath: string;
}

export type AgentJobState =
  | 'starting' | 'downloading' | 'extracting' | 'installing'
  | 'done' | 'error';

export interface AgentJobStatus {
  id: string;
  state: AgentJobState;
  /** Progression du téléchargement (0-100), si la taille est connue. */
  progress?: number;
  name?: string;
  destPath?: string;
  esReloaded?: boolean;
  error?: string;
  detail?: string;
}

export interface AgentInstallParams {
  url: string;
  system: string;
  category: string;
  name: string;
  gameId?: string;
  romName?: string;
  onConflict?: 'replace' | 'rename' | 'abort';
}

const DEFAULT_AGENT_BASE = 'http://127.0.0.1:8195';

// Capturé au chargement du module, AVANT le nettoyage d'URL fait par
// HyperBatMediaSite.tsx (history.replaceState). Le paramètre ?agent= est
// envoyé par le lanceur Batocera (vitrine-hyperbat.sh) et permet aussi le
// scénario "vitrine sur un téléphone, agent sur la machine de jeu"
// (BindHost=0.0.0.0 côté agent).
const AGENT_BASE: string = (() => {
  try {
    const param = new URLSearchParams(window.location.search).get('agent');
    if (param && /^https?:\/\//i.test(param)) return param.replace(/\/+$/, '');
  } catch {
    // pas de window (SSR) ou URL illisible : base par défaut
  }
  return DEFAULT_AGENT_BASE;
})();

export const getAgentBase = (): string => AGENT_BASE;

// AbortSignal.timeout() n'est pas disponible sur tous les navigateurs
// visés (kiosques parfois non à jour) : équivalent manuel.
const timeoutSignal = (ms: number): AbortSignal => {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
};

async function getJson<T>(path: string, timeoutMs = 8000): Promise<T> {
  const res = await fetch(`${AGENT_BASE}${path}`, { signal: timeoutSignal(timeoutMs) });
  if (!res.ok) throw new Error(`agent_http_${res.status}`);
  return (await res.json()) as T;
}

/** Sonde l'agent. Renvoie ses infos s'il répond, null sinon (= fallback
 *  hyperbat://). Timeout court : ne doit pas retarder l'affichage. */
export async function detectAgent(): Promise<AgentInfo | null> {
  try {
    const info = await getJson<AgentInfo>('/ping', 2500);
    return info && info.app === 'hyperbatmedia-agent' ? info : null;
  } catch {
    return null;
  }
}

/** Liste les ROMs du système (slug vitrine accepté, l'agent convertit),
 *  avec suggestion optionnelle basée sur le nom du thème et/ou gameId. */
export function agentRoms(system: string, name = '', gameId = ''): Promise<AgentRomsResult> {
  const q = new URLSearchParams({ system });
  if (name) q.set('name', name);
  if (gameId) q.set('gameId', gameId);
  return getJson<AgentRomsResult>(`/roms?${q.toString()}`);
}

/** Vérifie AVANT téléchargement si un thème existe déjà à la destination
 *  (pour afficher le dialogue Remplacer / Renommer / Annuler). */
export function agentCheckConflict(args: {
  category: string;
  system: string;
  romName?: string;
  name?: string;
}): Promise<AgentConflictResult> {
  const q = new URLSearchParams({ category: args.category, system: args.system });
  if (args.romName) q.set('romName', args.romName);
  if (args.name) q.set('name', args.name);
  return getJson<AgentConflictResult>(`/check-conflict?${q.toString()}`);
}

/** Démarre une installation. L'agent répond immédiatement avec un id de
 *  job ; suivre la progression avec agentStatus(). Peut rejeter avec
 *  Error("multiple_retrobat_installs") ou Error("busy"). */
export async function agentStartInstall(params: AgentInstallParams): Promise<{ id: string }> {
  const res = await fetch(`${AGENT_BASE}/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: timeoutSignal(10000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data && data.error ? String(data.error) : `agent_http_${res.status}`);
  }
  return data as { id: string };
}

/** État d'un job d'installation en cours. */
export function agentStatus(id: string): Promise<AgentJobStatus> {
  return getJson<AgentJobStatus>(`/status?id=${encodeURIComponent(id)}`, 5000);
}

/** Demande à EmulationStation de recharger ses listes (F5 sous Windows,
 *  API web sous Batocera). À appeler de préférence juste après le clic OK
 *  de fin d'installation — comme l'installeur AHK après le dialogue de succès. */
export async function agentReloadEs(): Promise<boolean> {
  try {
    const r = await getJson<{ ok?: boolean }>('/reload-es', 12000);
    return !!r?.ok;
  } catch {
    return false;
  }
}
