import type { ScoringEffect, Tag } from '../../types/card.ts';
import { CARD_DEFS } from '../../data/cards.ts';
import { TAG_COLORS } from './Colors.ts';
import { FONTS } from '../../config.ts';

// Build card name patterns sorted by length (longest first to avoid partial matches)
const CARD_NAME_PATTERNS: { pattern: RegExp; color: string }[] = CARD_DEFS
  .map(def => def.name)
  .sort((a, b) => b.length - a.length) // longest first
  .map(name => {
    // Get primary tag color for this card
    const def = CARD_DEFS.find(d => d.name === name)!;
    const tagColor = TAG_COLORS[def.tags[0]] ?? 0x888888;
    const hexColor = '#' + tagColor.toString(16).padStart(6, '0');
    // Escape special regex chars in card name
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return {
      pattern: new RegExp(`\\b${escaped}\\b`, 'i'),
      color: hexColor,
    };
  });

const ALL_TAGS: Tag[] = ['Beast', 'Fire', 'Weather', 'Leader', 'Weapon', 'Land', 'Wild', 'Flood', 'Army', 'Artifact', 'Wizard', 'Undead'];

// Build a regex that matches any tag name variation (case-insensitive, with optional plural 's')
// Also matches common variations like "Armies", "Beasts", "Leaders", "Weapons", etc.
const TAG_VARIATIONS: { pattern: RegExp; tag: Tag }[] = ALL_TAGS.map(tag => {
  // Handle special plurals
  const plurals: Record<string, string> = {
    Army: 'Armies|Army',
    Beast: 'Beasts?',
    Fire: 'Fires?|Flames?',
    Weather: 'Weather',
    Leader: 'Leaders?',
    Weapon: 'Weapons?',
    Land: 'Lands?',
    Wild: 'Wilds?',
    Flood: 'Floods?',
    Artifact: 'Artifacts?',
    Wizard: 'Wizards?',
    Undead: 'Undead',
  };
  const pat = plurals[tag] || tag + 's?';
  return { pattern: new RegExp(`\\b(${pat})\\b`, 'i'), tag };
});

const KEYWORD_PATTERN = /\b(BLANKED|Blanks|Blanked|blank|blanks|blanked|discard|Discard)\b/i;

export interface TextSegment {
  text: string;
  color: string;
  bold: boolean;
}

/**
 * Parse effect description into colored segments.
 * Tag name variations (incl. plurals, case-insensitive) → tag color + bold
 * Keywords (BLANKED, Blanks, discard) → red + bold
 * Everything else → base color
 */
export function parseEffectText(description: string, baseColor: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let remaining = description;

  while (remaining.length > 0) {
    // Find the earliest match across all patterns
    let earliestIdx = remaining.length;
    let matchLen = 0;
    let matchColor = baseColor;
    let matchBold = false;

    // Check tag variations (case-insensitive with plurals)
    for (const { pattern, tag } of TAG_VARIATIONS) {
      const m = pattern.exec(remaining);
      if (m && m.index < earliestIdx) {
        earliestIdx = m.index;
        matchLen = m[0].length;
        const c = TAG_COLORS[tag];
        matchColor = '#' + c.toString(16).padStart(6, '0');
        matchBold = true;
      }
    }

    // Check keywords
    const kwMatch = KEYWORD_PATTERN.exec(remaining);
    if (kwMatch && kwMatch.index < earliestIdx) {
      earliestIdx = kwMatch.index;
      matchLen = kwMatch[0].length;
      matchColor = '#c4433a';
      matchBold = true;
    }

    // Check card names (longest first)
    for (const { pattern, color } of CARD_NAME_PATTERNS) {
      const m = pattern.exec(remaining);
      if (m && m.index < earliestIdx) {
        earliestIdx = m.index;
        matchLen = m[0].length;
        matchColor = color;
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
  clearedTags?: Set<string>,
): Phaser.GameObjects.GameObject[] {
  const baseColor = isPenalty ? '#8b2500' : '#1a1a1a';
  const segments = parseEffectText(description, baseColor);

  // Mark segments as struck through if their tag is cleared (only for penalty effects)
  const tagSet = clearedTags && isPenalty ? clearedTags : undefined;

  // First pass: measure total width
  const tempTexts: { text: string; color: string; bold: boolean; width: number; height: number; strikethrough: boolean }[] = [];
  let totalW = 0;

  for (const seg of segments) {
    const t = scene.add.text(0, 0, seg.text, {
      fontFamily: FONTS.card,
      fontSize: fontSize + 'px',
      color: seg.color,
      fontStyle: seg.bold ? 'bold' : '',
      resolution,
    });
    const isCleared = tagSet ? TAG_VARIATIONS.some(tv => tagSet.has(tv.tag) && tv.pattern.test(seg.text)) : false;
    tempTexts.push({ ...seg, width: t.width, height: t.height, strikethrough: isCleared });
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
  const result: Phaser.GameObjects.GameObject[] = [];

  for (const seg of tempTexts) {
    const t = scene.add.text(curX, y, seg.text, {
      fontFamily: FONTS.card,
      fontSize: fontSize + 'px',
      color: seg.strikethrough ? '#bbb' : seg.color,
      fontStyle: seg.bold ? 'bold' : '',
      resolution,
    });
    result.push(t);

    // Draw strikethrough line for cleared tags
    if (seg.strikethrough) {
      const line = scene.add.graphics();
      line.lineStyle(1, 0xcc0000, 0.8);
      line.lineBetween(curX, y + seg.height / 2, curX + seg.width, y + seg.height / 2);
      result.push(line);
    }

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
