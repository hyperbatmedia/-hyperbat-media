// Fichier: src/hooks/useUnpushedThemes.ts
// Petit compteur partagé : combien de thèmes ajoutés depuis l'onglet
// "Applications" ne sont PAS encore poussés sur GitHub. Sert à rappeler à
// l'admin (bandeau + fenêtre "Fermer l'administration") de pusher avant de
// partir. Remis à zéro quand le push des thèmes réussit (ManageTab).
import { useSyncExternalStore } from 'react';

let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const addUnpushedThemes = (n: number): void => {
  count += n;
  emit();
};
export const clearUnpushedThemes = (): void => {
  if (count === 0) return;
  count = 0;
  emit();
};
export const getUnpushedThemes = (): number => count;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useUnpushedThemes = (): number => useSyncExternalStore(subscribe, getUnpushedThemes);
