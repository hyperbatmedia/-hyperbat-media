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
  date?: string;
  onScreenScraper?: boolean;
  isMulti?: boolean;  // thème multi-région (PAL, USA, JAP, etc.)
  ssGameId?: string;  // ID du jeu sur ScreenScraper (lien manuel ou auto)
};

export type NewThemeForm = Omit<ThemeItem, 'id'>;

export type SystemRow = {
  id: string;
  name: string;
  label?: string;
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

export type SystemSubsection = {
  label: string;
  systems: string[];
};

export type SystemsDataStructure = Record<string, Record<string, SystemSubsection>>;
export type SectionIconsStructure = Record<string, string>;
