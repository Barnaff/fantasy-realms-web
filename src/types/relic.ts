export type RelicRarity = 'common' | 'rare' | 'legendary';

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  art?: string;
  effectId: string;
  params: Record<string, unknown>;
  rarity: RelicRarity;
}

export interface RelicInstance {
  instanceId: string;
  defId: string;
}
