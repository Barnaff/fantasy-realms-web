import { useState } from 'react';
import { clsx } from 'clsx';
import type { ScoreResult } from '../../types/game.ts';
import { formatCardText } from '../card/CardText.tsx';

interface ScorePanelProps {
  score: ScoreResult | null;
}

export function ScorePanel({ score }: ScorePanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!score) {
    return (
      <div className="text-ink-muted text-xs sm:text-sm italic">
        Add cards to see score
      </div>
    );
  }

  return (
    <div className="bg-parchment-50 border border-parchment-300 rounded-lg p-2 sm:p-3 min-w-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 sm:gap-2 w-full text-left"
      >
        <span className="font-display text-sm sm:text-lg text-ink">
          Score: <strong className="text-lg sm:text-2xl">{score.totalScore}</strong>
        </span>
        <span className="text-[10px] sm:text-xs text-ink-muted">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1 text-xs border-t border-parchment-200 pt-2">
          {score.breakdown.map(entry => (
            <div
              key={entry.cardId}
              className={clsx(
                'flex justify-between items-start',
                entry.blanked && 'opacity-50 line-through',
              )}
            >
              <div>
                <span className="font-bold text-ink">{entry.cardName}</span>
                <span className="text-ink-muted ml-1">(base: {entry.baseValue})</span>
                {entry.bonuses.map((b, i) => (
                  <div key={i} className="text-tag-beast ml-2">+{b.value}: {formatCardText(b.description)}</div>
                ))}
                {entry.penalties.map((p, i) => (
                  <div key={i} className="text-tag-fire ml-2">{p.value}: {formatCardText(p.description)}</div>
                ))}
              </div>
              <span className={clsx(
                'font-bold ml-4 whitespace-nowrap',
                entry.finalValue > entry.baseValue ? 'text-tag-beast' :
                entry.finalValue < entry.baseValue ? 'text-tag-fire' :
                'text-ink',
              )}>
                {entry.blanked ? 'BLANKED' : entry.finalValue}
              </span>
            </div>
          ))}
          {score.relicBonuses.length > 0 && (
            <div className="border-t border-parchment-200 pt-1 mt-1">
              {score.relicBonuses.map((rb, i) => (
                <div key={i} className="flex justify-between text-tag-artifact">
                  <span>{rb.relicName}</span>
                  <span>+{rb.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
