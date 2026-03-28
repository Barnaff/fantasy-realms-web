export interface LevelRecord {
  levelIndex: number;
  encounterName: string;
  targetScore: number;
  actualScore: number;
  passed: boolean;
  handCardIds: string[];  // the 7 cards in hand at end
  handScore: number;
  modifiers?: { tag: string; value: number }[];
}

export interface RewardRecord {
  levelIndex: number;
  offeredOptions: string[][];  // each option is array of card IDs
  selectedOptionIndex: number; // -1 if skipped
  selectedCardIds: string[];
}

export interface RunRecord {
  id: string;
  odUserId: string;
  startedAt: string;  // ISO
  endedAt: string;
  seed: number;
  won: boolean;
  levelsCompleted: number;
  totalScore: number;
  finalPoolSize: number;
  levels: LevelRecord[];
  rewards: RewardRecord[];
  draftPickedCardIds: string[];
}
