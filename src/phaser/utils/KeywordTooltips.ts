import Phaser from 'phaser';
import { FONTS, CARD } from '../../config.ts';
import { CARD_DEF_MAP, CARD_DEFS } from '../../data/cards.ts';
import type { ResolvedCard } from '../../types/card.ts';
import { resolveCard } from '../../engine/scoring.ts';
import { CardObject } from '../gameobjects/CardObject.ts';
import { GameManager } from '../systems/GameManager.ts';

/** Helper: get pool card def IDs as a Set */
export function getPoolCardIds(): Set<string> {
  const gm = GameManager.getInstance();
  return new Set(gm.state.run?.pool.map(c => c.defId) ?? []);
}

/** Keyword tooltips — only blank/blanked */
const KEYWORD_DEFS: Record<string, { label: string; description: string; color: string }> = {
  blank: {
    label: 'BLANK',
    description: 'A blanked card loses all abilities and scores 0 points.',
    color: '#dc2626',
  },
  blanked: {
    label: 'BLANKED',
    description: 'This card scores 0 and all its effects are disabled.',
    color: '#dc2626',
  },
};

/**
 * Extract referenced card IDs from a card's scoring effects.
 */
function getReferencedCardIds(card: ResolvedCard): string[] {
  const ids = new Set<string>();

  for (const eff of card.scoringEffects) {
    // Direct card references via params
    if (eff.params.cardId && typeof eff.params.cardId === 'string') {
      ids.add(eff.params.cardId);
    }

    // Scan description for card names
    const desc = eff.description || '';
    for (const def of CARD_DEFS) {
      if (def.id === card.defId) continue; // skip self
      if (desc.includes(def.name)) {
        ids.add(def.id);
      }
    }
  }

  // Also check flavor text for card names
  if (card.flavor) {
    for (const def of CARD_DEFS) {
      if (def.id === card.defId) continue;
      if (card.flavor.includes(def.name)) {
        ids.add(def.id);
      }
    }
  }

  return Array.from(ids);
}

/**
 * Check if card has blank-related keywords in its effects.
 */
function getBlankKeywords(card: ResolvedCard): string[] {
  const found: string[] = [];
  for (const eff of card.scoringEffects) {
    const desc = (eff.description || '').toLowerCase();
    if (eff.effectId.includes('blank') || desc.includes('blank')) {
      if (desc.includes('blanked') || eff.effectId === 'blankIfTagPresent' || eff.effectId === 'blankIfTagAbsent') {
        if (!found.includes('blanked')) found.push('blanked');
      } else {
        if (!found.includes('blank')) found.push('blank');
      }
    }
  }
  return found;
}

/**
 * Creates keyword tooltips and referenced card previews next to a hovered card.
 */
export function createKeywordTooltips(
  scene: Phaser.Scene,
  card: ResolvedCard,
  cardX: number,
  cardY: number,
  cardScale: number,
  poolCardIds?: Set<string>,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  const blankKeywords = getBlankKeywords(card);
  const referencedIds = getReferencedCardIds(card);

  if (blankKeywords.length === 0 && referencedIds.length === 0) return container;

  const cardHalfW = (CARD.WIDTH * cardScale) / 2;
  const cardHalfH = (CARD.HEIGHT * cardScale) / 2;
  const { width: screenW, height: screenH } = scene.scale;

  // Determine which side to show (prefer right, fall back to left)
  const rightSpace = screenW - (cardX + cardHalfW);
  const showOnRight = rightSpace > 160;

  const sideX = showOnRight
    ? cardX + cardHalfW + 10
    : cardX - cardHalfW - 10;

  let curY = cardY - cardHalfH;

  // --- Blank keyword tooltips ---
  for (const key of blankKeywords) {
    const def = KEYWORD_DEFS[key];
    if (!def) continue;

    const tooltipW = 130;
    const tx = showOnRight ? sideX : sideX - tooltipW;

    const textObj = scene.add.text(0, 0, def.description, {
      fontFamily: FONTS.card,
      fontSize: '8px',
      color: '#333333',
      wordWrap: { width: tooltipW - 14 },
      resolution: 2,
    });
    const tooltipH = textObj.height + 20;

    // Shadow + Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.06);
    bg.fillRoundedRect(tx - 10, curY - 10, tooltipW + 20, tooltipH + 20, 12);
    bg.fillStyle(0x000000, 0.12);
    bg.fillRoundedRect(tx - 5, curY - 5, tooltipW + 10, tooltipH + 10, 8);
    bg.fillStyle(0x000000, 0.20);
    bg.fillRoundedRect(tx - 2, curY - 2, tooltipW + 4, tooltipH + 4, 6);
    bg.fillStyle(0xffffff, 0.97);
    bg.fillRoundedRect(tx, curY, tooltipW, tooltipH, 5);
    bg.fillStyle(0xdc2626, 1);
    bg.fillRect(tx, curY + 3, 3, tooltipH - 6);
    bg.lineStyle(1, 0xdddddd, 0.3);
    bg.strokeRoundedRect(tx, curY, tooltipW, tooltipH, 5);
    container.add(bg);

    // Label
    const label = scene.add.text(tx + 9, curY + 3, def.label, {
      fontFamily: FONTS.card,
      fontSize: '9px',
      color: def.color,
      fontStyle: 'bold',
      resolution: 2,
    });
    container.add(label);

    // Description
    textObj.setPosition(tx + 9, curY + 15);
    container.add(textObj);

    curY += tooltipH + 6;
  }

  // --- Referenced card previews ---
  if (referencedIds.length > 0) {
    const refScale = 0.55;
    const refCardW = CARD.WIDTH * refScale;
    const refCardH = CARD.HEIGHT * refScale;
    const maxRefs = 3;

    for (let i = 0; i < Math.min(referencedIds.length, maxRefs); i++) {
      const refDef = CARD_DEF_MAP.get(referencedIds[i]);
      if (!refDef) continue;

      // Don't overflow screen
      if (curY + refCardH > screenH - 10) break;

      const instance = { instanceId: `tooltip_ref_${i}`, defId: refDef.id, modifiers: [] };
      const resolved = resolveCard(instance);

      const refX = showOnRight
        ? sideX + refCardW / 2
        : sideX - refCardW / 2;
      const refY = curY + refCardH / 2;

      const refCard = new CardObject(scene, refX, refY, resolved);
      refCard.setScale(refScale);

      // Dark halo shadow behind referenced card
      const shadow = scene.add.graphics();
      const rsx = refX - refCardW / 2;
      const rsy = refY - refCardH / 2;
      shadow.fillStyle(0x000000, 0.06);
      shadow.fillRoundedRect(rsx - 14, rsy - 14, refCardW + 28, refCardH + 28, 14);
      shadow.fillStyle(0x000000, 0.10);
      shadow.fillRoundedRect(rsx - 8, rsy - 8, refCardW + 16, refCardH + 16, 10);
      shadow.fillStyle(0x000000, 0.18);
      shadow.fillRoundedRect(rsx - 3, rsy - 3, refCardW + 6, refCardH + 6, 6);
      shadow.fillStyle(0x000000, 0.25);
      shadow.fillRoundedRect(rsx, rsy, refCardW, refCardH, 4);
      container.add(shadow);

      // Move card from scene to container
      scene.children.remove(refCard);
      container.add(refCard);

      // Show green checkmark if this referenced card is in the player's pool
      if (poolCardIds && poolCardIds.has(refDef.id)) {
        const checkSize = 16;
        const checkX = refX + refCardW / 2 - checkSize / 2 + 2;
        const checkY = refY - refCardH / 2 + checkSize / 2 - 2;

        // Green circle background
        const checkBg = scene.add.graphics();
        checkBg.fillStyle(0x22c55e, 1);
        checkBg.fillCircle(checkX, checkY, checkSize / 2 + 1);
        checkBg.lineStyle(1.5, 0xffffff, 0.9);
        checkBg.strokeCircle(checkX, checkY, checkSize / 2 + 1);
        container.add(checkBg);

        // Checkmark text
        const checkText = scene.add.text(checkX, checkY, '✓', {
          fontSize: '11px',
          color: '#ffffff',
          fontStyle: 'bold',
          resolution: 2,
        }).setOrigin(0.5);
        container.add(checkText);
      }

      curY += refCardH + 6;
    }
  }

  container.setDepth(200);
  return container;
}
