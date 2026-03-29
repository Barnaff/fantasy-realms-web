import Phaser from 'phaser';
import { COLORS, FONTS, CARD } from '../../config.ts';
import { LayoutHelper } from '../systems/LayoutHelper.ts';
import { GameManager } from '../systems/GameManager.ts';
import { CardFactory } from '../systems/CardFactory.ts';
import { resolveCard } from '../../engine/scoring.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';

export class ScoringScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ScoringScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    const result = gm.state.lastScoreResult;
    const score = result?.totalScore ?? 0;
    const threshold = gm.state.encounter?.scoreThreshold ?? 0;
    const passed = score >= threshold;
    const breakdown = result?.breakdown ?? [];
    const handCards = gm.state.hand.cards;

    // ── Fixed header ──
    const headerBg = this.add.graphics().setDepth(9);
    headerBg.fillStyle(COLORS.parchment100, 1);
    headerBg.fillRect(0, 0, width, 52);

    this.add.text(14, 10, passed ? 'Victory!' : 'Defeated', {
      fontFamily: FONTS.display,
      fontSize: '20px',
      color: passed ? '#1a8a3e' : '#a82020',
      resolution: 2,
    }).setDepth(10);

    this.add.text(width - 14, 8, `${score}`, {
      fontFamily: FONTS.display,
      fontSize: '28px',
      color: passed ? '#1a8a3e' : '#a82020',
      resolution: 2,
    }).setOrigin(1, 0).setDepth(10);

    this.add.text(width - 14, 38, `target ${threshold}`, {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#5a4a3a',
      resolution: 2,
    }).setOrigin(1, 0).setDepth(10);

    const divider = this.add.graphics().setDepth(10);
    divider.lineStyle(1, COLORS.parchment400, 0.5);
    divider.lineBetween(10, 50, width - 10, 50);

    // ── Scrollable content ──
    const scrollY = 54;
    const scrollH = height - scrollY - 58;
    const content = this.add.container(0, scrollY);
    let curY = 8;

    // ── Card columns: each card with its breakdown below ──
    const cardCount = handCards.length;
    const gap = 8;
    // Calculate card scale to fit ~3.5 cards visible, allowing horizontal scroll
    const bounds = LayoutHelper.getLayoutBounds(width, height);
    const cardScale = Math.min(0.85, (bounds.layoutW - 20) / (3.2 * CARD.WIDTH));
    const cardW = CARD.WIDTH * cardScale;
    const cardH = CARD.HEIGHT * cardScale;
    const colW = cardW + gap;
    const totalW = cardCount * colW - gap;
    const startX = Math.max(cx - totalW / 2, gap) + cardW / 2;

    for (let i = 0; i < cardCount; i++) {
      const resolved = resolveCard(handCards[i]);
      const entry = breakdown[i];
      const colX = startX + i * colW;
      let colY = curY;

      // Card
      const card = CardFactory.create(this, resolved, colX, colY + cardH / 2, cardScale);
      this.children.remove(card);
      content.add(card);
      if (entry?.blanked) card.setBlanked(true);

      colY += cardH + 6;

      // Score value under card
      if (entry) {
        const fColor = entry.blanked ? '#999' : (entry.finalValue < entry.baseValue ? '#a82020' : '#1a8a3e');
        const scoreVal = this.add.text(colX, colY, `${entry.finalValue}`, {
          fontFamily: FONTS.display,
          fontSize: '14px',
          color: fColor,
          fontStyle: 'bold',
          resolution: 2,
        }).setOrigin(0.5, 0);
        content.add(scoreVal);
        colY += 18;

        // Compact breakdown lines
        // const lineW = cardW - 4;

        // Base
        const baseT = this.add.text(colX, colY, `Base: ${entry.baseValue}`, {
          fontFamily: FONTS.body, fontSize: '7px', color: '#5a4a3a', resolution: 2,
        }).setOrigin(0.5, 0);
        content.add(baseT);
        colY += 11;

        // Bonuses
        for (const b of entry.bonuses) {
          const desc = b.description.length > 28 ? b.description.slice(0, 27) + '…' : b.description;
          const t = this.add.text(colX, colY, `+${b.value} ${desc}`, {
            fontFamily: FONTS.body, fontSize: '7px', color: '#157a30',
            wordWrap: { width: cardW + 10 }, resolution: 2,
          }).setOrigin(0.5, 0);
          content.add(t);
          colY += t.height + 1;
        }

        // Penalties
        for (const p of entry.penalties) {
          const desc = p.description.length > 28 ? p.description.slice(0, 27) + '…' : p.description;
          const t = this.add.text(colX, colY, `${p.value} ${desc}`, {
            fontFamily: FONTS.body, fontSize: '7px', color: '#a82020',
            wordWrap: { width: cardW + 10 }, resolution: 2,
          }).setOrigin(0.5, 0);
          content.add(t);
          colY += t.height + 1;
        }

        // Blanked
        if (entry.blanked) {
          const bl = this.add.text(colX, colY, '✕ BLANKED', {
            fontFamily: FONTS.display, fontSize: '8px', color: '#a82020',
            fontStyle: 'bold', resolution: 2,
          }).setOrigin(0.5, 0);
          content.add(bl);
          colY += 13;
        }
      }
    }

    // Content height = cards + breakdown
    // const maxColH = curY + cardH + 120;

    // ── Relic bonuses ──
    let bottomY = curY + cardH + 80;
    if (result && result.relicBonuses.length > 0) {
      for (const rb of result.relicBonuses) {
        const t = this.add.text(14, bottomY, `⚜ ${rb.relicName}: +${rb.value}`, {
          fontFamily: FONTS.body, fontSize: '10px', color: '#157a30', fontStyle: 'bold', resolution: 2,
        });
        content.add(t);
        bottomY += 16;
      }
    }

    // ── Total — large and centered ──
    bottomY += 8;
    const totalBg = this.add.graphics();
    totalBg.fillStyle(passed ? 0x1a8a3e : 0xa82020, 0.08);
    totalBg.fillRoundedRect(cx - 100, bottomY, 200, 50, 10);
    content.add(totalBg);

    const totalLbl = this.add.text(cx, bottomY + 6, 'TOTAL SCORE', {
      fontFamily: FONTS.display, fontSize: '10px', color: '#5a4a3a', resolution: 2,
    }).setOrigin(0.5, 0);
    content.add(totalLbl);

    const totalVal = this.add.text(cx, bottomY + 20, `${score}`, {
      fontFamily: FONTS.display, fontSize: '24px', color: passed ? '#1a8a3e' : '#a82020', fontStyle: 'bold', resolution: 2,
    }).setOrigin(0.5, 0);
    content.add(totalVal);

    const targetLbl = this.add.text(cx, bottomY + 46, `target: ${threshold}`, {
      fontFamily: FONTS.body, fontSize: '9px', color: '#6b5c4e', resolution: 2,
    }).setOrigin(0.5, 0);
    content.add(targetLbl);
    bottomY += 64;

    // ── Horizontal scroll for cards, vertical scroll for overflow ──
    const contentTotalH = bottomY;
    const contentTotalW = totalW + gap * 2;

    // Mask
    const maskGfx = this.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(0, scrollY, width, scrollH);
    content.setMask(maskGfx.createGeometryMask());

    // Scroll handling — horizontal drag for cards, vertical for overflow
    let dragging = false;
    let dragSX = 0, dragSY = 0;
    let contentSX = 0, contentSY = 0;

    const minX = Math.min(0, -(contentTotalW - width + 20));
    const maxX = 0;
    const minY = Math.min(scrollY, scrollY - (contentTotalH - scrollH));
    const maxY = scrollY;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y >= scrollY && p.y <= scrollY + scrollH) {
        dragging = true;
        dragSX = p.x; dragSY = p.y;
        contentSX = content.x; contentSY = content.y;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging) return;
      const dx = p.x - dragSX;
      const dy = p.y - dragSY;
      // Determine scroll direction by which axis moved more
      if (Math.abs(dx) > Math.abs(dy)) {
        content.x = Phaser.Math.Clamp(contentSX + dx, minX, maxX);
      } else {
        content.y = Phaser.Math.Clamp(contentSY + dy, minY, maxY);
      }
    });
    this.input.on('pointerup', () => { dragging = false; });
    this.input.on('wheel', (_p: unknown, _g: unknown[], dx: number, dy: number) => {
      if (Math.abs(dx) > Math.abs(dy)) {
        content.x = Phaser.Math.Clamp(content.x - dx * 0.5, minX, maxX);
      } else {
        content.y = Phaser.Math.Clamp(content.y - dy * 0.5, minY, maxY);
      }
    });

    // ── Continue button ──
    const btnY = height - 30;
    const btnW = Math.min(width * 0.55, 220);

    const continueBtn = new ButtonObject(this, cx, btnY, 'Continue', {
      width: btnW,
      height: 40,
      color: passed ? 0x1a8a3e : 0xa82020,
      fontSize: '15px',
      onClick: () => {
        gm.acknowledgeScore();
        const phase = gm.state.phase;
        if (phase === 'post_encounter') this.scene.start('PostEncounterScene');
        else this.scene.start('GameOverScene');
      },
    });
    continueBtn.setDepth(10);
  }
}
