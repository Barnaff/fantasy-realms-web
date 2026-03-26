import type { GameMap, MapLayer, MapNode, MapNodeType } from '../types/map.ts';
import { SeededRNG } from '../utils/random.ts';

interface MapConfig {
  layerCount: number;
  nodesPerLayer: [number, number]; // [min, max]
  act: number;
  totalActs: number;
}

const DEFAULT_CONFIG: MapConfig = {
  layerCount: 8,
  nodesPerLayer: [2, 4],
  act: 1,
  totalActs: 3,
};

function getNodeTypeWeights(layer: number, totalLayers: number): [MapNodeType, number][] {
  // Layer 0 is start (handled separately)
  // Last layer is boss
  // Pre-boss layer: merchant or rest only
  if (layer === totalLayers - 2) {
    return [
      ['merchant', 1],
      ['rest', 1],
    ];
  }

  // First real layer: encounters only
  if (layer === 1) {
    return [['encounter', 1]];
  }

  // Middle layers: mixed
  return [
    ['encounter', 50],
    ['event', 20],
    ['merchant', 15],
    ['rest', 15],
  ];
}

function pickNodeType(rng: SeededRNG, weights: [MapNodeType, number][]): MapNodeType {
  const types = weights.map(w => w[0]);
  const values = weights.map(w => w[1]);
  return rng.weightedPick(types, values);
}

export function generateMap(rng: SeededRNG, config: Partial<MapConfig> = {}): GameMap {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const layers: MapLayer[] = [];

  // Layer 0: Start node
  const startNode: MapNode = {
    id: 'start',
    type: 'start',
    layer: 0,
    column: 0,
    connections: [],
    visited: true,
  };
  layers.push({ depth: 0, nodes: [startNode] });

  // Middle layers
  for (let depth = 1; depth < cfg.layerCount - 1; depth++) {
    const nodeCount = rng.nextInt(cfg.nodesPerLayer[0], cfg.nodesPerLayer[1]);
    const weights = getNodeTypeWeights(depth, cfg.layerCount);
    const nodes: MapNode[] = [];

    for (let col = 0; col < nodeCount; col++) {
      const nodeType = pickNodeType(rng, weights);
      nodes.push({
        id: `node_${depth}_${col}`,
        type: nodeType,
        layer: depth,
        column: col,
        connections: [],
        visited: false,
      });
    }

    layers.push({ depth, nodes });
  }

  // Last layer: Boss
  const bossNode: MapNode = {
    id: `boss_${cfg.act}`,
    type: 'boss',
    layer: cfg.layerCount - 1,
    column: 0,
    connections: [],
    visited: false,
  };
  layers.push({ depth: cfg.layerCount - 1, nodes: [bossNode] });

  // Generate connections between adjacent layers
  for (let i = 0; i < layers.length - 1; i++) {
    const currentLayer = layers[i];
    const nextLayer = layers[i + 1];

    // Ensure every node in current layer connects to at least one in next
    for (const node of currentLayer.nodes) {
      const connectionCount = Math.min(
        rng.nextInt(1, 2),
        nextLayer.nodes.length,
      );
      const targets = rng.pick(nextLayer.nodes, connectionCount);
      for (const target of targets) {
        if (!node.connections.includes(target.id)) {
          node.connections.push(target.id);
        }
      }
    }

    // Ensure every node in next layer has at least one incoming connection
    for (const nextNode of nextLayer.nodes) {
      const hasIncoming = currentLayer.nodes.some(n => n.connections.includes(nextNode.id));
      if (!hasIncoming) {
        const randomSource = currentLayer.nodes[rng.nextInt(0, currentLayer.nodes.length - 1)];
        randomSource.connections.push(nextNode.id);
      }
    }
  }

  return {
    layers,
    act: cfg.act,
    totalActs: cfg.totalActs,
  };
}

export function getAvailableNodes(map: GameMap, currentNodeId: string): MapNode[] {
  // Find the current node
  for (const layer of map.layers) {
    for (const node of layer.nodes) {
      if (node.id === currentNodeId) {
        // Return the nodes this node connects to
        const connectedIds = new Set(node.connections);
        const available: MapNode[] = [];
        for (const nextLayer of map.layers) {
          for (const nextNode of nextLayer.nodes) {
            if (connectedIds.has(nextNode.id) && !nextNode.visited) {
              available.push(nextNode);
            }
          }
        }
        return available;
      }
    }
  }
  return [];
}

export function markNodeVisited(map: GameMap, nodeId: string): GameMap {
  return {
    ...map,
    layers: map.layers.map(layer => ({
      ...layer,
      nodes: layer.nodes.map(node =>
        node.id === nodeId ? { ...node, visited: true } : node
      ),
    })),
  };
}

export function findNode(map: GameMap, nodeId: string): MapNode | undefined {
  for (const layer of map.layers) {
    for (const node of layer.nodes) {
      if (node.id === nodeId) return node;
    }
  }
  return undefined;
}
