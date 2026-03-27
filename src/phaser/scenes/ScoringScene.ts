import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';

export class ScoringScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ScoringScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    const score = gm.state.lastScoreResult?.totalScore ?? 0;
    const threshold = gm.state.encounter?.scoreThreshold ?? 0;
    const passed = score >= threshold;

    this.add.text(cx, height * 0.18, 'Score', {
      fontFamily: FONTS.display,
      fontSize: '28px',
      color: '#2c1810',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.32, `${score}`, {
      fontFamily: FONTS.display,
      fontSize: '48px',
      color: passed ? '#22c55e' : '#c4433a',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.44, `Threshold: ${threshold}`, {
      fontFamily: FONTS.body,
      fontSize: '16px',
      color: '#6b5c4e',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.52, passed ? 'PASSED' : 'FAILED', {
      fontFamily: FONTS.display,
      fontSize: '22px',
      color: passed ? '#22c55e' : '#c4433a',
    }).setOrigin(0.5);

    // Continue button
    const btnY = height * 0.7;
    const btnW = Math.min(width * 0.6, 240);
    const btnH = 46;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(passed ? COLORS.tag.Beast : COLORS.tag.Fire, 1);
    btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);

    this.add.text(cx, btnY, 'Continue', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        gm.acknowledgeScore();
        const phase = gm.state.phase;
        if (phase === 'post_encounter') {
          this.scene.start('PostEncounterScene');
        } else if (phase === 'game_over') {
          this.scene.start('GameOverScene');
        } else {
          // Victory or unexpected — treat as game over with win
          this.scene.start('GameOverScene');
        }
      });
  }
}
