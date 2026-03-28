import Phaser from 'phaser';
import { COLORS, FONTS, CARD } from '../../config.ts';
import { CARD_DEF_MAP } from '../../data/cards.ts';
import { RARITY_LABELS } from '../../types/card.ts';
import { GameManager } from '../systems/GameManager.ts';
import { CardObject } from '../gameobjects/CardObject.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';
import { LayoutHelper } from '../systems/LayoutHelper.ts';
import { resolveCard } from '../../engine/scoring.ts';

export class DraftScene extends Phaser.Scene {
  private selectedId: string | null = null;
  private highlightGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private selectBtn: ButtonObject | null = null;
  private cardObjects: { card: CardObject; x: number; y: number; scale: number }[] = [];
  private hoveredCard: CardObject | null = null;
  private hoverScale = 1.8;
  private baseCardScale = 0.85;

  constructor() {
    super({ key: 'DraftScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();
    const options = gm.state.draftOptions;

    this.selectedId = null;
    this.highlightGraphics.clear();
    this.cardObjects = [];
    this.hoveredCard = null;

    if (!options || options.length === 0) {
      this.scene.start('MapScene');
      return;
    }

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    // Title
    this.add.text(cx, 24, 'Choose Your Starting Bonus', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#2c1810',
      resolution: 2,
    }).setOrigin(0.5);

    this.add.text(cx, 46, 'Pick one set of cards to add to your starting deck', {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#8a7a5c',
      resolution: 2,
    }).setOrigin(0.5);

    // Layout: vertical list of options, each a horizontal row of cards
    // Use river card scale from LayoutHelper for consistency
    const scales = LayoutHelper.getScales(width, height);
    const cardScale = Math.min(scales.river, (width - 80) / (5 * (CARD.WIDTH + 10)));
    const cardW = CARD.WIDTH * cardScale;
    const cardH = CARD.HEIGHT * cardScale;
    const cardGap = cardW + 10;
    const rowH = cardH + 44;
    const startY = 75;

    for (let oi = 0; oi < options.length; oi++) {
      const option = options[oi];
      const rowY = startY + oi * rowH;
      const cardCount = option.cardIds.length;
      const rowW = cardCount * cardGap;

      // Rarity summary
      const rarities = option.cardIds.map(id => CARD_DEF_MAP.get(id)?.rarity || 'common');
      const rarityCounts = new Map<string, number>();
      for (const r of rarities) rarityCounts.set(r, (rarityCounts.get(r) || 0) + 1);

      // Option background
      const bgPadX = 16;
      const bgW = Math.max(rowW + bgPadX * 2, 200);
      const bgH = rowH - 8;
      const bgX = cx - bgW / 2;

      const bg = this.add.graphics();
      bg.fillStyle(COLORS.parchment50, 1);
      bg.fillRoundedRect(bgX, rowY - 4, bgW, bgH, 8);
      bg.lineStyle(1.5, COLORS.parchment300, 0.5);
      bg.strokeRoundedRect(bgX, rowY - 4, bgW, bgH, 8);

      // Selection highlight
      const highlight = this.add.graphics();
      highlight.lineStyle(3, 0x22c55e, 1);
      highlight.strokeRoundedRect(bgX - 2, rowY - 6, bgW + 4, bgH + 4, 10);
      highlight.setVisible(false);
      this.highlightGraphics.set(option.id, highlight);

      // Option label with rarity summary
      const labelParts: string[] = [];
      for (const [r, count] of rarityCounts) {
        labelParts.push(`${count} ${RARITY_LABELS[r as keyof typeof RARITY_LABELS] || r}`);
      }
      this.add.text(bgX + 8, rowY, `Option ${oi + 1}  •  ${cardCount} cards  (${labelParts.join(', ')})`, {
        fontFamily: FONTS.body,
        fontSize: '9px',
        color: '#8a7a5c',
        resolution: 2,
      });

      // Cards in horizontal row
      const cardsStartX = cx - ((cardCount - 1) * cardGap) / 2;
      for (let ci = 0; ci < cardCount; ci++) {
        const def = CARD_DEF_MAP.get(option.cardIds[ci]);
        if (!def) continue;

        const instance = { instanceId: `draft_${oi}_${ci}`, defId: def.id, modifiers: [] };
        const resolved = resolveCard(instance);
        const cardX = cardsStartX + ci * cardGap;
        const cardY = rowY + 14 + cardH / 2;

        const card = new CardObject(this, cardX, cardY, resolved);
        card.setScale(cardScale);
        this.cardObjects.push({ card, x: cardX, y: cardY, scale: cardScale });
      }

      // Click zone for the entire row
      const zone = this.add.zone(cx, rowY + bgH / 2 - 4, bgW, bgH)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.selectOption(option.id));
    }

    // Select button
    const btnY = Math.min(startY + options.length * rowH + 15, height - 40);
    this.selectBtn = new ButtonObject(this, cx, btnY, 'Select & Start', {
      color: 0x22c55e,
      onClick: () => {
        if (!this.selectedId) return;
        gm.selectDraftOption(this.selectedId);
        this.scene.start('MapScene');
      },
    });
    this.selectBtn.setAlpha(0.4);

    // Store scales for hover preview
    this.hoverScale = scales.hand * 1.5;
    this.baseCardScale = cardScale;

    // Hover preview system
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.updateHoverPreview(pointer);
    });
  }

  private selectOption(id: string) {
    this.selectedId = id;

    for (const [optId, gfx] of this.highlightGraphics) {
      gfx.setVisible(optId === id);
    }

    if (this.selectBtn) {
      this.selectBtn.setAlpha(1);
    }
  }

  private updateHoverPreview(pointer: Phaser.Input.Pointer) {
    // Find card under pointer
    let found: { card: CardObject; x: number; y: number; scale: number } | null = null;

    for (const entry of this.cardObjects) {
      const hw = (CARD.WIDTH * entry.scale) / 2;
      const hh = (CARD.HEIGHT * entry.scale) / 2;
      if (
        pointer.x >= entry.x - hw && pointer.x <= entry.x + hw &&
        pointer.y >= entry.y - hh && pointer.y <= entry.y + hh
      ) {
        found = entry;
        break;
      }
    }

    if (!found) {
      // Un-hover current
      if (this.hoveredCard) {
        const entry = this.cardObjects.find(e => e.card === this.hoveredCard);
        if (entry) {
          this.tweens.killTweensOf(this.hoveredCard);
          this.tweens.add({
            targets: this.hoveredCard,
            x: entry.x, y: entry.y,
            scaleX: this.baseCardScale, scaleY: this.baseCardScale,
            duration: 120, ease: 'Quad.easeOut',
          });
          this.hoveredCard.setDepth(0);
        }
        this.hoveredCard = null;
      }
      return;
    }

    // Already hovering this card
    if (this.hoveredCard === found.card) return;

    // Un-hover old
    if (this.hoveredCard) {
      const oldEntry = this.cardObjects.find(e => e.card === this.hoveredCard);
      if (oldEntry) {
        this.tweens.killTweensOf(this.hoveredCard);
        this.tweens.add({
          targets: this.hoveredCard,
          x: oldEntry.x, y: oldEntry.y,
          scaleX: this.baseCardScale, scaleY: this.baseCardScale,
          duration: 120, ease: 'Quad.easeOut',
        });
        this.hoveredCard.setDepth(0);
      }
    }

    // Hover new — enlarge in place like river cards
    this.hoveredCard = found.card;
    this.tweens.killTweensOf(found.card);
    this.tweens.add({
      targets: found.card,
      y: found.y - 20,
      scaleX: this.hoverScale, scaleY: this.hoverScale,
      duration: 150, ease: 'Back.easeOut',
    });
    found.card.setDepth(100);
  }

  shutdown() {
    this.hoveredCard = null;
    this.input.off('pointermove');
  }
}
