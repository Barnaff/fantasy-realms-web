import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const { width, height } = this.scale;

    // Loading bar
    const barW = Math.min(width * 0.6, 300);
    const barH = 16;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.parchment300, 1);
    bg.fillRoundedRect(barX, barY, barW, barH, 8);

    const fill = this.add.graphics();
    this.load.on('progress', (v: number) => {
      fill.clear();
      fill.fillStyle(COLORS.tag.Leader, 1);
      fill.fillRoundedRect(barX + 2, barY + 2, (barW - 4) * v, barH - 4, 6);
    });

    const loadingText = this.add.text(width / 2, barY - 30, 'Loading...', {
      fontFamily: FONTS.body,
      fontSize: '16px',
      color: '#6b5c4e',
    }).setOrigin(0.5);

    this.load.on('complete', () => {
      bg.destroy();
      fill.destroy();
      loadingText.destroy();
    });

    // Load card art
    this.load.image('art-phoenix', '/art/phoenix.webp');
    this.load.image('art-archmage', '/art/archmage.webp');
    this.load.image('art-enchanted-blade', '/art/enchanted-blade.webp');
    this.load.image('art-great-flood', '/art/great-flood.webp');
    this.load.image('art-lich-lord', '/art/lich-lord.webp');
  }

  create() {
    // Wait for fonts to be ready
    if (document.fonts) {
      document.fonts.ready.then(() => {
        this.scene.start('TitleScene');
      });
    } else {
      this.scene.start('TitleScene');
    }
  }
}
