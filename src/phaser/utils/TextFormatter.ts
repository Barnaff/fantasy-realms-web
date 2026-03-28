import type { ScoringEffect, Tag } from '../../types/card.ts';
import { TAG_COLORS } from './Colors.ts';
import { FONTS } from '../../config.ts';

const ALL_TAGS: Tag[] = ['Beast', 'Fire', 'Weather', 'Leader', 'Weapon', 'Land', 'Wild', 'Flood', 'Army', 'Artifact', 'Wizard', 'Undead'];
const KEYWORDS = ['BLANKED', 'Blanks', 'Blanked', 'blank', 'discard', 'Discard'];

export interface TextSegment {
  text: string;
  color: string;    // hex string like '#2c1810'
  bold: boolean;
}

/**
 * Parse effect description into colored segments.
 * Tag names → tag color + bold
 * Keywords (BLANKED, discard) → red + bold
 * Everything else → base color
 */
export function parseEffectText(description: string, baseColor: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let remaining = description;

  while (remaining.length > 0) {
    // Find the earliest tag or keyword match
    let earliestIdx = remaining.length;
    let matchLen = 0;
    let matchColor = baseColor;
    let matchBold = false;

    // Check tags
    for (const tag of ALL_TAGS) {
      const idx = remaining.indexOf(tag);
      if (idx >= 0 && idx < earliestIdx) {
        earliestIdx = idx;
        matchLen = tag.length;
        const c = TAG_COLORS[tag];
        matchColor = '#' + c.toString(16).padStart(6, '0');
        matchBold = true;
      }
    }

    // Check keywords
    for (const kw of KEYWORDS) {
      const idx = remaining.indexOf(kw);
      if (idx >= 0 && idx < earliestIdx) {
        earliestIdx = idx;
        matchLen = kw.length;
        matchColor = '#c4433a';
        matchBold = true;
      }
    }

    // Add text before the match
    if (earliestIdx > 0) {
      segments.push({ text: remaining.slice(0, earliestIdx), color: baseColor, bold: false });
    }

    // Add the match
    if (matchLen > 0) {
      segments.push({ text: remaining.slice(earliestIdx, earliestIdx + matchLen), color: matchColor, bold: matchBold });
      remaining = remaining.slice(earliestIdx + matchLen);
    } else {
      break;
    }
  }

  return segments;
}

/**
 * Render a rich-text effect line as multiple Phaser Text objects positioned inline.
 * Returns an array of text objects and total width.
 */
export function createRichEffectText(
  scene: Phaser.Scene,
  centerX: number,
  y: number,
  description: string,
  fontSize: number,
  maxWidth: number,
  isPenalty: boolean,
  resolution = 1,
): Phaser.GameObjects.Text[] {
  const baseColor = isPenalty ? '#8b2500' : '#1a1a1a';
  const segments = parseEffectText(description, baseColor);

  // First pass: measure total width
  const tempTexts: { text: string; color: string; bold: boolean; width: number }[] = [];
  let totalW = 0;

  for (const seg of segments) {
    const t = scene.add.text(0, 0, seg.text, {
      fontFamily: FONTS.card,
      fontSize: fontSize + 'px',
      color: seg.color,
      fontStyle: seg.bold ? 'bold' : '',
      resolution,
    });
    tempTexts.push({ ...seg, width: t.width });
    totalW += t.width;
    t.destroy();
  }

  // Fall back to single wrapped text if too wide
  if (totalW > maxWidth) {
    const singleText = scene.add.text(centerX, y, description, {
      fontFamily: FONTS.card,
      fontSize: fontSize + 'px',
      color: baseColor,
      align: 'center',
      wordWrap: { width: maxWidth, useAdvancedWrap: true },
      resolution,
    }).setOrigin(0.5, 0);
    return [singleText];
  }

  // Second pass: position segments centered
  const startX = centerX - totalW / 2;
  let curX = startX;
  const result: Phaser.GameObjects.Text[] = [];

  for (const seg of tempTexts) {
    const t = scene.add.text(curX, y, seg.text, {
      fontFamily: FONTS.card,
      fontSize: fontSize + 'px',
      color: seg.color,
      fontStyle: seg.bold ? 'bold' : '',
      resolution,
    });
    result.push(t);
    curX += seg.width;
  }

  return result;
}

/**
 * Returns a hex color for a scoring effect:
 * dark for bonuses, red for penalties / blanking effects.
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
    return 0x8b2500; // dark red
  }
  return 0x1a1a1a; // near-black
}

export function isPenaltyEffect(effect: ScoringEffect): boolean {
  const penaltyIds = [
    'penaltyPerTag', 'penaltyIfTagPresent', 'penaltyIfTagAbsent',
    'blankTag', 'blankIfTagAbsent', 'blankSpecificCard', 'blankIfTagPresent',
  ];
  return penaltyIds.includes(effect.effectId);
}

/**
 * Returns the text as-is (for compatibility).
 */
export function formatCardText(text: string): string {
  return text;
}
