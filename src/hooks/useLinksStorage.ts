// Fichier: src/hooks/useLinksStorage.ts
// Pendant de useLinksLoader.ts, mais pour L'ÉDITION admin (pas juste la
// lecture) : mêmes données (src/data/links.json), même clé localStorage
// ('admin-links', déjà lue en priorité par useLinksLoader), pour que ce
// que l'admin enregistre ici soit immédiatement visible sur le site sans
// attendre le Push GitHub.
import { useState, useEffect } from 'react';
import linksData from '../data/links.json';
import type { Link } from './useLinksLoader';

const LS_KEY = 'admin-links';

interface UseLinksStorageResult {
  links: Link[];
  setLinks: React.Dispatch<React.SetStateAction<Link[]>>;
  isLoading: boolean;
  saveLinks: (newLinks: Link[]) => Promise<void>;
}

export function useLinksStorage(): UseLinksStorageResult {
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sauvegarde locale (immédiate, en attendant le Push GitHub depuis l'admin).
  const saveLinks = async (newLinks: Link[]) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(newLinks));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des liens:', error);
      alert('Erreur lors de la sauvegarde des liens');
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        setLinks(JSON.parse(stored));
      } else if (Array.isArray(linksData)) {
        setLinks(linksData as Link[]);
      } else {
        setLinks([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des liens:', error);
      setLinks(Array.isArray(linksData) ? (linksData as Link[]) : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { links, setLinks, isLoading, saveLinks };
}
