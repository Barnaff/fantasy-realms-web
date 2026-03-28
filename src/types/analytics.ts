export interface CardScoreRecord {
  cardId: string;
  baseValue: number;
  finalValue: number;
  blanked: boolean;
}

export interface LevelRecord {
  levelIndex: number;
  encounterName: string;
  targetScore: number;
  actualScore: number;
  passed: boolean;
  handCardIds: string[];
  handScore: number;
  cardScores?: CardScoreRecord[];
  modifiers?: { tag: string; value: number }[];
}

export interface RewardRecord {
  levelIndex: number;
  offeredOptions: string; // JSON-stringified string[][] (Firestore doesn't support nested arrays)
  selectedOptionIndex: number; // -1 if skipped
  selectedCardIds: string[];
  skippedCardIds: string[];
}

export interface DraftRecord {
  offeredOptions: string; // JSON-stringified string[][]
  selectedOptionIndex: number;
  selectedCardIds: string[];
  skippedCardIds: string[];
}

export interface MapNodeRecord {
  layer: number;
  selectedNodeType: string;
  availableNodeTypes: string[];
}

export interface RunRecord {
  id: string;
  odUserId: string;
  startedAt: string;
  endedAt: string;
  seed: number;
  won: boolean;
  levelsCompleted: number;
  totalScore: number;
  finalPoolSize: number;
  levels: LevelRecord[];
  rewards: RewardRecord[];
  draft?: DraftRecord;
  draftPickedCardIds: string[]; // kept for backward compat
  mapChoices: MapNodeRecord[];
}
