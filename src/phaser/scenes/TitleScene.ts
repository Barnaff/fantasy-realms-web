import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { APP_VERSION } from '../../version.ts';
import { GameManager } from '../systems/GameManager.ts';
import { AuthManager } from '../systems/AuthManager.ts';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();
    const auth = AuthManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    // ── Title ──
    const title = this.add.text(cx, height * 0.22, 'Fantasy\nRealms', {
      fontFamily: FONTS.display,
      fontSize: Math.min(width * 0.12, 72) + 'px',
      color: '#2c1810',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    this.add.text(cx, title.y + title.height / 2 + 16, 'Build your hand. Master the river. Conquer the realm.', {
      fontFamily: FONTS.body,
      fontSize: '13px',
      color: '#6b5c4e',
      align: 'center',
      wordWrap: { width: width * 0.85 },
    }).setOrigin(0.5);

    // ── Auth status row ──
    const authY = height * 0.42;
    const authLabel = this.add.text(cx - 60, authY, auth.isAnonymous ? '👤 Guest' : `👤 ${auth.displayName}`, {
      fontFamily: FONTS.body,
      fontSize: '12px',
      color: '#6b5c4e',
    }).setOrigin(0, 0.5);

    // Google sign-in button
    if (auth.isAnonymous) {
      const signInBtn = this.createSmallButton(cx + 60, authY, 'Sign in with Google', COLORS.parchment300, () => {
        auth.signInGoogle().then((user) => {
          if (user) {
            authLabel.setText(`👤 ${auth.displayName}`);
            signInBtn.setVisible(false);
          }
        });
      });
    }

    // ── Buttons ──
    let btnY = height * 0.53;

    // Continue button (if saved state exists)
    if (auth.savedState?.run) {
      const restoreScene = auth.getRestoreScene();
      if (restoreScene) {
        this.createButton(cx, btnY, 'Continue Run', COLORS.tag.Beast, () => {
          gm.restoreState(auth.savedState!);
          this.scene.start(restoreScene);
        });
        btnY += 60;
      }
    }

    // New Adventure button
    this.createButton(cx, btnY, 'New Adventure', COLORS.tag.Leader, () => {
      auth.clearSave(); // clear old save
      gm.newGame();
      this.scene.start('MapScene');
    });

    // ── Tips ──
    const tipsY = Math.max(btnY + 80, height * 0.72);
    const tips = [
      'Collect 7 cards with powerful synergies',
      'Navigate a branching map of encounters',
      'Discover relics and shape your deck',
    ];
    tips.forEach((tip, i) => {
      this.add.text(cx, tipsY + i * 22, tip, {
        fontFamily: FONTS.body,
        fontSize: '12px',
        color: '#9c8a5c',
        align: 'center',
      }).setOrigin(0.5);
    });

    // ── Version ──
    this.add.text(width - 12, height - 12, `v${APP_VERSION}`, {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#b8a67866',
    }).setOrigin(1, 1);

    // ── Entrance animations ──
    title.setAlpha(0).setY(title.y - 20);
    this.tweens.add({ targets: title, alpha: 1, y: title.y + 20, duration: 500, ease: 'Back.easeOut' });
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const btnW = Math.min(this.scale.width * 0.7, 320);
    const btnH = 48;

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

    const text = this.add.text(0, 0, label, {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const container = this.add.container(x, y, [bg, text]);
    container.setSize(btnW, btnH);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains,
    );
    container.input!.cursor = 'pointer';

    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95, scaleY: 0.95,
        duration: 80, yoyo: true,
        onComplete: onClick,
      });
    });
    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 100 });
    });
    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });

    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 400, delay: 300 });

    return container;
  }

  private createSmallButton(x: number, y: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const btnW = 140;
    const btnH = 28;

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    bg.lineStyle(1, 0x6b5c4e, 0.5);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);

    const text = this.add.text(0, 0, label, {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#2c1810',
    }).setOrigin(0.5);

    const container = this.add.container(x, y, [bg, text]);
    container.setSize(btnW, btnH);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains,
    );
    container.input!.cursor = 'pointer';

    container.on('pointerdown', onClick);
    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 80 });
    });
    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 });
    });

    return container;
  }
}
