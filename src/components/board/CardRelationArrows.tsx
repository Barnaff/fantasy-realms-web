import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ResolvedCard, Tag } from '../../types/card.ts';

/**
 * Relationship type between two cards.
 * - bonus: green arrow (selected card benefits from target)
 * - penalty: red arrow (selected card is penalized by target)
 * - blank: red dashed arrow (selected card blanks target, or is blanked by target)
 */
type RelationType = 'bonus' | 'penalty' | 'blank';

interface Relation {
  targetInstanceId: string;
  type: RelationType;
  /** 'outgoing' = selected card causes this effect on target (arrow: selected → target)
   *  'incoming' = target card causes this effect on selected (arrow: target → selected) */
  direction: 'outgoing' | 'incoming';
  label?: string;
}

/** Analyze a selected card's effects and find which other hand cards it relates to */
function findRelations(selected: ResolvedCard, hand: ResolvedCard[]): Relation[] {
  const relations: Relation[] = [];
  const seen = new Set<string>(); // avoid duplicates

  for (const effect of selected.scoringEffects) {
    const eid = effect.effectId;
    const p = effect.params;

    // Selected card gets bonus FROM target (target boosts selected) → arrow: target → selected
    if (eid === 'bonusPerTag' || eid === 'bonusIfTagPresent') {
      const tag = p.tag as Tag;
      const bonus = (p.bonus as number) ?? 0;
      for (const c of hand) {
        if (c.instanceId === selected.instanceId) continue;
        if (c.tags.includes(tag) && !seen.has(`bonus-${c.instanceId}-${tag}`)) {
          seen.add(`bonus-${c.instanceId}-${tag}`);
          relations.push({ targetInstanceId: c.instanceId, type: 'bonus', direction: 'incoming', label: `+${bonus}` });
        }
      }
    }

    // Selected would get bonus if tag absent — target has the tag, blocking the bonus → arrow: target → selected
    if (eid === 'bonusIfTagAbsent') {
      const tag = p.tag as Tag;
      for (const c of hand) {
        if (c.instanceId === selected.instanceId) continue;
        if (c.tags.includes(tag) && !seen.has(`penalty-${c.instanceId}-${tag}`)) {
          seen.add(`penalty-${c.instanceId}-${tag}`);
          relations.push({ targetInstanceId: c.instanceId, type: 'penalty', direction: 'incoming', label: 'blocks' });
        }
      }
    }

    // Selected card gets penalty FROM target → arrow: target → selected
    if (eid === 'penaltyPerTag' || eid === 'penaltyIfTagPresent') {
      const tag = p.tag as Tag;
      const penalty = (p.penalty as number) ?? 0;
      for (const c of hand) {
        if (c.instanceId === selected.instanceId) continue;
        if (c.tags.includes(tag) && !seen.has(`penalty-${c.instanceId}-${tag}`)) {
          seen.add(`penalty-${c.instanceId}-${tag}`);
          relations.push({ targetInstanceId: c.instanceId, type: 'penalty', direction: 'incoming', label: `${penalty}` });
        }
      }
    }

    // Selected penalized if tag absent — target saves selected → arrow: target → selected
    if (eid === 'penaltyIfTagAbsent') {
      const tag = p.tag as Tag;
      for (const c of hand) {
        if (c.instanceId === selected.instanceId) continue;
        if (c.tags.includes(tag) && !seen.has(`bonus-${c.instanceId}-saves`)) {
          seen.add(`bonus-${c.instanceId}-saves`);
          relations.push({ targetInstanceId: c.instanceId, type: 'bonus', direction: 'incoming', label: 'saves' });
        }
      }
    }

    // Selected gets bonus from specific card → arrow: target → selected
    if (eid === 'bonusIfCardPresent') {
      const cardId = p.cardId as string;
      const bonus = (p.bonus as number) ?? 0;
      for (const c of hand) {
        if (c.instanceId === selected.instanceId) continue;
        if (c.defId === cardId && !seen.has(`bonus-${c.instanceId}-card`)) {
          seen.add(`bonus-${c.instanceId}-card`);
          relations.push({ targetInstanceId: c.instanceId, type: 'bonus', direction: 'incoming', label: `+${bonus}` });
        }
      }
    }

    // Selected card BLANKS target → arrow: selected → target
    if (eid === 'blankTag') {
      const tag = p.tag as Tag;
      for (const c of hand) {
        if (c.instanceId === selected.instanceId) continue;
        if (c.tags.includes(tag) && !seen.has(`blank-${c.instanceId}-${tag}`)) {
          seen.add(`blank-${c.instanceId}-${tag}`);
          relations.push({ targetInstanceId: c.instanceId, type: 'blank', direction: 'outgoing', label: 'BLANK' });
        }
      }
    }

    // Selected card BLANKS specific card → arrow: selected → target
    if (eid === 'blankSpecificCard') {
      const cardId = p.cardId as string;
      for (const c of hand) {
        if (c.defId === cardId && !seen.has(`blank-${c.instanceId}-specific`)) {
          seen.add(`blank-${c.instanceId}-specific`);
          relations.push({ targetInstanceId: c.instanceId, type: 'blank', direction: 'outgoing', label: 'BLANK' });
        }
      }
    }

    // Selected is blanked BY target's presence → arrow: target → selected
    if (eid === 'blankIfTagPresent') {
      const tag = p.tag as Tag;
      for (const c of hand) {
        if (c.instanceId === selected.instanceId) continue;
        if (c.tags.includes(tag) && !seen.has(`blank-self-${c.instanceId}-${tag}`)) {
          seen.add(`blank-self-${c.instanceId}-${tag}`);
          relations.push({ targetInstanceId: c.instanceId, type: 'blank', direction: 'incoming', label: 'BLANKS ME' });
        }
      }
    }

    // Selected is blanked if tag absent — target saves selected → arrow: target → selected
    if (eid === 'blankIfTagAbsent') {
      const tag = p.tag as Tag;
      for (const c of hand) {
        if (c.instanceId === selected.instanceId) continue;
        if (c.tags.includes(tag) && !seen.has(`bonus-${c.instanceId}-unblanks`)) {
          seen.add(`bonus-${c.instanceId}-unblanks`);
          relations.push({ targetInstanceId: c.instanceId, type: 'bonus', direction: 'incoming', label: 'saves' });
        }
      }
    }
  }

  // Also check if OTHER cards in hand have effects targeting the selected card
  for (const other of hand) {
    if (other.instanceId === selected.instanceId) continue;
    for (const effect of other.scoringEffects) {
      const eid = effect.effectId;
      const p = effect.params;

      // Other card blanks selected → arrow: other → selected
      if (eid === 'blankTag') {
        const tag = p.tag as Tag;
        if (selected.tags.includes(tag) && !seen.has(`blank-from-${other.instanceId}`)) {
          seen.add(`blank-from-${other.instanceId}`);
          relations.push({ targetInstanceId: other.instanceId, type: 'blank', direction: 'incoming', label: 'BLANKS ME' });
        }
      }

      if (eid === 'blankSpecificCard') {
        if ((p.cardId as string) === selected.defId && !seen.has(`blank-from-${other.instanceId}`)) {
          seen.add(`blank-from-${other.instanceId}`);
          relations.push({ targetInstanceId: other.instanceId, type: 'blank', direction: 'incoming', label: 'BLANKS ME' });
        }
      }
    }
  }

  return relations;
}

/** Get top-center position of a card element by instanceId.
 *  If inspectedId matches, prefer the large preview element position. */
function getCardTop(instanceId: string, inspectedId: string | null): { x: number; y: number } | null {
  // If this card is being inspected, use the large preview element
  if (inspectedId === instanceId) {
    const preview = document.querySelector(`[data-inspect-preview="${instanceId}"]`);
    if (preview) {
      const rect = preview.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top };
    }
  }
  const el = document.querySelector(`[data-inspect-id="${instanceId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top };
}

interface ArrowDef {
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: RelationType;
  label?: string;
  key: string;
}

export function CardRelationArrows({
  selectedCard,
  hand,
  inspectedInstanceId,
}: {
  selectedCard: ResolvedCard | null;
  hand: ResolvedCard[];
  /** When a card is being long-press inspected, arrows connect to/from the large preview */
  inspectedInstanceId: string | null;
}) {
  const [arrows, setArrows] = useState<ArrowDef[]>([]);

  const relations = useMemo(() => {
    if (!selectedCard) return [];
    return findRelations(selectedCard, hand);
  }, [selectedCard, hand]);

  // Continuous RAF loop — tracks card positions in real-time so arrows
  // follow cards as they animate (fan spring, drag, etc.)
  useEffect(() => {
    if (!selectedCard || relations.length === 0) {
      setArrows([]);
      return;
    }

    let rafId = 0;
    // Cache previous serialized result to avoid unnecessary re-renders
    let prev = '';

    const tick = () => {
      const selectedPos = getCardTop(selectedCard.instanceId, inspectedInstanceId);
      if (!selectedPos) { rafId = requestAnimationFrame(tick); return; }

      const newArrows: ArrowDef[] = [];
      for (const rel of relations) {
        const targetPos = getCardTop(rel.targetInstanceId, inspectedInstanceId);
        if (!targetPos) continue;
        // Arrow direction: outgoing = selected→target, incoming = target→selected
        const from = rel.direction === 'outgoing' ? selectedPos : targetPos;
        const to = rel.direction === 'outgoing' ? targetPos : selectedPos;
        newArrows.push({
          from,
          to,
          type: rel.type,
          label: rel.label,
          key: `${selectedCard.instanceId}-${rel.targetInstanceId}-${rel.type}-${rel.direction}`,
        });
      }

      // Only setState when positions actually changed (cheap string compare)
      const serialized = newArrows.map(a =>
        `${a.from.x.toFixed(1)},${a.from.y.toFixed(1)}-${a.to.x.toFixed(1)},${a.to.y.toFixed(1)}`
      ).join('|');

      if (serialized !== prev) {
        prev = serialized;
        setArrows(newArrows);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [selectedCard, relations, inspectedInstanceId]);

  return (
    <AnimatePresence>
      {arrows.length > 0 && (
        <motion.svg
          key="relation-arrows"
          className="fixed inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 25 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <defs>
            <marker id="arrow-green" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <path d="M0,0 L7,2.5 L0,5 Z" fill="#4a7c59" />
            </marker>
            <marker id="arrow-red" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <path d="M0,0 L7,2.5 L0,5 Z" fill="#c4433a" />
            </marker>
            <filter id="arrow-glow-green">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#4a7c59" floodOpacity="0.6" />
            </filter>
            <filter id="arrow-glow-red">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#c4433a" floodOpacity="0.6" />
            </filter>
          </defs>
          {arrows.map((arrow, i) => (
            <RelationArrow key={arrow.key} arrow={arrow} index={i} />
          ))}
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

function RelationArrow({ arrow, index }: { arrow: ArrowDef; index: number }) {
  const isGood = arrow.type === 'bonus';
  const isBlank = arrow.type === 'blank';
  const color = isGood ? '#4a7c59' : '#c4433a';
  const markerId = isGood ? 'arrow-green' : 'arrow-red';
  const filterId = isGood ? 'arrow-glow-green' : 'arrow-glow-red';

  // Bezier curve: large arc rising high above the cards
  const { from, to } = arrow;
  const dx = Math.abs(to.x - from.x);
  const dist = Math.max(dx, 40);

  // Large upward curvature — scales with distance, minimum 80px rise
  const curvature = Math.max(80, Math.min(dist * 0.7, 160));

  // Control points for a cubic bezier with a tall arc
  const midX = (from.x + to.x) / 2;
  const topY = Math.min(from.y, to.y) - curvature;

  // Cubic bezier: two control points both high above for a smooth tall arc
  const cp1x = from.x + (midX - from.x) * 0.3;
  const cp1y = topY;
  const cp2x = to.x - (to.x - midX) * 0.3;
  const cp2y = topY;

  const path = `M${from.x},${from.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${to.x},${to.y}`;

  // Label at the apex of the arc
  const labelX = midX;
  const labelY = topY - 6;

  // Label width based on text length
  const labelW = Math.max(48, (arrow.label?.length ?? 0) * 7 + 16);
  const labelH = 20;

  return (
    <g style={{ opacity: 1 }}>
      {/* Shadow/glow path */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeOpacity={0.15}
        filter={`url(#${filterId})`}
      />
      {/* Main path */}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={3.5}
        strokeOpacity={0.9}
        strokeLinecap="round"
        strokeDasharray={isBlank ? '8 5' : undefined}
        markerEnd={`url(#${markerId})`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: index * 0.04 }}
      />
      {/* Label */}
      {arrow.label && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 + index * 0.04 }}
        >
          <rect
            x={labelX - labelW / 2}
            y={labelY - labelH / 2}
            width={labelW}
            height={labelH}
            rx={5}
            fill={color}
            fillOpacity={0.92}
            stroke="white"
            strokeWidth={0.5}
            strokeOpacity={0.3}
          />
          <text
            x={labelX}
            y={labelY + 4}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            fontWeight="bold"
            fontFamily="'MedievalSharp', serif"
          >
            {arrow.label}
          </text>
        </motion.g>
      )}
    </g>
  );
}
