import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { AuthManager } from '../systems/AuthManager.ts';
import { CARD_DEFS } from '../../data/cards.ts';

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

    this.add.text(width / 2, barY - 30, 'Loading...', {
      fontFamily: FONTS.body,
      fontSize: '16px',
      color: '#6b5c4e',
    }).setOrigin(0.5);

    // Load card art from local public/art/ folder
    // Files are synced from Firebase Storage via: npx tsx scripts/sync-art.ts
    for (const card of CARD_DEFS) {
      this.load.image(`art-${card.id}`, `/art/${card.id}.png`);
    }
  }

  create() {
    // Generate particle texture
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(8, 8, 8);
    gfx.generateTexture('particle-glow', 16, 16);
    gfx.destroy();

    // Log how many textures loaded
    const loaded = CARD_DEFS.filter(c => this.textures.exists(`art-${c.id}`)).length;
    console.log(`[BootScene] ${loaded}/${CARD_DEFS.length} card art textures loaded`);

    const goToTitle = () => {
      if (document.fonts) {
        document.fonts.ready.then(() => this.scene.start('TitleScene'));
      } else {
        this.scene.start('TitleScene');
      }
    };

    const auth = AuthManager.getInstance();
    auth.init().then(goToTitle).catch(() => goToTitle());
  }
}
