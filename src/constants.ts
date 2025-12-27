// Fichier: src/constants.ts
import { Category, SystemsDataStructure, SectionIconsStructure } from './types';

// --- categories (statique) - EXPORTÉ pour utilisation dans Lightbox
export const categories: Category[] = [
    { id: 'game-themes', name: 'Thèmes de jeux' },
    { id: 'system-themes', name: 'Thèmes système' },
    { id: 'default-themes', name: 'Thème default' },
    { id: 'artwork', name: 'Artwork' }
];

// --- systemsData (statique)
export const systemsData: SystemsDataStructure = {
    collections: {
        collections: { 
            label: '', 
            systems: ['Collections Personnalisées']
        }
    },
    arcade: {
        mame: { label: 'MAME ARCADE', systems: ['MAME', 'HBMAME' ] },
        snk: { label: 'SNK', systems: ['SNK 68k', 'Alpha Denshi', 'Neo Geo MVS', 'Hyper Neo Geo 64'] },
        capcom: { label: 'CAPCOM', systems: ['Capcom Classique', 'CP System Dash', 'CPS1', 'CPS2', 'CPS3'] },
        'sega-arcade': {
          label: 'SEGA',
          systems: ['Sega G80', 'System 1', 'System 2', 'System E', 'System C', 'System C-2', 'System 16', 'System 18', 'System 24', 'System 32', 'System Multi 32', 'X Board', 'Y Board', 'ST-V', 'Europa-R', 'System SP', 'Model 1', 'Model 2', 'Model 3', 'Hikaru', 'Naomi', 'Naomi 2', 'Chihiro', 'Lindbergh', 'RingEdge', 'RingEdge 2', 'RingWide']
        },
        namco: { label: 'NAMCO', systems: ['Namco Classique', 'Namco System', 'Namco System 2x6', 'Namco System 10', 'Namco System 11', 'Namco System 12', 'Namco System 21', 'Namco System 22', 'Namco System 23', 'Namco System 246', 'Namco System 256', 'Namco System Super 256', 'Namco System 357', 'Namco System 369', 'Namco System ES1', 'Namco System ES2', 'Namco System ES3', 'Namco System FL', 'Namco System NA-1', 'Namco System NA-2'] },
        konami: { label: 'KONAMI', systems: ['Konami Classique', 'Konami', 'Konami GX', 'Konami GTI', 'Konami M2', 'Konami Hornet', 'Konami Python', 'Konami Viper', 'Konami Firebeat', 'Konami Twinkle', 'Konami Windy', 'Konami Windy X2', 'Konami System 573', 'Bemani DJ Main', 'Bemani PC', 'e-Amusement'] },
        taito: { label: 'TAITO', systems: ['Taito Classique', 'Taito', 'Taito F3', 'Taito G-Net', 'Type X', 'Type X2', 'Type X3', 'Type X Zero'] },
        'nintendo-arcade': { label: 'NINTENDO', systems: ['PlayChoice-10', 'VS System'] },
        triforce: { label: 'TRIFORCE', systems: ['Triforce'] },
        'atari-arcade': { label: 'ATARI', systems: ['Atari Classique', 'Atari System 1', 'Atari System 2'] },
        cave: { label: 'CAVE', systems: ['Cave'] },
        psikyo: { label: 'PSIKYO', systems: ['Psikyo'] },
        toaplan: { label: 'TOAPLAN', systems: ['Toaplan'] },
        kaneko: { label: 'KANEKO', systems: ['Kaneko'] },
        dataeast: { label: 'DATA EAST', systems: ['Data East'] },
        mitchell: { label: 'MITCHELL', systems: ['Mitchell'] },
        jaleco: { label: 'JALECO', systems: ['Jaleco'] },
        videosystem: { label: 'VIDEO SYSTEM', systems: ['Video System'] },
        visco: { label: 'VISCO', systems: ['Visco'] },
        seibu: { label: 'SEIBU KAIHATSU', systems: ['Seibu Kaihatsu'] },
        nichibutsu: { label: 'NICHIBUTSU', systems: ['Nichibutsu'] },
        incredi: { label: 'INCREDIBLE TECHNOLOGIES', systems: ['Incredible Technologies'] },
        zinc: { label: 'ZINC', systems: ['Zinc'] },
        sammy: { label: 'SAMMY', systems: ['Sammy', 'Atomiswave', 'SSV'] },
        technoparrot: { label: 'TECHNOPARROT', systems: ['TechnoParrot'] },
        'autres-arcade': { label: 'AUTRES CONSTRUCTEURS', systems: ['Daphne (LaserDisc)', 'Singe (LaserDisc)', 'American Laser Games', 'Gaelco', 'IGS', 'Irem', 'Technos', 'Midway', 'FBNeo'] }
    },
    home: {
        magnavox: { label: 'MAGNAVOX', systems: ['Odyssey', 'Odyssey 2 / Videopac'] },
        fairchild: { label: 'FAIRCHILD', systems: ['Channel F'] },
        atari: { label: 'ATARI', systems: ['Atari Pong', 'Atari 2600', 'Atari 5200', 'Atari 7800', 'Atari Jaguar', 'Atari Jaguar CD'] },
        apf: { label: 'APF', systems: ['APF-M1000'] },
        mattel: { label: 'MATTEL', systems: ['Aquarius', 'Intellivision'] },
        emerson: { label: 'EMERSON', systems: ['Arcadia 2001'] },
        vtech: { label: 'VTECH', systems: ['CreatiVision', 'V.Smile'] },
        ballyastrocade: { label: 'BALLY', systems: ['Astrocade'] },
        worlds: { label: 'WORLDS OF WONDER', systems: ['Action Max'] },
        coleco: { label: 'COLECO', systems: ['ColecoVision', 'Coleco Adam'] },
        bandai: { label: 'BANDAI', systems: ['Super Cassette Vision'] },
        casio: { label: 'CASIO', systems: ['Casio Loopy', 'PV-1000'] },
        tomy: { label: 'TOMY', systems: ['Tutor'] },
        autres: { label: 'CONSTRUCTEURS DIVERS', systems: ['Vectrex', 'Adventurevision', 'TV Games'] },
        nintendo: { 
            label: 'NINTENDO', 
            systems: [
                'NES', 
                'Famicom', 
                'Famicom Disk System', 
                'Super Nintendo', 
                'SNES-MSU1', 
                'Satellaview', 
                'Sufami Turbo', 
                'Nintendo 64', 
                'Nintendo 64DD', 
                'GameCube', 
                'Wii', 
                'Wii U', 
                'Switch'
            ] 
        },
        nec: { label: 'NEC', systems: ['PC Engine / TurboGrafx-16', 'PC Engine CD / TurboGrafx-CD', 'SuperGrafx', 'PC-FX'] },
        sega: { label: 'SEGA', systems: ['SG-1000', 'Master System', 'Mega Drive / Genesis', 'Mega Drive MSU', 'Mega CD', '32X', 'Saturn', 'Dreamcast'] },
        snk: { label: 'SNK', systems: ['Neo Geo AES', 'Neo Geo 64', 'Neo Geo CD'] },
        sony: { label: 'SONY PLAYSTATION', systems: ['PlayStation', 'PlayStation 2', 'PlayStation 3', 'PlayStation 4', 'PlayStation 5'] },
        panasonic: { label: 'PANASONIC', systems: ['3DO'] },
        philips: { label: 'PHILIPS', systems: ['CD-i', 'Videopac / Odyssey 2', 'VC 4000'] },
        commodore: { label: 'COMMODORE', systems: ['Amiga CD32', 'Amiga CDTV'] },
        funtech: { label: 'FUNTECH', systems: ['Super A\'Can'] },
        apple: { label: 'APPLE / BANDAI', systems: ['Pippin'] },
        microsoft: { label: 'MICROSOFT XBOX', systems: ['Xbox', 'Xbox 360'] },
        valve: { label: 'VALVE', systems: ['Steam'] },
        amazon: { label: 'AMAZON', systems: ['Fire TV'] },
        pegasus: { label: 'PEGASUS', systems: ['Pegasus (NES Famiclone)'] }
    },
    portable: {
        entex: { label: 'ENTEX', systems: ['Select-A-Game'] },
        epoch: { label: 'EPOCH', systems: ['Game Pocket Computer'] },
        'milton-bradley': { label: 'MILTON BRADLEY', systems: ['Microvision'] },
        'atari-portable': { label: 'ATARI', systems: ['Lynx', 'Lynx (Camplynx)'] },
        'nintendo-portable': { label: 'NINTENDO', systems: ['Game & Watch', 'Game Boy', 'Game Boy (2 Players)', 'Super Game Boy', 'Game Boy Color', 'Game Boy Color (2 Players)', 'Game Boy Advance', 'Game Boy Advance (2 Players)', 'Game Boy MSU', 'Virtual Boy', 'Pokémon Mini', 'DS', '3DS'] },
        'nec-portable': { label: 'NEC', systems: ['PC Engine GT / TurboExpress'] },
        'sega-portable': { label: 'SEGA', systems: ['Game Gear', 'Nomad'] },
        'snk-portable': { label: 'SNK', systems: ['Neo Geo Pocket', 'Neo Geo Pocket Color'] },
        'sony-portable': { label: 'SONY PLAYSTATION', systems: ['PSP', 'PSP Go', 'PS Vita'] },
        bandai: { label: 'BANDAI', systems: ['LCD Solarpower', 'WonderSwan', 'WonderSwan Color'] },
        bitcorp: { label: 'BITCORP', systems: ['Gamate'] },
        hartung: { label: 'HARTUNG', systems: ['Game Master'] },
        'welback-holdings': { label: 'WELBACK HOLDINGS', systems: ['Mega Duck'] },
        tiger: { label: 'TIGER ELECTRONICS', systems: ['Game.com'] },
        tapwave: { label: 'TAPWAVE', systems: ['Zodiac'] },
        gamepark: { label: 'GP32 / GAMEPARK', systems: ['GP32', 'GP2X', 'GP2X Wiz', 'Caanoo'] },
        nokia: { label: 'NOKIA', systems: ['N-Gage', 'N-Gage QD'] },
        mobile: { label: 'MOBILE', systems: ['J2ME (Java Mobile)'] },
        watara: { label: 'WATARA', systems: ['Supervision'] },
        lcd: { label: 'LCD GAMES', systems: ['Game & Watch', 'Tiger LCD', 'LCD Handhelds'] },
        dingoo: { label: 'DINGOO', systems: ['Dingoo A320'] },
        openpandora: { label: 'OPEN PANDORA', systems: ['Pandora'] },
        arduboy: { label: 'ARDUBOY', systems: ['Arduboy'] },
        valve: { label: 'VALVE', systems: ['Steam Deck'] }
    },
    ports: {
        zelda: { label: 'ZELDA PORTS', systems: ['Ship of Harkinian (Ocarina of Time)'] },
        sonic: { label: 'SONIC PORTS', systems: ['Sonic 3 AIR', 'Sonic Mania', 'Sonic Retro', 'Cannonball (OutRun)'] },
        mario: { label: 'MARIO PORTS', systems: ['Super Bros War'] },
        indie: { label: 'INDIE PORTS', systems: ['Cave Story', 'C-Dogs SDL', 'LÖVE (Love2D)'] },
        pc: { label: 'PC PORTS', systems: ['Boom 3 (Doom 3)', 'GZDoom', 'Commander Genius (Commander Keen)', 'CorsixTH (Theme Hospital)'] },
        fighting: { label: 'FIGHTING ENGINES', systems: ['Ikemen GO', 'M.U.G.E.N'] },
        other: { label: 'AUTRES PORTS', systems: ['Solarus', 'Starship', 'Karaoke'] }
    },
    fantasy: {
        fantasy: { label: 'FANTASY CONSOLES', systems: ['PICO-8', 'TIC-80', 'WASM-4', 'LowRes NX', 'Lutro', 'Uzebox', 'Vircon32'] }
    },
    ordinosaure: {
        acorn: { label: 'ACORN', systems: ['Atom', 'Archimedes', 'BBC Micro'] },
        'atari-computer': { label: 'ATARI', systems: ['Atari 800', 'Atari ST', 'Atari XE', 'XEGS'] },
        commodore: { label: 'COMMODORE', systems: ['VIC-20 (C20)', 'Commodore 64', 'Commodore 128', 'PET', 'Amiga', 'Amiga 500', 'Amiga 1200', 'Amiga 4000', 'Plus/4 (C+4)'] },
        amstrad: { label: 'AMSTRAD', systems: ['CPC', 'GX4000'] },
        sinclair: { label: 'SINCLAIR', systems: ['ZX81', 'ZX Spectrum'] },
        samcoupe: { label: 'MGT', systems: ['SAM Coupé'] },
        msx: { label: 'MSX', systems: ['MSX', 'MSX2', 'MSX2+', 'MSX TurboR'] },
        spectravideo: { label: 'SPECTRAVIDEO', systems: ['Spectravideo'] },
        apple: { label: 'APPLE', systems: ['Apple II', 'Apple IIgs'] },
        thomson: { label: 'THOMSON', systems: ['MO5', 'TO7', 'TO8'] },
        tandy: { label: 'TANDY', systems: ['TRS-80 Color Computer (CoCo)'] },
        ti: { label: 'TEXAS INSTRUMENTS', systems: ['TI-99/4A'] },
        dragon: { label: 'DRAGON DATA', systems: ['Dragon 32', 'Dragon 64'] },
        sharp: { label: 'SHARP', systems: ['X1', 'X68000'] },
        nec: { label: 'NEC PC', systems: ['PC-88', 'PC-98'] },
        fujitsu: { label: 'FUJITSU', systems: ['FM-7', 'FM Towns'] },
        oric: { label: 'ORIC', systems: ['Oric-1', 'Oric Atmos'] },
        p2000: { label: 'PHILIPS P2000', systems: ['P2000T'] },
        vg5000: { label: 'PHILIPS VG5000', systems: ['VG 5000'] },
        windows: { label: 'WINDOWS', systems: ['Windows 3.x', 'Windows 9x', 'Windows'] },
        dos: { label: 'DOS', systems: ['MS-DOS', 'PC DOS'] }
    },
    flipper: {
        simulateurs: { label: 'SIMULATEURS', systems: ['Visual Pinball', 'Future Pinball', 'Pinball FX', 'Pinball FX2', 'Pinball FX3', 'Zaccaria Pinball', 'Pinball M'] }
    }
};

export const sectionIcons: SectionIconsStructure = {
    collections: '📦 COLLECTIONS',
    arcade: '🕹️ ARCADE',
    home: '🏠 CONSOLES DE SALON',
    portable: '🎮 CONSOLES PORTABLES',
    ports: '🔧 PORTS',
    fantasy: '💾 FANTASY CONSOLES',
    ordinosaure: '💻 ORDINOSAURE',
    flipper: '🎯 FLIPPER'
};