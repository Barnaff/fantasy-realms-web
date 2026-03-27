import { clsx } from 'clsx';
import type { ResolvedCard, Tag } from '../../types/card.ts';
import { TAG_COLORS } from '../../types/card.ts';
import { useLongPress, type LongPressPosition } from '../../hooks/useLongPress.ts';
import { formatCardText } from './CardText.tsx';

/** Map tag to a placeholder art file until all cards have unique art */
const TAG_ART_FALLBACK: Record<Tag, string> = {
  Beast: 'phoenix',
  Fire: 'phoenix',
  Weather: 'great-flood',
  Leader: 'archmage',
  Weapon: 'enchanted-blade',
  Land: 'great-flood',
  Wild: 'archmage',
  Flood: 'great-flood',
  Army: 'enchanted-blade',
  Artifact: 'enchanted-blade',
  Wizard: 'archmage',
  Undead: 'lich-lord',
};

function getCardArtSrc(card: ResolvedCard): string {
  const tag = card.tags[0];
  const fallback = tag ? TAG_ART_FALLBACK[tag] : 'phoenix';
  return `/art/${fallback}.webp`;
}

/*
 * CARD SIZE SYSTEM
 * ────────────────
 * Every Card renders at a FIXED canonical size: 100 × 140 px.
 * To show cards smaller/larger, we wrap them in a container that
 * uses CSS `transform: scale(...)` and sets width/height to the
 * scaled dimensions so layout flows correctly.
 *
 * This guarantees every card looks identical everywhere — just
 * at different scales.
 */

/** Canonical (unscaled) card dimensions in px */
const CARD_W = 100;
const CARD_H = 140;

export interface CardProps {
  card: ResolvedCard;
  /** Scale factor (default 1). 0.72 = river, 1 = hand/default */
  scale?: number;
  selected?: boolean;
  blanked?: boolean;
  dimmed?: boolean;
  glowing?: boolean;
  /** Color for the glow effect: 'gold' (default), 'green', 'red' */
  glowColor?: 'gold' | 'green' | 'red';
  onClick?: () => void;
  onLongPress?: (pos: LongPressPosition) => void;
  className?: string;
  style?: React.CSSProperties;
}

function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-block rounded-sm font-bold text-white leading-none px-0.5 py-px text-[6px]"
      style={{ backgroundColor: TAG_COLORS[tag] }}
    >
      {tag}
    </span>
  );
}

export function Card({
  card,
  scale = 1,
  selected = false,
  blanked = false,
  dimmed = false,
  glowing = false,
  glowColor = 'gold',
  onClick,
  onLongPress,
  className,
  style,
}: CardProps) {
  const primaryTag = card.tags[0];
  const borderColor = primaryTag ? TAG_COLORS[primaryTag] : '#8b6d3f';

  const { handlers, didLongPress } = useLongPress(onLongPress);

  // Outer wrapper sets the layout dimensions to the scaled size
  // Inner card is always CARD_W × CARD_H with a CSS scale transform
  const scaledW = CARD_W * scale;
  const scaledH = CARD_H * scale;

  return (
    <div
      className={clsx('flex-shrink-0', className)}
      style={{ width: scaledW, height: scaledH, ...style }}
    >
      <div
        className={clsx(
          'card-face relative flex flex-col rounded-lg select-none overflow-hidden',
          selected && 'shadow-[0_0_12px_rgba(212,164,55,0.5)]',
          !selected && !glowing && 'shadow-md',
          blanked && 'grayscale',
          dimmed && !selected && 'opacity-50 saturate-50',
          onClick && !dimmed && !blanked && 'cursor-pointer',
        )}
        data-inspect-id={card.instanceId}
        style={{
          width: CARD_W,
          height: CARD_H,
          padding: 6,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: selected ? '#d4a437' : borderColor,
          outline: glowing && !dimmed
            ? `2px solid ${glowColor === 'green' ? 'rgba(34,197,94,0.6)' : glowColor === 'red' ? 'rgba(239,68,68,0.6)' : 'rgba(212,164,55,0.4)'}`
            : 'none',
          outlineOffset: '1px',
          boxShadow: glowing && !dimmed
            ? (glowColor === 'green' ? '0 0 10px rgba(34,197,94,0.5)' : glowColor === 'red' ? '0 0 10px rgba(239,68,68,0.5)' : undefined)
            : undefined,
          background: 'linear-gradient(170deg, #fdf8ef 0%, #f3e8cc 100%)',
          touchAction: 'manipulation',
          transformOrigin: 'top left',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
        }}
        onClick={() => {
          if (!didLongPress.current) onClick?.();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          onLongPress?.({ x: rect.left + rect.width / 2, pointerY: e.clientY, rect });
        }}
        {...handlers}
      >
        {/* Tags row — single line, no wrap */}
        <div className="flex gap-px mb-px ml-[22px] overflow-hidden">
          {card.tags.map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>

        {/* Card name — single line, truncated */}
        <h3 className="font-display font-bold text-ink leading-tight text-[8px] ml-[22px] truncate">
          {card.name}
        </h3>

        {/* Art area — fixed height so every card's image is identical */}
        <div className="rounded border border-parchment-300/60 overflow-hidden my-0.5" style={{ height: 52 }}>
          <img
            src={getCardArtSrc(card)}
            alt=""
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>

        {/* Base value badge */}
        <div
          className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center font-display font-bold text-white text-[10px] shadow-sm"
          style={{ backgroundColor: borderColor }}
        >
          {card.baseValue}
        </div>

        {/* Text area — fills remaining space, scrollable */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0 text-[6px] leading-tight">
          {/* All scoring effects */}
          {card.scoringEffects.map((effect, i) => {
            const isBlank = ['blankTag', 'blankIfTagAbsent', 'blankSpecificCard', 'blankIfTagPresent'].includes(effect.effectId);
            const isPenalty = effect.effectId.startsWith('penalty');
            return (
              <div key={i} className={clsx(
                isBlank ? 'text-tag-fire font-bold' : isPenalty ? 'text-tag-fire' : 'text-ink-muted',
              )}>
                {formatCardText(effect.description)}
              </div>
            );
          })}

          {/* Discard indicator */}
          {card.discardEffect && (
            <div className="mt-auto pt-px border-t border-parchment-300/50">
              <span className="text-tag-fire font-bold">Disc: </span>
              <span className="text-ink-light">{formatCardText(card.discardEffect.description)}</span>
            </div>
          )}
        </div>

        {/* Blanked overlay */}
        {blanked && (
          <div className="absolute inset-0 pointer-events-none rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          >
            {/* Diagonal red lines (X) */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 140" preserveAspectRatio="none">
              <line x1="10" y1="10" x2="90" y2="130" stroke="#c4433a" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
              <line x1="90" y1="10" x2="10" y2="130" stroke="#c4433a" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            </svg>
            {/* BLANKED stamp */}
            <span
              className="relative font-display font-bold text-[11px] text-white tracking-widest uppercase px-2 py-0.5 rounded"
              style={{
                background: 'rgba(196,67,58,0.85)',
                transform: 'rotate(-18deg)',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              Blanked
            </span>
          </div>
        )}

        {/* Shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.04) 100%)',
          }}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   Expanded card preview (overlays / hover)
   ════════════════════════════════════════════════════════ */

export function CardPreview({ card }: { card: ResolvedCard }) {
  const primaryTag = card.tags[0];
  const borderColor = primaryTag ? TAG_COLORS[primaryTag] : '#8b6d3f';

  return (
    <div
      className="relative flex flex-col rounded-2xl bg-parchment-50 w-[240px] sm:w-[280px] p-3 sm:p-4 overflow-hidden"
      style={{
        borderWidth: 3,
        borderStyle: 'solid',
        borderColor,
        background: 'linear-gradient(170deg, #fdf8ef 0%, #f3e4c4 100%)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.25), 0 0 20px ${borderColor}30`,
      }}
    >
      {/* Tags — offset right to avoid score circle */}
      <div className="flex flex-wrap gap-1 mb-1 ml-12 sm:ml-14">
        {card.tags.map(tag => (
          <span
            key={tag}
            className="inline-block rounded px-1.5 py-0.5 text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: TAG_COLORS[tag] }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Name */}
      <h3 className="font-display font-bold text-ink text-lg sm:text-xl leading-tight mb-1.5">
        {card.name}
      </h3>

      {/* Art */}
      <div className="rounded-lg border border-parchment-300/60 overflow-hidden h-24 sm:h-28 mb-2.5">
        <img
          src={getCardArtSrc(card)}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Base value */}
      <div
        className="absolute top-2.5 left-2.5 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-display font-bold text-white text-base sm:text-lg"
        style={{
          backgroundColor: borderColor,
          boxShadow: `0 2px 8px ${borderColor}60`,
        }}
      >
        {card.baseValue}
      </div>

      {/* Scoring effects */}
      {card.scoringEffects.length > 0 && (
        <div className="space-y-1 mb-2">
          <div className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">Scoring</div>
          {card.scoringEffects.map((effect, i) => {
            const isBlankEffect = ['blankTag', 'blankIfTagAbsent', 'blankSpecificCard', 'blankIfTagPresent'].includes(effect.effectId);
            return (
              <p key={i} className={clsx(
                'text-xs sm:text-sm leading-snug',
                isBlankEffect ? 'text-tag-fire font-bold' : 'text-ink',
              )}>
                {isBlankEffect && <span className="inline-block w-3 h-3 mr-1 align-middle text-[10px]">⛔</span>}
                {formatCardText(effect.description)}
              </p>
            );
          })}
        </div>
      )}

      {/* Discard effect */}
      {card.discardEffect && (
        <div className="pt-2 border-t border-parchment-300/50">
          <div className="text-[9px] font-bold text-tag-fire uppercase tracking-wider mb-0.5">Discard Effect</div>
          <p className="text-xs sm:text-sm text-ink-light leading-snug">
            {formatCardText(card.discardEffect.description)}
          </p>
        </div>
      )}

      {/* Flavor */}
      {card.flavor && (
        <p className="text-[10px] text-ink-muted italic mt-2 border-t border-parchment-200/60 pt-1">
          {card.flavor}
        </p>
      )}

      {/* Shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 45%, rgba(0,0,0,0.03) 100%)',
        }}
      />
    </div>
  );
}
