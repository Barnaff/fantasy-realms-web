import type { ScoringEffect } from '../../types/card.ts';

export interface GroupedEffect {
  description: string;
  effectId: string;
  params: Record<string, unknown>;
  isSeparator?: boolean;
}

/**
 * Groups similar scoring effects together for compact display on cards.
 *
 * Examples:
 *   "Blanks all Fire" + "Blanks all Army" → "Blanks all Fire and Army"
 *   "+8 for each Army in hand" + "+8 for each Leader in hand" → "+8 for each Army and Leader in hand"
 *   "+5 if any Wizard is present" + "+5 if any Leader is present" → "+5 if any Wizard or Leader is present"
 */
export function groupEffects(effects: ScoringEffect[]): GroupedEffect[] {
  // Filter out hidden effects (used for display-only purposes, e.g. second tag check in OR groups)
  const visible = effects.filter(e => !(e as any).hidden);
  const result: GroupedEffect[] = [];
  const used = new Set<number>();

  for (let i = 0; i < visible.length; i++) {
    if (used.has(i)) continue;

    const eff = visible[i];
    const group = [eff];
    used.add(i);

    // Find similar effects to merge with
    for (let j = i + 1; j < visible.length; j++) {
      if (used.has(j)) continue;
      if (canGroup(eff, visible[j])) {
        group.push(visible[j]);
        used.add(j);
      }
    }

    if (group.length === 1) {
      // No grouping needed — use original description
      result.push({
        description: eff.description,
        effectId: eff.effectId,
        params: eff.params,
      });
    } else {
      // Merge grouped effects
      result.push(mergeGroup(group));
    }
  }

  // Insert "- or -" separators between consecutive orGroup effects
  const withSeparators: GroupedEffect[] = [];
  for (let i = 0; i < result.length; i++) {
    const curr = visible.find(e => e.description === result[i].description);
    const prev = i > 0 ? visible.find(e => e.description === result[i - 1].description) : undefined;
    if (prev?.orGroup && curr?.orGroup && prev.orGroup === curr.orGroup) {
      withSeparators.push({ description: '- or -', effectId: '_separator', params: {}, isSeparator: true });
    }
    withSeparators.push(result[i]);
  }

  return withSeparators;
}

/** Check if two effects can be grouped (same type + same numeric value, different tags) */
function canGroup(a: ScoringEffect, b: ScoringEffect): boolean {
  if (a.effectId !== b.effectId) return false;
  // Never merge effects that belong to an orGroup
  if (a.orGroup || b.orGroup) return false;

  switch (a.effectId) {
    case 'blankTag':
      // Both blank different tags
      return a.params.tag !== b.params.tag;

    case 'bonusPerTag':
    case 'bonusPerOtherTag':
      return a.params.bonus === b.params.bonus && a.params.tag !== b.params.tag;

    case 'penaltyPerTag':
      return a.params.penalty === b.params.penalty && a.params.tag !== b.params.tag;

    case 'bonusIfTagPresent':
      return a.params.bonus === b.params.bonus && a.params.tag !== b.params.tag;

    case 'bonusIfTagAbsent':
      return a.params.bonus === b.params.bonus && a.params.tag !== b.params.tag;

    case 'penaltyIfTagAbsent':
      return a.params.penalty === b.params.penalty && a.params.tag !== b.params.tag;

    default:
      return false;
  }
}

/** Merge a group of similar effects into one with combined description */
function mergeGroup(group: ScoringEffect[]): GroupedEffect {
  const first = group[0];
  const tags = group.map(e => e.params.tag as string);
  const tagList = formatTagList(tags);

  switch (first.effectId) {
    case 'blankTag':
      return {
        description: `Blanks all ${tagList}`,
        effectId: first.effectId,
        params: { tags },
      };

    case 'bonusPerTag':
    case 'bonusPerOtherTag':
      return {
        description: `+${first.params.bonus} for each ${tagList} in hand`,
        effectId: first.effectId,
        params: { tags, bonus: first.params.bonus },
      };

    case 'penaltyPerTag':
      return {
        description: `-${Math.abs(first.params.penalty as number)} for each ${tagList}`,
        effectId: first.effectId,
        params: { tags, penalty: first.params.penalty },
      };

    case 'bonusIfTagPresent':
      return {
        description: `+${first.params.bonus} if any ${tagList} is present`,
        effectId: first.effectId,
        params: { tags, bonus: first.params.bonus },
      };

    case 'bonusIfTagAbsent':
      return {
        description: `+${first.params.bonus} if no ${tagList} in hand`,
        effectId: first.effectId,
        params: { tags, bonus: first.params.bonus },
      };

    case 'penaltyIfTagAbsent':
      return {
        description: `-${Math.abs(first.params.penalty as number)} unless any ${tagList} is present`,
        effectId: first.effectId,
        params: { tags, penalty: first.params.penalty },
      };

    default:
      return {
        description: first.description,
        effectId: first.effectId,
        params: first.params,
      };
  }
}

/** Format ["Fire", "Army", "Beast"] as "Fire, Army and Beast" */
function formatTagList(tags: string[]): string {
  if (tags.length === 1) return tags[0];
  if (tags.length === 2) return `${tags[0]} and ${tags[1]}`;
  return tags.slice(0, -1).join(', ') + ' and ' + tags[tags.length - 1];
}
