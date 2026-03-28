import Phaser from 'phaser';
import { COLORS, FONTS, CARD } from '../../config.ts';
import { CARD_DEF_MAP } from '../../data/cards.ts';
import { ALL_TAGS, RARITY_COLORS } from '../../types/card.ts';
import type { CardRarity, Tag } from '../../types/card.ts';
import { GameManager } from '../systems/GameManager.ts';
import { CardObject } from '../gameobjects/CardObject.ts';
import { resolveCard } from '../../engine/scoring.ts';

const RARITIES: CardRarity[] = ['starting', 'common', 'rare', 'epic'];

/**
 * Overlay scene that shows the player's full card pool with filtering.
 * Launched on top of MapScene or EncounterScene.
 */
export class PoolViewerScene extends Phaser.Scene {
  private returnScene: string = 'MapScene';
  private cardObjects: CardObject[] = [];
  private scrollY = 0;
  private maxScroll = 0;
  private contentContainer!: Phaser.GameObjects.Container;
  private filterTags = new Set<Tag>();
  private filterRarity: CardRarity | null = null;
  private searchText = '';
  private tagButtons: { tag: Tag; bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }[] = [];
  private rarityButtons: { rarity: CardRarity; bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }[] = [];
  private countLabel!: Phaser.GameObjects.Text;
  private hoverPreview: CardObject | null = null;

  constructor() {
    super({ key: 'PoolViewerScene' });
  }

  init(data: { returnScene?: string }) {
    this.returnScene = data.returnScene ?? 'MapScene';
  }

  create() {
    const { width, height } = this.scale;
    const gm = GameManager.getInstance();
    const pool = gm.state.run?.pool ?? [];

    this.scrollY = 0;
    this.cardObjects = [];
    this.filterTags.clear();
    this.filterRarity = null;
    this.searchText = '';

    // Darken background
    this.add.graphics().fillStyle(0x000000, 0.5).fillRect(0, 0, width, height);

    // Panel background
    const panelX = 16;
    const panelY = 16;
    const panelW = width - 32;
    const panelH = height - 32;
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.parchment100, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    panel.lineStyle(2, COLORS.parchment400, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

    // Title
    this.add.text(width / 2, panelY + 20, 'Your Card Pool', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#2c1810',
      resolution: 2,
    }).setOrigin(0.5);

    // Close button
    const closeBtn = this.add.text(panelX + panelW - 16, panelY + 12, '✕', {
      fontSize: '20px',
      color: '#8a7a5c',
      resolution: 2,
    }).setOrigin(1, 0);
    const closeZone = this.add.zone(closeBtn.x - 12, closeBtn.y + 10, 30, 30)
      .setInteractive({ useHandCursor: true });
    closeZone.on('pointerdown', () => this.closeViewer());

    // Filter area
    const filterY = panelY + 42;

    // Rarity buttons
    let rx = panelX + 12;
    this.add.text(rx, filterY, 'Rarity:', {
      fontFamily: FONTS.body, fontSize: '9px', color: '#8a7a5c', resolution: 2,
    });
    rx += 40;
    for (const r of RARITIES) {
      const color = parseInt(RARITY_COLORS[r].replace('#', ''), 16);
      const bg = this.add.graphics();
      const label = this.add.text(rx + 24, filterY, r.charAt(0).toUpperCase() + r.slice(1), {
        fontFamily: FONTS.body, fontSize: '9px', color: '#666', resolution: 2,
      }).setOrigin(0.5, 0);
      const bw = label.width + 12;
      bg.fillStyle(color, 0.15);
      bg.fillRoundedRect(rx + 24 - bw / 2, filterY - 1, bw, 14, 3);
      bg.lineStyle(1, color, 0.4);
      bg.strokeRoundedRect(rx + 24 - bw / 2, filterY - 1, bw, 14, 3);
      this.rarityButtons.push({ rarity: r, bg, label });

      const zone = this.add.zone(rx + 24, filterY + 6, bw + 8, 18)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.toggleRarity(r));
      rx += bw + 6;
    }

    // Tag buttons row
    const tagY = filterY + 18;
    let tx = panelX + 12;
    this.add.text(tx, tagY, 'Tags:', {
      fontFamily: FONTS.body, fontSize: '9px', color: '#8a7a5c', resolution: 2,
    });
    tx += 32;
    for (const tag of ALL_TAGS) {
      const color = COLORS.tag[tag] ?? 0x888888;
      const bg = this.add.graphics();
      const label = this.add.text(tx, tagY, tag, {
        fontFamily: FONTS.body, fontSize: '8px', color: '#666', resolution: 2,
      });
      const bw = label.width + 8;
      bg.fillStyle(color, 0.1);
      bg.fillRoundedRect(tx - 4, tagY - 1, bw, 12, 2);
      bg.lineStyle(1, color, 0.3);
      bg.strokeRoundedRect(tx - 4, tagY - 1, bw, 12, 2);
      this.tagButtons.push({ tag, bg, label });

      const zone = this.add.zone(tx + bw / 2 - 4, tagY + 5, bw + 4, 16)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.toggleTag(tag));

      tx += bw + 4;
      if (tx > panelX + panelW - 40) {
        tx = panelX + 44;
      }
    }

    // Count label
    this.countLabel = this.add.text(panelX + panelW - 16, tagY, `${pool.length} cards`, {
      fontFamily: FONTS.body, fontSize: '9px', color: '#8a7a5c', resolution: 2,
    }).setOrigin(1, 0);

    // Content area (scrollable)
    const contentY = tagY + 18;
    const contentH = panelH - (contentY - panelY) - 8;

    // Mask for scrolling
    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(panelX, contentY, panelW, contentH);
    const mask = maskGraphics.createGeometryMask();

    this.contentContainer = this.add.container(0, 0);
    this.contentContainer.setMask(mask);

    // Build cards
    this.buildCardGrid(pool, panelX + 8, contentY + 4, panelW - 16);

    // Scroll with wheel
    this.input.on('wheel', (_p: unknown, _gx: unknown, _gy: unknown, _gz: unknown, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      this.contentContainer.setY(-this.scrollY);
    });

    // Drag scroll
    let dragStartY = 0;
    let dragScrollStart = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y > contentY && p.y < contentY + contentH) {
        dragStartY = p.y;
        dragScrollStart = this.scrollY;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && dragStartY > 0) {
        const dy = dragStartY - p.y;
        this.scrollY = Phaser.Math.Clamp(dragScrollStart + dy, 0, this.maxScroll);
        this.contentContainer.setY(-this.scrollY);
      }
    });
    this.input.on('pointerup', () => { dragStartY = 0; });

    // Hover preview
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.updateHover(pointer, contentY, contentH);
    });
  }

  private buildCardGrid(pool: { instanceId: string; defId: string; modifiers: any[] }[], startX: number, startY: number, areaW: number) {
    // Clear old
    for (const c of this.cardObjects) c.destroy();
    this.cardObjects = [];
    this.contentContainer.removeAll(true);

    // Filter
    const filtered = pool.filter(inst => {
      const def = CARD_DEF_MAP.get(inst.defId);
      if (!def) return false;
      if (this.filterRarity && def.rarity !== this.filterRarity) return false;
      if (this.filterTags.size > 0 && !def.tags.some(t => this.filterTags.has(t))) return false;
      if (this.searchText) {
        const s = this.searchText.toLowerCase();
        if (!def.name.toLowerCase().includes(s) && !def.id.toLowerCase().includes(s)) return false;
      }
      return true;
    });

    // Update count
    this.countLabel?.setText(`${filtered.length} / ${pool.length} cards`);

    const cardScale = 0.65;
    const cardW = CARD.WIDTH * cardScale;
    const cardH = CARD.HEIGHT * cardScale;
    const gap = 8;
    const cols = Math.max(1, Math.floor((areaW + gap) / (cardW + gap)));
    const actualGap = (areaW - cols * cardW) / Math.max(cols - 1, 1);

    for (let i = 0; i < filtered.length; i++) {
      const inst = filtered[i];
      const resolved = resolveCard(inst);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + actualGap) + cardW / 2;
      const cy = startY + row * (cardH + gap) + cardH / 2;

      const card = new CardObject(this, cx, cy, resolved);
      card.setScale(cardScale);
      this.children.remove(card);
      this.contentContainer.add(card);
      this.cardObjects.push(card);
    }

    const rows = Math.ceil(filtered.length / cols);
    const totalH = rows * (cardH + gap);
    const { height } = this.scale;
    const visibleH = height - 32 - (startY - 16) - 8;
    this.maxScroll = Math.max(0, totalH - visibleH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    this.contentContainer.setY(-this.scrollY);
  }

  private toggleTag(tag: Tag) {
    if (this.filterTags.has(tag)) {
      this.filterTags.delete(tag);
    } else {
      this.filterTags.add(tag);
    }
    this.updateTagVisuals();
    this.rebuildGrid();
  }

  private toggleRarity(r: CardRarity) {
    this.filterRarity = this.filterRarity === r ? null : r;
    this.updateRarityVisuals();
    this.rebuildGrid();
  }

  private updateTagVisuals() {
    for (const { tag, bg, label } of this.tagButtons) {
      const active = this.filterTags.has(tag);
      const color = COLORS.tag[tag] ?? 0x888888;
      bg.clear();
      bg.fillStyle(color, active ? 0.8 : 0.1);
      const bw = label.width + 8;
      bg.fillRoundedRect(label.x - 4, label.y - 1, bw, 12, 2);
      bg.lineStyle(1, color, active ? 1 : 0.3);
      bg.strokeRoundedRect(label.x - 4, label.y - 1, bw, 12, 2);
      label.setColor(active ? '#ffffff' : '#666666');
    }
  }

  private updateRarityVisuals() {
    for (const { rarity, bg, label } of this.rarityButtons) {
      const active = this.filterRarity === rarity;
      const color = parseInt(RARITY_COLORS[rarity].replace('#', ''), 16);
      bg.clear();
      const bw = label.width + 12;
      bg.fillStyle(color, active ? 0.8 : 0.15);
      bg.fillRoundedRect(label.x - bw / 2, label.y - 1, bw, 14, 3);
      bg.lineStyle(1, color, active ? 1 : 0.4);
      bg.strokeRoundedRect(label.x - bw / 2, label.y - 1, bw, 14, 3);
      label.setColor(active ? '#ffffff' : '#666666');
    }
  }

  private rebuildGrid() {
    const gm = GameManager.getInstance();
    const pool = gm.state.run?.pool ?? [];
    const { width } = this.scale;
    const panelX = 16;
    const panelW = width - 32;
    // Approximate contentY from tag row position
    const contentY = 16 + 42 + 18 + 18 + 4;
    this.buildCardGrid(pool, panelX + 8, contentY, panelW - 16);
  }

  private updateHover(pointer: Phaser.Input.Pointer, contentY: number, contentH: number) {
    if (pointer.y < contentY || pointer.y > contentY + contentH) {
      this.clearHover();
      return;
    }

    // Find card under pointer (accounting for scroll)
    const worldY = pointer.y + this.scrollY;
    let found: CardObject | null = null;
    for (const card of this.cardObjects) {
      const cx = card.x;
      const cy = card.y;
      const hw = (CARD.WIDTH * 0.65) / 2;
      const hh = (CARD.HEIGHT * 0.65) / 2;
      if (pointer.x >= cx - hw && pointer.x <= cx + hw &&
          worldY >= cy - hh && worldY <= cy + hh) {
        found = card;
        break;
      }
    }

    if (!found) {
      this.clearHover();
      return;
    }

    const resolved = found.getCard();
    if (this.hoverPreview && this.hoverPreview.getCard()?.instanceId === resolved.instanceId) return;

    this.clearHover();

    const previewScale = 1.1;
    const previewH = CARD.HEIGHT * previewScale;
    const { width, height } = this.scale;
    let px = Phaser.Math.Clamp(pointer.x, CARD.WIDTH * previewScale / 2 + 20, width - CARD.WIDTH * previewScale / 2 - 20);
    let py = pointer.y - previewH / 2 - 12;
    if (py < 20) py = pointer.y + previewH / 2 + 12;
    py = Phaser.Math.Clamp(py, previewH / 2 + 20, height - previewH / 2 - 20);

    this.hoverPreview = new CardObject(this, px, py, resolved);
    this.hoverPreview.setScale(previewScale);
    this.hoverPreview.setDepth(200);
  }

  private clearHover() {
    if (this.hoverPreview) {
      this.hoverPreview.destroy();
      this.hoverPreview = null;
    }
  }

  private closeViewer() {
    this.clearHover();
    this.scene.stop();
    this.scene.resume(this.returnScene);
  }

  shutdown() {
    this.clearHover();
    this.input.off('wheel');
    this.input.off('pointermove');
    this.input.off('pointerdown');
    this.input.off('pointerup');
  }
}
