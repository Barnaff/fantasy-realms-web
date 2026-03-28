import type { ResolvedCard, Tag } from '../../types/card.ts';

export interface CardRelation {
  fromInstanceId: string;
  toInstanceId: string;
  type: 'bonus' | 'penalty' | 'blank';
}

/**
 * Given a focused card and the full hand, compute all relationships
 * (which cards it affects or is affected by).
 */
export function getCardRelations(
  focusedCard: ResolvedCard,
  hand: ResolvedCard[],
): CardRelation[] {
  const relations: CardRelation[] = [];
  const seen = new Set<string>(); // prevent duplicates

  for (const effect of focusedCard.scoringEffects) {
    const eid = effect.effectId;
    const params = effect.params;

    // Effects where the focused card benefits/penalizes FROM other cards
    if (eid === 'bonusPerTag' || eid === 'penaltyPerTag') {
      const tag = params.tag as Tag;
      const type = eid === 'bonusPerTag' ? 'bonus' : 'penalty';
      for (const c of hand) {
        if (c.instanceId === focusedCard.instanceId) continue;
        if (c.tags.includes(tag)) {
          const key = `${focusedCard.instanceId}-${c.instanceId}-${type}`;
          if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: focusedCard.instanceId, toInstanceId: c.instanceId, type }); }
        }
      }
    }

    if (eid === 'bonusIfTagPresent' || eid === 'penaltyIfTagPresent') {
      const tag = params.tag as Tag;
      const type = eid === 'bonusIfTagPresent' ? 'bonus' : 'penalty';
      for (const c of hand) {
        if (c.instanceId === focusedCard.instanceId) continue;
        if (c.tags.includes(tag)) {
          const key = `${focusedCard.instanceId}-${c.instanceId}-${type}`;
          if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: focusedCard.instanceId, toInstanceId: c.instanceId, type }); }
        }
      }
    }

    if (eid === 'bonusIfTagAbsent' || eid === 'penaltyIfTagAbsent') {
      const tag = params.tag as Tag;
      const type = eid.startsWith('bonus') ? 'bonus' : 'penalty';
      const present = hand.some(c => c.instanceId !== focusedCard.instanceId && c.tags.includes(tag));
      if (!present && type === 'bonus') continue; // no arrows needed — absence is the bonus
      if (present) {
        // Show penalty arrows to cards that have the tag
        for (const c of hand) {
          if (c.instanceId === focusedCard.instanceId) continue;
          if (c.tags.includes(tag)) {
            const key = `${focusedCard.instanceId}-${c.instanceId}-${type}`;
            if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: focusedCard.instanceId, toInstanceId: c.instanceId, type }); }
          }
        }
      }
    }

    if (eid === 'bonusIfCardPresent') {
      const cardId = params.cardId as string;
      for (const c of hand) {
        if (c.instanceId === focusedCard.instanceId) continue;
        if (c.defId === cardId) {
          const key = `${focusedCard.instanceId}-${c.instanceId}-bonus`;
          if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: focusedCard.instanceId, toInstanceId: c.instanceId, type: 'bonus' }); }
        }
      }
    }

    // Blanking effects: focused card blanks others
    if (eid === 'blankTag') {
      const tag = params.tag as Tag;
      for (const c of hand) {
        if (c.instanceId === focusedCard.instanceId) continue;
        if (c.tags.includes(tag)) {
          const key = `${focusedCard.instanceId}-${c.instanceId}-blank`;
          if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: focusedCard.instanceId, toInstanceId: c.instanceId, type: 'blank' }); }
        }
      }
    }

    if (eid === 'blankIfTagAbsent') {
      const tag = params.tag as Tag;
      const present = hand.some(c => c.instanceId !== focusedCard.instanceId && c.tags.includes(tag));
      if (!present) {
        // This card gets blanked — show arrow from itself
        relations.push({ fromInstanceId: focusedCard.instanceId, toInstanceId: focusedCard.instanceId, type: 'blank' });
      }
    }

    if (eid === 'blankIfTagPresent') {
      const tag = params.tag as Tag;
      for (const c of hand) {
        if (c.instanceId === focusedCard.instanceId) continue;
        if (c.tags.includes(tag)) {
          const key = `${c.instanceId}-${focusedCard.instanceId}-blank`;
          if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: c.instanceId, toInstanceId: focusedCard.instanceId, type: 'blank' }); }
        }
      }
    }
  }

  // Also check if OTHER cards in hand have effects that reference the focused card's tags
  for (const other of hand) {
    if (other.instanceId === focusedCard.instanceId) continue;
    for (const effect of other.scoringEffects) {
      const eid = effect.effectId;
      const params = effect.params;

      if ((eid === 'bonusPerTag' || eid === 'bonusIfTagPresent') && focusedCard.tags.includes(params.tag as Tag)) {
        const key = `${other.instanceId}-${focusedCard.instanceId}-bonus`;
        if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: other.instanceId, toInstanceId: focusedCard.instanceId, type: 'bonus' }); }
      }

      if ((eid === 'penaltyPerTag' || eid === 'penaltyIfTagPresent') && focusedCard.tags.includes(params.tag as Tag)) {
        const key = `${other.instanceId}-${focusedCard.instanceId}-penalty`;
        if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: other.instanceId, toInstanceId: focusedCard.instanceId, type: 'penalty' }); }
      }

      if (eid === 'blankTag' && focusedCard.tags.includes(params.tag as Tag)) {
        const key = `${other.instanceId}-${focusedCard.instanceId}-blank`;
        if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: other.instanceId, toInstanceId: focusedCard.instanceId, type: 'blank' }); }
      }

      if (eid === 'bonusIfCardPresent' && focusedCard.defId === (params.cardId as string)) {
        const key = `${other.instanceId}-${focusedCard.instanceId}-bonus`;
        if (!seen.has(key)) { seen.add(key); relations.push({ fromInstanceId: other.instanceId, toInstanceId: focusedCard.instanceId, type: 'bonus' }); }
      }
    }
  }

  return relations;
}
