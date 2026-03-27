import type { ScoringEffect } from '../../types/card.ts';

/**
 * Returns the text as-is. Phaser doesn't support inline rich text easily;
 * coloring is handled at the Text-object level instead.
 */
export function formatCardText(text: string): string {
  return text;
}

/**
 * Returns a hex color for a scoring effect:
 * green for bonuses, red for penalties / blanking effects.
 */
export function getEffectColor(effect: ScoringEffect): number {
  const penaltyIds = [
    'penaltyPerTag',
    'penaltyIfTagPresent',
    'penaltyIfTagAbsent',
    'blankTag',
    'blankIfTagAbsent',
    'blankSpecificCard',
    'blankIfTagPresent',
  ];

  if (penaltyIds.includes(effect.effectId)) {
    return 0xc4433a; // red
  }
  return 0x22c55e; // green
}
