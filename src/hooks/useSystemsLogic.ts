import { useState, useMemo } from 'react';
import { SystemRow, Category, SystemsDataStructure, SectionIconsStructure } from '../types';
import { systemsData, sectionIcons, categories } from '../constants';

const DEFAULT_SECTIONS = {
  collections: false,
  arcade: false,
  home: false,
  portable: false,
  fantasy: false,
  ordinosaure: false,
  ports: false,
  flipper: false
};

export const generateSystems = (cats: Category[], data: SystemsDataStructure, icons: SectionIconsStructure): SystemRow[] => {
  const result: SystemRow[] = [
    { id: 'all', name: 'Tous les systèmes', categories: [] },
    { id: 'tools', name: 'Outils', categories: [] },
    { id: 'tutorials', name: 'Tutoriels', categories: [] },
    { id: 'main-themes', name: 'THÈMES HYPERBAT', categories: [] }
  ];

  const usedSystemNames = new Set<string>();
  const usedIds = new Set<string>(['all', 'tools', 'tutorials', 'main-themes']);

  Object.entries(data).forEach(([section, subsections]) => {
    const headerId = `${section}-header`;
    result.push({
      id: headerId,
      name: icons[section],
      isHeader: true,
      section
    });
    usedIds.add(headerId);

    Object.entries(subsections).forEach(([subsectionKey, subsectionData]) => {
      const subHeaderId = `${section}-${subsectionKey}-brand`;
      result.push({
        id: subHeaderId,
        name: subsectionData.label,
        isSubHeader: true,
        section,
        subsection: subsectionKey
      });
      usedIds.add(subHeaderId);

      subsectionData.systems.forEach(systemName => {
        const normalizedSystemName = systemName.toLowerCase().trim();
        if (usedSystemNames.has(normalizedSystemName)) {
          return;
        }

        usedSystemNames.add(normalizedSystemName);
        const normalizedName = systemName.toLowerCase().replace(/[^a-z0-9]+/g, '');
        let systemId = `${section}-${subsectionKey}-${normalizedName}`;

        let counter = 1;
        while (usedIds.has(systemId)) {
          systemId = `${section}-${subsectionKey}-${normalizedName}-${counter}`;
          counter++;
        }

        result.push({
          id: systemId,
          name: systemName,
          section,
          subsection: subsectionKey,
          categories: cats
        });
        usedIds.add(systemId);
      });
    });
  });

  return result;
};

interface UseSystemsLogicResult {
  systems: SystemRow[];
  selectedSystem: string;
  setSelectedSystem: React.Dispatch<React.SetStateAction<string>>;
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  expandedSubsections: Record<string, boolean>;
  toggleSubsection: (subsection: string) => void;
  expandedSystems: Record<string, boolean>;
  toggleSystemCategories: (systemId: string) => void;
  handleSystemSelect: (systemId: string) => void;
}

export function useSystemsLogic(): UseSystemsLogicResult {
  // ✅ SIMPLIFIÉ : Plus besoin de dépendre des liens
  const systems = useMemo<SystemRow[]>(() => {
    return generateSystems(categories, systemsData, sectionIcons);
  }, []); // ✅ Dépendances vides car constants statiques

  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(DEFAULT_SECTIONS);
  const [expandedSubsections, setExpandedSubsections] = useState<Record<string, boolean>>({});
  const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>({});

  const toggleSystemCategories = (systemId: string) => {
    setExpandedSystems(prev => {
      const isOpen = !!prev[systemId];
      return isOpen ? {} : { [systemId]: true };
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...DEFAULT_SECTIONS,
      [section]: !prev[section] ? true : false
    }));
    setExpandedSubsections({});
    setExpandedSystems({});
  };

  const toggleSubsection = (subsection: string) => {
    setExpandedSubsections(prev => {
      const isOpen = !!prev[subsection];
      return isOpen ? {} : { [subsection]: true };
    });
    setExpandedSystems({});
  };

  const handleSystemSelect = (systemId: string) => {
    const system = systems.find(s => s.id === systemId);
    if (!system) return;

    if (['all', 'tools', 'tutorials', 'main-themes'].includes(systemId)) {
      setSelectedSystem(systemId);
      setSelectedCategory('all');
      setExpandedSystems({});
      setExpandedSections(DEFAULT_SECTIONS);
      setExpandedSubsections({});
      return;
    }

    if (selectedSystem === systemId) {
      if (system.categories && system.categories.length > 0) {
        setExpandedSystems(prev => 
          prev[systemId] ? {} : { [systemId]: true }
        );
      }
      return;
    }

    if (system.section) {
      const sectionKey = system.section as string;
      setExpandedSections({
        ...DEFAULT_SECTIONS,
        [sectionKey]: true
      });
    }

    if (system.subsection) {
      setExpandedSubsections({ [system.subsection]: true });
    } else {
      setExpandedSubsections({});
    }

    if (system.categories && system.categories.length > 0) {
      setExpandedSystems({ [systemId]: true });
    } else {
      setExpandedSystems({});
    }

    setSelectedSystem(systemId);
    setSelectedCategory('all');
  };

  return {
    systems,
    selectedSystem,
    setSelectedSystem,
    selectedCategory,
    setSelectedCategory,
    expandedSections,
    toggleSection,
    expandedSubsections,
    toggleSubsection,
    expandedSystems,
    toggleSystemCategories,
    handleSystemSelect
  };
}