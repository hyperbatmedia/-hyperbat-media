// Fichier: src/types.ts

export type ThemeItem = {
  id: number;
  name: string;
  system: string;
  category: string;
  imageUrl: string;
  downloadUrl: string;
  creator: string;
  size: string;
};

// Utilise Omit pour éviter de répéter toutes les propriétés
// Si vous modifiez ThemeItem, NewThemeForm sera automatiquement mis à jour
export type NewThemeForm = Omit<ThemeItem, 'id'>;

export type SystemRow = {
  id: string;
  name: string;  // ✅ Retiré le '?' pour rendre name obligatoire
  isHeader?: boolean;
  isSubHeader?: boolean;
  section?: string;
  subsection?: string;
  categories?: { id: string; name: string }[];
};

export type Category = {
  id: string;
  name: string;
};

// Types pour la structure des données statiques (systemsData)
export type SystemSubsection = {
  label: string;
  systems: string[];
};

export type SystemsDataStructure = Record<string, Record<string, SystemSubsection>>;

export type SectionIconsStructure = Record<string, string>;