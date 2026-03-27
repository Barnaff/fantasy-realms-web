import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    const run = gm.state.run;
    const lastScore = gm.state.lastScoreResult?.totalScore ?? 0;
    const threshold = gm.state.encounter?.scoreThreshold ?? 0;
    const passed = lastScore >= threshold;

    // Determine victory: passed the last encounter and no more encounters
    const isVictory = passed && (run?.encountersCleared ?? 0) > 0;
    const title = isVictory ? 'Victory' : 'Game Over';
    const titleColor = isVictory ? '#22c55e' : '#c4433a';

    this.add.text(cx, height * 0.18, title, {
      fontFamily: FONTS.display,
      fontSize: '36px',
      color: titleColor,
    }).setOrigin(0.5);

    // Stats
    const stats = [
      `Total Score: ${run?.totalScore ?? 0}`,
      `Encounters Cleared: ${run?.encountersCleared ?? 0}`,
      `Gold Earned: ${run?.gold ?? 0}`,
      `Pool Size: ${run?.pool.length ?? 0}`,
    ];

    stats.forEach((line, i) => {
      this.add.text(cx, height * 0.35 + i * 26, line, {
        fontFamily: FONTS.body,
        fontSize: '15px',
        color: '#6b5c4e',
      }).setOrigin(0.5);
    });

    // Play Again button
    const btnY = height * 0.7;
    const btnW = Math.min(width * 0.6, 260);
    const btnH = 46;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.tag.Leader, 1);
    btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);

    this.add.text(cx, btnY, 'Play Again', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        gm.resetToTitle();
        this.scene.start('TitleScene');
      });
  }
}
