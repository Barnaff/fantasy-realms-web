import Phaser from 'phaser';
import type { ResolvedCard, Tag } from '../../types/card.ts';
import { RARITY_COLORS } from '../../types/card.ts';
import { CARD, FONTS, COLORS } from '../../config.ts';
import { TAG_COLORS, TAG_ART_FALLBACK } from '../utils/Colors.ts';
import { createRichEffectText, isPenaltyEffect } from '../utils/TextFormatter.ts';
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
  private glowParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private cardScale: number;

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
    const RES = 2; // text resolution multiplier for crisp scaling
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
    const artW = W - 16;
    const artH = Math.round(H * 0.38);
    const artY = -H / 2 + 10 + artH / 2; // positioned in upper portion

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
    const circleRadius = 13;
    const circleX = -W / 2 + 12;
    const circleY = -H / 2 + 12;

    const valueCircle = scene.add.graphics();
    valueCircle.fillStyle(tagColor, 1);
    valueCircle.fillCircle(circleX, circleY, circleRadius);
    this.add(valueCircle);

    const valueText = scene.add.text(circleX, circleY, String(card.baseValue), {
      fontFamily: FONTS.display,
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      resolution: RES,
    }).setOrigin(0.5);
    this.add(valueText);

    // --- 5. Tag badges (left side, after score circle) ---
    const badgeScale = 0.8;
    const badgeSpacing = 36;
    const badgeStartX = circleX + circleRadius + 18; // start right of the score circle
    const badgeY = -H / 2 + 8;

    for (let i = 0; i < card.tags.length; i++) {
      const bx = badgeStartX + i * badgeSpacing; // go rightward from the score circle
      const badge = new TagBadgeObject(scene, bx, badgeY, card.tags[i], badgeScale);
      scene.children.remove(badge);
      this.add(badge);
    }

    // --- 6. Card name ---
    const nameY = artY + artH / 2 + 6;
    const maxNameWidth = W - 12;

    const nameText = scene.add.text(0, nameY, card.name, {
      fontFamily: FONTS.display,
      fontSize: '10px',
      color: '#2c1810',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: maxNameWidth },
      resolution: RES,
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

    // --- 7. Scoring effects (rich text with colored tag names) ---
    let curEffectY = nameY + (nameText.height || 10) + 3;
    const maxEffectWidth = W - 14;
    const effectFontSize = 7;
    const maxEffectBottom = H / 2 - 3; // don't overflow past card bottom

    for (let i = 0; i < card.scoringEffects.length; i++) {
      if (curEffectY >= maxEffectBottom) break; // no more room

      const effect = card.scoringEffects[i];
      const penalty = isPenaltyEffect(effect);
      const textObjs = createRichEffectText(
        scene, 0, curEffectY,
        effect.description, effectFontSize, maxEffectWidth, penalty, RES,
      );

      // Measure actual height of rendered text
      let maxH = 0;
      for (const t of textObjs) {
        maxH = Math.max(maxH, t.height);
        scene.children.remove(t);
      }

      // Check if this line would overflow
      if (curEffectY + maxH > maxEffectBottom) {
        // Destroy overflow text
        for (const t of textObjs) t.destroy();
        break;
      }

      for (const t of textObjs) {
        this.add(t);
      }
      curEffectY += maxH + 1;
    }

    // --- 8. Blanked overlay (hidden by default) ---
    this.blankedOverlay = scene.add.container(0, 0);
    this.blankedOverlay.setVisible(false);

    // Light gray wash over entire card (gives desaturated look)
    const grayWash = scene.add.graphics();
    grayWash.fillStyle(0xd0d0d0, 0.45);
    grayWash.fillRoundedRect(-W / 2, -H / 2, W, H, R);
    this.blankedOverlay.add(grayWash);

    // Darker overlay on art area + BLANKED label
    const artDark = scene.add.graphics();
    artDark.fillStyle(0x888888, 0.5);
    artDark.fillRect(-artW / 2, artY - artH / 2, artW, artH);
    this.blankedOverlay.add(artDark);

    const blankedLabel = scene.add.text(0, artY, 'BLANKED', {
      fontFamily: FONTS.display,
      fontSize: '12px',
      color: '#cc3333',
      stroke: '#ffffff',
      strokeThickness: 2,
      align: 'center',
      resolution: RES,
    }).setOrigin(0.5);
    this.blankedOverlay.add(blankedLabel);

    this.add(this.blankedOverlay);

    // --- 9. Rarity gem at bottom center ---
    if (card.rarity && card.rarity !== 'starting') {
      const gemY = H / 2 - 8;
      const gemRadius = 5;
      const rarityHex = parseInt(RARITY_COLORS[card.rarity].replace('#', ''), 16);

      const gem = scene.add.graphics();
      // Outer glow
      gem.fillStyle(rarityHex, 0.3);
      gem.fillCircle(0, gemY, gemRadius + 3);
      // Inner gem (diamond shape)
      gem.fillStyle(rarityHex, 1);
      gem.fillCircle(0, gemY, gemRadius);
      // Highlight
      gem.fillStyle(0xffffff, 0.5);
      gem.fillCircle(-1.5, gemY - 1.5, gemRadius * 0.35);
      this.add(gem);
    }

    // --- 10. Glow ring (hidden by default) ---
    this.glowRing = scene.add.graphics();
    this.glowRing.setVisible(false);
    this.add(this.glowRing);

    // Apply scale
    this.cardScale = cardScale ?? 1;
    if (cardScale !== undefined) {
      this.setScale(cardScale);
    }

    scene.add.existing(this);
  }

  /** Show or hide the blanked overlay. */
  setBlanked(blanked: boolean): void {
    this.blankedOverlay.setVisible(blanked);
    if (this.artImage) {
      this.artImage.setAlpha(blanked ? 0.4 : 1);
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

      // Add particles for green glow
      if (color === 'green' && !this.glowParticles && this.scene?.textures?.exists('particle-glow')) {
        const s = this.cardScale;
        const pw = CARD.WIDTH * s;
        const ph = CARD.HEIGHT * s;
        this.glowParticles = this.scene.add.particles(this.x, this.y, 'particle-glow', {
          speed: { min: 6, max: 18 },
          scale: { start: 0.14, end: 0 },
          alpha: { start: 0.7, end: 0 },
          lifespan: { min: 400, max: 900 },
          frequency: 70,
          tint: 0x22c55e,
          blendMode: 'ADD',
          emitZone: {
            type: 'edge',
            source: new Phaser.Geom.Rectangle(
              -pw / 2 - 3,
              -ph / 2 - 3,
              pw + 6,
              ph + 6,
            ),
            quantity: 20,
          },
        });
        this.glowParticles.setDepth((this.depth ?? 0) + 1);
      }
    } else {
      if (this.glowParticles) {
        this.glowParticles.destroy();
        this.glowParticles = null;
      }
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

  destroy(fromScene?: boolean): void {
    if (this.glowParticles) {
      this.glowParticles.destroy();
      this.glowParticles = null;
    }
    super.destroy(fromScene);
  }
}
