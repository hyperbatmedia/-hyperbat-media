import * as React from 'react';
import linksData from '../data/links.json';

interface Link {
  id: string;
  name: string;
  url: string;
  location: 'header' | 'list';
  position?: number;
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
          console.log(`📦 ${parsedLinks.length} lien(s) chargé(s) depuis localStorage`);
          setIsLoading(false);
          return;
        }

        // 2️⃣ FALLBACK : Fichier JSON bundlé
        if (linksData && Array.isArray(linksData)) {
          const typedLinks = linksData as Link[];
          setLinks(typedLinks);
          console.log(`⚡ ${typedLinks.length} lien(s) chargé(s) depuis links.json (instantané)`);
        } else {
          setLinks([]);
          console.log('ℹ️ Aucun lien trouvé dans links.json');
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