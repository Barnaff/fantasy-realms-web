// Mulberry32 seeded PRNG
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Returns a float in [0, 1)
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns an integer in [min, max] inclusive
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Fisher-Yates shuffle (in-place, returns same array)
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Pick n random items from array without replacement
  pick<T>(array: T[], n: number): T[] {
    const copy = [...array];
    this.shuffle(copy);
    return copy.slice(0, Math.min(n, copy.length));
  }

  // Weighted random selection
  weightedPick<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

let idCounter = 0;

export function generateId(): string {
  return `${Date.now()}_${idCounter++}_${Math.random().toString(36).slice(2, 8)}`;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}
