import { useEffect, useRef } from 'react';
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

function getNodePosition(node: MapNode, totalInLayer: number, totalLayers: number): { x: number; y: number } {
  const startX = VIRTUAL_WIDTH / 2 - ((totalInLayer - 1) * NODE_SPACING) / 2;
  // Flip: layer 0 at bottom, last layer at top
  const maxY = 60 + (totalLayers - 1) * LAYER_SPACING;
  return {
    x: startX + node.column * NODE_SPACING,
    y: maxY - node.layer * LAYER_SPACING,
  };
}

export function MapView({ map, currentNodeId, availableNodeIds, onSelectNode }: MapViewProps) {
  const allNodes = map.layers.flatMap(l => l.nodes);
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  const totalLayers = map.layers.length;
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalHeight = totalLayers * LAYER_SPACING + 100;

  // Auto-scroll to the current node on mount
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const currentNode = nodeMap.get(currentNodeId);
    if (!currentNode) return;

    const layerNodes = map.layers[currentNode.layer]?.nodes ?? [];
    const pos = getNodePosition(currentNode, layerNodes.length, totalLayers);

    // The SVG is rendered with viewBox, so we need to map virtual coords to actual scroll position
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    const svgRect = svgEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Scale from virtual coords to actual pixels
    const scaleY = svgRect.height / (totalHeight + 40);
    const actualY = pos.y * scaleY;

    // Scroll so the current node is centered in the visible area
    const targetScroll = actualY - containerRect.height / 2 + svgRect.top - containerRect.top + container.scrollTop;
    container.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, [currentNodeId]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Sticky header */}
      <div className="flex-shrink-0 text-center py-2 px-4 bg-parchment-100">
        <h2 className="font-display text-xl sm:text-2xl text-ink">
          Act {map.act} of {map.totalActs}
        </h2>
      </div>

      {/* Scrollable map area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 pb-4 sm:px-4">
        <div className="flex justify-center">
          <div className="w-full max-w-[600px]">
            <svg
              viewBox={`0 0 ${VIRTUAL_WIDTH} ${totalHeight + 40}`}
              className="w-full h-auto bg-parchment-200/30 rounded-xl border border-parchment-300"
              preserveAspectRatio="xMidYMid meet"
            >
          {/* Draw connections */}
          {allNodes.map(node => {
            const layerNodes = map.layers[node.layer]?.nodes ?? [];
            const fromPos = getNodePosition(node, layerNodes.length, totalLayers);

            return node.connections.map(targetId => {
              const targetNode = nodeMap.get(targetId);
              if (!targetNode) return null;
              const targetLayerNodes = map.layers[targetNode.layer]?.nodes ?? [];
              const toPos = getNodePosition(targetNode, targetLayerNodes.length, totalLayers);

              const isAvailable = node.id === currentNodeId && availableNodeIds.includes(targetId);

              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={isAvailable ? '#22c55e' : '#d9c9a0'}
                  strokeWidth={isAvailable ? 3 : 1.5}
                  strokeDasharray={isAvailable ? undefined : '4 4'}
                  opacity={isAvailable ? 0.8 : 1}
                />
              );
            });
          })}

          {/* Draw nodes */}
          {allNodes.map(node => {
            const layerNodes = map.layers[node.layer]?.nodes ?? [];
            const pos = getNodePosition(node, layerNodes.length, totalLayers);
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
                {/* Available – pulsing green glow */}
                {isAvailable && !isCurrent && (
                  <>
                    {/* Outer pulse ring */}
                    <circle cx={pos.x} cy={pos.y} r={r + 8} fill="none" stroke="#22c55e" strokeWidth={2}>
                      <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                    {/* Inner green ring */}
                    <circle cx={pos.x} cy={pos.y} r={r + 3} fill="none" stroke="#22c55e" strokeWidth={2.5}>
                      <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </>
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
      </div>
    </div>
  );
}
