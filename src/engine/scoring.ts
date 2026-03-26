import type { CardInstance, ResolvedCard, ScoringEffect, Tag } from '../types/card.ts';
import type { ScoreBreakdownEntry, ScoreResult } from '../types/game.ts';
import type { RelicInstance } from '../types/relic.ts';
import { CARD_DEF_MAP } from '../data/cards.ts';
import { RELIC_DEF_MAP } from '../data/relics.ts';

// --- Card Resolution ---

export function resolveCard(instance: CardInstance): ResolvedCard {
  const def = CARD_DEF_MAP.get(instance.defId);
  if (!def) throw new Error(`Unknown card def: ${instance.defId}`);

  let tags = [...def.tags];
  let baseValue = def.baseValue;
  const scoringEffects = [...def.scoringEffects];
  const discardEffect = def.discardEffect;

  for (const mod of instance.modifiers) {
    switch (mod.type) {
      case 'addTag':
        if (!tags.includes(mod.payload as Tag)) {
          tags.push(mod.payload as Tag);
        }
        break;
      case 'removeTag':
        tags = tags.filter(t => t !== (mod.payload as Tag));
        break;
      case 'changeBaseValue':
        baseValue += mod.payload as number;
        break;
      case 'addEffect':
        scoringEffects.push(mod.payload as ScoringEffect);
        break;
    }
  }

  return {
    instanceId: instance.instanceId,
    defId: instance.defId,
    name: def.name,
    tags,
    baseValue,
    scoringEffects,
    discardEffect,
    art: def.art,
    flavor: def.flavor,
  };
}

// --- Scoring Effect Registry ---

type ScoringFn = (
  self: ResolvedCard,
  hand: ResolvedCard[],
  params: Record<string, unknown>,
) => number;

const scoringRegistry: Record<string, ScoringFn> = {
  bonusPerTag: (self, hand, params) => {
    const tag = params.tag as Tag;
    const bonus = params.bonus as number;
    const count = hand.filter(c => c.instanceId !== self.instanceId && c.tags.includes(tag)).length;
    return count * bonus;
  },

  penaltyPerTag: (self, hand, params) => {
    const tag = params.tag as Tag;
    const penalty = params.penalty as number;
    const count = hand.filter(c => c.instanceId !== self.instanceId && c.tags.includes(tag)).length;
    return count * penalty; // penalty should be negative
  },

  bonusIfTagPresent: (self, hand, params) => {
    const tag = params.tag as Tag;
    const bonus = params.bonus as number;
    const present = hand.some(c => c.instanceId !== self.instanceId && c.tags.includes(tag));
    return present ? bonus : 0;
  },

  penaltyIfTagPresent: (self, hand, params) => {
    const tag = params.tag as Tag;
    const penalty = params.penalty as number;
    const present = hand.some(c => c.instanceId !== self.instanceId && c.tags.includes(tag));
    return present ? penalty : 0; // penalty should be negative
  },

  bonusIfTagAbsent: (self, hand, params) => {
    const tag = params.tag as Tag;
    const bonus = params.bonus as number;
    const excludeSelf = params.excludeSelf as boolean | undefined;
    const present = hand.some(c => {
      if (excludeSelf && c.instanceId === self.instanceId) return false;
      if (c.instanceId === self.instanceId) return false;
      return c.tags.includes(tag);
    });
    return present ? 0 : bonus;
  },

  penaltyIfTagAbsent: (self, hand, params) => {
    const tag = params.tag as Tag;
    const penalty = params.penalty as number;
    const excludeSelf = (params.excludeSelf as boolean) ?? true;
    const present = hand.some(c => {
      if (excludeSelf && c.instanceId === self.instanceId) return false;
      return c.tags.includes(tag);
    });
    return present ? 0 : penalty; // penalty should be negative
  },

  bonusPerUniqueTag: (_self, hand, params) => {
    const bonus = params.bonus as number;
    const allTags = new Set<Tag>();
    for (const card of hand) {
      for (const tag of card.tags) {
        allTags.add(tag);
      }
    }
    return allTags.size * bonus;
  },

  bonusIfCardPresent: (self, hand, params) => {
    const cardId = params.cardId as string;
    const bonus = params.bonus as number;
    const present = hand.some(c => c.instanceId !== self.instanceId && c.defId === cardId);
    return present ? bonus : 0;
  },

  bonusPerCardInHand: (_self, hand, params) => {
    const bonus = params.bonus as number;
    const includeSelf = (params.includeSelf as boolean) ?? true;
    return (includeSelf ? hand.length : hand.length - 1) * bonus;
  },

  flatBonus: (_self, _hand, params) => {
    return params.bonus as number;
  },

  copyTagsOfHighest: (_self, _hand, _params) => {
    // This effect modifies tags rather than adding score directly.
    // The actual tag copying is handled in the resolution phase.
    // For scoring, we recalculate as if this card had the highest card's tags.
    // This is handled specially in scoreHand.
    return 0;
  },
};

// --- Blanking Registry ---

interface BlankResult {
  blankedInstanceIds: Set<string>;
}

function evaluateBlanking(hand: ResolvedCard[]): BlankResult {
  const blankedIds = new Set<string>();

  for (const card of hand) {
    for (const effect of card.scoringEffects) {
      // "This card blanks all cards with tag X"
      if (effect.effectId === 'blankTag') {
        const tag = effect.params.tag as Tag;
        for (const target of hand) {
          if (target.instanceId !== card.instanceId && target.tags.includes(tag)) {
            blankedIds.add(target.instanceId);
          }
        }
      }

      // "This card is blanked if no card with tag X is present"
      if (effect.effectId === 'blankIfTagAbsent') {
        const tag = effect.params.tag as Tag;
        const hasTag = hand.some(c => c.instanceId !== card.instanceId && c.tags.includes(tag));
        if (!hasTag) {
          blankedIds.add(card.instanceId);
        }
      }

      // "This card blanks a specific other card by defId"
      if (effect.effectId === 'blankSpecificCard') {
        const targetDefId = effect.params.cardId as string;
        for (const target of hand) {
          if (target.defId === targetDefId) {
            blankedIds.add(target.instanceId);
          }
        }
      }

      // "This card is blanked if any card with tag X is present"
      if (effect.effectId === 'blankIfTagPresent') {
        const tag = effect.params.tag as Tag;
        const hasTag = hand.some(c => c.instanceId !== card.instanceId && c.tags.includes(tag));
        if (hasTag) {
          blankedIds.add(card.instanceId);
        }
      }
    }
  }

  return { blankedInstanceIds: blankedIds };
}

// --- Handle copyTagsOfHighest ---

function applyCopyTagsOfHighest(hand: ResolvedCard[]): ResolvedCard[] {
  return hand.map(card => {
    const hasCopy = card.scoringEffects.some(e => e.effectId === 'copyTagsOfHighest');
    if (!hasCopy) return card;

    const others = hand.filter(c => c.instanceId !== card.instanceId);
    if (others.length === 0) return card;

    const highest = others.reduce((best, c) => c.baseValue > best.baseValue ? c : best);
    return {
      ...card,
      tags: [...new Set([...card.tags, ...highest.tags])],
    };
  });
}

// --- Main Scoring Function ---

export function scoreHand(
  handInstances: CardInstance[],
  relics: RelicInstance[] = [],
): ScoreResult {
  // Resolve all cards
  let resolved = handInstances.map(resolveCard);

  // Apply relic base value modifiers
  for (const relic of relics) {
    const relicDef = RELIC_DEF_MAP.get(relic.defId);
    if (!relicDef) continue;

    if (relicDef.effectId === 'tagBaseValueBonus') {
      const tag = relicDef.params.tag as Tag;
      const bonus = relicDef.params.bonus as number;
      resolved = resolved.map(c =>
        c.tags.includes(tag) ? { ...c, baseValue: c.baseValue + bonus } : c
      );
    }
  }

  // Apply copyTagsOfHighest
  resolved = applyCopyTagsOfHighest(resolved);

  // Evaluate blanking
  const { blankedInstanceIds } = evaluateBlanking(resolved);

  // Check relic blank reduction
  let blankReductionFactor = 1;
  for (const relic of relics) {
    const relicDef = RELIC_DEF_MAP.get(relic.defId);
    if (relicDef?.effectId === 'blankReduction') {
      blankReductionFactor = relicDef.params.factor as number;
    }
  }

  // Score each card
  const breakdown: ScoreBreakdownEntry[] = resolved.map(card => {
    const blanked = blankedInstanceIds.has(card.instanceId);

    if (blanked && blankReductionFactor >= 1) {
      return {
        cardId: card.defId,
        cardName: card.name,
        baseValue: card.baseValue,
        bonuses: [],
        penalties: [],
        blanked: true,
        finalValue: 0,
      };
    }

    const bonuses: { source: string; description: string; value: number }[] = [];
    const penalties: { source: string; description: string; value: number }[] = [];

    for (const effect of card.scoringEffects) {
      if (['blankTag', 'blankIfTagAbsent', 'blankSpecificCard', 'blankIfTagPresent', 'copyTagsOfHighest'].includes(effect.effectId)) continue;

      const fn = scoringRegistry[effect.effectId];
      if (!fn) continue;

      const value = fn(card, resolved, effect.params);
      if (value > 0) {
        bonuses.push({ source: card.name, description: effect.description, value });
      } else if (value < 0) {
        penalties.push({ source: card.name, description: effect.description, value });
      }
    }

    let finalValue = card.baseValue
      + bonuses.reduce((sum, b) => sum + b.value, 0)
      + penalties.reduce((sum, p) => sum + p.value, 0);

    if (blanked) {
      // Partial blanking via relic
      finalValue = Math.round(finalValue * (1 - blankReductionFactor));
    }

    return {
      cardId: card.defId,
      cardName: card.name,
      baseValue: card.baseValue,
      bonuses,
      penalties,
      blanked,
      finalValue,
    };
  });

  // Relic flat bonuses
  const relicBonuses: { relicName: string; value: number }[] = [];
  for (const relic of relics) {
    const relicDef = RELIC_DEF_MAP.get(relic.defId);
    if (!relicDef) continue;

    if (relicDef.effectId === 'tagScoringBonus') {
      const tag = relicDef.params.tag as Tag;
      const bonus = relicDef.params.bonus as number;
      const count = resolved.filter(c => !blankedInstanceIds.has(c.instanceId) && c.tags.includes(tag)).length;
      if (count > 0) {
        relicBonuses.push({ relicName: relicDef.name, value: count * bonus });
      }
    } else if (relicDef.effectId === 'flatScoreBonus') {
      relicBonuses.push({ relicName: relicDef.name, value: relicDef.params.bonus as number });
    }
  }

  const cardTotal = breakdown.reduce((sum, entry) => sum + entry.finalValue, 0);
  const relicTotal = relicBonuses.reduce((sum, rb) => sum + rb.value, 0);

  let totalScore = cardTotal + relicTotal;

  // Score multiplier relic
  for (const relic of relics) {
    const relicDef = RELIC_DEF_MAP.get(relic.defId);
    if (relicDef?.effectId === 'scoreMultiplier') {
      const threshold = relicDef.params.threshold as number;
      const multiplier = relicDef.params.multiplier as number;
      if (totalScore >= threshold) {
        relicBonuses.push({
          relicName: relicDef.name,
          value: Math.round(totalScore * (multiplier - 1)),
        });
        totalScore = Math.round(totalScore * multiplier);
      }
    }
  }

  return { totalScore, breakdown, relicBonuses };
}
