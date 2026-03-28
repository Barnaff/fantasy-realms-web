import type { Encounter, BossStipulation } from '../types/game.ts';
import { SeededRNG } from '../utils/random.ts';
import { ENCOUNTER_THEMES } from '../data/encounterThemes.ts';

const BOSS_STIPULATIONS: BossStipulation[] = [
  {
    id: 'blank_weapons',
    description: 'All Weapon cards are blanked',
    effectId: 'blankTag',
    params: { tag: 'Weapon' },
  },
  {
    id: 'reduced_hand',
    description: 'Hand size reduced to 6',
    effectId: 'reduceHandSize',
    params: { maxSize: 6 },
  },
  {
    id: 'no_discard',
    description: 'Discard effects are disabled',
    effectId: 'disableDiscard',
    params: {},
  },
  {
    id: 'no_refill',
    description: 'The river does not refill',
    effectId: 'disableRefill',
    params: {},
  },
  {
    id: 'blank_beasts',
    description: 'All Beast cards are blanked',
    effectId: 'blankTag',
    params: { tag: 'Beast' },
  },
  {
    id: 'fewer_actions',
    description: 'You have 2 fewer actions',
    effectId: 'reduceActions',
    params: { reduction: 2 },
  },
  {
    id: 'blank_wizards',
    description: 'All Wizard cards are blanked',
    effectId: 'blankTag',
    params: { tag: 'Wizard' },
  },
  {
    id: 'no_synergy_preview',
    description: 'Score preview is hidden until finalization',
    effectId: 'hideScorePreview',
    params: {},
  },
];

const BOSS_NAMES = [
  'The Dragon of Ember Peak',
  'The Lich of the Sunken Throne',
  'The Storm Titan',
];

export function generateEncounterForNode(
  encounterIndex: number,
  act: number,
  rng: SeededRNG,
): Encounter {
  // Act 1 starts ~100, scales up gradually
  const baseThreshold = 70 + act * 25 + encounterIndex * 12;
  const variance = rng.nextInt(-5, 8);
  const threshold = baseThreshold + variance;

  // Pick a thematic encounter
  const theme = ENCOUNTER_THEMES[rng.nextInt(0, ENCOUNTER_THEMES.length - 1)];

  return {
    id: `encounter_${act}_${encounterIndex}`,
    name: theme.name,
    scoreThreshold: threshold,
    riverSize: 0,
    isBoss: false,
    rewardTier: 'normal',
    flavor: theme.flavor,
    modifiers: theme.modifiers,
  };
}

export function generateBossEncounter(
  act: number,
  rng: SeededRNG,
): Encounter {
  const threshold = 80 + act * 60;
  const stipulation = BOSS_STIPULATIONS[rng.nextInt(0, BOSS_STIPULATIONS.length - 1)];
  const name = BOSS_NAMES[Math.min(act - 1, BOSS_NAMES.length - 1)];

  return {
    id: `boss_act_${act}`,
    name,
    scoreThreshold: threshold,
    riverSize: 0, // river starts empty
    isBoss: true,
    bossStipulation: stipulation,
    rewardTier: 'boss',
    flavor: `The ${name} awaits. ${stipulation.description}.`,
  };
}

export function getActionsForEncounter(
  encounterIndex: number,
  isBoss: boolean,
  bossStipulation?: BossStipulation,
): number {
  let base = isBoss ? 8 : 6 + Math.min(encounterIndex, 3);

  if (bossStipulation?.effectId === 'reduceActions') {
    base -= bossStipulation.params.reduction as number;
  }

  return Math.max(3, base);
}
