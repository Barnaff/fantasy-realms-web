import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';

export class PostEncounterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PostEncounterScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    this.add.text(cx, height * 0.15, 'Reward', {
      fontFamily: FONTS.display,
      fontSize: '28px',
      color: '#2c1810',
    }).setOrigin(0.5);

    // Show reward card choices
    const reward = gm.state.postEncounterReward;
    const cardChoices = reward?.cardChoices ?? [];

    if (reward?.gold) {
      this.add.text(cx, height * 0.28, `+${reward.gold} Gold`, {
        fontFamily: FONTS.body,
        fontSize: '16px',
        color: '#c9a227',
      }).setOrigin(0.5);
    }

    cardChoices.forEach((defId, i) => {
      this.add.text(cx, height * 0.36 + i * 28, defId, {
        fontFamily: FONTS.body,
        fontSize: '15px',
        color: '#2c1810',
      }).setOrigin(0.5);
    });

    if (cardChoices.length === 0) {
      this.add.text(cx, height * 0.38, 'No card rewards available', {
        fontFamily: FONTS.body,
        fontSize: '14px',
        color: '#9c8a5c',
      }).setOrigin(0.5);
    }

    // Skip button
    const btnY = height * 0.75;
    const btnW = Math.min(width * 0.6, 240);
    const btnH = 46;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.parchment600, 1);
    btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);

    this.add.text(cx, btnY, 'Skip', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        gm.skipCardReward();
        this.scene.start('MapScene');
      });
  }
}
