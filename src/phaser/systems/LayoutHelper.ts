import { CARD } from '../../config.ts';

export interface FanPosition {
  x: number;
  y: number;
  rotation: number;
}

export interface GridPosition {
  x: number;
  y: number;
}

/**
 * Computes card layout positions for hand fans and river grids.
 */
export class LayoutHelper {
  /**
   * Compute fan positions for N cards centered at (centerX, bottomY).
   * Cards fan out in an arc with slight rotation and vertical offset.
   */
  static fanLayout(
    count: number,
    centerX: number,
    bottomY: number,
    cardScale: number,
  ): FanPosition[] {
    if (count === 0) return [];

    const cardW = CARD.WIDTH * cardScale;
    const maxRotation = 15; // degrees
    const maxArcDrop = 20; // pixels of vertical drop at edges
    const overlap = 0.65; // overlap factor (1 = no overlap)
    const spacing = cardW * overlap;

    // Total width of fanned hand
    const totalWidth = spacing * (count - 1);
    const startX = centerX - totalWidth / 2;

    const positions: FanPosition[] = [];

    for (let i = 0; i < count; i++) {
      // t ranges from -1 (leftmost) to 1 (rightmost)
      const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;

      const x = startX + i * spacing;
      // Arc: cards at center are higher, edges drop down
      const y = bottomY + t * t * maxArcDrop;
      // Rotation: left cards tilt left, right cards tilt right
      const rotation = t * maxRotation * (Math.PI / 180);

      positions.push({ x, y, rotation });
    }

    return positions;
  }

  /**
   * Compute grid positions for cards starting at (startX, startY).
   * Cards are laid out left-to-right, top-to-bottom.
   */
  static gridLayout(
    count: number,
    startX: number,
    startY: number,
    cardScale: number,
    maxCols: number,
    gap: number = 8,
  ): GridPosition[] {
    if (count === 0) return [];

    const cardW = CARD.WIDTH * cardScale;
    const cardH = CARD.HEIGHT * cardScale;
    const positions: GridPosition[] = [];

    for (let i = 0; i < count; i++) {
      const col = i % maxCols;
      const row = Math.floor(i / maxCols);
      positions.push({
        x: startX + col * (cardW + gap) + cardW / 2,
        y: startY + row * (cardH + gap) + cardH / 2,
      });
    }

    return positions;
  }

  /**
   * Get responsive card scales based on game dimensions.
   */
  static getScales(width: number, height: number): { hand: number; river: number } {
    const isNarrow = width < 500;
    const isShort = height < 700;

    let hand = 1.2;
    let river = 1.25;

    if (isNarrow || isShort) {
      hand = 1.0;
      river = 1.05;
    }

    // Extra small screens
    if (width < 380) {
      hand = 0.85;
      river = 0.9;
    }

    return { hand, river };
  }
}
