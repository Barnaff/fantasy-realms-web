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
  // Pre-boss layer: merchant only
  if (layer === totalLayers - 2) {
    return [
      ['merchant', 1],
    ];
  }

  // First real layer: encounters only
  if (layer === 1) {
    return [['encounter', 1]];
  }

  // Middle layers: mixed (no rest)
  return [
    ['encounter', 55],
    ['event', 25],
    ['merchant', 20],
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

  // Generate non-crossing connections between adjacent layers
  for (let i = 0; i < layers.length - 1; i++) {
    const curNodes = layers[i].nodes;   // sorted by column (they already are)
    const nxtNodes = layers[i + 1].nodes;
    const curLen = curNodes.length;
    const nxtLen = nxtNodes.length;

    // Track which next-layer nodes have incoming edges
    const hasIncoming = new Array(nxtLen).fill(false);

    // For each current node, compute a "natural" target range in the next layer
    // that preserves left-to-right ordering (no crossings).
    // Map each current node's column position proportionally to next layer indices.
    for (let ci = 0; ci < curLen; ci++) {
      // Proportional position in next layer
      const ratio = curLen === 1 ? 0.5 : ci / (curLen - 1);
      const center = ratio * (nxtLen - 1);

      // Primary target: closest node to our proportional position
      const primary = Math.round(center);
      curNodes[ci].connections.push(nxtNodes[primary].id);
      hasIncoming[primary] = true;

      // Sometimes add one adjacent neighbor (left or right, but never crossing)
      if (nxtLen > 1 && rng.next() < 0.4) {
        // Pick an adjacent target that won't cross other edges
        const candidates: number[] = [];
        if (primary > 0) candidates.push(primary - 1);
        if (primary < nxtLen - 1) candidates.push(primary + 1);

        // Filter to avoid crossings: the secondary target column must not
        // be less than the primary target of our left neighbor, or greater
        // than the primary target of our right neighbor
        const validCandidates = candidates.filter(t => {
          // Check no crossing with left neighbor
          if (ci > 0) {
            const leftConns = curNodes[ci - 1].connections;
            for (const connId of leftConns) {
              const connIdx = nxtNodes.findIndex(n => n.id === connId);
              if (connIdx > t) return false; // would cross
            }
          }
          // Check no crossing with right neighbor (if already connected)
          if (ci < curLen - 1) {
            const rightConns = curNodes[ci + 1].connections;
            for (const connId of rightConns) {
              const connIdx = nxtNodes.findIndex(n => n.id === connId);
              if (connIdx < t) return false; // would cross
            }
          }
          return true;
        });

        if (validCandidates.length > 0) {
          const secondary = validCandidates[rng.nextInt(0, validCandidates.length - 1)];
          if (!curNodes[ci].connections.includes(nxtNodes[secondary].id)) {
            curNodes[ci].connections.push(nxtNodes[secondary].id);
            hasIncoming[secondary] = true;
          }
        }
      }
    }

    // Ensure every next-layer node has at least one incoming connection
    for (let ni = 0; ni < nxtLen; ni++) {
      if (hasIncoming[ni]) continue;

      // Find the closest current-layer node (by proportional position) that
      // won't create a crossing
      const ratio = nxtLen === 1 ? 0.5 : ni / (nxtLen - 1);
      const bestCur = Math.round(ratio * (curLen - 1));

      // Verify no crossing — check that no existing connection from bestCur
      // or its neighbors would cross this new edge
      let source = bestCur;
      let valid = true;

      // Simple crossing check: all connections from nodes left of source
      // should go to targets <= ni, and all from right should go >= ni
      for (let ci = 0; ci < curLen; ci++) {
        for (const connId of curNodes[ci].connections) {
          const connIdx = nxtNodes.findIndex(n => n.id === connId);
          if (ci < source && connIdx > ni) { valid = false; break; }
          if (ci > source && connIdx < ni) { valid = false; break; }
        }
        if (!valid) break;
      }

      if (!valid) {
        // Try neighbors of bestCur
        for (const tryOffset of [1, -1, 2, -2]) {
          const trySrc = bestCur + tryOffset;
          if (trySrc < 0 || trySrc >= curLen) continue;
          let ok = true;
          for (let ci = 0; ci < curLen; ci++) {
            for (const connId of curNodes[ci].connections) {
              const connIdx = nxtNodes.findIndex(n => n.id === connId);
              if (ci < trySrc && connIdx > ni) { ok = false; break; }
              if (ci > trySrc && connIdx < ni) { ok = false; break; }
            }
            if (!ok) break;
          }
          if (ok) { source = trySrc; valid = true; break; }
        }
      }

      if (!curNodes[source].connections.includes(nxtNodes[ni].id)) {
        curNodes[source].connections.push(nxtNodes[ni].id);
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
