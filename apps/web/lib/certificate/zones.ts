import modules from '../../../../curriculum/modules.json';

/** How a forge zone looks on its certificates and collection cards. */
export interface ZoneLook {
  /** Main color: badge, module name, difficulty pips, borders. */
  accent: string;
  /** Lighter tint: badge text, XP, highlights on the plate's edge. */
  light: string;
  /** Plate gradient, from the top-left corner to the bottom-right one. */
  plate: readonly [string, string];
  /** Badge glyph, a stroke path in a 24×24 box. */
  glyph: string;
  /** Background motif, a stroke path in the 1000×1000 certificate (drawn behind everything). */
  motif: string;
}

/** A module's forge zone: its look, its place in the curriculum and its names. */
export interface Zone extends ZoneLook {
  moduleId: string;
  /** Module name, such as "Contract logic". */
  module: string;
  /** Zone name, such as "The Anvil". */
  name: string;
  /** 1-based position of the module in the curriculum. */
  index: number;
}

/**
 * The look of each module's zone, keyed by module id (curriculum/modules.json). Accents differ in
 * lightness as well as hue, so the zones stay apart at thumbnail size: ember red and bright gold,
 * for instance, never read as two oranges.
 */
const LOOKS: Record<string, ZoneLook> = {
  // The Hearth: ember red, flames rising from the coals.
  foundations: {
    accent: '#ff5533',
    light: '#ff9a6b',
    plate: ['#2e0d08', '#100605'],
    glyph: 'M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z',
    motif:
      'M560 600C560 500 640 460 620 340C700 420 720 500 700 600M680 600C690 480 790 430 760 260C870 380 890 500 840 600' +
      'M800 600C820 520 900 490 885 380C950 460 960 540 930 600M540 600H960',
  },
  // The Anvil: tempered steel with amber sparks, an anvil struck.
  'contract-logic': {
    accent: '#c3cede',
    light: '#ffd27a',
    plate: ['#1c222b', '#0a0c10'],
    glyph: 'M3 7h14c0 2 2 3 4 3v1h-6v3l2 2v2H7v-2l2-2v-3H7C5 11 3 9 3 7z',
    motif:
      'M600 400H930V440Q870 455 850 490V540H900V580H640V540H690V490Q670 455 600 440ZM600 400Q510 405 470 435Q540 440 600 440' +
      'M770 340L800 230M730 345L690 240M810 355L910 290M700 360L600 310M840 375L950 370',
  },
  // The Mint: bright gold, a struck coin with its milled rim and die.
  tokens: {
    accent: '#f5d547',
    light: '#fff0a8',
    plate: ['#1f1b07', '#0b0a03'],
    glyph: 'M12 3a9 9 0 1 0 0.01 0zM12 7.5L15.5 9.5V14.5L12 16.5L8.5 14.5V9.5z',
    motif:
      'M960 420A200 200 0 1 0 560 420A200 200 0 1 0 960 420M925 420A165 165 0 1 0 595 420A165 165 0 1 0 925 420' +
      'M760 320L847 370V470L760 520L673 470V370Z',
  },
  // The Bellows: wind teal, air currents.
  interoperability: {
    accent: '#3fd0b5',
    light: '#9ff0de',
    plate: ['#0b1f1c', '#050c0b'],
    glyph: 'M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7',
    motif:
      'M420 340C560 290 700 400 960 330M380 420C540 370 700 490 960 410M440 500C600 450 740 560 960 490M520 580C660 540 780 620 960 570',
  },
  // The Quench: quench blue, ripples and rising steam.
  'stylus-specifics': {
    accent: '#28a0f0',
    light: '#8fd0fa',
    plate: ['#0a1a2a', '#050b12'],
    glyph: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z',
    motif:
      'M960 520A200 50 0 1 0 560 520A200 50 0 1 0 960 520M900 520A140 34 0 1 0 620 520A140 34 0 1 0 900 520' +
      'M840 520A80 18 0 1 0 680 520A80 18 0 1 0 840 520M700 440C680 380 730 350 705 290M770 445C750 375 800 335 775 265' +
      'M840 440C820 390 860 360 840 310',
  },
};

/** Every module's zone, in curriculum order. */
export const ZONES: Zone[] = modules.map(({ id, name, zone }, index) => {
  const look = LOOKS[id];
  if (!look) {
    throw new Error(`Module ${id} has no certificate look in lib/certificate/zones.ts`);
  }
  return { ...look, moduleId: id, module: name, name: zone, index: index + 1 };
});

/** The zone of a module. Throws for an unknown module id. */
export function zoneOf(moduleId: string): Zone {
  const zone = ZONES.find((candidate) => candidate.moduleId === moduleId);
  if (!zone) {
    throw new Error(`Unknown module: ${moduleId}`);
  }
  return zone;
}
