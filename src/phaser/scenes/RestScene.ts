import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';

export class RestScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RestScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    this.add.text(cx, height * 0.25, 'Rest', {
      fontFamily: FONTS.display,
      fontSize: '28px',
      color: '#2c1810',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.4, 'You take a moment to rest and gather your strength.', {
      fontFamily: FONTS.body,
      fontSize: '14px',
      color: '#6b5c4e',
      align: 'center',
      wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5);

    // Continue button
    const btnY = height * 0.6;
    const btnW = Math.min(width * 0.6, 240);
    const btnH = 46;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.tag.Beast, 1);
    btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);

    this.add.text(cx, btnY, 'Continue', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        gm.leaveRest();
        this.scene.start('MapScene');
      });
  }
}
