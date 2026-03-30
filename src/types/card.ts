export type Tag =
  | 'Beast'
  | 'Fire'
  | 'Weather'
  | 'Leader'
  | 'Weapon'
  | 'Land'
  | 'Wild'
  | 'Flood'
  | 'Army'
  | 'Artifact'
  | 'Wizard'
  | 'Undead';

export const TAG_COLORS: Record<Tag, string> = {
  Beast: '#4a7c59',
  Fire: '#c4433a',
  Weather: '#6b8cae',
  Leader: '#c9a227',
  Weapon: '#8b8b8b',
  Land: '#8b6d3f',
  Wild: '#7b4fa0',
  Flood: '#2d6a8f',
  Army: '#8b2500',
  Artifact: '#c49a27',
  Wizard: '#5b3fa0',
  Undead: '#6b3a6b',
};

export const ALL_TAGS: Tag[] = [
  'Beast', 'Fire', 'Weather', 'Leader', 'Weapon', 'Land',
  'Wild', 'Flood', 'Army', 'Artifact', 'Wizard', 'Undead',
];

export interface ScoringEffect {
  description: string;
  effectId: string;
  params: Record<string, unknown>;
  orGroup?: string;
}

export interface DiscardEffect {
  description: string;
  effectId: string;
  params: Record<string, unknown>;
}

export type CardRarity = 'starting' | 'common' | 'rare' | 'epic';

export const RARITY_COLORS: Record<CardRarity, string> = {
  starting: '#9ca3af', // gray
  common: '#22c55e',   // green
  rare: '#3b82f6',     // blue
  epic: '#f59e0b',     // gold
};

export const RARITY_LABELS: Record<CardRarity, string> = {
  starting: 'Starting',
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
};

export interface OnEndEffect {
  description: string;
  effectId: string;
  params: Record<string, unknown>;
}

export interface OngoingEffect {
  effectId: string;
  description: string;
  params: Record<string, unknown>;
}

export interface CardDef {
  id: string;
  name: string;
  tags: Tag[];
  baseValue: number;
  rarity: CardRarity;
  art?: string;
  flavor?: string;
  scoringEffects: ScoringEffect[];
  discardEffect: DiscardEffect | null;
  onEndEffect?: OnEndEffect | null;
  ongoingEffect?: OngoingEffect | null;
}

export interface CardModifier {
  type: 'addTag' | 'removeTag' | 'changeBaseValue' | 'addEffect';
  payload: unknown;
}

export interface CardInstance {
  instanceId: string;
  defId: string;
  modifiers: CardModifier[];
}

export interface ResolvedCard {
  instanceId: string;
  defId: string;
  name: string;
  tags: Tag[];
  baseValue: number;
  rarity: CardRarity;
  scoringEffects: ScoringEffect[];
  discardEffect: DiscardEffect | null;
  onEndEffect?: OnEndEffect | null;
  ongoingEffect?: OngoingEffect | null;
  art?: string;
  flavor?: string;
}
