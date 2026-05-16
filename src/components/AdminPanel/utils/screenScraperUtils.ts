// screenScraperUtils.ts - Utilitaires pour la synchronisation ScreenScraper
// Format CSV : export "médias manquants" ScreenScraper, séparateur ";" entre guillemets

import { ThemeItem } from '../../../types';

// ===== INTERFACES =====

export interface SSGameEntry {
  gameId: string;
  gameName: string;
  hasTheme: boolean;
}

export interface SSFileResult {
  fileName: string;
  systemSlug: string;
  entries: SSGameEntry[];
}

export interface MatchResult {
  ssEntry: SSGameEntry;
  matchedTheme?: ThemeItem;
  score: number;
  matched: boolean;
  targetOnScreenScraper: boolean;
}

export interface FileStats {
  fileName: string;
  systemSlug: string;
  totalSS: number;
  presentOnSS: number;
  missingOnSS: number;
  matchedPresent: number;
  matchedMissing: number;
  notFound: number;
}

export const SS_TO_THEME: Record<string, string | null> = {
  'mame': 'mame', 'mame-libretro': 'mame', 'mame-advmame': 'mame',
  'mame-mame4all': 'mame', 'mame2000': 'mame', 'mame2003': 'mame',
  'hbmame': 'hbmame', 'another_arcade_emulator': 'mame', 'arcade': 'mame',
  'arcade_classics': 'mame', 'dice': 'mame', 'consolearcade': 'mame',
  'chihiro': 'chihiro', 'fba': 'fbneo', 'fba_libretro': 'fbneo',
  'fba2012': 'fbneo', 'fbneo': 'fbneo', 'shmups': 'fbneo', 'vgmplay': 'fbneo',
  'Autres': 'fbneo', 'examu': 'fbneo', 'globalvr': 'fbneo', 'konamipc': 'fbneo',
  'namcoes3': 'fbneo', 'namcon2': 'fbneo', 'nesicax': 'fbneo',
  'RAW THRILLS': 'rawthrills', 'rawthrills': 'rawthrills',
  'segaalls': 'alls', 'segaeuropa-r': 'europar', 'segalindbergh': 'lindbergh',
  'seganu': 'fbneo', 'segaringedge': 'ringedge', 'segaringwide': 'ringwide',
  'taitotypex+': 'typex', 'taitotypex0': 'typexzero', 'taitotypex2': 'typex2',
  'taitotypex3': 'typex3', 'taitotypex4': 'fbneo',
  'teknoparrot': 'teknoparrot', 'triforce': 'triforce', 'zinc': 'zinc',
  'cps1': 'cps1', 'capcom_play_system': 'cps1', 'Capcom Play System': 'cps1',
  'cps2': 'cps2', 'capcom_play_system_2': 'cps2', 'Capcom Play System II': 'cps2',
  'cps3': 'cps3', 'capcom_play_system_3': 'cps3', 'Capcom Play System III': 'cps3',
  'capcom_classics': 'capcomclassique',
  'snk_classics': 'snk68k', 'alpha_denshi_co.': 'alphadenshi', 'neo-geo_mvs': 'neogeomvs',
  'sega_classics': 'segag80', 'sega_st-v': 'stv', 'stv': 'stv', 'segastv': 'stv',
  'Sega ST-V': 'stv', 'model2': 'model2', 'Sega Model 2': 'model2',
  'model3': 'model3', 'Sega Model 3': 'model3', 'naomi': 'naomi',
  'Sega Naomi': 'naomi', 'Sega Atomiswave Naomi': 'naomi', 'naomigd': 'naomi',
  'naomi2': 'naomi2', 'Sega Naomi 2': 'naomi2', 'hikaru': 'hikaru',
  'lindbergh': 'lindbergh', 'atomiswave': 'atomiswave', 'Sammy Atomiswave': 'atomiswave',
  'mega-play': 'fbneo', 'mega-tech': 'fbneo',
  'namco_classics': 'namcoclassique', 'namco_system_22': 'namcosystem22',
  'Namco System 22': 'namcosystem22', 'namco2x6': 'namcosystem2x6',
  'namco3xx': 'namcosystem357',
  'konami_classics': 'konamiclassique',
  'taito_classics': 'taitoclassique', 'typex': 'typex', 'type-x': 'typex',
  'nintendo_classics': 'vssystem', 'playchoice': 'playchoice10',
  'atlus': 'atlus', 'banpresto': 'banpresto', 'cave': 'cave', 'cave3rd': 'cave',
  'data_east_classics': 'dataeast', 'eighting_raizing': 'raizing', 'exidy': 'sorcerer',
  'gaelco': 'gaelco', 'incredible_technologies': 'incredibletechnologies',
  'irem_classics': 'iremm62', 'jaleco': 'jaleco', 'kaneko': 'kaneko',
  'midway_classics': 'midway', 'mitchell': 'mitchell', 'nichibutsu': 'nichibutsu',
  'nmk': 'nmk', 'psikyo': 'psikyo', 'sammy_classics': 'sammy',
  'seibu_kaihatsu': 'seibukaihatsu', 'semicom': 'fbneo', 'seta': 'fbneo',
  'toaplan': 'toaplan', 'technos': 'technos', 'tecmo': 'tecmo',
  'universal': 'fbneo', 'video_system_co.': 'videosystem', 'visco': 'visco',
  'comad': 'fbneo', 'dynax': 'fbneo', 'century_electronics': 'fbneo',
  'cinematronics': 'fbneo', 'amcoe': 'fbneo', 'igs': 'igs',
  'daphne': 'daphnelaserdisc', 'laserdisc': 'daphnelaserdisc',
  'american_laser_games': 'americanlasergames', 'singe': 'singelaserdisc',
  'singe2': 'singelaserdisc', 'alg': 'americanlasergames',
  'nes': 'nes', 'nesmini': 'nes', 'fc': 'nes',
  'Nintendo Entertainment System': 'nes', 'Nintendo NES-Famicom': 'nes',
  'famicom': 'famicom', 'family_computer': 'famicom',
  'fds': 'famicomdisksystem', 'famiri_konpyuta_disuku_shisutemu': 'famicomdisksystem',
  'Nintendo Famicom Disk System': 'famicomdisksystem',
  'snes': 'supernintendo', 'snesmini': 'supernintendo', 'snes-hacks': 'supernintendo',
  'snes_-_super_mario_world_hacks': 'supernintendo',
  'Super Nintendo Entertainment System': 'supernintendo',
  'Super Nintendo Entertainment System - Mario Hacks': 'supernintendo',
  'Nintendo SNES-SFC': 'supernintendo', 'sfc': 'superfamicom',
  'snes-msu1': 'snesmsu1', 'snes-msu': 'snesmsu1', 'snesmsu1': 'snesmsu1',
  'snescd': 'snesmsu1', 'Super Nintendo MSU-1': 'snesmsu1',
  'sgb': 'supergameboy', 'super_game_boy': 'supergameboy', 'super_game_boy_2': 'supergameboy',
  'satellaview': 'satellaview', 'nintendo_power': 'satellaview', 'Nintendo Satellaview': 'satellaview',
  'sufami': 'sufamiturbo', 'sufami_turbo': 'sufamiturbo',
  'n64': 'nintendo64', 'Nintendo 64': 'nintendo64', 'Nintendo N64': 'nintendo64',
  '64dd': 'nintendo64dd', 'n64dd': 'nintendo64dd', 'nintendo_64dd': 'nintendo64dd', 'Nintendo 64DD': 'nintendo64dd',
  'gc': 'gamecube', 'gamecube': 'gamecube', 'Nintendo GameCube': 'gamecube',
  'wii': 'wii', 'Nintendo Wii': 'wii',
  'wiiu': 'wiiu', 'Nintendo Wii U': 'wiiu',
  'switch': 'switch', 'switch2': 'switch', 'Nintendo Switch': 'switch',
  'ds': 'ds', 'nds': 'ds', 'Nintendo DS': 'ds',
  '3ds': '3ds', 'n3ds': '3ds', 'Nintendo 3DS': '3ds',
  'pokemini': 'pokmonmini', 'pokemonmini': 'pokmonmini', 'poke': 'pokmonmini', 'Nintendo Pokemon Mini': 'pokmonmini',
  'virtualboy': 'virtualboy', 'vb': 'virtualboy', 'Nintendo Virtual Boy': 'virtualboy',
  'gb': 'gameboy', 'Nintendo Game Boy': 'gameboy',
  'gb2players': 'gameboy2players',
  'gbc': 'gameboycolor', 'Nintendo Game Boy Color': 'gameboycolor',
  'gba': 'gameboyadvance', 'gba_e-reader': 'gameboyadvance', 'Nintendo Game Boy Advance': 'gameboyadvance',
  'mastersystem': 'mastersystem', 'mastersystemRA': 'mastersystem', 'ms': 'mastersystem',
  'sms': 'mastersystem', 'Sega Master System': 'mastersystem',
  'megadrive': 'megadrivegenesis', 'megadriveRA': 'megadrivegenesis', 'genesis': 'megadrivegenesis',
  'md': 'megadrivegenesis', 'megadrivejp': 'megadrivegenesis', 'megadrive_32x': '32x',
  'megadrive_-_sonic_the_hedgehog_2_hacks': 'megadrivegenesis',
  'Sega Genesis': 'megadrivegenesis', 'Sega Mega Drive - Genesis': 'megadrivegenesis',
  'megadrive-msu': 'megadrivemsu', 'Megadrive MSU': 'megadrivemsu',
  'mega-cd': 'megacd', 'megacd': 'megacd', 'segacd': 'megacd', 'segacdRA': 'megacd',
  'mdcd': 'megacd', 'megacdjp': 'megacd', 'Sega CD': 'megacd', 'Sega Mega CD - Sega CD': 'megacd',
  'sega32x': '32x', 'sega32xRA': '32x', 'thirtytwox': '32x', 'sega32xjp': '32x', 'sega32xna': '32x', 'Sega 32X': '32x',
  'saturn': 'saturn', 'saturnRA': 'saturn', 'saturnjp': 'saturn', 'Sega Saturn': 'saturn',
  'dreamcast': 'dreamcast', 'dreamcastRA': 'dreamcast', 'Sega Dreamcast': 'dreamcast',
  'sg-1000': 'sg1000', 'sg1000': 'sg1000', 'sg1000RA': 'sg1000', 'segasgone': 'sg1000',
  'multivision': 'sg1000', 'Sega SG-1000': 'sg1000',
  'gamegear': 'gamegear', 'gamegearRA': 'gamegear', 'gg': 'gamegear', 'Sega Game Gear': 'gamegear',
  'segapico': null,
  'pcengine': 'pcengineturbografx16', 'pce': 'pcengineturbografx16',
  'turbografx-16': 'pcengineturbografx16', 'turbografx': 'pcengineturbografx16',
  'tg16': 'pcengineturbografx16', 'coregrafx': 'pcengineturbografx16',
  'NEC TurboGrafx-16': 'pcengineturbografx16', 'NEC PC Engine': 'pcengineturbografx16',
  'PC Engine / TurboGrafx-16': 'pcengineturbografx16',
  'turbografxcd': 'pcenginecdturbografxcd', 'pce-cd': 'pcenginecdturbografxcd',
  'pcenginecd': 'pcenginecdturbografxcd', 'tg-cd': 'pcenginecdturbografxcd',
  'NEC - PC Engine CD': 'pcenginecdturbografxcd', 'NEC - TurboGrafx CD': 'pcenginecdturbografxcd',
  'NEC PC Engine-CD': 'pcenginecdturbografxcd', 'NEC PC Engine CD': 'pcenginecdturbografxcd',
  'supergrafx': 'supergrafx', 'sgfx': 'supergrafx',
  'PC Engine SuperGrafx': 'supergrafx', 'NEC PC Engine SuperGrafx': 'supergrafx',
  'pcfx': 'pcfx', 'pc-fx': 'pcfx', 'NEC PC-FX': 'pcfx',
  'neogeo': 'neogeoaes', 'neogeomini': 'neogeoaes', 'neogeox': 'neogeoaes', 'SNK Neo Geo': 'neogeoaes',
  'neogeo64': 'neogeo64',
  'neogeocd': 'neogeocd', 'neogeocdRA': 'neogeocd', 'neo-geo_cd': 'neogeocd',
  'neogeocdjp': 'neogeocd', 'neocd': 'neogeocd', 'SNK Neo Geo CD': 'neogeocd',
  'ngp': 'neogeopocket', 'SNK Neo Geo Pocket': 'neogeopocket',
  'ngpc': 'neogeopocketcolor', 'SNK Neo Geo Pocket Color': 'neogeopocketcolor',
  'SNK Neo Geo Pocket - Color': 'neogeopocketcolor',
  'psx': 'playstation', 'ps1': 'playstation', 'ps': 'playstation', 'psxmini': 'playstation',
  'Sony Playstation': 'playstation',
  'ps2': 'playstation2', 'Sony Playstation 2': 'playstation2',
  'ps3': 'playstation3', 'playstation_3': 'playstation3', 'Sony Playstation 3': 'playstation3',
  'ps4': 'playstation4', 'Sony Playstation 4': 'playstation4',
  'psp': 'psp', 'Sony PSP': 'psp', 'Sony Playstation Portable': 'psp',
  'pspminis': 'pspmini', 'playstation_minis': 'pspmini', 'Sony PSP Minis': 'pspmini',
  'psvita': 'psvita', 'ps_vita': 'psvita', 'Sony Playstation Vita': 'psvita',
  'xbox': 'xbox', 'Microsoft Xbox': 'xbox',
  'xbox360': 'xbox360', 'x360': 'xbox360', 'Microsoft Xbox 360': 'xbox360',
  'xbla': 'xboxlivearcade', 'xone': null, 'Microsoft Xbox One': null,
  '3do': '3do', '3DO Interactive Multiplayer': '3do', 'The 3DO Company - 3DO': '3do',
  'threedo': '3do', 'panasonic': '3do',
  'atari2600': 'atari2600', 'a2600': 'atari2600', 'atari_2600_supercharger': 'atari2600', 'Atari 2600': 'atari2600',
  'atari5200': 'atari5200', 'a5200': 'atari5200', 'Atari 5200': 'atari5200',
  'atari7800': 'atari7800', 'a7800': 'atari7800', 'Atari 7800': 'atari7800',
  'atari800': 'atari800', 'a800': 'atari800', 'Atari 800': 'atari800', 'atari8bits': 'atari800',
  'atari_xe': 'atarixe',
  'atarijaguar': 'atarijaguar', 'jaguar': 'atarijaguar', 'Atari Jaguar': 'atarijaguar',
  'atarijaguarcd': 'atarijaguarcd', 'jaguar_cd': 'atarijaguarcd', 'jaguarcd': 'atarijaguarcd', 'Atari Jaguar CD': 'atarijaguarcd',
  'atarilynx': 'lynx', 'lynx': 'lynx', 'Atari Lynx': 'lynx',
  'camplynx': 'lynxcamplynx', 'camputers_lynx': 'lynxcamplynx', 'Camputers Lynx': 'lynxcamplynx',
  'colecovision': 'colecovision', 'adam': 'colecoadam', 'coleco': 'colecoadam', 'Coleco ADAM': 'colecoadam',
  'intellivision': 'intellivision', 'Mattel Intellivision': 'intellivision', 'Mattel - Intellivision': 'intellivision',
  'odyssey2': 'odyssey2videopac', 'videopac': 'odyssey2videopac', 'o2em': 'odyssey2videopac',
  'videopacplus': 'videopacodyssey2', 'odyssey': 'odyssey', 'Magnavox Odyssey 2': 'odyssey2videopac',
  'cd-i': 'cdi', 'cdi': 'cdi', 'cdimono1': 'cdi', 'Philips CD-i': 'cdi', 'Philips CDi': 'cdi',
  'channel-f': 'channelf', 'channel_f': 'channelf', 'channelf': 'channelf',
  'Fairchild Channel F': 'channelf', 'fairchild': 'channelf', 'Fairchild ChannelF': 'channelf',
  'astrocade': 'astrocade', 'astrocde': 'astrocade', 'Bally Astrocade': 'astrocade',
  'adventure_vision': 'adventurevision', 'advision': 'adventurevision', 'Entex Adventure Vision': 'adventurevision',
  'action_max': 'actionmax', 'actionmax': 'actionmax', 'WoW Action Max': 'actionmax',
  'arcadia_2001': 'arcadia2001', 'arcadia': 'arcadia2001', 'Emerson Arcadia 2001': 'arcadia2001',
  'scv': 'supercassettevision', 'super_cassette_vision': 'supercassettevision',
  'ecv': 'supercassettevision', 'Epoch Super Cassette Vision': 'supercassettevision',
  'loopy': 'casioloopy', 'Casio Loopy': 'casioloopy',
  'pv-1000': 'pv1000', 'pv1000': 'pv1000', 'Casio PV-1000': 'pv1000', 'pcv2': 'pv2000',
  'creativision': 'creativision', 'crvision': 'creativision', 'cvision': 'creativision',
  'v.smile': 'vsmile', 'vsmile': 'vsmile', 'socrates': 'vsmile',
  "super_a'can": 'superacan', 'supracan': 'superacan', 'Funtech Super Acan': 'superacan',
  'mega_duck': 'megaduck', 'megaduck': 'megaduck', 'sameduck': 'megaduck',
  'cougar_boy': 'megaduck', 'Mega Duck': 'megaduck', 'Mega Duck - Cougar Boy': 'megaduck',
  'supervision8000': 'supervision8000', 'ace4000': null,
  'vectrex': 'vectrex', 'GCE Vectrex': 'vectrex', 'GCE-Vectrex': 'vectrex',
  'vc4000': 'vc4000', 'steam': 'steam',
  'gameandwatch': 'gamewatch', 'gw': 'gamewatch', 'lcdgames': 'gamewatch',
  'Game & Watch': 'gamewatch', 'Handheld Electronic - Game and Watch': 'gamewatch',
  'n-gage': 'ngage', 'ngage': 'ngage', 'Nokia N-Gage': 'ngage',
  'wonderswan': 'wonderswan', 'wswan': 'wonderswan', 'WonderSwan': 'wonderswan',
  'wonderswancolor': 'wonderswancolor', 'wswanc': 'wonderswancolor',
  'WonderSwan Color': 'wonderswancolor', 'Bandai WonderSwan-Color': 'wonderswancolor',
  'gp32': 'gp32', 'supervision': 'supervision',
  'watara_supervision': 'supervision', 'Watara Supervision': 'supervision',
  'gamate': 'gamate', 'game.com': 'gamecom', 'gamecom': 'gamecom',
  'game_master': 'gamemaster', 'gmaster': 'gamemaster', 'Hartung Game Master': 'gamemaster',
  'gamepock': 'gamepocketcomputer', 'game_pocket_computer': 'gamepocketcomputer',
  'Epoch Game Pocket Computer': 'gamepocketcomputer',
  'arduboy': 'arduboy', 'pocketstation': 'pocketstation', 'palm': null,
  'amiga': 'amiga', 'amiga500': 'amiga500', 'amiga500p': 'amiga500', 'amiga600': 'amiga500',
  'amiga1000': 'amiga', 'amiga1200': 'amiga1200', 'amiga3000': 'amiga', 'amiga4000': 'amiga4000',
  'Commodore Amiga': 'amiga', 'amigacd32': 'amigacd32', 'cd32': 'amigacd32',
  'amiga_cd32_(hack)': 'amigacd32', 'Commodore Amiga CD32': 'amigacd32',
  'amiga_cd': 'amigacdtv', 'amigacdtv': 'amigacdtv', 'Commodore CDTV': 'amigacdtv',
  'c64': 'commodore64', 'Commodore 64': 'commodore64', 'Commodore C64': 'commodore64',
  'c128': 'commodore128', 'Commodore 128': 'commodore128', 'Commodore C128': 'commodore128',
  'c20': 'vic20c20', 'vic-20': 'vic20c20', 'vic20': 'vic20c20', 'Commodore VIC-20': 'vic20c20', 'c16': 'vic20c20',
  'cplus4': 'plus4c4', 'plus4': 'plus4c4', 'Commodore Plus 4': 'plus4c4',
  'pet': 'pet', 'Commodore PET': 'pet',
  'amstradcpc': 'cpc', 'cpc': 'cpc', 'Amstrad CPC': 'cpc', 'Amstrad': 'cpc',
  'gx4000': 'gx4000', 'Amstrad GX4000': 'gx4000',
  'apple2': 'appleii', 'Apple II': 'appleii', 'apple2gs': 'appleiigs', 'Apple IIGS': 'appleiigs',
  'bbcmicro': 'bbcmicro', 'bbc_micro': 'bbcmicro', 'bbc': 'bbcmicro', 'BBC Microcomputer System': 'bbcmicro',
  'msx': 'msx', 'msx1': 'msx', 'Microsoft MSX': 'msx', 'Microsoft - MSX': 'msx',
  'msx2': 'msx2', 'Microsoft MSX2': 'msx2', 'msx2+': 'msx2', 'Microsoft MSX2+': 'msx2', 'Microsoft - MSX2': 'msx2',
  'msxturbor': 'msxturbor', 'msx_r_turbo': 'msxturbor', 'np2pi': 'pc98',
  'zxspectrum': 'zxspectrum', 'zxs': 'zxspectrum', 'sinclair': 'zxspectrum',
  'Sinclair ZX Spectrum': 'zxspectrum', 'zxnext': 'zxspectrum',
  'zx81': 'zx81', 'zxeightyone': 'zx81', 'Sinclair ZX-81': 'zx81', 'Sinclair ZX 81': 'zx81',
  'atarist': 'atarist', 'Atari ST': 'atarist', 'Atari ST-STE-TT-Falcon': 'atarist',
  'atarixegs': 'xegs', 'xegs': 'xegs',
  'fm7': 'fm7', 'fm-7': 'fm7', 'Fujitsu FM-7': 'fm7',
  'fmtowns': 'fmtowns', 'FM Towns': 'fmtowns', 'fmtmarty': 'fmtowns',
  'x1': 'x1', 'Sharp X1': 'x1', 'sharpX1': 'x1',
  'x68000': 'x68000', 'Sharp X68000': 'x68000',
  'pc88': 'pc88', 'NEC PC-8000 - PC-8800 series': 'pc88', 'pceightyeight': 'pc88',
  'pc98': 'pc98', 'NEC PC98': 'pc98', 'pcninetyeight': 'pc98',
  'samcoupe': 'samcoup', 'MGT SAM Coupé': 'samcoup',
  'coco': 'trs80colorcomputercoco', 'trs-80': 'trs80colorcomputercoco',
  'trs80coco': 'trs80colorcomputercoco', 'coco3': 'trs80colorcomputercoco',
  'TRS-80 Color Computer': 'trs80colorcomputercoco',
  'dragon32': 'dragon32', 'dragon': 'dragon32', 'Dragon 32-64': 'dragon32', 'tanodragon': 'dragon32',
  'spectravideo': 'spectravideo', 'mo5': 'mo5', 'Thomson MO5': 'mo5',
  'to7': 'to7', 'to8': 'to8', 'thomson': 'mo5', 'moto': 'mo5',
  'ti994a': 'ti994a', 'ti99': 'ti994a', 'Texas Instruments TI 99/4A': 'ti994a',
  'oric': 'oricatmos', 'oricatmos': 'oricatmos', 'Oric Atmos': 'oricatmos',
  'p2000t': 'p2000t', 'vg5000': 'vg5000', 'vg5k': 'vg5000',
  'electron': null, 'archimedes': 'archimedes', 'archimede': 'archimedes', 'Acorn Archimedes': 'archimedes',
  'atom': 'atom', 'Acorn Atom': 'atom',
  'eg2000_colour_genie': null, 'cg2000': null, 'bk': null, 'pecom_64': 'pecom64',
  'mikrosha': null, 'jupace': null, 'Jupiter Ace': null,
  'mac_os': null, 'macintosh': null, 'Apple Mac OS': null, 'mac': null,
  'linux': null, 'android': null, 'aamber_pegasus': null, 'acclaim': null,
  'dos': 'msdos', 'pc': 'msdos', 'MS-DOS': 'msdos',
  'pc_win3.xx': 'windows3x', 'Windows 3.X': 'windows3x',
  'pc_win9x': 'windows9x',
  'pc_windows': 'windows', 'windows': 'windows', 'Windows': 'windows', 'windows_installers': 'windows',
  'ports': 'msdos', 'moonlight': null, 'scummvm': null, 'residualvm': null, 'dinothawr': null,
  'vpinball': 'visualpinball', 'visual_pinball': 'visualpinball',
  'fpinball': 'futurepinball', 'future_pinball': 'futurepinball',
  'pinballfx': 'pinballfx', 'pinball_fx2': 'pinballfx2', 'pinballfx2': 'pinballfx2',
  'pinball_fx3': 'pinballfx3', 'pinballfx3': 'pinballfx3',
  'zaccariapinball': 'zaccariapinball', 'pinballm': 'pinballm',
  'pinball': 'visualpinball', 'flipper': 'visualpinball', 'the_pinball_arcade': null,
  'pico8': 'pico8', 'PICO-8': 'pico8', 'pico': 'pico8',
  'tic80': 'tic80', 'TIC-80': 'tic80', 'tic': 'tic80',
  'wasm4': 'wasm4', 'WASM-4': 'wasm4',
  'lowresnx': 'lowresnx', 'Lowres NX': 'lowresnx',
  'uzebox': 'uzebox', 'vircon32': 'vircon32', 'voxatron': 'voxatron', 'lutro': 'lutro',
  'mugen': 'mugen', 'cavestory': 'cavestory', 'cannonball': 'cannonballoutrun',
  'gzdoom': 'gzdoom', 'doom': 'gzdoom', 'prboom': 'gzdoom', 'doom3': 'boom3doom3',
  'solarus': 'solarus', 'flash': 'flash',
  'easyrpg': null, 'openbor': null, 'eduke32': null, 'ecwolf': null,
  'tyrquake': null, 'xash3d_fwgs': null,
  'non_jeu': null, 'system': null,
};

// ===== PARSER CSV =====
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i += 2; continue; }
      inQuotes = !inQuotes; i++; continue;
    }
    if (ch === ';' && !inQuotes) { result.push(current.trim()); current = ''; i++; continue; }
    current += ch; i++;
  }
  result.push(current.trim());
  return result;
};

export const parseSSManquesCSV = (csvContent: string, fileName: string, systemSlug: string): SSFileResult => {
  const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { fileName, systemSlug, entries: [] };
  const headers = parseCSVLine(lines[0]);
  const gameNameIdx = headers.indexOf('Game Name');
  const gameIdIdx = headers.indexOf('Game ID');
  const hyperbatIdx = headers.indexOf('Thème HyperBat');
  if (gameNameIdx === -1 || hyperbatIdx === -1) {
    console.error(`CSV "${fileName}": colonnes "Game Name" ou "Thème HyperBat" introuvables.`);
    console.error('En-têtes détectées :', headers);
    return { fileName, systemSlug, entries: [] };
  }
  const entries: SSGameEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length <= Math.max(gameNameIdx, hyperbatIdx)) continue;
    const gameName = cols[gameNameIdx]?.trim() ?? '';
    if (!gameName) continue;
    const gameId = gameIdIdx !== -1 ? (cols[gameIdIdx]?.trim() ?? String(i)) : String(i);
    const hyperbatVal = cols[hyperbatIdx]?.trim() ?? '';
    entries.push({ gameId, gameName, hasTheme: hyperbatVal !== '' });
  }
  return { fileName, systemSlug, entries };
};

// ===== DÉTECTION DU SYSTÈME DEPUIS LE NOM DE FICHIER =====
export const guessSystemSlug = (fileName: string): string => {
  const base = fileName.replace(/\.csv$/i, '').replace(/-manques$/i, '').toLowerCase();
  const ssMatch = SS_TO_THEME[base];
  if (ssMatch !== undefined && ssMatch !== null) return ssMatch;
  return base;
};

// ===== NORMALISATION =====
const romanToArabic: Record<string, string> = {
  'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5',
  'vi': '6', 'vii': '7', 'viii': '8', 'ix': '9', 'x': '10',
  'xi': '11', 'xii': '12', 'xiii': '13', 'xiv': '14', 'xv': '15',
};

export const normalizeString = (str: string): string => {
  let n = str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  n = n.replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s*\{[^}]*\}/g, '');
  n = n.replace(/[!?.:,;'"]/g, ' ').replace(/[-_]/g, ' ').replace(/[^a-z0-9\s]/g, ' ');
  const words = n.split(/\s+/).filter(w => w.length > 0);
  n = words.map(w => romanToArabic[w] ?? w).join(' ');
  n = n.replace(/\b(the|a|an)\b/g, '').replace(/\s+/g, ' ').trim();
  n = n.replace(/\s+(version|edition|remastered|hd|remake|deluxe|special|ultimate|gold|goty|complete|enhanced)$/g, '').replace(/\s+/g, ' ').trim();
  return n;
};

// ===== LEVENSHTEIN =====
const levenshteinDistance = (a: string, b: string): number => {
  const m: number[][] = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    }
  }
  return m[a.length][b.length];
};

export const calculateSimilarity = (str1: string, str2: string): number => {
  const n1 = normalizeString(str1);
  const n2 = normalizeString(str2);
  if (n1 === n2) return 100;
  const dist = levenshteinDistance(n1, n2);
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 0;
  return Math.round(((maxLen - dist) / maxLen) * 100);
};

// ===== MATCHING PAR ssGameId D'ABORD, PUIS PAR NOM =====
export const findSSEntry = (
  theme: ThemeItem,
  ssEntries: SSGameEntry[]
): SSGameEntry | null => {
  // 1. Match par ssGameId (lien manuel enregistré)
  if (theme.ssGameId) {
    const byId = ssEntries.find(e => e.gameId === theme.ssGameId);
    if (byId) return byId;
  }
  // 2. Match par nom exact
  const byName = ssEntries.find(e =>
    e.gameName.toLowerCase().trim() === theme.name.toLowerCase().trim()
  );
  if (byName) return byName;
  // 3. Pas de match
  return null;
};

// ===== APPLIQUER LES CHANGEMENTS =====
export const applySSChanges = (
  themes: ThemeItem[],
  changes: { themeId: number; onScreenScraper: boolean; ssGameId?: string }[]
): ThemeItem[] => {
  const changeMap = new Map(changes.map(c => [c.themeId, c]));
  return themes.map(t => {
    const change = changeMap.get(t.id);
    if (!change) return t;
    return {
      ...t,
      onScreenScraper: change.onScreenScraper,
      ...(change.ssGameId !== undefined ? { ssGameId: change.ssGameId } : {}),
    };
  });
};
