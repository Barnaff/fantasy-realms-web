import Phaser from 'phaser';
import { COLORS, FONTS, CARD } from '../../config.ts';
import { LayoutHelper } from '../systems/LayoutHelper.ts';
import { GameManager } from '../systems/GameManager.ts';
import { CardFactory } from '../systems/CardFactory.ts';
import { CardObject } from '../gameobjects/CardObject.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';
import { CARD_DEF_MAP } from '../../data/cards.ts';
import { resolveCard } from '../../engine/scoring.ts';
import { createKeywordTooltips, getPoolCardIds } from '../utils/KeywordTooltips.ts';
import type { CardInstance } from '../../types/card.ts';

export class PostEncounterScene extends Phaser.Scene {
  private rewardCards: CardObject[] = [];
  private selectedIndex = -1;
  private hoveredIndex = -1;
  private selectBtn: ButtonObject | null = null;
  private baseScale = 1;
  private hoverShadow: Phaser.GameObjects.Graphics | null = null;
  private keywordTooltips: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'PostEncounterScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.rewardCards = [];
    this.selectedIndex = -1;
    this.hoveredIndex = -1;
    this.selectBtn = null;

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    // ── Title ──
    this.add.text(cx, height * 0.06, 'Encounter Complete!', {
      fontFamily: FONTS.display,
      fontSize: '24px',
      color: '#22c55e',
      resolution: 2,
    }).setOrigin(0.5);

    // ── Gold reward ──
    const reward = gm.state.postEncounterReward;
    let labelY = height * 0.13;

    if (reward?.gold) {
      this.add.text(cx, labelY, `+${reward.gold} Gold`, {
        fontFamily: FONTS.display,
        fontSize: '18px',
        color: '#c9a227',
        resolution: 2,
      }).setOrigin(0.5);
      labelY += 28;
    }

    // ── Card choice options (grouped) ──
    const cardOptions = reward?.cardChoices ?? [];

    if (cardOptions.length > 0) {
      this.add.text(cx, labelY, 'Choose a set of cards to add to your pool:', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: '#6b5c4e',
        resolution: 2,
      }).setOrigin(0.5);
      labelY += 22;

      // Layout options vertically, cards horizontal within each option
      const optionGap = 12;
      const bounds = LayoutHelper.getLayoutBounds(width, height);
      const btnSpace = 120; // space for buttons at bottom (skip + add to pool + margin)
      const rowPadding = 26; // label + margins per option row
      const availableH = height - labelY - btnSpace;
      const maxScaleW = (bounds.layoutW - 80) / (3 * CARD.WIDTH + 20);
      const maxScaleV = (availableH / cardOptions.length - rowPadding) / CARD.HEIGHT;
      // Enforce a minimum scale so cards remain readable
      this.baseScale = Math.max(0.35, Math.min(0.9, maxScaleW, maxScaleV));
      const cardW = CARD.WIDTH * this.baseScale;
      const cardH = CARD.HEIGHT * this.baseScale;

      let optionY = labelY;

      for (let oi = 0; oi < cardOptions.length; oi++) {
        const option = cardOptions[oi];

        // Option label
        this.add.text(cx, optionY, `Option ${oi + 1}`, {
          fontFamily: FONTS.body,
          fontSize: '10px',
          color: '#9c8a5c',
          resolution: 2,
        }).setOrigin(0.5);
        optionY += 14;

        // Option border/bg
        const optBg = this.add.graphics();
        const optW = option.cards.length * (cardW + 8) + 16;
        const optH = cardH + 16;
        optBg.lineStyle(2, this.selectedIndex === oi ? COLORS.tag.Beast : COLORS.parchment300, 0.6);
        optBg.strokeRoundedRect(cx - optW / 2, optionY - 4, optW, optH, 8);
        optBg.fillStyle(COLORS.parchment200, 0.2);
        optBg.fillRoundedRect(cx - optW / 2, optionY - 4, optW, optH, 8);
        optBg.setData('optionIndex', oi);

        // Cards in this option
        const gap = 8;
        const totalCardsW = option.cards.length * cardW + (option.cards.length - 1) * gap;
        const startX = cx - totalCardsW / 2 + cardW / 2;
        const cardsY = optionY + cardH / 2;

        for (let ci = 0; ci < option.cards.length; ci++) {
          const defId = option.cards[ci];
          const def = CARD_DEF_MAP.get(defId);
          if (!def) continue;

          const instance: CardInstance = {
            instanceId: `reward_${defId}_${oi}_${ci}`,
            defId,
            modifiers: [],
          };
          const resolved = resolveCard(instance);
          const x = startX + ci * (cardW + gap);
          const card = CardFactory.create(this, resolved, x, cardsY, this.baseScale);
          card.setDepth(oi * 10 + ci + 1);
          card.setData('rewardIndex', ci);
          card.setData('optionIndex', oi);
          card.setData('defId', defId);
          card.setData('originX', x);
          card.setData('originY', cardsY);
          card.setData('baseScale', this.baseScale);

          this.rewardCards.push(card);
        }

        // Clickable zone for the whole option
        const zone = this.add.zone(cx, optionY + cardH / 2, optW, optH).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          this.selectOption(oi);
        });

        optionY += cardH + optionGap + 14;
      }

      // Scene-level pointer for hover preview
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        const idx = this.getRewardCardAt(pointer.x, pointer.y);
        this.updateHover(idx);
      });
    } else {
      this.add.text(cx, labelY + 20, 'No card rewards available', {
        fontFamily: FONTS.body,
        fontSize: '14px',
        color: '#9c8a5c',
        resolution: 2,
      }).setOrigin(0.5);
    }

    // ── Buttons anchored to bottom ──
    const btnW = Math.min(width * 0.6, 240);
    const skipBtnY = height - 30;
    const selectBtnY = skipBtnY - 50;

    this.selectBtn = new ButtonObject(this, cx, selectBtnY, 'Add to Pool', {
      width: btnW,
      height: 44,
      color: COLORS.tag.Beast,
      fontSize: '16px',
      onClick: () => {
        if (this.selectedIndex >= 0 && this.selectedIndex < cardOptions.length) {
          gm.selectCardReward(this.selectedIndex);
          this.scene.start(gm.state.phase === 'game_over' ? 'GameOverScene' : 'MapScene');
        }
      },
    });
    this.selectBtn.setVisible(false);
    this.selectBtn.setDepth(10);

    new ButtonObject(this, cx, skipBtnY, 'Skip Reward', {
      width: btnW,
      height: 40,
      color: COLORS.parchment600,
      fontSize: '14px',
      onClick: () => {
        gm.skipCardReward();
        this.scene.start(gm.state.phase === 'game_over' ? 'GameOverScene' : 'MapScene');
      },
    }).setDepth(10);

    // ── View Deck button ──
    const deckLabel = this.add.text(12, height - 24, '📋 View Deck', {
      fontFamily: FONTS.body,
      fontSize: '12px',
      color: '#6b5c4e',
      resolution: 2,
    });
    deckLabel.setDepth(10);
    const deckZone = this.add.zone(60, height - 18, 120, 24).setInteractive({ useHandCursor: true });
    deckZone.setDepth(10);
    deckZone.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('PoolViewerScene', { returnScene: 'PostEncounterScene' });
    });
  }

  private getRewardCardAt(px: number, py: number): number {
    // Check from top depth to bottom — reverse order
    for (let i = this.rewardCards.length - 1; i >= 0; i--) {
      const card = this.rewardCards[i];
      const ox = card.getData('originX') as number;
      const oy = card.getData('originY') as number;
      const s = this.baseScale; // use base scale for hit test, not current animated scale
      const halfW = (CARD.WIDTH * s) / 2 + 10; // extra padding
      const halfH = (CARD.HEIGHT * s) / 2 + 10;
      if (px >= ox - halfW && px <= ox + halfW && py >= oy - halfH && py <= oy + halfH) {
        return i;
      }
    }
    return -1;
  }

  private updateHover(idx: number): void {
    if (idx === this.hoveredIndex) return;
    const old = this.hoveredIndex;
    this.hoveredIndex = idx;

    // Clear shadow + tooltips
    this.clearHoverEffects();

    // Un-hover previous (unless it's selected)
    if (old >= 0 && old < this.rewardCards.length && old !== this.selectedIndex) {
      const card = this.rewardCards[old];
      const oy = card.getData('originY') as number;
      this.tweens.killTweensOf(card);
      this.tweens.add({
        targets: card,
        y: oy,
        scaleX: this.baseScale,
        scaleY: this.baseScale,
        duration: 150,
        ease: 'Quad.easeOut',
      });
      card.setDepth(old + 1);
    }

    // Hover new — enlarge 1.5× from center
    if (idx >= 0 && idx < this.rewardCards.length && idx !== this.selectedIndex) {
      const card = this.rewardCards[idx];
      const hoverScale = this.baseScale * 1.5;
      const hoverY = (card.getData('originY') as number) ?? card.y;
      this.tweens.killTweensOf(card);
      this.tweens.add({
        targets: card,
        scaleX: hoverScale,
        scaleY: hoverScale,
        duration: 150,
        ease: 'Back.easeOut',
      });
      card.setDepth(200);

      // Shadow
      this.hoverShadow = this.add.graphics();
      this.hoverShadow.setDepth(199);
      const sw = CARD.WIDTH * hoverScale;
      const sh = CARD.HEIGHT * hoverScale;
      const sx = card.x - sw / 2;
      const sy = hoverY - sh / 2;
      this.hoverShadow.fillStyle(0x000000, 0.06);
      this.hoverShadow.fillRoundedRect(sx - 20, sy - 20, sw + 40, sh + 40, 22);
      this.hoverShadow.fillStyle(0x000000, 0.10);
      this.hoverShadow.fillRoundedRect(sx - 14, sy - 14, sw + 28, sh + 28, 18);
      this.hoverShadow.fillStyle(0x000000, 0.16);
      this.hoverShadow.fillRoundedRect(sx - 8, sy - 8, sw + 16, sh + 16, 14);
      this.hoverShadow.fillStyle(0x000000, 0.24);
      this.hoverShadow.fillRoundedRect(sx - 3, sy - 3, sw + 6, sh + 6, 10);

      // Tooltips
      const resolved = card.getCard();
      if (resolved) {
        this.keywordTooltips = createKeywordTooltips(
          this, resolved, card.x, hoverY, hoverScale, getPoolCardIds(),
        );
      }
    }
  }

  private clearHoverEffects(): void {
    if (this.hoverShadow) {
      this.hoverShadow.destroy();
      this.hoverShadow = null;
    }
    if (this.keywordTooltips) {
      this.keywordTooltips.destroy(true);
      this.keywordTooltips = null;
    }
  }

  private selectOption(optionIndex: number): void {
    // Deselect all cards from previous option
    for (const card of this.rewardCards) {
      const oi = card.getData('optionIndex') as number;
      if (oi === this.selectedIndex) {
        const oy = card.getData('originY') as number;
        this.tweens.killTweensOf(card);
        card.setGlowing(false);
        this.tweens.add({
          targets: card,
          y: oy,
          scaleX: this.baseScale,
          scaleY: this.baseScale,
          duration: 150,
          ease: 'Quad.easeOut',
        });
      }
    }

    // Toggle
    if (this.selectedIndex === optionIndex) {
      this.selectedIndex = -1;
      this.selectBtn?.setVisible(false);
      return;
    }

    this.selectedIndex = optionIndex;

    // Highlight all cards in the selected option
    for (const card of this.rewardCards) {
      const oi = card.getData('optionIndex') as number;
      if (oi === optionIndex) {
        this.tweens.killTweensOf(card);
        card.setGlowing(true, 'gold');
        card.setDepth(200);
      }
    }

    this.selectBtn?.setVisible(true);
  }
}
