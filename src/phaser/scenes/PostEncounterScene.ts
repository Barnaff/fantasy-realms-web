import Phaser from 'phaser';
import { COLORS, FONTS, CARD } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';
import { CardFactory } from '../systems/CardFactory.ts';
import { CardObject } from '../gameobjects/CardObject.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';
import { CARD_DEF_MAP } from '../../data/cards.ts';
import { resolveCard } from '../../engine/scoring.ts';
import type { CardInstance } from '../../types/card.ts';

export class PostEncounterScene extends Phaser.Scene {
  private rewardCards: CardObject[] = [];
  private selectedIndex = -1;
  private hoveredIndex = -1;
  private selectBtn: ButtonObject | null = null;
  private baseScale = 1;

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

    // ── Card choices ──
    const cardChoices = reward?.cardChoices ?? [];

    if (cardChoices.length > 0) {
      this.add.text(cx, labelY, 'Choose a card to add to your pool:', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: '#6b5c4e',
        resolution: 2,
      }).setOrigin(0.5);
      labelY += 22;

      // Scale cards to fit width — bigger than before
      const maxCardW = (width - 40) / cardChoices.length - 10;
      this.baseScale = Math.min(1.3, maxCardW / CARD.WIDTH);
      const cardW = CARD.WIDTH * this.baseScale;
      const cardH = CARD.HEIGHT * this.baseScale;
      const gap = 10;
      const totalW = cardChoices.length * cardW + (cardChoices.length - 1) * gap;
      const startX = cx - totalW / 2 + cardW / 2;
      const cardsY = labelY + cardH / 2 + 8;

      for (let i = 0; i < cardChoices.length; i++) {
        const defId = cardChoices[i];
        const def = CARD_DEF_MAP.get(defId);
        if (!def) continue;

        const instance: CardInstance = {
          instanceId: `reward_${defId}_${i}`,
          defId,
          modifiers: [],
        };
        const resolved = resolveCard(instance);
        const x = startX + i * (cardW + gap);
        const card = CardFactory.create(this, resolved, x, cardsY, this.baseScale);
        card.setDepth(i + 1);
        card.setData('rewardIndex', i);
        card.setData('defId', defId);
        card.setData('originX', x);
        card.setData('originY', cardsY);
        card.setData('baseScale', this.baseScale);

        this.rewardCards.push(card);
      }

      // Scene-level pointer for card selection + hover preview
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        const idx = this.getRewardCardAt(pointer.x, pointer.y);
        this.updateHover(idx);
      });

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const idx = this.getRewardCardAt(pointer.x, pointer.y);
        if (idx >= 0) {
          this.selectRewardCard(idx);
        }
      });
    } else {
      this.add.text(cx, labelY + 20, 'No card rewards available', {
        fontFamily: FONTS.body,
        fontSize: '14px',
        color: '#9c8a5c',
        resolution: 2,
      }).setOrigin(0.5);
    }

    // ── Select button (hidden until a card is selected) ──
    const selectBtnY = height * 0.85;
    const btnW = Math.min(width * 0.6, 240);

    this.selectBtn = new ButtonObject(this, cx, selectBtnY, 'Add to Pool', {
      width: btnW,
      height: 44,
      color: COLORS.tag.Beast,
      fontSize: '16px',
      onClick: () => {
        if (this.selectedIndex >= 0 && this.selectedIndex < cardChoices.length) {
          gm.selectCardReward(cardChoices[this.selectedIndex]);
          this.scene.start('MapScene');
        }
      },
    });
    this.selectBtn.setVisible(false);

    // ── Skip button ──
    const skipBtnY = height * 0.93;
    new ButtonObject(this, cx, skipBtnY, 'Skip Reward', {
      width: btnW,
      height: 40,
      color: COLORS.parchment600,
      fontSize: '14px',
      onClick: () => {
        gm.skipCardReward();
        this.scene.start('MapScene');
      },
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

    // Hover new — enlarge 1.5× from center (no y shift = center pivot)
    if (idx >= 0 && idx < this.rewardCards.length && idx !== this.selectedIndex) {
      const card = this.rewardCards[idx];
      const hoverScale = this.baseScale * 1.5;
      this.tweens.killTweensOf(card);
      this.tweens.add({
        targets: card,
        scaleX: hoverScale,
        scaleY: hoverScale,
        duration: 150,
        ease: 'Back.easeOut',
      });
      card.setDepth(200);
    }
  }

  private selectRewardCard(idx: number): void {
    // Deselect previous
    if (this.selectedIndex >= 0 && this.selectedIndex < this.rewardCards.length) {
      const oldCard = this.rewardCards[this.selectedIndex];
      const oy = oldCard.getData('originY') as number;
      this.tweens.killTweensOf(oldCard);
      oldCard.setGlowing(false);
      this.tweens.add({
        targets: oldCard,
        y: oy,
        scaleX: this.baseScale,
        scaleY: this.baseScale,
        duration: 150,
        ease: 'Quad.easeOut',
      });
      oldCard.setDepth(this.selectedIndex + 1);
    }

    // Toggle selection
    if (this.selectedIndex === idx) {
      this.selectedIndex = -1;
      this.selectBtn?.setVisible(false);
      return;
    }

    this.selectedIndex = idx;

    // Select new — enlarge from center and glow
    if (idx >= 0 && idx < this.rewardCards.length) {
      const card = this.rewardCards[idx];
      const selectedScale = this.baseScale * 1.4;
      this.tweens.killTweensOf(card);
      card.setGlowing(true, 'gold');
      this.tweens.add({
        targets: card,
        scaleX: selectedScale,
        scaleY: selectedScale,
        duration: 200,
        ease: 'Back.easeOut',
      });
      card.setDepth(200);
      this.selectBtn?.setVisible(true);
    }
  }
}
