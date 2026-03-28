import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';

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

    new ButtonObject(this, cx, btnY, 'Leave', {
      width: btnW,
      height: 46,
      color: COLORS.parchment600,
      fontSize: '18px',
      onClick: () => {
        gm.leaveMerchant();
        this.scene.start('MapScene');
      },
    });
  }
}
