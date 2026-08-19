// Fichier: src/components/ThemeList/GamepadVirtualKeyboard.tsx
//
// Clavier virtuel manette — mode kiosque (?retrobat=1).
// Logique alignee sur hyperbatmedia-virtual-keyboard.ahk :
//   SUD = touche visée ; EST = 1 caractère en moins ; NORD = fermer
//   (garde le texte) ; touche OK = fermer (garde le texte).
// Maj / Sym / Vider comme l'AHK. NORD n'efface plus tout le champ.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type LayoutId = 'letters' | 'sym';

type KeyDef =
  | { id: string; label: string; type: 'char'; value: string; flex?: number }
  | { id: string; label: string; type: 'space'; flex?: number }
  | { id: string; label: string; type: 'backspace'; flex?: number }
  | { id: string; label: string; type: 'shift'; flex?: number }
  | { id: string; label: string; type: 'sym'; flex?: number }
  | { id: string; label: string; type: 'abc'; flex?: number }
  | { id: string; label: string; type: 'clear'; flex?: number }
  | { id: string; label: string; type: 'ok'; flex?: number };

const LETTER_ROWS: KeyDef[][] = [
  '1234567890'.split('').map((c) => ({ id: `d-${c}`, label: c, type: 'char' as const, value: c })),
  'azertyuiop'.split('').map((c) => ({ id: `l-${c}`, label: c, type: 'char' as const, value: c })),
  'qsdfghjklm'.split('').map((c) => ({ id: `l-${c}`, label: c, type: 'char' as const, value: c })),
  [
    ...'wxcvbn'.split('').map((c) => ({ id: `l-${c}`, label: c, type: 'char' as const, value: c })),
    { id: 'shift', label: 'Maj', type: 'shift', flex: 1.4 },
    { id: 'bksp', label: '<--', type: 'backspace', flex: 1.4 },
  ],
  [
    { id: 'space', label: 'Espace', type: 'space', flex: 2.4 },
    { id: 'sym', label: 'Sym', type: 'sym', flex: 1.2 },
    { id: 'clear', label: 'Vider', type: 'clear', flex: 1.2 },
    { id: 'ok', label: 'OK', type: 'ok', flex: 1.4 },
  ],
];

const SYM_ROWS: KeyDef[][] = [
  '!?. ,:;\'-'.replace(/ /g, '').split('').map((c, i) => (
    { id: `s1-${i}`, label: c, type: 'char' as const, value: c }
  )),
  '()_+ =&%#'.replace(/ /g, '').split('').map((c, i) => (
    { id: `s2-${i}`, label: c, type: 'char' as const, value: c }
  )),
  [
    { id: 'abc', label: 'ABC', type: 'abc', flex: 1.3 },
    { id: 'space2', label: 'Espace', type: 'space', flex: 2.2 },
    { id: 'clear2', label: 'Vider', type: 'clear', flex: 1.2 },
    { id: 'ok2', label: 'OK', type: 'ok', flex: 1.4 },
  ],
];

export interface GamepadVirtualKeyboardProps {
  open: boolean;
  initialValue: string;
  title?: string;
  onChange: (value: string) => void;
  /** OK ou NORD : garder la valeur courante et fermer. */
  onConfirm: () => void;
  /** Conservé pour compat ; le clavier n'annule plus (EST = backspace). */
  onCancel: () => void;
}

const GamepadVirtualKeyboard: React.FC<GamepadVirtualKeyboardProps> = ({
  open,
  initialValue,
  title = 'Saisie',
  onChange,
  onConfirm,
}) => {
  const [layout, setLayout] = useState<LayoutId>('letters');
  const [shift, setShift] = useState(false);
  const [draft, setDraft] = useState(initialValue);
  const [focusRow, setFocusRow] = useState(0);
  const [focusCol, setFocusCol] = useState(0);
  const [debugLog, setDebugLog] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('osk-debug') || '[]'); } catch (_) { return []; }
  });
  const debugPush = useCallback((msg: string) => {
    const line = `${(performance.now()|0)} ${msg}`;
    setDebugLog(prev => {
      const next = [...prev.slice(-11), line];
      try { localStorage.setItem('osk-debug', JSON.stringify(next)); } catch (_) { /* ignore */ }
      return next;
    });
  }, []);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const focusRowRef = useRef(focusRow);
  const focusColRef = useRef(focusCol);
  focusRowRef.current = focusRow;
  focusColRef.current = focusCol;
  const shiftRef = useRef(shift);
  shiftRef.current = shift;

  const rows = useMemo(
    () => (layout === 'letters' ? LETTER_ROWS : SYM_ROWS),
    [layout],
  );
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const onChangeRef = useRef(onChange);
  const onConfirmRef = useRef(onConfirm);
  const debugPushRef = useRef(debugPush);
  onChangeRef.current = onChange;
  onConfirmRef.current = onConfirm;
  debugPushRef.current = debugPush;

  useEffect(() => {
    if (!open) return;
    debugPushRef.current('OPEN init=' + initialValue);
    setDraft(initialValue);
    draftRef.current = initialValue;
    setLayout('letters');
    setShift(false);
    setFocusRow(0);
    setFocusCol(0);
  }, [open, initialValue]);

  useEffect(() => {
    debugPushRef.current('MOUNT');
    return () => debugPushRef.current('UNMOUNT');
  }, []);

  const setDraftAndNotify = useCallback((next: string) => {
    setDraft(next);
    draftRef.current = next;
    onChangeRef.current(next);
  }, []);

  const closeKeep = useCallback(() => {
    onConfirmRef.current();
  }, []);

  const activateKey = useCallback((key: KeyDef) => {
    if (key.type === 'char') {
      const ch = shiftRef.current && key.value.length === 1
        ? key.value.toUpperCase()
        : key.value;
      setDraftAndNotify(draftRef.current + ch);
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
    if (key.type === 'shift') {
      setShift((s) => !s);
      return;
    }
    if (key.type === 'sym') {
      setLayout('sym');
      setFocusRow(0);
      setFocusCol(0);
      return;
    }
    if (key.type === 'abc') {
      setLayout('letters');
      setFocusRow(0);
      setFocusCol(0);
      return;
    }
    if (key.type === 'clear') {
      setDraftAndNotify('');
      return;
    }
    if (key.type === 'ok') {
      debugPushRef.current('OK→ferme');
      closeKeep();
    }
  }, [setDraftAndNotify, closeKeep]);

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
    const REPEAT_NEXT = 90;
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
        const safeC = Math.min(fc, Math.max(0, line.length - 1));
        const key = line[safeC];
        const allDown = pressed.map((v, i) => v ? i : null).filter(v => v !== null).join(',');
        debugPushRef.current(`SUD r${fr}c${fc}→${safeC} key=${key?.id||'?'} btns=[${allDown}]`);
        if (key) activateKey(key);
      }
      if (just(btnEst)) {
        debugPushRef.current('EST backspace');
        setDraftAndNotify(draftRef.current.slice(0, -1));
      }
      if (just(btnNord)) {
        const allDown = pressed.map((v, i) => v ? i : null).filter(v => v !== null).join(',');
        const prevNord = prev ? prev[btnNord] : '?';
        debugPushRef.current(`NORD! btns=[${allDown}] prev[${btnNord}]=${prevNord}`);
        closeKeep();
      }
      prev = pressed;
    }, 40);

    return () => clearInterval(iv);
  }, [open, moveFocus, activateKey, setDraftAndNotify, closeKeep]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        debugPushRef.current('ESC clavier→ferme');
        closeKeep();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
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
  }, [open, setDraftAndNotify, closeKeep]);

  const debugOverlay = debugLog.length > 0 ? (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      zIndex: 99999, padding: '6px 10px',
      backgroundColor: '#000', border: '2px solid #f00',
      borderRadius: '0 0 8px 0', fontSize: '11px', fontFamily: 'monospace',
      color: '#0f0', maxWidth: '600px', pointerEvents: 'none',
    }}>
      <div style={{ color: '#f44', fontWeight: 700, marginBottom: '2px' }}>
        OSK {open ? 'ouvert' : 'FERMÉ'}
      </div>
      {debugLog.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  ) : null;

  if (!open) return debugOverlay;

  const safeCol = Math.min(focusCol, Math.max(0, (rows[focusRow]?.length || 1) - 1));
  const displayLabel = (key: KeyDef): string => {
    if (key.type === 'char' && shift && key.value.length === 1) {
      return key.value.toUpperCase();
    }
    return key.label;
  };

  return (
    <>
    {debugOverlay}
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
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '8px', gap: '10px',
        }}>
          <div style={{ color: '#FFA500', fontWeight: 800, fontSize: '14px' }}>{title}</div>
          <div style={{ color: '#888', fontSize: '11px' }}>
            {layout === 'letters' ? (shift ? 'MAJ' : 'AZERTY') : 'Symboles'}
          </div>
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
                const isShiftOn = key.type === 'shift' && shift;
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
                      backgroundColor: isOk
                        ? '#c45f00'
                        : focused || isShiftOn
                          ? '#E39B00'
                          : '#1a1a1a',
                      color: focused || isShiftOn ? '#111' : '#fff',
                      fontWeight: 700,
                      fontSize: key.type === 'char' && key.value.length === 1 ? '15px' : '12px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {displayLabel(key)}
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
          <span><b style={{ color: '#e74c3c' }}>EST</b> effacer</span>
          <span><b style={{ color: '#f1c40f' }}>NORD</b> fermer</span>
          <span><b style={{ color: '#fff' }}>OK</b> valider</span>
        </div>

        {debugLog.length > 0 && (
          <div style={{
            marginTop: '8px', padding: '6px 10px',
            backgroundColor: '#0a0a0a', border: '1px solid #333',
            borderRadius: '6px', fontSize: '10px', fontFamily: 'monospace',
            color: '#0f0', maxHeight: '90px', overflowY: 'auto',
          }}>
            {debugLog.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default GamepadVirtualKeyboard;
