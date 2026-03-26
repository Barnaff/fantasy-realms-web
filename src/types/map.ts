export type MapNodeType =
  | 'encounter'
  | 'boss'
  | 'merchant'
  | 'event'
  | 'rest'
  | 'start';

export interface MapNode {
  id: string;
  type: MapNodeType;
  layer: number;
  column: number;
  connections: string[]; // IDs of nodes this connects to
  visited: boolean;
  encounterData?: EncounterNodeData;
  bossData?: BossNodeData;
  eventData?: string; // event ID
  merchantData?: MerchantNodeData;
}

export interface EncounterNodeData {
  encounterId: string;
  name: string;
  scoreThreshold: number;
  riverSize: number;
}

export interface BossNodeData {
  encounterId: string;
  name: string;
  scoreThreshold: number;
  riverSize: number;
  stipulationId: string;
  stipulationDescription: string;
}

export interface MerchantNodeData {
  cardStock: string[]; // card def IDs
  relicStock: string[]; // relic def IDs
  removalCost: number;
}

export interface MapLayer {
  depth: number;
  nodes: MapNode[];
}

export interface GameMap {
  layers: MapLayer[];
  act: number;
  totalActs: number;
}
