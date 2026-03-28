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
 *
 * Uses a transparent Rectangle as the interactive target (not the Container itself).
 * This is far more reliable than Container.setInteractive() which has known issues
 * with hit areas when containers are nested, scaled, or when scene-level input exists.
 *
 * Fires onClick on pointerup (not pointerdown) to avoid conflicts with scene-level
 * pointerdown handlers that may stopPropagation or consume the event.
 */
export class ButtonObject extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hitRect: Phaser.GameObjects.Rectangle;
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

    // --- Transparent hit rectangle (much more reliable than Container.setInteractive) ---
    const hitW = this.btnWidth + padding * 2;
    const hitH = this.btnHeight + padding * 2;
    this.hitRect = scene.add.rectangle(0, 0, hitW, hitH, 0x000000, 0);
    this.hitRect.setInteractive({ useHandCursor: true });
    this.add(this.hitRect);

    // --- Pointer events on the hit rectangle ---
    this.hitRect.on('pointerover', () => {
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

    this.hitRect.on('pointerout', () => {
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

    this.hitRect.on('pointerdown', () => {
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

    this.hitRect.on('pointerup', () => {
      if (!this.isEnabled || !this.isPressed) return;
      this.isPressed = false;

      // Fire callback
      this.clickCallback?.();

      // Bounce back
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
      this.hitRect.setInteractive({ useHandCursor: true });
      this.setAlpha(1);
    } else {
      this.hitRect.disableInteractive();
      this.setAlpha(0.5);
    }
  }

  setOnClick(callback: () => void): void {
    this.clickCallback = callback;
  }
}
