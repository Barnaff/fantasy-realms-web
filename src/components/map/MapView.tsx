import { clsx } from 'clsx';
import type { GameMap, MapNode, MapNodeType } from '../../types/map.ts';

interface MapViewProps {
  map: GameMap;
  currentNodeId: string;
  availableNodeIds: string[];
  onSelectNode: (nodeId: string) => void;
}

const NODE_ICONS: Record<MapNodeType, string> = {
  encounter: '⚔️',
  boss: '💀',
  merchant: '🏪',
  event: '📜',
  rest: '🏕️',
  start: '🏠',
};

const NODE_LABELS: Record<MapNodeType, string> = {
  encounter: 'Battle',
  boss: 'Boss',
  merchant: 'Merchant',
  event: 'Event',
  rest: 'Rest',
  start: 'Start',
};

// Virtual coordinate space — rendered via viewBox scaling
const VIRTUAL_WIDTH = 600;
const LAYER_SPACING = 100;
const NODE_SPACING = 120;

function getNodePosition(node: MapNode, totalInLayer: number): { x: number; y: number } {
  const startX = VIRTUAL_WIDTH / 2 - ((totalInLayer - 1) * NODE_SPACING) / 2;
  return {
    x: startX + node.column * NODE_SPACING,
    y: 60 + node.layer * LAYER_SPACING,
  };
}

export function MapView({ map, currentNodeId, availableNodeIds, onSelectNode }: MapViewProps) {
  const allNodes = map.layers.flatMap(l => l.nodes);
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));

  const totalHeight = map.layers.length * LAYER_SPACING + 100;

  return (
    <div className="flex flex-col items-center px-2 py-4 sm:p-4">
      <h2 className="font-display text-xl sm:text-2xl text-ink mb-2">
        Act {map.act} of {map.totalActs}
      </h2>

      {/* SVG-based map that scales to fit the container */}
      <div className="w-full max-w-[600px]">
        <svg
          viewBox={`0 0 ${VIRTUAL_WIDTH} ${totalHeight + 40}`}
          className="w-full h-auto bg-parchment-200/30 rounded-xl border border-parchment-300"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Draw connections */}
          {allNodes.map(node => {
            const layerNodes = map.layers[node.layer]?.nodes ?? [];
            const fromPos = getNodePosition(node, layerNodes.length);

            return node.connections.map(targetId => {
              const targetNode = nodeMap.get(targetId);
              if (!targetNode) return null;
              const targetLayerNodes = map.layers[targetNode.layer]?.nodes ?? [];
              const toPos = getNodePosition(targetNode, targetLayerNodes.length);

              const isAvailable = node.id === currentNodeId && availableNodeIds.includes(targetId);

              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={isAvailable ? '#c9a227' : '#d9c9a0'}
                  strokeWidth={isAvailable ? 3 : 1.5}
                  strokeDasharray={isAvailable ? undefined : '4 4'}
                />
              );
            });
          })}

          {/* Draw nodes */}
          {allNodes.map(node => {
            const layerNodes = map.layers[node.layer]?.nodes ?? [];
            const pos = getNodePosition(node, layerNodes.length);
            const isAvailable = availableNodeIds.includes(node.id);
            const isCurrent = node.id === currentNodeId;

            const r = 22;
            const fillColor =
              node.type === 'boss' ? 'rgba(196,67,58,0.2)' :
              node.type === 'merchant' ? 'rgba(196,154,39,0.2)' :
              node.type === 'event' ? 'rgba(91,63,160,0.2)' :
              node.type === 'rest' ? 'rgba(74,124,89,0.2)' :
              'rgba(253,248,239,1)';

            const strokeColor =
              node.type === 'boss' ? '#c4433a' :
              node.type === 'merchant' ? '#c49a27' :
              node.type === 'event' ? '#5b3fa0' :
              node.type === 'rest' ? '#4a7c59' :
              '#a89070';

            return (
              <g
                key={node.id}
                onClick={() => isAvailable && onSelectNode(node.id)}
                style={{ cursor: isAvailable ? 'pointer' : 'default' }}
                role="button"
                aria-label={NODE_LABELS[node.type]}
              >
                {/* Glow ring for current node */}
                {isCurrent && (
                  <circle cx={pos.x} cy={pos.y} r={r + 6} fill="none" stroke="#d4a437" strokeWidth={3} />
                )}
                {/* Available highlight */}
                {isAvailable && !node.visited && (
                  <circle cx={pos.x} cy={pos.y} r={r + 4} fill="none" stroke="#c9a227" strokeWidth={2} opacity={0.5} />
                )}
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={2}
                  opacity={node.visited && !isCurrent ? 0.4 : 1}
                />
                {/* Icon */}
                <text
                  x={pos.x}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={18}
                  opacity={node.visited && !isCurrent ? 0.4 : 1}
                >
                  {NODE_ICONS[node.type]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
