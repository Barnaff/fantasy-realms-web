import React from 'react';
import type { CardDef, CardRarity } from '../../src/types/card';

const RARITY_COLORS: Record<CardRarity, string> = {
  starting: '#9ca3af',
  common: '#22c55e',
  rare: '#3b82f6',
  epic: '#f59e0b',
};

const TAG_COLORS: Record<string, string> = {
  Beast: '#22c55e', Fire: '#ef4444', Weather: '#60a5fa',
  Leader: '#c9a227', Weapon: '#9ca3af', Land: '#854d0e',
  Wild: '#a855f7', Flood: '#0ea5e9', Army: '#6366f1',
  Artifact: '#d97706', Wizard: '#7c3aed', Undead: '#4a5568',
};

const TAG_ART_FALLBACK: Record<string, string> = {
  Beast: 'phoenix', Fire: 'phoenix', Weather: 'great-flood',
  Leader: 'archmage', Weapon: 'enchanted-blade', Land: 'great-flood',
  Wild: 'archmage', Flood: 'great-flood', Army: 'enchanted-blade',
  Artifact: 'enchanted-blade', Wizard: 'archmage', Undead: 'lich-lord',
};

interface Props {
  card: CardDef;
  width?: number;
  showEffects?: boolean;
  blanked?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function CardPreviewMini({ card, width = 120, showEffects = true, blanked = false, onClick, style }: Props) {
  const scale = width / 120;
  const borderColor = TAG_COLORS[card.tags[0]] || '#999';
  const artSrc = card.art || `/art/${TAG_ART_FALLBACK[card.tags[0]] || 'phoenix'}.webp`;

  return (
    <div
      onClick={onClick}
      style={{
        width,
        borderRadius: 8 * scale,
        border: `2px solid ${borderColor}`,
        background: '#fdf6e3',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        ...style,
      }}
    >
      {/* Header: value circle + tags */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4 * scale,
        padding: `${3 * scale}px ${5 * scale}px`,
      }}>
        <div style={{
          width: 22 * scale,
          height: 22 * scale,
          borderRadius: '50%',
          background: borderColor,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11 * scale,
          fontWeight: 800,
          flexShrink: 0,
        }}>
          {card.baseValue}
        </div>
        <div style={{ display: 'flex', gap: 2 * scale, flexWrap: 'wrap', flex: 1 }}>
          {card.tags.map(t => (
            <span key={t} style={{
              fontSize: 7 * scale,
              fontWeight: 700,
              color: '#fff',
              background: TAG_COLORS[t] || '#888',
              padding: `${1 * scale}px ${4 * scale}px`,
              borderRadius: 3 * scale,
              lineHeight: 1.2,
            }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Name */}
      <div style={{
        fontSize: 10 * scale,
        fontWeight: 700,
        color: '#2c1810',
        padding: `0 ${5 * scale}px`,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {card.name}
      </div>

      {/* Art */}
      <div style={{
        height: 50 * scale,
        margin: `${3 * scale}px ${4 * scale}px`,
        borderRadius: 4 * scale,
        overflow: 'hidden',
        background: '#e8dcc8',
      }}>
        <img
          src={artSrc}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Effects */}
      {showEffects && card.scoringEffects && card.scoringEffects.length > 0 && (
        <div style={{
          padding: `${2 * scale}px ${5 * scale}px ${4 * scale}px`,
          maxHeight: 40 * scale,
          overflow: 'hidden',
        }}>
          {card.scoringEffects.slice(0, 3).map((eff, i) => {
            const isNeg = eff.effectId.includes('penalty') || eff.effectId.includes('blank');
            return (
              <div key={i} style={{
                fontSize: 7 * scale,
                color: isNeg ? '#dc2626' : '#166534',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {eff.description}
              </div>
            );
          })}
          {card.scoringEffects.length > 3 && (
            <div style={{ fontSize: 6 * scale, color: '#aaa' }}>
              +{card.scoringEffects.length - 3} more
            </div>
          )}
        </div>
      )}

      {/* Rarity gem at bottom center */}
      {card.rarity && card.rarity !== 'starting' && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: `${2 * scale}px 0 ${3 * scale}px`,
        }}>
          <div style={{
            width: 10 * scale,
            height: 10 * scale,
            borderRadius: '50%',
            background: RARITY_COLORS[card.rarity] || '#888',
            boxShadow: `0 0 ${4 * scale}px ${RARITY_COLORS[card.rarity] || '#888'}60`,
            border: `1px solid ${RARITY_COLORS[card.rarity] || '#888'}`,
          }} />
        </div>
      )}

      {/* Blanked overlay */}
      {blanked && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(120,120,120,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8 * scale,
        }}>
          <span style={{
            fontSize: 12 * scale,
            fontWeight: 900,
            color: '#fff',
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            letterSpacing: 2,
          }}>
            BLANKED
          </span>
        </div>
      )}
    </div>
  );
}
