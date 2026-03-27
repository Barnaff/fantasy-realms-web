import Phaser from 'phaser';
import { FONTS } from '../../config.ts';
import { TAG_COLORS } from '../utils/Colors.ts';
import type { Tag } from '../../types/card.ts';

/**
 * A small colored rectangle with tag name text, used as a badge on cards.
 * Size is approximately 40x12 at scale 1.
 */
export class TagBadgeObject extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, tag: string, scale?: number) {
    super(scene, x, y);

    const badgeW = 40;
    const badgeH = 12;
    const radius = 3;
    const color = TAG_COLORS[tag as Tag] ?? 0x888888;

    // Background rounded rect
    const bg = scene.add.graphics();
    bg.fillStyle(color, 0.8);
    bg.fillRoundedRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, radius);
    this.add(bg);

    // Tag name text
    const label = scene.add.text(0, 0, tag, {
      fontFamily: FONTS.body,
      fontSize: '6px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    this.add(label);

    if (scale !== undefined) {
      this.setScale(scale);
    }

    scene.add.existing(this);
  }
}
