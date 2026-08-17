// Fichier: src/components/ThemeList/GamepadVirtualKeyboard.tsx
//
// Clavier virtuel manette — mode kiosque (?retrobat=1) uniquement.
// Ouverture gérée par le parent (SUD sur barre de recherche).
// EST = annuler (restaure la valeur initiale) ; NORD = effacer ;
// touche OK = valider et fermer. Bascule AZERTY ↔ QWERTY manuelle.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type KeyboardLayoutId = 'azerty' | 'qwerty';

// Journal visible SUR le clavier (temporaire).
const LOG_MAX = 10;
let logLines: string[] = [];
const logListeners = new Set<() => void>();

/** @deprecated journal debug clavier — à retirer ensuite */
// eslint-disable-next-line react-refresh/only-export-components
export function oskLog(msg: string): void {
  const now = new Date();
  const t = `${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  logLines = [...logLines.slice(-(LOG_MAX - 1)), `${t} ${msg}`];
  // eslint-disable-next-line no-console
  console.log('[HBM-OSK]', msg);
  logListeners.forEach((fn) => fn());
  try {
    const q = new URLSearchParams(window.location.search).get('agent');
    const base = (q || 'http://127.0.0.1:8195').replace(/\/$/, '');
    void fetch(`${base}/osk-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: msg,
      keepalive: true,
    }).catch(() => { /* agent absent */ });
  } catch { /* ignore */ }
}

type KeyDef =
  | { id: string; label: string; type: 'char'; value: string; flex?: number }
  | { id: string; label: string; type: 'space'; flex?: number }
  | { id: string; label: string; type: 'backspace'; flex?: number }
  | { id: string; label: string; type: 'layout'; flex?: number }
  | { id: string; label: string; type: 'ok'; flex?: number };

const DIGITS: KeyDef[] = '1234567890'.split('').map((c) => ({
  id: `d-${c}`, label: c, type: 'char' as const, value: c,
}));

const AZERTY_ROWS: KeyDef[][] = [
  DIGITS,
  'azertyuiop'.split('').map((c) => ({ id: `a-${c}`, label: c, type: 'char' as const, value: c })),
  'qsdfghjklm'.split('').map((c) => ({ id: `a-${c}`, label: c, type: 'char' as const, value: c })),
  [...'wxcvbn'.split('').map((c) => ({ id: `a-${c}`, label: c, type: 'char' as const, value: c })),
    { id: 'a-apos', label: "'", type: 'char', value: "'" },
    { id: 'a-dash', label: '-', type: 'char', value: '-' },
    { id: 'a-dot', label: '.', type: 'char', value: '.' },
    { id: 'a-comma', label: ',', type: 'char', value: ',' }],
];

const QWERTY_ROWS: KeyDef[][] = [
  DIGITS,
  'qwertyuiop'.split('').map((c) => ({ id: `q-${c}`, label: c, type: 'char' as const, value: c })),
  'asdfghjkl'.split('').map((c) => ({ id: `q-${c}`, label: c, type: 'char' as const, value: c })).concat(
    [{ id: 'q-semi', label: ';', type: 'char', value: ';' }],
  ),
  [...'zxcvbnm'.split('').map((c) => ({ id: `q-${c}`, label: c, type: 'char' as const, value: c })),
    { id: 'q-apos', label: "'", type: 'char', value: "'" },
    { id: 'q-dash', label: '-', type: 'char', value: '-' },
    { id: 'q-dot', label: '.', type: 'char', value: '.' },
    { id: 'q-comma', label: ',', type: 'char', value: ',' }],
];

const ACTION_ROW = (layout: KeyboardLayoutId): KeyDef[] => [
  { id: 'layout', label: layout === 'azerty' ? 'QWERTY' : 'AZERTY', type: 'layout', flex: 1.2 },
  { id: 'space', label: 'Espace', type: 'space', flex: 3 },
  { id: 'bksp', label: '⌫', type: 'backspace', flex: 1.2 },
  { id: 'ok', label: 'OK', type: 'ok', flex: 1.4 },
];

export interface GamepadVirtualKeyboardProps {
  open: boolean;
  /** Valeur au moment de l'ouverture (restaurée si EST / Annuler). */
  initialValue: string;
  title?: string;
  /** Mise à jour live pendant la saisie (filtre recherche). */
  onChange: (value: string) => void;
  /** OK : garder la valeur courante et fermer. */
  onConfirm: () => void;
  /** EST : restaurer initialValue puis fermer. */
  onCancel: () => void;
}

const GamepadVirtualKeyboard: React.FC<GamepadVirtualKeyboardProps> = ({
  open,
  initialValue,
  title = 'Recherche',
  onChange,
  onConfirm,
  onCancel,
}) => {
  const [logTick, setLogTick] = useState(0);
  useEffect(() => {
    const fn = () => setLogTick((n) => n + 1);
    logListeners.add(fn);
    return () => { logListeners.delete(fn); };
  }, []);
  void logTick;
  const [layout, setLayout] = useState<KeyboardLayoutId>('azerty');
  const [draft, setDraft] = useState(initialValue);
  const [focusRow, setFocusRow] = useState(1);
  const [focusCol, setFocusCol] = useState(0);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const initialRef = useRef(initialValue);
  const focusRowRef = useRef(focusRow);
  const focusColRef = useRef(focusCol);
  focusRowRef.current = focusRow;
  focusColRef.current = focusCol;

  const rows = useMemo(() => {
    const letterRows = layout === 'azerty' ? AZERTY_ROWS : QWERTY_ROWS;
    return [...letterRows, ACTION_ROW(layout)];
  }, [layout]);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const onChangeRef = useRef(onChange);
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  onChangeRef.current = onChange;
  onConfirmRef.current = onConfirm;
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    oskLog(`OSK open « ${title} »`);
    setDraft(initialValue);
    draftRef.current = initialValue;
    initialRef.current = initialValue;
    setLayout('azerty');
    setFocusRow(1);
    setFocusCol(0);
    return () => { oskLog('OSK unmount'); };
  }, [open, initialValue, title]);

  const setDraftAndNotify = useCallback((next: string) => {
    setDraft(next);
    draftRef.current = next;
    onChangeRef.current(next);
  }, []);

  const activateKey = useCallback((key: KeyDef) => {
    if (key.type === 'char') {
      setDraftAndNotify(draftRef.current + key.value);
      return;
    }
    if (key.type === 'space') {
      setDraftAndNotify(draftRef.current + ' ');
      return;
    }
    if (key.type === 'backspace') {
      setDraftAndNotify(draftRef.current.slice(0, -1));
      return;
    }
    if (key.type === 'layout') {
      setLayout((l) => (l === 'azerty' ? 'qwerty' : 'azerty'));
      setFocusCol(0);
      return;
    }
    if (key.type === 'ok') {
      oskLog('key OK -> onConfirm');
      onConfirmRef.current();
    }
  }, [setDraftAndNotify]);

  const moveFocus = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    const r = rowsRef.current;
    const row = focusRowRef.current;
    const col = focusColRef.current;
    if (dir === 'left' || dir === 'right') {
      const line = r[row] || [];
      const nextCol = dir === 'left'
        ? Math.max(0, col - 1)
        : Math.min(line.length - 1, col + 1);
      setFocusCol(nextCol);
      return;
    }
    const nextRow = dir === 'up'
      ? Math.max(0, row - 1)
      : Math.min(r.length - 1, row + 1);
    const line = r[nextRow] || [];
    setFocusRow(nextRow);
    setFocusCol(Math.min(col, Math.max(0, line.length - 1)));
  }, []);

  useEffect(() => {
    if (!open) return;

    const p = new URLSearchParams(window.location.search);
    const num = (key: string, def: number) => {
      const v = p.get(key);
      if (v === null) return def;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 0 ? n : def;
    };
    const btnSud = num('btnSud', 0);
    const btnEst = num('btnEst', 1);
    const btnNord = num('btnNord', 3);

    const AXIS = 0.5;
    const REPEAT_FIRST = 350;
    const REPEAT_NEXT = 130;
    const isDown = (gp: Gamepad, i: number) => {
      if (i < 0) return false;
      const b = gp.buttons[i];
      return b ? (b.pressed || b.value > AXIS) : false;
    };
    const readDir = (gp: Gamepad): 'up' | 'down' | 'left' | 'right' | null => {
      const ax = gp.axes[0] || 0;
      const ay = gp.axes[1] || 0;
      const hx = gp.axes.length > 6 ? (gp.axes[6] || 0) : 0;
      const hy = gp.axes.length > 7 ? (gp.axes[7] || 0) : 0;
      if (isDown(gp, 12) || ay < -AXIS || hy < -AXIS) return 'up';
      if (isDown(gp, 13) || ay > AXIS || hy > AXIS) return 'down';
      if (isDown(gp, 14) || ax < -AXIS || hx < -AXIS) return 'left';
      if (isDown(gp, 15) || ax > AXIS || hx > AXIS) return 'right';
      return null;
    };

    let prev: boolean[] | null = null;
    let curDir: string | null = null;
    let nextRepeat = 0;

    const iv = setInterval(() => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp: Gamepad | null = null;
      for (const g of pads) { if (g && g.connected) { gp = g; break; } }
      if (!gp) return;
      const pressed = gp.buttons.map((_, i) => isDown(gp!, i));
      if (prev === null) {
        oskLog(`pad 1er tick ignore sud=${pressed[btnSud] ? 1 : 0}`);
        prev = pressed;
        curDir = readDir(gp);
        return;
      }

      const now = performance.now();
      const dir = readDir(gp);
      if (dir) {
        if (dir !== curDir) {
          curDir = dir;
          nextRepeat = now + REPEAT_FIRST;
          moveFocus(dir);
        } else if (now >= nextRepeat) {
          nextRepeat = now + REPEAT_NEXT;
          moveFocus(dir);
        }
      } else {
        curDir = null;
      }

      const just = (i: number) => i >= 0 && pressed[i] && !prev![i];
      if (just(btnSud)) {
        const fr = focusRowRef.current;
        const fc = focusColRef.current;
        const line = rowsRef.current[fr] || [];
        const key = line[Math.min(fc, Math.max(0, line.length - 1))];
        oskLog(`SUD touche « ${key?.label ?? '?'} » (${key?.type ?? '?'})`);
        if (key) activateKey(key);
      }
      if (just(btnEst)) {
        oskLog('EST gamepad -> cancel');
        onChangeRef.current(initialRef.current);
        onCancelRef.current();
      }
      if (just(btnNord)) {
        oskLog('NORD gamepad -> clear');
        setDraftAndNotify('');
      }
      prev = pressed;
    }, 80);

    return () => clearInterval(iv);
  }, [open, moveFocus, activateKey, setDraftAndNotify]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        oskLog('keydown Escape -> cancel (AHK/clavier?)');
        onChangeRef.current(initialRef.current);
        onCancelRef.current();
        return;
      }
      // RetroBat : l'AHK envoie Entrée à chaque SUD. Ce n'est pas OK.
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        oskLog('ENTREE ignoree (AHK RetroBat, pas OK)');
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setDraftAndNotify(draftRef.current.slice(0, -1));
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setDraftAndNotify(draftRef.current + e.key);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, setDraftAndNotify]);

  if (!open) return null;

  const safeCol = Math.min(focusCol, Math.max(0, (rows[focusRow]?.length || 1) - 1));

  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0, zIndex: 11000,
        backgroundColor: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '12px',
      }}
    >
      <div style={{
        width: 'min(920px, 100%)',
        backgroundColor: '#141414',
        border: '2px solid #FF8C00',
        borderRadius: '14px',
        padding: '14px 14px 10px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '8px', gap: '10px',
        }}>
          <div style={{ color: '#FFA500', fontWeight: 800, fontSize: '14px' }}>{title}</div>
          <div style={{ color: '#888', fontSize: '11px' }}>
            Disposition : <span style={{ color: '#fff' }}>{layout.toUpperCase()}</span>
          </div>
        </div>

        <div style={{
          backgroundColor: '#0b0b0b',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '6px 10px',
          marginBottom: '8px',
          color: '#8f8',
          fontSize: '11px',
          fontFamily: 'ui-monospace, Consolas, monospace',
          lineHeight: 1.35,
          maxHeight: '88px',
          overflow: 'hidden',
        }}>
          {logLines.slice(-8).map((l, i) => <div key={`${i}-${l}`}>{l}</div>)}
        </div>

        <div style={{
          backgroundColor: '#0b0b0b',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '10px 12px',
          minHeight: '40px',
          color: '#fff',
          fontSize: '18px',
          fontFamily: 'ui-monospace, monospace',
          marginBottom: '12px',
          wordBreak: 'break-word',
        }}>
          {draft || <span style={{ color: '#555' }}>…</span>}
          <span style={{ color: '#FFA500' }}>|</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rows.map((line, ri) => (
            <div key={`row-${ri}`} style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              {line.map((key, ci) => {
                const focused = ri === focusRow && ci === safeCol;
                const flex = key.flex ?? 1;
                const isOk = key.type === 'ok';
                return (
                  <button
                    key={key.id}
                    type="button"
                    onClick={() => {
                      setFocusRow(ri);
                      setFocusCol(ci);
                      activateKey(key);
                    }}
                    style={{
                      flex,
                      minWidth: 0,
                      height: '42px',
                      borderRadius: '8px',
                      border: focused ? '2px solid #fff' : '1px solid #444',
                      backgroundColor: isOk ? '#c45f00' : focused ? '#2a2a2a' : '#1a1a1a',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: key.type === 'space' || key.type === 'layout' || key.type === 'ok' ? '12px' : '15px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {key.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap',
          marginTop: '10px', color: '#aaa', fontSize: '11px',
        }}>
          <span><b style={{ color: '#2ecc71' }}>SUD</b> touche</span>
          <span><b style={{ color: '#e74c3c' }}>EST</b> annuler</span>
          <span><b style={{ color: '#f1c40f' }}>NORD</b> effacer</span>
          <span><b style={{ color: '#fff' }}>OK</b> valider</span>
        </div>
      </div>
    </div>
  );
};

export default GamepadVirtualKeyboard;
