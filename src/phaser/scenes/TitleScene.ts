import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { APP_VERSION } from '../../version.ts';
import { GameManager } from '../systems/GameManager.ts';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    // Title
    const title = this.add.text(cx, height * 0.28, 'Fantasy\nRealms', {
      fontFamily: FONTS.display,
      fontSize: Math.min(width * 0.12, 72) + 'px',
      color: '#2c1810',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, title.y + title.height / 2 + 20, 'Build your hand. Master the river. Conquer the realm.', {
      fontFamily: FONTS.body,
      fontSize: '14px',
      color: '#6b5c4e',
      align: 'center',
      wordWrap: { width: width * 0.85 },
    }).setOrigin(0.5);

    // New Adventure button — using a Container for proper hit area
    const btnY = height * 0.55;
    const btnW = Math.min(width * 0.7, 320);
    const btnH = 50;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.tag.Leader, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

    const btnText = this.add.text(0, 0, 'New Adventure', {
      fontFamily: FONTS.display,
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const btnContainer = this.add.container(cx, btnY, [btnBg, btnText]);
    btnContainer.setSize(btnW, btnH);
    btnContainer.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains,
    )
    btnContainer.input!.cursor = 'pointer';

    btnContainer.on('pointerdown', () => {
      this.tweens.add({
        targets: btnContainer,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          gm.newGame();
          this.scene.start('MapScene');
        },
      });
    });

    btnContainer.on('pointerover', () => {
      this.tweens.add({ targets: btnContainer, scaleX: 1.03, scaleY: 1.03, duration: 100 });
    });
    btnContainer.on('pointerout', () => {
      this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 100 });
    });

    // Tips
    const tipsY = height * 0.72;
    const tips = [
      'Collect 7 cards with powerful synergies',
      'Navigate a branching map of encounters',
      'Discover relics and shape your deck',
    ];
    tips.forEach((tip, i) => {
      this.add.text(cx, tipsY + i * 22, tip, {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: '#9c8a5c',
        align: 'center',
      }).setOrigin(0.5);
    });

    // Version
    this.add.text(width - 12, height - 12, `v${APP_VERSION}`, {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#b8a67866',
    }).setOrigin(1, 1);

    // Entrance animations
    title.setAlpha(0).setY(title.y - 20);
    this.tweens.add({ targets: title, alpha: 1, y: title.y + 20, duration: 500, ease: 'Back.easeOut' });

    btnContainer.setAlpha(0);
    this.tweens.add({ targets: btnContainer, alpha: 1, duration: 400, delay: 300 });
  }
}
