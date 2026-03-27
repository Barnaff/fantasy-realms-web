import type { EncounterModifier } from '../types/game.ts';

export interface EncounterTheme {
  name: string;
  flavor: string;
  modifiers: EncounterModifier[];
}

/**
 * Each encounter picks a theme which gives tag-based bonuses/penalties.
 * Themes are designed to encourage or discourage certain strategies.
 */
export const ENCOUNTER_THEMES: EncounterTheme[] = [
  // --- Nature / Water ---
  {
    name: 'The Black Swamps',
    flavor: 'Murky waters hide ancient power.',
    modifiers: [
      { tag: 'Beast', value: 3 }, { tag: 'Flood', value: 3 }, { tag: 'Land', value: 2 },
      { tag: 'Army', value: -3 }, { tag: 'Weapon', value: -2 }, { tag: 'Fire', value: -4 },
    ],
  },
  {
    name: 'The Whispering Woods',
    flavor: 'The trees themselves seem to be watching.',
    modifiers: [
      { tag: 'Beast', value: 4 }, { tag: 'Wild', value: 3 },
      { tag: 'Army', value: -3 }, { tag: 'Fire', value: -2 },
    ],
  },
  {
    name: 'The Frozen Wastes',
    flavor: 'Nothing survives the cold for long.',
    modifiers: [
      { tag: 'Weather', value: 4 }, { tag: 'Flood', value: 3 },
      { tag: 'Fire', value: -5 }, { tag: 'Beast', value: -2 },
    ],
  },
  {
    name: 'The Drowned Coast',
    flavor: 'The sea reclaims all that was built.',
    modifiers: [
      { tag: 'Flood', value: 5 }, { tag: 'Weather', value: 2 },
      { tag: 'Land', value: -3 }, { tag: 'Army', value: -2 }, { tag: 'Fire', value: -3 },
    ],
  },

  // --- Fire / War ---
  {
    name: 'The Burning Fields',
    flavor: 'Smoke chokes the sky as flames rage.',
    modifiers: [
      { tag: 'Fire', value: 5 }, { tag: 'Weapon', value: 2 },
      { tag: 'Flood', value: -4 }, { tag: 'Beast', value: -2 }, { tag: 'Wild', value: -2 },
    ],
  },
  {
    name: 'The Iron Citadel',
    flavor: 'A fortress forged in blood and steel.',
    modifiers: [
      { tag: 'Army', value: 4 }, { tag: 'Weapon', value: 3 }, { tag: 'Leader', value: 2 },
      { tag: 'Wild', value: -3 }, { tag: 'Beast', value: -2 },
    ],
  },
  {
    name: 'The Shattered Plains',
    flavor: 'Armies clash endlessly on this cursed ground.',
    modifiers: [
      { tag: 'Army', value: 3 }, { tag: 'Leader', value: 3 }, { tag: 'Weapon', value: 2 },
      { tag: 'Weather', value: -2 }, { tag: 'Wizard', value: -3 },
    ],
  },
  {
    name: 'Ashfall Valley',
    flavor: 'Volcanic ash rains from the darkened sky.',
    modifiers: [
      { tag: 'Fire', value: 4 }, { tag: 'Land', value: 2 },
      { tag: 'Flood', value: -3 }, { tag: 'Weather', value: -2 }, { tag: 'Army', value: -2 },
    ],
  },

  // --- Magic / Arcane ---
  {
    name: 'The Forgotten Library',
    flavor: 'Ancient tomes whisper forbidden knowledge.',
    modifiers: [
      { tag: 'Wizard', value: 4 }, { tag: 'Artifact', value: 3 },
      { tag: 'Army', value: -3 }, { tag: 'Beast', value: -2 },
    ],
  },
  {
    name: 'The Arcane Spire',
    flavor: 'Magic crackles in the air like lightning.',
    modifiers: [
      { tag: 'Wizard', value: 5 }, { tag: 'Weather', value: 2 },
      { tag: 'Weapon', value: -3 }, { tag: 'Army', value: -2 },
    ],
  },
  {
    name: 'Moonlit Ruins',
    flavor: 'Enchantments linger among the broken stones.',
    modifiers: [
      { tag: 'Artifact', value: 4 }, { tag: 'Wizard', value: 2 }, { tag: 'Wild', value: 3 },
      { tag: 'Fire', value: -3 }, { tag: 'Army', value: -2 },
    ],
  },

  // --- Undead / Dark ---
  {
    name: "Deadman's Hollow",
    flavor: 'The dead do not rest easy here.',
    modifiers: [
      { tag: 'Undead', value: 5 }, { tag: 'Wizard', value: 2 },
      { tag: 'Leader', value: -3 }, { tag: 'Beast', value: -3 },
    ],
  },
  {
    name: 'The Cursed Barrow',
    flavor: 'Dark magic seeps from ancient tombs.',
    modifiers: [
      { tag: 'Undead', value: 4 }, { tag: 'Artifact', value: 3 },
      { tag: 'Fire', value: -2 }, { tag: 'Army', value: -2 }, { tag: 'Wild', value: -2 },
    ],
  },

  // --- Wild / Chaos ---
  {
    name: 'The Fae Crossing',
    flavor: 'Reality bends at the borders of the fae realm.',
    modifiers: [
      { tag: 'Wild', value: 5 }, { tag: 'Beast', value: 2 },
      { tag: 'Army', value: -4 }, { tag: 'Weapon', value: -2 },
    ],
  },
  {
    name: 'Crystal Caverns',
    flavor: 'Glittering crystals amplify all magic within.',
    modifiers: [
      { tag: 'Artifact', value: 4 }, { tag: 'Land', value: 3 },
      { tag: 'Weather', value: -2 }, { tag: 'Flood', value: -3 },
    ],
  },

  // --- Mixed / Balanced ---
  {
    name: 'The Serpent\'s Den',
    flavor: 'Cunning and power rule in equal measure.',
    modifiers: [
      { tag: 'Beast', value: 3 }, { tag: 'Leader', value: 3 },
      { tag: 'Artifact', value: -2 }, { tag: 'Wizard', value: -2 },
    ],
  },
  {
    name: 'Stormwall Pass',
    flavor: 'Thunder echoes off the narrow cliffs.',
    modifiers: [
      { tag: 'Weather', value: 4 }, { tag: 'Land', value: 2 },
      { tag: 'Fire', value: -3 }, { tag: 'Flood', value: -2 },
    ],
  },
  {
    name: 'Thornwood Depths',
    flavor: 'Nature fights back against all intruders.',
    modifiers: [
      { tag: 'Beast', value: 3 }, { tag: 'Land', value: 3 }, { tag: 'Wild', value: 2 },
      { tag: 'Weapon', value: -3 }, { tag: 'Leader', value: -2 },
    ],
  },
  {
    name: 'The Sunken Temple',
    flavor: 'Half-drowned relics still pulse with energy.',
    modifiers: [
      { tag: 'Flood', value: 3 }, { tag: 'Artifact', value: 3 }, { tag: 'Wizard', value: 2 },
      { tag: 'Army', value: -3 }, { tag: 'Fire', value: -3 },
    ],
  },
  {
    name: 'The War Camp',
    flavor: 'Steel and discipline win the day.',
    modifiers: [
      { tag: 'Army', value: 4 }, { tag: 'Leader', value: 3 }, { tag: 'Weapon', value: 3 },
      { tag: 'Wizard', value: -3 }, { tag: 'Wild', value: -3 }, { tag: 'Undead', value: -2 },
    ],
  },
];
