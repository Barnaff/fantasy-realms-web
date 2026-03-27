import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';
import { EVENT_DEFS } from '../../data/events.ts';

export class EventScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EventScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    const eventId = gm.state.pendingChoice?.options[0] as string | undefined;
    const eventDef = EVENT_DEFS.find(e => e.id === eventId);
    const eventName = eventDef?.name ?? 'Event';

    this.add.text(cx, height * 0.15, eventName, {
      fontFamily: FONTS.display,
      fontSize: '24px',
      color: '#2c1810',
      align: 'center',
      wordWrap: { width: width * 0.85 },
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.3, eventDef?.narrative ?? 'Something happens...', {
      fontFamily: FONTS.body,
      fontSize: '13px',
      color: '#6b5c4e',
      align: 'center',
      wordWrap: { width: width * 0.85 },
    }).setOrigin(0.5);

    // Choice buttons
    const choices = eventDef?.choices ?? [];
    const btnW = Math.min(width * 0.7, 280);
    const btnH = 40;
    const startY = height * 0.5;

    choices.forEach((choice, i) => {
      const btnY = startY + i * 56;

      const btnBg = this.add.graphics();
      btnBg.fillStyle(COLORS.tag.Wizard, 1);
      btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);

      this.add.text(cx, btnY, choice.label, {
        fontFamily: FONTS.display,
        fontSize: '15px',
        color: '#ffffff',
      }).setOrigin(0.5);

      this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          gm.selectEventChoice(i);
          this.scene.start('MapScene');
        });
    });

    // Fallback if no choices defined
    if (choices.length === 0) {
      const btnY = startY;

      const btnBg = this.add.graphics();
      btnBg.fillStyle(COLORS.parchment600, 1);
      btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);

      this.add.text(cx, btnY, 'Continue', {
        fontFamily: FONTS.display,
        fontSize: '15px',
        color: '#ffffff',
      }).setOrigin(0.5);

      this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          gm.selectEventChoice(0);
          this.scene.start('MapScene');
        });
    }
  }
}
