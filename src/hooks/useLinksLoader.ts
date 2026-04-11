import * as React from 'react';
import linksData from '../data/links.json';

export interface ModalItem {
  id: string;
  name: string;
  creator: string;
  youtubeUrl?: string;
  youtubeId?: string;
  description?: string;
  imageUrl?: string;
  downloadUrl?: string;
}

export interface ModalConfig {
  title: string;
  type: 'youtube' | 'download';
  items: ModalItem[];
}

export interface Link {
  id: string;
  name: string;
  url: string;
  location: 'header' | 'list';
  position?: number;
  modal?: ModalConfig;
}

/**
 * ✅ VERSION OPTIMISÉE : Chargement depuis le code source
 * Les liens sont maintenant bundlés avec l'application
 */
export function useLinksLoader() {
  const [links, setLinks] = React.useState<Link[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadLinks = async () => {
      setIsLoading(true);
      try {
        // 1️⃣ PRIORITÉ : localStorage (éditions temporaires en admin)
        const storedLinks = localStorage.getItem('admin-links');
        if (storedLinks) {
          const parsedLinks: Link[] = JSON.parse(storedLinks);
          setLinks(parsedLinks);
          setIsLoading(false);
          return;
        }

        // 2️⃣ FALLBACK : Fichier JSON bundlé
        if (linksData && Array.isArray(linksData)) {
          const typedLinks = linksData as Link[];
          setLinks(typedLinks);
        } else {
          setLinks([]);
        }

      } catch (error) {
        console.error('❌ Erreur chargement liens:', error);
        setLinks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLinks();
  }, []);

  return { links, isLoading };
}
