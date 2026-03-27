import Phaser from 'phaser';
import type { CardInstance, ResolvedCard } from '../../types/card.ts';
import { resolveCard } from '../../engine/scoring.ts';
import { CardObject } from '../gameobjects/CardObject.ts';

/**
 * Static factory for creating CardObject instances.
 */
export class CardFactory {
  /** Create a CardObject from a fully resolved card. */
  static create(
    scene: Phaser.Scene,
    card: ResolvedCard,
    x: number = 0,
    y: number = 0,
    scale: number = 1,
  ): CardObject {
    return new CardObject(scene, x, y, card, scale);
  }

  /** Create a CardObject from a CardInstance, resolving it first. */
  static createFromInstance(
    scene: Phaser.Scene,
    instance: CardInstance,
    x: number = 0,
    y: number = 0,
    scale: number = 1,
  ): CardObject {
    const resolved = resolveCard(instance);
    return new CardObject(scene, x, y, resolved, scale);
  }
}
