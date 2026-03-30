import type { CardInstance, Tag } from './card.ts';
import type { RelicInstance } from './relic.ts';
import type { GameMap } from './map.ts';

export interface DraftOption {
  id: string;
  cardIds: string[]; // 3 card def IDs
}

export type GamePhase =
  | 'title'
  | 'draft_pick'
  | 'map'
  | 'encounter_start'
  | 'player_turn'
  | 'hand_finalization'
  | 'on_end_resolution'
  | 'scoring'
  | 'post_encounter'
  | 'merchant'
  | 'event'
  | 'rest'
  | 'boss_intro'
  | 'game_over'
  | 'victory';

export interface River {
  cards: CardInstance[];
  deck: CardInstance[];
}

export interface HandState {
  cards: CardInstance[];
  maxSize: number;
}

export interface ScoreBreakdownEntry {
  cardId: string;
  cardName: string;
  baseValue: number;
  bonuses: { source: string; description: string; value: number }[];
  penalties: { source: string; description: string; value: number; cleared?: boolean }[];
  blanked: boolean;
  finalValue: number;
}

export interface ScoreResult {
  totalScore: number;
  breakdown: ScoreBreakdownEntry[];
  relicBonuses: { relicName: string; value: number }[];
  clearedTags?: string[];
}

export interface EncounterModifier {
  tag: Tag;
  value: number; // positive = bonus, negative = penalty
}

export interface Encounter {
  id: string;
  name: string;
  scoreThreshold: number;
  riverSize: number;
  isBoss: boolean;
  bossStipulation?: BossStipulation;
  rewardTier: 'normal' | 'elite' | 'boss';
  flavor?: string;
  modifiers?: EncounterModifier[];
}

export interface BossStipulation {
  id: string;
  description: string;
  effectId: string;
  params: Record<string, unknown>;
}

export type PoolModification =
  | { type: 'add_card'; cardDefId: string }
  | { type: 'remove_card'; cardDefId: string }
  | { type: 'upgrade_card'; cardDefId: string; newBaseValue: number }
  | { type: 'transform_tag'; cardDefId: string; oldTag: Tag; newTag: Tag };

export interface CardRewardOption {
  cards: string[]; // card def IDs in this option group
  label: string;   // e.g. "Option 1 · 3 cards (1 Rare, 2 Common)"
}

export interface PostEncounterReward {
  cardChoices: CardRewardOption[]; // grouped card options to choose from
  gold: number;
  relicChoice?: string; // relic def ID (boss rewards)
}

export interface PendingChoice {
  type:
    | 'choose_from_discard'
    | 'choose_from_river'
    | 'choose_tag'
    | 'reorder_cards'
    | 'choose_card_reward'
    | 'choose_event_option'
    | 'choose_merchant_action'
    | 'on_end_pick_from_discard'
    | 'pick_from_rival_hand';
  options: unknown[];
  minSelections: number;
  maxSelections: number;
  prompt: string;
  /** Card that triggered this effect */
  sourceCardName?: string;
  sourceCardId?: string;
}

export interface RunState {
  seed: number;
  pool: CardInstance[];
  map: GameMap;
  currentNodeId: string;
  completedNodeIds: string[];
  totalScore: number;
  gold: number;
  encountersCleared: number;
  /** Tracks how many times each card was offered but not picked. cardDefId → skip count */
  skippedCardCounts: Record<string, number>;
}

export type TurnPhase = 'draw' | 'discard';

/** Max cards discarded to river before encounter auto-ends */
export const MAX_RIVER_DISCARDS = 10;

export type RivalIntent =
  | { type: 'river'; cardInstanceId: string }
  | { type: 'deck' }
  | null;

export interface GameState {
  phase: GamePhase;
  run: RunState | null;
  encounter: Encounter | null;
  river: River | null;
  hand: HandState;
  discardPile: CardInstance[];
  exhaustedCards: CardInstance[];
  turnsRemaining: number;
  turnPhase: TurnPhase;
  riverDiscardCount: number;
  relics: RelicInstance[];
  lastScoreResult: ScoreResult | null;
  pendingChoice: PendingChoice | null;
  postEncounterReward: PostEncounterReward | null;
  draftOptions: DraftOption[] | null;
  actionLog: GameEvent[];
  /** Rival card-taker: shows which card the rival intends to take after player's turn */
  rivalIntent: RivalIntent;
  /** Number of cards the rival has taken this encounter */
  rivalCardsTaken: number;
  /** Cards the rival has taken (hidden from player unless revealed by card effects) */
  rivalHand: CardInstance[];
}

export type GameEvent =
  | { type: 'draw_from_river'; cardInstanceId: string }
  | { type: 'draw_from_deck'; cardInstanceId: string }
  | { type: 'discard_to_river'; cardInstanceId: string; effectDescription: string }
  | { type: 'discard_from_hand'; cardInstanceId: string; effectDescription: string }
  | { type: 'swap_card'; fromHandId: string; toRiverId: string }
  | { type: 'encounter_started'; encounterName: string }
  | { type: 'exhaust'; cardInstanceId: string; cardName: string }
  | { type: 'scoring_complete'; totalScore: number }
  | { type: 'encounter_passed'; score: number; threshold: number }
  | { type: 'encounter_failed'; score: number; threshold: number }
  | { type: 'card_added_to_pool'; cardDefId: string }
  | { type: 'card_removed_from_pool'; cardDefId: string }
  | { type: 'relic_acquired'; relicDefId: string }
  | { type: 'gold_changed'; amount: number; reason: string }
  | { type: 'river_refilled'; count: number }
  | { type: 'rival_take'; cardInstanceId?: string; cardName?: string; fromDeck: boolean };
