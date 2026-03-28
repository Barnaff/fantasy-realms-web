import Phaser from 'phaser';
import { FONTS, COLORS, DURATION } from '../../config.ts';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  fontSize?: string;
  onClick?: () => void;
  padding?: number;
}

/**
 * Reliable button for Phaser scenes.
 * Uses a Zone game object for hit detection (most reliable across all scale modes)
 * and a Container for the visual elements.
 */
export class ButtonObject extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private zone: Phaser.GameObjects.Zone;
  private btnWidth: number;
  private btnHeight: number;
  private clickCallback?: () => void;
  private isPressed = false;
  private isEnabled = true;

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
    const padding = opts?.padding ?? 14;
    this.clickCallback = opts?.onClick;

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
      resolution: 2,
    }).setOrigin(0.5);
    this.add(this.label);

    // --- Zone for input (scene-level, most reliable) ---
    const hitW = this.btnWidth + padding * 2;
    const hitH = this.btnHeight + padding * 2;
    this.zone = scene.add.zone(x, y, hitW, hitH)
      .setInteractive({ useHandCursor: true })
      .setDepth(9999);

    // --- Pointer events on zone ---
    this.zone.on('pointerover', () => {
      if (!this.isEnabled) return;
      scene.tweens.killTweensOf(this);
      scene.tweens.add({
        targets: this,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: DURATION.hoverEnlarge,
        ease: 'Back.easeOut',
      });
    });

    this.zone.on('pointerout', () => {
      this.isPressed = false;
      if (!this.isEnabled) return;
      scene.tweens.killTweensOf(this);
      scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: DURATION.hoverEnlarge,
        ease: 'Back.easeOut',
      });
    });

    this.zone.on('pointerdown', () => {
      if (!this.isEnabled) return;
      this.isPressed = true;
      scene.tweens.killTweensOf(this);
      scene.tweens.add({
        targets: this,
        scaleX: 0.93,
        scaleY: 0.93,
        duration: 50,
        ease: 'Quad.easeOut',
      });
    });

    this.zone.on('pointerup', () => {
      if (!this.isEnabled || !this.isPressed) return;
      this.isPressed = false;
      this.clickCallback?.();
      scene.tweens.killTweensOf(this);
      scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Back.easeOut',
      });
    });

    this.setSize(hitW, hitH);
    scene.add.existing(this);
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.zone.setInteractive({ useHandCursor: true });
      this.setAlpha(1);
    } else {
      this.zone.disableInteractive();
      this.setAlpha(0.5);
    }
  }

  setOnClick(callback: () => void): void {
    this.clickCallback = callback;
  }

  setVisible(value: boolean): this {
    super.setVisible(value);
    if (this.zone) {
      this.zone.setActive(value);
      if (value) {
        this.zone.setInteractive({ useHandCursor: true });
      } else {
        this.zone.disableInteractive();
      }
    }
    return this;
  }

  setDepth(value: number): this {
    super.setDepth(value);
    if (this.zone) this.zone.setDepth(value + 1);
    return this;
  }

  destroy(fromScene?: boolean): void {
    if (this.zone) {
      this.zone.destroy();
    }
    super.destroy(fromScene);
  }
}
