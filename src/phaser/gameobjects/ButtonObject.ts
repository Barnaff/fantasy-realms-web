import Phaser from 'phaser';
import { FONTS, COLORS, DURATION } from '../../config.ts';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  fontSize?: string;
  onClick?: () => void;
}

/**
 * Reusable button with rounded rect background and text label.
 * Has hover and tap scale effects.
 */
export class ButtonObject extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hitZone: Phaser.GameObjects.Zone;
  private btnWidth: number;
  private btnHeight: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    opts?: ButtonOptions,
  ) {
    super(scene, x, y);

    this.btnWidth = opts?.width ?? 160;
    this.btnHeight = opts?.height ?? 44;
    const color = opts?.color ?? COLORS.tag.Leader;
    const fontSize = opts?.fontSize ?? '16px';
    const radius = 10;

    // --- Background ---
    this.bg = scene.add.graphics();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(
      -this.btnWidth / 2,
      -this.btnHeight / 2,
      this.btnWidth,
      this.btnHeight,
      radius,
    );
    this.add(this.bg);

    // --- Label ---
    this.label = scene.add.text(0, 0, text, {
      fontFamily: FONTS.display,
      fontSize,
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    this.add(this.label);

    // --- Hit zone for interactions ---
    this.hitZone = scene.add.zone(0, 0, this.btnWidth, this.btnHeight);
    this.hitZone.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(
        -this.btnWidth / 2,
        -this.btnHeight / 2,
        this.btnWidth,
        this.btnHeight,
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.add(this.hitZone);

    // --- Hover effect ---
    this.hitZone.on('pointerover', () => {
      scene.tweens.add({
        targets: this,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: DURATION.hoverEnlarge,
        ease: 'Back.easeOut',
      });
    });

    this.hitZone.on('pointerout', () => {
      scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: DURATION.hoverEnlarge,
        ease: 'Back.easeOut',
      });
    });

    // --- Tap effect + callback ---
    this.hitZone.on('pointerdown', () => {
      scene.tweens.add({
        targets: this,
        scaleX: 0.93,
        scaleY: 0.93,
        duration: 60,
        yoyo: true,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          opts?.onClick?.();
        },
      });
    });

    scene.add.existing(this);
  }

  /** Update the button label text. */
  setText(text: string): void {
    this.label.setText(text);
  }

  /** Enable or disable the button interaction. */
  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.hitZone.setInteractive({ useHandCursor: true });
      this.setAlpha(1);
    } else {
      this.hitZone.disableInteractive();
      this.setAlpha(0.5);
    }
  }
}
