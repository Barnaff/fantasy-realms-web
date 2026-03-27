import Phaser from 'phaser';
import type { ResolvedCard, Tag } from '../../types/card.ts';
import { CARD, FONTS, COLORS } from '../../config.ts';
import { TAG_COLORS, TAG_ART_FALLBACK } from '../utils/Colors.ts';
import { getEffectColor } from '../utils/TextFormatter.ts';
import { TagBadgeObject } from './TagBadgeObject.ts';

/**
 * The main card visual for the Fantasy Realms game.
 * Canonical size: CARD.WIDTH x CARD.HEIGHT (100x140).
 * Origin is center.
 */
export class CardObject extends Phaser.GameObjects.Container {
  private card: ResolvedCard;
  private blankedOverlay: Phaser.GameObjects.Container;
  private glowRing: Phaser.GameObjects.Graphics;
  private artImage: Phaser.GameObjects.Image | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    card: ResolvedCard,
    cardScale?: number,
  ) {
    super(scene, x, y);
    this.card = card;

    const W = CARD.WIDTH;
    const H = CARD.HEIGHT;
    const R = CARD.BORDER_RADIUS;
    const primaryTag = card.tags[0] as Tag | undefined;
    const tagColor = primaryTag ? (TAG_COLORS[primaryTag] ?? 0x888888) : 0x888888;

    // --- 1. Background ---
    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.parchment50, 1);
    bg.fillRoundedRect(-W / 2, -H / 2, W, H, R);
    this.add(bg);

    // --- 2. Border ---
    const border = scene.add.graphics();
    border.lineStyle(CARD.BORDER_WIDTH, tagColor, 1);
    border.strokeRoundedRect(-W / 2, -H / 2, W, H, R);
    this.add(border);

    // --- 3. Art area ---
    const artKey = card.art ?? (primaryTag ? TAG_ART_FALLBACK[primaryTag] : 'art-phoenix');
    const artW = 90;
    const artH = 52;
    const artY = -H / 2 + 8 + artH / 2; // positioned in upper portion

    if (scene.textures.exists(artKey)) {
      this.artImage = scene.add.image(0, artY, artKey);
      this.artImage.setDisplaySize(artW, artH);
      this.add(this.artImage);
    } else {
      // Fallback: colored rectangle
      const artFallback = scene.add.graphics();
      artFallback.fillStyle(tagColor, 0.2);
      artFallback.fillRect(-artW / 2, artY - artH / 2, artW, artH);
      this.add(artFallback);
    }

    // --- 4. Base value circle ---
    const circleRadius = 11;
    const circleX = -W / 2 + 14;
    const circleY = -H / 2 + 14;

    const valueCircle = scene.add.graphics();
    valueCircle.fillStyle(tagColor, 1);
    valueCircle.fillCircle(circleX, circleY, circleRadius);
    this.add(valueCircle);

    const valueText = scene.add.text(circleX, circleY, String(card.baseValue), {
      fontFamily: FONTS.display,
      fontSize: '10px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    this.add(valueText);

    // --- 5. Tag badges ---
    const badgeScale = 0.7;
    const badgeSpacing = 30;
    const badgeStartX = W / 2 - 10;
    const badgeY = -H / 2 + 10;

    for (let i = 0; i < card.tags.length; i++) {
      const bx = badgeStartX - i * badgeSpacing;
      // TagBadgeObject adds itself to scene, so we need to remove it from scene
      // and add to this container manually.
      const badge = new TagBadgeObject(scene, bx, badgeY, card.tags[i], badgeScale);
      scene.children.remove(badge);
      this.add(badge);
    }

    // --- 6. Card name ---
    const nameY = artY + artH / 2 + 8;
    const maxNameWidth = W - 10;

    const nameText = scene.add.text(0, nameY, card.name, {
      fontFamily: FONTS.display,
      fontSize: '8px',
      color: '#2c1810',
      align: 'center',
      wordWrap: { width: maxNameWidth },
    }).setOrigin(0.5, 0);

    // Truncate if too long
    if (nameText.width > maxNameWidth) {
      let truncated = card.name;
      while (truncated.length > 0 && nameText.width > maxNameWidth) {
        truncated = truncated.slice(0, -1);
        nameText.setText(truncated + '...');
      }
    }
    this.add(nameText);

    // --- 7. Scoring effects ---
    const effectStartY = nameY + (nameText.height || 10) + 4;
    const maxEffectWidth = W - 12;

    for (let i = 0; i < card.scoringEffects.length; i++) {
      const effect = card.scoringEffects[i];
      const effectColor = getEffectColor(effect);
      const hexStr = '#' + effectColor.toString(16).padStart(6, '0');

      const effectText = scene.add.text(0, effectStartY + i * 10, effect.description, {
        fontFamily: FONTS.body,
        fontSize: '6px',
        color: hexStr,
        align: 'center',
        wordWrap: { width: maxEffectWidth },
      }).setOrigin(0.5, 0);
      this.add(effectText);
    }

    // --- 8. Blanked overlay (hidden by default) ---
    this.blankedOverlay = scene.add.container(0, 0);
    this.blankedOverlay.setVisible(false);

    const darkRect = scene.add.graphics();
    darkRect.fillStyle(0x000000, 0.5);
    darkRect.fillRoundedRect(-W / 2, -H / 2, W, H, R);
    this.blankedOverlay.add(darkRect);

    // Diagonal lines
    const lines = scene.add.graphics();
    lines.lineStyle(1, 0xff0000, 0.6);
    for (let i = -H; i < W + H; i += 12) {
      lines.lineBetween(
        Math.max(-W / 2, -W / 2 + i),
        Math.max(-H / 2, -H / 2 + (i > 0 ? 0 : -i)),
        Math.min(W / 2, -W / 2 + i + H),
        Math.min(H / 2, H / 2),
      );
    }
    this.blankedOverlay.add(lines);

    const blankedLabel = scene.add.text(0, 0, 'BLANKED', {
      fontFamily: FONTS.display,
      fontSize: '12px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5);
    this.blankedOverlay.add(blankedLabel);

    this.add(this.blankedOverlay);

    // --- 9. Glow ring (hidden by default) ---
    this.glowRing = scene.add.graphics();
    this.glowRing.setVisible(false);
    this.add(this.glowRing);

    // Apply scale
    if (cardScale !== undefined) {
      this.setScale(cardScale);
    }

    scene.add.existing(this);
  }

  /** Show or hide the blanked overlay. */
  setBlanked(blanked: boolean): void {
    this.blankedOverlay.setVisible(blanked);
    if (this.artImage) {
      this.artImage.setAlpha(blanked ? 0.3 : 1);
    }
  }

  /** Show or hide a colored glow ring around the card. */
  setGlowing(glowing: boolean, color?: 'gold' | 'green' | 'red'): void {
    this.glowRing.setVisible(glowing);
    if (glowing) {
      const colorMap: Record<string, number> = {
        gold: 0xffd700,
        green: 0x22c55e,
        red: 0xc4433a,
      };
      const glowColor = colorMap[color ?? 'gold'] ?? 0xffd700;

      this.glowRing.clear();
      this.glowRing.lineStyle(4, glowColor, 0.7);
      this.glowRing.strokeRoundedRect(
        -CARD.WIDTH / 2 - 3,
        -CARD.HEIGHT / 2 - 3,
        CARD.WIDTH + 6,
        CARD.HEIGHT + 6,
        CARD.BORDER_RADIUS + 2,
      );
    }
  }

  /** Dim or restore the card's opacity. */
  setDimmed(dimmed: boolean): void {
    this.setAlpha(dimmed ? 0.4 : 1);
  }

  /** Return the underlying card data. */
  getCard(): ResolvedCard {
    return this.card;
  }
}
