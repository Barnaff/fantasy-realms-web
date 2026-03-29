import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { APP_VERSION } from '../../version.ts';
import { GameManager } from '../systems/GameManager.ts';
import { AuthManager } from '../systems/AuthManager.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';
import changelogRaw from '../../../CHANGELOG.md?raw';

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
      resolution: 2,
    }).setOrigin(0.5);

    this.add.text(cx, title.y + title.height / 2 + 16, 'Build your hand. Master the river. Conquer the realm.', {
      fontFamily: FONTS.body,
      fontSize: '13px',
      color: '#6b5c4e',
      align: 'center',
      wordWrap: { width: width * 0.85 },
      resolution: 2,
    }).setOrigin(0.5);

    // ── Auth status row ──
    const authY = height * 0.42;
    const authLabel = this.add.text(cx - 60, authY, auth.isAnonymous ? '👤 Guest' : `👤 ${auth.displayName}`, {
      fontFamily: FONTS.body,
      fontSize: '12px',
      color: '#6b5c4e',
      resolution: 2,
    }).setOrigin(0, 0.5);

    if (auth.isAnonymous) {
      const signInBtn = new ButtonObject(this, cx + 70, authY, 'G Sign in', {
        width: 100,
        height: 28,
        color: COLORS.parchment300,
        fontSize: '10px',
        onClick: () => {
          auth.signInGoogle().then((user) => {
            if (user) {
              authLabel.setText(`👤 ${auth.displayName}`);
              signInBtn.setVisible(false);
            }
          });
        },
      });
    }

    // ── Buttons ──
    let btnY = height * 0.53;
    const btnW = Math.min(width * 0.7, 320);

    // Continue button (if saved state exists)
    if (auth.savedState?.run) {
      const restoreScene = auth.getRestoreScene();
      if (restoreScene) {
        new ButtonObject(this, cx, btnY, 'Continue Run', {
          width: btnW,
          height: 48,
          color: COLORS.tag.Beast,
          fontSize: '18px',
          onClick: () => {
            gm.restoreState(auth.savedState!);
            this.scene.start(restoreScene);
          },
        });
        btnY += 60;
      }
    }

    // New Adventure button
    new ButtonObject(this, cx, btnY, 'New Adventure', {
      width: btnW,
      height: 48,
      color: COLORS.tag.Leader,
      fontSize: '18px',
      onClick: () => {
        try {
          auth.clearSave();
          gm.newGame();
          this.scene.start('DraftScene');
        } catch (e) {
          console.error('NEW GAME ERROR:', e);
        }
      },
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
        resolution: 2,
      }).setOrigin(0.5);
    });

    // ── Version tag (clickable → opens changelog) ──
    const versionText = this.add.text(cx, height - 18, `v${APP_VERSION}  ·  Changelog`, {
      fontFamily: FONTS.body,
      fontSize: '12px',
      color: '#8a7a5a',
      resolution: 2,
    }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });

    versionText.on('pointerover', () => versionText.setColor('#5a4c3e'));
    versionText.on('pointerout', () => versionText.setColor('#8a7a5a'));
    versionText.on('pointerup', () => this.showChangelog());

    // ── Entrance animations ──
    title.setAlpha(0).setY(title.y - 20);
    this.tweens.add({ targets: title, alpha: 1, y: title.y + 20, duration: 500, ease: 'Back.easeOut' });
  }

  private showChangelog(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Parse changelog markdown
    const sections = changelogRaw
      .split(/^## /m)
      .slice(1)
      .map(section => {
        const [header, ...body] = section.split('\n');
        return { header: header.trim(), body: body.join('\n').trim() };
      });

    // ── Overlay container ──
    const overlay = this.add.container(0, 0).setDepth(500);

    // Backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.5);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    // Close only on tap (not drag) — track distance moved
    let backdropDownX = 0, backdropDownY = 0;
    backdrop.on('pointerdown', (p: Phaser.Input.Pointer) => {
      backdropDownX = p.x; backdropDownY = p.y;
    });
    backdrop.on('pointerup', (p: Phaser.Input.Pointer) => {
      const dist = Math.abs(p.x - backdropDownX) + Math.abs(p.y - backdropDownY);
      if (dist < 10) overlay.destroy();
    });
    overlay.add(backdrop);

    // Panel
    const panelW = Math.min(width - 32, 380);
    const panelH = Math.min(height - 60, 520);
    const panelX = cx - panelW / 2;
    const panelY = (height - panelH) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(COLORS.parchment50, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 14);
    panel.lineStyle(1.5, COLORS.parchment400, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 14);
    overlay.add(panel);

    // Header
    const headerText = this.add.text(panelX + 16, panelY + 14, 'Changelog', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#2c1810',
      resolution: 2,
    });
    overlay.add(headerText);

    // Close button
    const closeBtn = this.add.text(panelX + panelW - 16, panelY + 14, '✕', {
      fontSize: '18px',
      color: '#9c8a5c',
      resolution: 2,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => overlay.destroy());
    overlay.add(closeBtn);

    // Scrollable content area
    const contentX = panelX + 16;
    const contentW = panelW - 32;
    let cy = panelY + 48;
    // const maxY = panelY + panelH - 16;

    // Mask for scrolling
    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(panelX, panelY + 42, panelW, panelH - 56);
    const mask = maskShape.createGeometryMask();

    const scrollContainer = this.add.container(0, 0);
    scrollContainer.setMask(mask);
    overlay.add(scrollContainer);

    for (const section of sections) {
      // Version header
      const vHeader = this.add.text(contentX, cy, section.header, {
        fontFamily: FONTS.display,
        fontSize: '13px',
        color: '#2c1810',
        resolution: 2,
      });
      scrollContainer.add(vHeader);
      cy += 22;

      // Body lines
      const lines = section.body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { cy += 4; continue; }

        let text: string;
        let color: string;
        let bold = false;

        if (trimmed.startsWith('### ')) {
          text = trimmed.replace('### ', '');
          color = '#2c1810';
          bold = true;
        } else if (trimmed.startsWith('- ')) {
          text = '• ' + trimmed.replace('- ', '');
          color = '#4a3c2e';
        } else {
          text = trimmed;
          color = '#4a3c2e';
        }

        const lineText = this.add.text(contentX + (bold ? 0 : 8), cy, text, {
          fontFamily: FONTS.body,
          fontSize: bold ? '11px' : '10px',
          color,
          fontStyle: bold ? 'bold' : 'normal',
          wordWrap: { width: contentW - 16 },
          resolution: 2,
        });
        scrollContainer.add(lineText);
        cy += lineText.height + 2;
      }
      cy += 12;
    }

    // Enable scroll via drag + wheel
    const totalContentH = cy - (panelY + 48);
    const visibleH = panelH - 56;
    let scrollY = 0;
    let lastPointerY = 0;
    let isDraggingScroll = false;

    const applyScroll = (delta: number) => {
      const maxScroll = Math.max(0, totalContentH - visibleH);
      scrollY = Phaser.Math.Clamp(scrollY + delta, -maxScroll, 0);
      scrollContainer.setY(scrollY);
    };

    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (!overlay.active) return;
      // Only start scroll drag if pointer is inside the panel
      if (pointer.x >= panelX && pointer.x <= panelX + panelW &&
          pointer.y >= panelY + 42 && pointer.y <= panelY + panelH) {
        isDraggingScroll = true;
        lastPointerY = pointer.y;
      }
    };

    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (!isDraggingScroll || !pointer.isDown || !overlay.active) return;
      const dy = pointer.y - lastPointerY;
      lastPointerY = pointer.y;
      applyScroll(dy);
    };

    const onPointerUp = () => {
      isDraggingScroll = false;
    };

    const onWheel = (_p: unknown, _gos: unknown, _dx: number, dy: number) => {
      if (!overlay.active) return;
      applyScroll(-dy * 0.5);
    };

    this.input.on('pointerdown', onPointerDown);
    this.input.on('pointermove', onPointerMove);
    this.input.on('pointerup', onPointerUp);
    this.input.on('wheel', onWheel);

    // Clean up listeners when overlay is destroyed
    overlay.on('destroy', () => {
      this.input.off('pointerdown', onPointerDown);
      this.input.off('pointermove', onPointerMove);
      this.input.off('pointerup', onPointerUp);
      this.input.off('wheel', onWheel);
      maskShape.destroy();
    });
  }
}
