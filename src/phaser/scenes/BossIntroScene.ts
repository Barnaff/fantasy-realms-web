import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';

export class BossIntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossIntroScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    const bossName = gm.state.encounter?.name ?? 'Boss';
    const stipulation = gm.state.encounter?.modifiers?.[0] ?? 'No special rules';

    this.add.text(cx, height * 0.2, bossName, {
      fontFamily: FONTS.display,
      fontSize: '32px',
      color: '#2c1810',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.38, `Stipulation: ${String(stipulation)}`, {
      fontFamily: FONTS.body,
      fontSize: '14px',
      color: '#6b5c4e',
      align: 'center',
      wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5);

    // Begin Battle button
    const btnY = height * 0.6;
    const btnW = Math.min(width * 0.6, 260);

    new ButtonObject(this, cx, btnY, 'Begin Battle', {
      width: btnW,
      height: 46,
      color: COLORS.tag.Fire,
      fontSize: '18px',
      onClick: () => {
        gm.state = { ...gm.state, phase: 'player_turn' };
        this.scene.start('EncounterScene');
      },
    });
  }
}
