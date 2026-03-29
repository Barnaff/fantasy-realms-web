import React, { useEffect, useState } from 'react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import type { RunRecord, LevelRecord } from '../../src/types/analytics';
import { CARD_DEF_MAP } from '../../src/data/cards';
import { CardPreviewMini } from '../components/CardPreviewMini';

const TAG_COLORS: Record<string, string> = {
  Beast: '#22c55e', Fire: '#ef4444', Weather: '#60a5fa',
  Leader: '#c9a227', Weapon: '#9ca3af', Land: '#854d0e',
  Wild: '#a855f7', Flood: '#0ea5e9', Army: '#6366f1',
  Artifact: '#d97706', Wizard: '#7c3aed', Undead: '#4a5568',
};

interface FlatLevel extends LevelRecord {
  runId: string;
  runWon: boolean;
  runSeed: number;
}

export default function HandsHistoryPage() {
  const [levels, setLevels] = useState<FlatLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [hoverCard, setHoverCard] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'runRecords'), limit(100));
        const snap = await getDocs(q);
        const flat: FlatLevel[] = [];
        snap.forEach((d) => {
          const r = d.data() as RunRecord;
          if (r.cheated) return;
          for (const l of (r.levels || [])) {
            flat.push({ ...l, runId: r.id, runWon: r.won, runSeed: r.seed });
          }
        });
        // Sort by most recent (highest run seed + level index)
        flat.sort((a, b) => b.runId.localeCompare(a.runId) || b.levelIndex - a.levelIndex);
        setLevels(flat);
      } catch (err) {
        console.error('Failed to load hands:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === 'all' ? levels : levels.filter(l => filter === 'passed' ? l.passed : !l.passed);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading hands history...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: 22 }}>🃏 Hands History</h2>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
        {levels.length} level hands from recent runs
      </p>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'passed', 'failed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer',
              fontSize: 13, fontWeight: filter === f ? 700 : 400,
              background: filter === f ? (f === 'passed' ? '#dcfce7' : f === 'failed' ? '#fee2e2' : '#f3f4f6') : '#fff',
              color: filter === f ? (f === 'passed' ? '#166534' : f === 'failed' ? '#991b1b' : '#333') : '#666',
            }}
          >
            {f === 'all' ? `All (${levels.length})` :
             f === 'passed' ? `Passed (${levels.filter(l => l.passed).length})` :
             `Failed (${levels.filter(l => !l.passed).length})`}
          </button>
        ))}
      </div>

      {/* Hand entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.slice(0, 50).map((level, idx) => (
          <HandEntry
            key={`${level.runId}_${level.levelIndex}_${idx}`}
            level={level}
            onCardHover={(id, e) => setHoverCard({ id, x: e.clientX + 10, y: e.clientY - 100 })}
            onCardLeave={() => setHoverCard(null)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>No hands match this filter</div>
      )}

      {/* Floating card preview */}
      {hoverCard && (() => {
        const def = CARD_DEF_MAP.get(hoverCard.id);
        if (!def) return null;
        const top = Math.max(10, Math.min(hoverCard.y, window.innerHeight - 300));
        const left = Math.min(hoverCard.x, window.innerWidth - 200);
        return (
          <div style={{ position: 'fixed', top, left, zIndex: 1000, pointerEvents: 'none', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
            <CardPreviewMini card={def} width={200} />
          </div>
        );
      })()}
    </div>
  );
}

function HandEntry({
  level,
  onCardHover,
  onCardLeave,
}: {
  level: FlatLevel;
  onCardHover: (id: string, e: React.MouseEvent) => void;
  onCardLeave: () => void;
}) {
  const passed = level.passed;
  const scoreDiff = level.actualScore - level.targetScore;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: `2px solid ${passed ? '#22c55e40' : '#ef444440'}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        background: passed ? '#f0fdf4' : '#fef2f2',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <span style={{
          fontSize: 16, fontWeight: 700,
          color: passed ? '#166534' : '#991b1b',
        }}>
          {passed ? '✓ PASSED' : '✗ FAILED'}
        </span>
        <span style={{ fontSize: 13, color: '#555' }}>{level.encounterName}</span>
        <span style={{ fontSize: 12, color: '#999' }}>Level {level.levelIndex + 1}</span>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: passed ? '#166534' : '#991b1b' }}>
            {level.actualScore}
          </span>
          <span style={{ fontSize: 12, color: '#999' }}> / {level.targetScore}</span>
          <span style={{
            marginLeft: 8, fontSize: 12, fontWeight: 600,
            color: scoreDiff >= 0 ? '#22c55e' : '#ef4444',
          }}>
            ({scoreDiff >= 0 ? '+' : ''}{scoreDiff})
          </span>
        </div>
      </div>

      {/* Modifiers */}
      {level.modifiers && level.modifiers.length > 0 && (
        <div style={{ display: 'flex', gap: 4, padding: '6px 16px', flexWrap: 'wrap' }}>
          {level.modifiers.map((mod, i) => (
            <span key={i} style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
              background: mod.value > 0 ? '#dcfce7' : '#fee2e2',
              color: mod.value > 0 ? '#166534' : '#991b1b',
            }}>
              {mod.value > 0 ? '+' : ''}{mod.value} {mod.tag}
            </span>
          ))}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto' }}>
        {(level.handCardIds || []).map((cardId, i) => {
          const def = CARD_DEF_MAP.get(cardId);
          if (!def) return <div key={i} style={{ width: 100, height: 140, background: '#f3f4f6', borderRadius: 6 }} />;
          const cs = (level.cardScores || []).find(s => s.cardId === cardId);

          return (
            <div
              key={i}
              style={{ flexShrink: 0, cursor: 'pointer', position: 'relative' }}
              onMouseEnter={(e) => onCardHover(cardId, e)}
              onMouseLeave={onCardLeave}
            >
              <CardPreviewMini card={def} width={110} blanked={cs?.blanked} />
              {/* Score overlay at bottom */}
              {cs && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(255,255,255,0.92)', borderTop: '1px solid #e5e7eb',
                  padding: '2px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: '0 0 8px 8px',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cs.blanked ? '#999' : '#333' }}>
                    {cs.blanked ? '0' : cs.finalValue}
                  </span>
                  {!cs.blanked && cs.finalValue !== cs.baseValue && (
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      color: cs.finalValue > cs.baseValue ? '#22c55e' : '#ef4444',
                    }}>
                      {cs.finalValue > cs.baseValue ? '+' : ''}{cs.finalValue - cs.baseValue}
                    </span>
                  )}
                  {cs.blanked && (
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#dc2626' }}>BLANK</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
