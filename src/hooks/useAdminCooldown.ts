// Fichier: src/hooks/useAdminCooldown.ts
// Cooldown de 3 min après un push admin (thèmes OU liens/outils) — extrait de
// ManageTab.tsx pour que ManageTab ET LinksTab partagent exactement la même
// logique et la même clé localStorage ('hyperbat_cooldown'). Un push depuis
// l'un des deux onglets bloque donc les DEUX pendant le cooldown, puisque
// c'est le même verrou admin_lock.json sur GitHub qui est écrit dans les
// deux cas.
import { useState, useEffect, useRef } from 'react';

export const COOLDOWN_SECONDS = 180; // 3 minutes

export function useAdminCooldown() {
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [cooldownAdmin, setCooldownAdmin] = useState<string>('');
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vérifie si un cooldown est actif au montage (depuis localStorage)
  useEffect(() => {
    const stored = localStorage.getItem('hyperbat_cooldown');
    if (stored) {
      try {
        const { pushedAt, adminName } = JSON.parse(stored);
        const elapsed = Math.floor((Date.now() - pushedAt) / 1000);
        const remaining = COOLDOWN_SECONDS - elapsed;
        if (remaining > 0) {
          setCooldownRemaining(remaining);
          setCooldownAdmin(adminName);
        } else {
          localStorage.removeItem('hyperbat_cooldown');
        }
      } catch {
        localStorage.removeItem('hyperbat_cooldown');
      }
    }
  }, []);

  // Écoute la fermeture de l'admin (depuis HyperBatMediaSite.tsx) → reset
  useEffect(() => {
    const handleCloseAdmin = () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      localStorage.removeItem('hyperbat_cooldown');
      setCooldownRemaining(0);
      setCooldownAdmin('');
    };
    window.addEventListener('hyperbat-close-admin', handleCloseAdmin);
    return () => window.removeEventListener('hyperbat-close-admin', handleCloseAdmin);
  }, []);

  // Décompte
  useEffect(() => {
    if (cooldownRemaining > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            clearInterval(cooldownIntervalRef.current!);
            localStorage.removeItem('hyperbat_cooldown');
            setCooldownAdmin('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, [cooldownRemaining]);

  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startCooldown = (adminName: string) => {
    const pushedAt = Date.now();
    localStorage.setItem('hyperbat_cooldown', JSON.stringify({ pushedAt, adminName }));
    setCooldownRemaining(COOLDOWN_SECONDS);
    setCooldownAdmin(adminName);
  };

  const forceCooldownSkip = () => {
    localStorage.removeItem('hyperbat_cooldown');
    setCooldownRemaining(0);
    setCooldownAdmin('');
  };

  return { cooldownRemaining, cooldownAdmin, formatCountdown, startCooldown, forceCooldownSkip };
}
