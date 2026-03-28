import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';
import { AuthManager } from '../systems/AuthManager.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();
    const auth = AuthManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    const run = gm.state.run;
    const lastScore = gm.state.lastScoreResult?.totalScore ?? 0;
    const threshold = gm.state.encounter?.scoreThreshold ?? 0;
    const passed = lastScore >= threshold;

    // Record stats and clear save
    auth.recordRunEnd({
      encountersCleared: run?.encountersCleared ?? 0,
      bestScoreThisRun: run?.totalScore ?? 0,
      goldEarned: run?.gold ?? 0,
      won: passed,
    });
    auth.clearSave();

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

    new ButtonObject(this, cx, btnY, 'Play Again', {
      width: btnW,
      height: 46,
      color: COLORS.tag.Leader,
      fontSize: '18px',
      onClick: () => {
        gm.resetToTitle();
        this.scene.start('TitleScene');
      },
    });
  }
}
