import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';

export class MerchantScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MerchantScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    this.add.text(cx, height * 0.2, 'Merchant', {
      fontFamily: FONTS.display,
      fontSize: '28px',
      color: '#2c1810',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.35, `Gold: ${gm.state.run?.gold ?? 0}`, {
      fontFamily: FONTS.body,
      fontSize: '16px',
      color: '#6b5c4e',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.45, 'placeholder — shop coming soon', {
      fontFamily: FONTS.body,
      fontSize: '14px',
      color: '#9c8a5c',
    }).setOrigin(0.5);

    // Leave button
    const btnY = height * 0.65;
    const btnW = Math.min(width * 0.6, 240);
    const btnH = 46;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.parchment600, 1);
    btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);

    this.add.text(cx, btnY, 'Leave', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        gm.leaveMerchant();
        this.scene.start('MapScene');
      });
  }
}
