import Phaser from 'phaser';
import { CARD, FONTS, COLORS } from '../../config.ts';

/**
 * Visual representation of the deck pile.
 * Dark brown rounded rectangle with "FR" monogram and card count.
 */
export class DeckPileObject extends Phaser.GameObjects.Container {
  private countText: Phaser.GameObjects.Text;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private _canDraw = false;
  private deckScale: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    count: number,
    scale: number = 1,
  ) {
    super(scene, x, y);

    const W = CARD.WIDTH;
    const H = CARD.HEIGHT;
    const R = CARD.BORDER_RADIUS;

    // --- Glow ring (behind card, hidden by default) ---
    this.glowGraphics = scene.add.graphics();
    this.glowGraphics.setVisible(false);
    this.add(this.glowGraphics);

    // --- Card back background ---
    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.parchment700, 1);
    bg.fillRoundedRect(-W / 2, -H / 2, W, H, R);
    this.add(bg);

    // --- Border ---
    const border = scene.add.graphics();
    border.lineStyle(CARD.BORDER_WIDTH, COLORS.parchment800, 1);
    border.strokeRoundedRect(-W / 2, -H / 2, W, H, R);
    this.add(border);

    // --- Decorative inner border ---
    const inner = scene.add.graphics();
    inner.lineStyle(1, COLORS.parchment500, 0.5);
    inner.strokeRoundedRect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12, R - 2);
    this.add(inner);

    // --- "FR" monogram ---
    const monogram = scene.add.text(0, -10, 'FR', {
      fontFamily: FONTS.display,
      fontSize: '22px',
      color: '#b8a678',
      align: 'center',
    }).setOrigin(0.5);
    this.add(monogram);

    // --- Card count ---
    this.countText = scene.add.text(0, H / 2 - 18, String(count), {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#d4c49a',
      align: 'center',
    }).setOrigin(0.5);
    this.add(this.countText);

    this.deckScale = scale;
    this.setScale(scale);
    scene.add.existing(this);
  }

  /** Update the displayed card count. */
  setCount(n: number): void {
    this.countText.setText(String(n));
  }

  /** Toggle green glow indicating the deck can be drawn from. */
  setCanDraw(can: boolean): void {
    if (this._canDraw === can) return;
    this._canDraw = can;

    if (can) {
      this.glowGraphics.clear();
      this.glowGraphics.lineStyle(4, COLORS.bonus, 0.7);
      this.glowGraphics.strokeRoundedRect(
        -CARD.WIDTH / 2 - 4,
        -CARD.HEIGHT / 2 - 4,
        CARD.WIDTH + 8,
        CARD.HEIGHT + 8,
        CARD.BORDER_RADIUS + 2,
      );
      this.glowGraphics.setVisible(true);
      this.glowGraphics.setAlpha(0.6);

      this.glowTween = this.scene.tweens.add({
        targets: this.glowGraphics,
        alpha: { from: 0.4, to: 0.9 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Magical particles around the glow outline
      if (!this.particles && this.scene.textures.exists('particle-glow')) {
        const s = this.deckScale;
        const pw = CARD.WIDTH * s;
        const ph = CARD.HEIGHT * s;
        this.particles = this.scene.add.particles(this.x, this.y, 'particle-glow', {
          speed: { min: 8, max: 22 },
          scale: { start: 0.18, end: 0 },
          alpha: { start: 0.8, end: 0 },
          lifespan: { min: 500, max: 1100 },
          frequency: 60,
          tint: 0x22c55e,
          blendMode: 'ADD',
          emitZone: {
            type: 'edge',
            source: new Phaser.Geom.Rectangle(
              -pw / 2 - 4,
              -ph / 2 - 4,
              pw + 8,
              ph + 8,
            ),
            quantity: 28,
          },
        });
        this.particles.setDepth(this.depth + 1);
      }
    } else {
      if (this.glowTween) {
        this.glowTween.stop();
        this.glowTween = null;
      }
      this.glowGraphics.setVisible(false);

      if (this.particles) {
        this.particles.destroy();
        this.particles = null;
      }
    }
  }
}
