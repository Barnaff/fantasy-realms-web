import Phaser from 'phaser';
import { COLORS, FONTS, CARD } from '../../config.ts';
import { CARD_DEF_MAP } from '../../data/cards.ts';
import { RARITY_COLORS, RARITY_LABELS } from '../../types/card.ts';
import { GameManager } from '../systems/GameManager.ts';
import { CardObject } from '../gameobjects/CardObject.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';
import { resolveCard } from '../../engine/scoring.ts';

export class DraftScene extends Phaser.Scene {
  private selectedId: string | null = null;
  private highlightGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private selectBtn: ButtonObject | null = null;
  private cardObjects: { card: CardObject; x: number; y: number; scale: number }[] = [];
  private hoverPreview: CardObject | null = null;

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
    this.hoverPreview = null;

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
    const cardScale = Math.min(0.7, (width - 120) / (5 * (CARD.WIDTH + 8)));
    const cardW = CARD.WIDTH * cardScale;
    const cardH = CARD.HEIGHT * cardScale;
    const cardGap = cardW + 8;
    const rowH = cardH + 40;
    const startY = 75;
    const contentH = options.length * rowH + 50;
    const needsScroll = contentH > height - 60;

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
      if (this.hoverPreview) {
        this.hoverPreview.destroy();
        this.hoverPreview = null;
      }
      return;
    }

    // Get the resolved card data from the found CardObject
    const resolved = found.card.getCard();
    if (!resolved) {
      if (this.hoverPreview) {
        this.hoverPreview.destroy();
        this.hoverPreview = null;
      }
      return;
    }

    // Check if already showing this card
    if (this.hoverPreview && this.hoverPreview.getCard()?.instanceId === resolved.instanceId) {
      return;
    }

    // Remove old preview
    if (this.hoverPreview) {
      this.hoverPreview.destroy();
      this.hoverPreview = null;
    }

    // Create enlarged preview
    const previewScale = 1.2;
    const previewW = CARD.WIDTH * previewScale;
    const previewH = CARD.HEIGHT * previewScale;

    // Position: above the card, clamped to screen
    let px = found.x;
    let py = found.y - (CARD.HEIGHT * found.scale) / 2 - previewH / 2 - 8;

    // Clamp
    const { width, height } = this.scale;
    px = Math.max(previewW / 2 + 4, Math.min(px, width - previewW / 2 - 4));
    if (py - previewH / 2 < 4) {
      py = found.y + (CARD.HEIGHT * found.scale) / 2 + previewH / 2 + 8;
    }
    py = Math.max(previewH / 2 + 4, Math.min(py, height - previewH / 2 - 4));

    this.hoverPreview = new CardObject(this, px, py, resolved);
    this.hoverPreview.setScale(previewScale);
    this.hoverPreview.setDepth(100);

    // Drop shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.2);
    shadow.fillRoundedRect(-CARD.WIDTH / 2 + 3, -CARD.HEIGHT / 2 + 3, CARD.WIDTH, CARD.HEIGHT, CARD.BORDER_RADIUS);
    this.hoverPreview.addAt(shadow, 0);
  }

  shutdown() {
    if (this.hoverPreview) {
      this.hoverPreview.destroy();
      this.hoverPreview = null;
    }
    this.input.off('pointermove');
  }
}
