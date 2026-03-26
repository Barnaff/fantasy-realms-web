import { useState } from 'react';
import type { RelicInstance } from '../../types/relic.ts';
import { RELIC_DEF_MAP } from '../../data/relics.ts';

interface RelicBarProps {
  relics: RelicInstance[];
}

export function RelicBar({ relics }: RelicBarProps) {
  const [hoveredRelic, setHoveredRelic] = useState<string | null>(null);

  if (relics.length === 0) return null;

  return (
    <div className="flex gap-2 items-center">
      {relics.map(relic => {
        const def = RELIC_DEF_MAP.get(relic.defId);
        if (!def) return null;

        const rarityColor =
          def.rarity === 'legendary' ? 'border-tag-artifact bg-tag-artifact/10' :
          def.rarity === 'rare' ? 'border-tag-wizard bg-tag-wizard/10' :
          'border-parchment-400 bg-parchment-50';

        return (
          <div
            key={relic.instanceId}
            className="relative"
            onMouseEnter={() => setHoveredRelic(relic.instanceId)}
            onMouseLeave={() => setHoveredRelic(null)}
          >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 ${rarityColor} flex items-center justify-center cursor-help text-lg`}>
              ✦
            </div>
            {hoveredRelic === relic.instanceId && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 sm:w-48 bg-parchment-50 border border-parchment-400 rounded-lg p-2 shadow-lg z-50">
                <div className="font-display text-sm font-bold text-ink">{def.name}</div>
                <div className="text-xs text-ink-muted mt-0.5">{def.description}</div>
                <div className="text-[10px] text-ink-muted mt-1 capitalize">{def.rarity}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
