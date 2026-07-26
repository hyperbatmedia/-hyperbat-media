// Fichier: src/data/systemAliases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fichier de correspondance central entre les slugs utilisés dans themes.json
// et les slugs officiels de bob-systems.json
//
// RÈGLE : themes.json et bob-systems.json ne sont JAMAIS modifiés.
// Ce fichier fait le pont entre les deux.
//
// Usage :
//   - RecapThemesPanel  : THEME_TO_BOB pour compter les thèmes par système
//   - screenScraperUtils: SS_TO_THEME   pour mapper les systèmes ScreenScraper
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Slug theme → slug bob-systems ─────────────────────────────────────────
// Les slugs déjà identiques dans les deux fichiers ne sont pas listés ici.
// null = système custom HyperBat sans équivalent dans bob-systems (arcade custom,
//        collections, magazines, etc.) → ignoré dans RecapThemesPanel.

export const THEME_TO_BOB: Record<string, string | null> = {

  // ── SEGA ──────────────────────────────────────────────────────────────────
  'megadrivegenesis':        'megadrive',
  'megadrivemsu':            'megadrive-msu',
  '32x':                     'sega32x',
  'segaalls':                null,
  'segaclassic':             null,
  'nomad':                   null,

  // ── NINTENDO ──────────────────────────────────────────────────────────────
  'supernintendo':           'snes',
  'superfamicom':            'snes',
  'nintendo64':              'n64',
  'gamecube':                'gc',
  'supergameboy':            'sgb',
  'famicomdisksystem':       'fds',
  'sufamiturbo':             'sufami',
  'datach':                  null,

  // ── GAME BOY ──────────────────────────────────────────────────────────────
  'gameboy':                 'gb',
  'gameboy2players':         'gb2players',
  'gameboyhacks':            'gb',
  'gameboycolor':            'gbc',
  'gameboycolor2players':    'gbc2players',
  'gameboycolorhacks':       'gbc',
  'gameboyadvance':          'gba',
  'gameboyadvance2players':  'gba2players',

  // ── SONY ──────────────────────────────────────────────────────────────────
  'playstation':             'psx',
  'playstation2':            'ps2',
  'playstation3':            'ps3',
  'playstation4':            'ps4',
  'pspmini':                 'psp',
  'pocketstation':           null,

  // ── ATARI ─────────────────────────────────────────────────────────────────
  'lynx':                    'atarilynx',
  'atariclassique':          null,

  // ── NEC ───────────────────────────────────────────────────────────────────
  'pcengineturbografx16':    'pcengine',
  'pcenginecdturbografxcd':  'pce-cd',

  // ── SNK ───────────────────────────────────────────────────────────────────
  'neogeoaes':               'neogeo',
  'neogeomvs':               'neogeo',
  'neogeopocket':            'ngp',
  'neogeopocketcolor':       'ngpc',

  // ── NINTENDO DS ───────────────────────────────────────────────────────────
  'ds':                      'nds',

  // ── HANDHELD / LCD ────────────────────────────────────────────────────────
  'gamewatch':               'gameandwatch',
  'gamepocketcomputer':      'gamepock',
  'konamilcd':               'lcdgames',
  'lcdhandhelds':            'lcdgames',
  'tigerlcd':                'lcdgames',
  'elektronikahandheld':     'lcdgames',

  // ── ORDINATEURS ───────────────────────────────────────────────────────────
  'appleii':                 'apple2',
  'appleiigs':               'apple2gs',
  'commodore64':             'c64',
  'amiga':                   'amiga500',
  'cpc':                     'amstradcpc',
  'msdos':                   'pc',
  'pcdos':                   'pc',
  'msx':                     'msx1',
  'samcoup':                 'samcoupe',
  'plus4c4':                 'cplus4',
  'oric1':                   'oric',
  'odyssey2videopac':        'odyssey2',
  'pecom64':                 null,
  'mtx512':                  null,
  'microbee':                null,
  'eg2000':                  null,
  'alice32':                 null,
  'exelvisionexl100':        null,
  'sordm5':                  null,
  'videobrainfamilycomputer': null,

  // ── CONSOLES ──────────────────────────────────────────────────────────────
  'superacan':               'supracan',
  'supercassettevision':     'scv',
  'supervision8000':         'sv8000',
  'casioloopy':              'loopy',
  'colecoadam':              'adam',
  'adventurevision':         'advision',

  // ── PINBALL ───────────────────────────────────────────────────────────────
  'futurepinball':           'fpinball',

  // ── ÉQUIVALENTS MANQUANTS (trouvés lors de l'audit du récap) ─────────────
  'nintendo64dd':            'n64dd',
  'stv':                     'segastv',
  'ti994a':                  'ti99',
  'videopacodyssey2':        'odyssey2',

  // ── ARCADE custom (pas dans bob-systems) ─────────────────────────────────
  'aae':                     null,
  'adrenalineamusement':     null,
  'aleck64':                 null,
  'alls':                    null,
  'americanlasergames':      null,
  'atlus':                   null,
  'ballyclassics':           null,
  'banpresto':               null,
  'capcom68000':             null,
  'capcomclassique':         null,
  'capcomz80':               null,
  'capcomzn1':               null,
  'capcomzn2':               null,
  'daphnelaserdisc':         'daphne',
  'dataeast':                null,
  'europar':                 null,
  'igs':                     null,
  'igtslots':                null,
  'irem':                    null,
  'iremm62':                 null,
  'iremm72':                 null,
  'iremm92':                 null,
  'jaleco':                  null,
  'kaneko':                  null,
  'konamibubblesystem':      null,
  'konamiclassique':         null,
  'midway':                  null,
  'mitchell':                null,
  'namcosystemes3':          'namco3xx',
  'namcosystemna1':          null,
  'namcosystemna2':          null,
  'nesicaxlive':             null,
  'nesicaxlive2':            null,
  'nichibutsu':              null,
  'nmk':                     null,
  'psikyo':                  null,
  'raizing':                 null,
  'rawthrills':              null,
  'ringedge':                null,
  'ringwide':                null,
  'sammy':                   null,
  'segaclassiq':             null,
  'sorcerer':                null,
  'system16':                null,
  'system18':                null,
  'system2':                 null,
  'system24':                null,
  'system32':                null,
  'taito':                   null,
  'taitoclassique':          null,
  'technos':                 null,
  'tecmo':                   null,
  'toaplan':                 null,
  'vssystem':                null,
  'zinc':                    'zinc',

  // ── CUSTOM HyperBat (pas dans bob-systems) ───────────────────────────────
  'collectionspersonnalises': null,
  'magazines':                null,
  'xboxlivearcade':           'xbox360',

  // ── ARCADE sans équivalent domestique (exclusion volontaire, audit récap) ─
  'atarisystem1':             null,
  'fuuki':                    null,
  'iremclassique':            null,
  'namcoclassique':           null,
  'namcosystem2':             null,
  'playchoice10':             null,
};

// ── 2. Résolution d'un slug theme vers slug bob ───────────────────────────────
// Retourne le slug bob correspondant, ou le slug theme lui-même s'il est déjà
// dans bob-systems, ou null si pas de correspondance.
export const resolveBobSlug = (themeSlug: string): string | null => {
  // Si présent dans le mapping explicite
  if (themeSlug in THEME_TO_BOB) {
    return THEME_TO_BOB[themeSlug];
  }
  // Sinon le slug est déjà correct (identique dans bob-systems)
  return themeSlug;
};
