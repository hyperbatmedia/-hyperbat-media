// /src/components/AdminPanel/AddTab.tsx
import React from 'react';
import { Save, Image, CheckCircle, Loader2, X, Eye } from 'lucide-react';

interface NewThemeForm {
  name: string;
  system: string;
  category: string;
  imageUrl: string;
  downloadUrl: string;
  creator: string;
  size: string;
}

interface SystemRow {
  id: string;
  name?: string; 
  isHeader?: boolean;
  isSubHeader?: boolean;
}

interface Category {
  id: string;
  name?: string; 
}

const extractSystemsFromConstants = (): { id: string; name: string }[] => {
  const systemsData = {
    collections: { collections: { systems: ['Collections Personnalisées'] } },
    arcade: {
      mame: { systems: ['MAME', 'HBMAME'] },
      snk: { systems: ['SNK 68k', 'Alpha Denshi', 'Neo Geo MVS', 'Hyper Neo Geo 64'] },
      capcom: { systems: ['Capcom Classique', 'CP System Dash', 'CPS1', 'CPS2', 'CPS3'] },
    },
    home: {
      nintendo: { systems: ['NES / Famicom', 'Super Nintendo', 'Nintendo 64', 'GameCube', 'Wii', 'Switch'] },
      sega: { systems: ['Master System', 'Mega Drive / Genesis', 'Mega CD', '32X', 'Saturn', 'Dreamcast'] },
      sony: { systems: ['PlayStation', 'PlayStation 2', 'PlayStation 3', 'PlayStation 4'] },
    },
    computer: {
      microsoft: { systems: ['MSX', 'MSX2', 'Windows'] },
      apple: { systems: ['Apple II', 'Macintosh'] },
    },
    portable: {
      nintendo: { systems: ['Game Boy', 'Game Boy Color', 'Game Boy Advance', 'DS', '3DS'] },
      sony: { systems: ['PSP', 'PS Vita'] },
    }
  };
  
  const allSystems: { id: string; name: string }[] = [];
  Object.values(systemsData).forEach((section: any) => {
    Object.values(section).forEach((manufacturer: any) => {
      if (manufacturer.systems) {
        manufacturer.systems.forEach((systemName: string) => {
          allSystems.push({ id: systemName.toLowerCase().replace(/[^a-z0-9]/g, '-'), name: systemName });
        });
      }
    });
  });
  return allSystems;
};

const CONSTANTS_SYSTEMS = extractSystemsFromConstants();

interface AddTabProps {
  newTheme: NewThemeForm;
  setNewTheme: React.Dispatch<React.SetStateAction<NewThemeForm>>;
  handleAddTheme: () => Promise<void>;
  systems: SystemRow[];
  categories: Category[];
  convertGoogleDriveUrl: (url: string, isImage?: boolean) => string; 
}

const AddTab: React.FC<AddTabProps> = ({ 
  newTheme, 
  setNewTheme, 
  handleAddTheme, 
  systems, 
  categories, 
  convertGoogleDriveUrl 
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [systemSearch, setSystemSearch] = React.useState('');
  const [showSystemDropdown, setShowSystemDropdown] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(false);
  
  const [rawImageUrlInput, setRawImageUrlInput] = React.useState(newTheme.imageUrl);
  const [rawDownloadUrlInput, setRawDownloadUrlInput] = React.useState(newTheme.downloadUrl);
  const [imagePreview, setImagePreview] = React.useState(newTheme.imageUrl);

  const safeNewTheme = newTheme || { 
    name: '', 
    creator: '', 
    system: '', 
    category: '', 
    imageUrl: '', 
    downloadUrl: '', 
    size: '' 
  };
  const safeSystems = systems || [];
  const safeCategories = categories || [];

  React.useEffect(() => {
    setRawImageUrlInput(newTheme.imageUrl);
    setRawDownloadUrlInput(newTheme.downloadUrl);
    setImagePreview(newTheme.imageUrl);
  }, [newTheme]);

  const finalSystems = React.useMemo(() => {
    const defaultSystems = safeSystems.length > 0 
      ? safeSystems.filter(s => !s.isHeader && !s.isSubHeader) 
      : CONSTANTS_SYSTEMS.map(s => ({ id: s.id, name: s.name }));

    return defaultSystems.filter(s => 
      s.name?.toLowerCase().includes(systemSearch.toLowerCase())
    );
  }, [safeSystems, systemSearch]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!safeNewTheme.name || !safeNewTheme.system) {
      alert("Le nom et le système sont obligatoires.");
      return;
    }

    try {
      setIsSubmitting(true);
      await handleAddTheme();
      setShowSuccess(true);
      
      setNewTheme({
        name: '',
        system: safeNewTheme.system, 
        category: safeNewTheme.category, 
        imageUrl: '',
        downloadUrl: '',
        creator: safeNewTheme.creator, 
        size: '',
      });
      setRawImageUrlInput('');
      setRawDownloadUrlInput('');
      setImagePreview('');

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erreur lors de l'ajout du thème:", error);
      alert("Une erreur est survenue lors de l'ajout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof NewThemeForm, value: string) => {
    if (field === 'imageUrl') {
      setRawImageUrlInput(value);
      setImagePreview(''); 
      setImageError(false);
    } else if (field === 'downloadUrl') {
      setRawDownloadUrlInput(value);
    } else {
      setNewTheme((prev: NewThemeForm) => ({ ...prev, [field]: value }));
    }
  };
  
  const handleInputBlur = (field: keyof NewThemeForm, rawValue: string) => {
    let convertedValue = rawValue;

    if (rawValue.trim()) {
      if (field === 'imageUrl') {
        convertedValue = convertGoogleDriveUrl(rawValue, true);
        setImagePreview(convertedValue); 
        setImageError(false);
      } else if (field === 'downloadUrl') {
        convertedValue = convertGoogleDriveUrl(rawValue);
      }
    } else {
      convertedValue = '';
      if (field === 'imageUrl') {
        setImagePreview('');
        setImageError(false);
      }
    }

    setNewTheme((prev: NewThemeForm) => ({ ...prev, [field]: convertedValue }));
  };

  const handleSystemSelect = (systemId: string) => {
    setNewTheme((prev: NewThemeForm) => ({ ...prev, system: systemId }));
    setShowSystemDropdown(false);
    setSystemSearch('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      {/* HEADER MODERNE (Style DriveTab) */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 p-1">
        <div className="bg-gray-900 rounded-[22px] p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative bg-gradient-to-br from-orange-500 to-pink-500 p-4 rounded-2xl">
                <Save className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black text-white mb-1">Ajouter un Thème</h1>
              <p className="text-gray-400 text-sm font-semibold">Création • Configuration • Prévisualisation</p>
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGE DE SUCCÈS */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-900/30 border-2 border-green-500 text-green-300 rounded-xl flex items-center gap-3 animate-pulse">
          <CheckCircle className="w-6 h-6" />
          <span className="font-bold">✅ Thème ajouté avec succès !</span>
        </div>
      )}

      {/* FORMULAIRE MODERNE */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl">
        <form onSubmit={handleSubmit}>
          {/* SECTION: Informations Principales */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Informations Principales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2" htmlFor="name">
                  Nom du Thème <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  id="name"
                  value={safeNewTheme.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nom du Thème"
                  required
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2" htmlFor="creator">
                  Créateur
                </label>
                <input 
                  type="text" 
                  id="creator"
                  value={safeNewTheme.creator}
                  onChange={(e) => handleInputChange('creator', e.target.value)}
                  placeholder="Créateur du Thème"
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION: Configuration Système */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 011-1v-.5z" />
              </svg>
              Configuration Système
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-300 mb-2" htmlFor="system">
                  Système <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    id="system"
                    value={showSystemDropdown ? systemSearch : finalSystems.find(s => s.id === safeNewTheme.system)?.name || safeNewTheme.system}
                    onChange={(e) => {
                      setSystemSearch(e.target.value);
                      setShowSystemDropdown(true);
                    }}
                    onFocus={() => setShowSystemDropdown(true)}
                    placeholder="Rechercher un système..."
                    required
                    className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                  />
                  {showSystemDropdown && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => {
                        setSystemSearch('');
                        setShowSystemDropdown(false);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                {showSystemDropdown && (
                  <div 
                    className="absolute z-10 w-full mt-1 bg-gray-900 border border-orange-500 rounded-xl max-h-60 overflow-y-auto shadow-2xl"
                    onMouseLeave={() => setShowSystemDropdown(false)}
                  >
                    {finalSystems.map((system) => (
                      <div
                        key={system.id}
                        className="p-3 text-gray-300 hover:bg-orange-600 hover:text-white cursor-pointer transition"
                        onClick={() => handleSystemSelect(system.id)}
                      >
                        {system.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2" htmlFor="category">
                  Catégorie
                </label>
                <select
                  id="category"
                  value={safeNewTheme.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition appearance-none"
                >
                  {safeCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2" htmlFor="size">
                  Taille
                </label>
                <input 
                  type="text" 
                  id="size"
                  value={safeNewTheme.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  placeholder="50 MB"
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION: URLs et Médias */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              URLs et Médias
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  URL de l'image (Google Drive)
                </label>
                <input 
                  type="url" 
                  value={rawImageUrlInput} 
                  onChange={(e) => handleInputChange('imageUrl', e.target.value)} 
                  onBlur={(e) => handleInputBlur('imageUrl', e.target.value)}
                  placeholder="https://drive.google.com/file/d/..." 
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  URL de téléchargement (Google Drive)
                </label>
                <input 
                  type="url" 
                  value={rawDownloadUrlInput} 
                  onChange={(e) => handleInputChange('downloadUrl', e.target.value)} 
                  onBlur={(e) => handleInputBlur('downloadUrl', e.target.value)}
                  placeholder="https://drive.google.com/file/d/..." 
                  className="w-full p-3 bg-gray-950 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition" 
                />
              </div>
            </div>
          </div>

          {/* SECTION: Prévisualisation */}
          {(imagePreview || imageError) && (
            <div className="mb-6 p-6 bg-gray-900 rounded-xl border border-gray-700 shadow-inner">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-orange-400" />
                Prévisualisation
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="relative w-full h-64 bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center border-2 border-gray-700">
                  {imageError ? (
                    <div className="text-center text-red-400">
                      <X className="w-12 h-12 mx-auto mb-2" />
                      <p className="font-bold">Erreur de chargement</p>
                    </div>
                  ) : imageLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-sm font-semibold">Chargement...</p>
                    </div>
                  ) : (
                    <img
                      src={imagePreview}
                      alt="Prévisualisation du thème"
                      className="w-full h-full object-contain"
                      onError={() => {
                        setImageError(true);
                        setImagePreview('');
                        setImageLoading(false);
                      }}
                      onLoadStart={() => setImageLoading(true)}
                      onLoad={() => setImageLoading(false)}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-3 justify-center">
                  <a 
                    href={newTheme.imageUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${!newTheme.imageUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Image className="w-5 h-5" />
                    Voir l'image (Convertie)
                  </a>
                  <button
                    type="button"
                    onClick={() => window.open(newTheme.downloadUrl, '_blank')}
                    disabled={!newTheme.downloadUrl}
                    className={`py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${!newTheme.downloadUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Télécharger
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BOUTON PRINCIPAL */}
          <button 
            type="submit"
            disabled={isSubmitting} 
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:cursor-not-allowed text-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Ajout en cours...</span>
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                <span>Ajouter le thème</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTab;