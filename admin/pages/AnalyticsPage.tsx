import React, { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import type { RunRecord } from '../../src/types/analytics';
import { CARD_DEFS, CARD_DEF_MAP } from '../../src/data/cards';
import { CardPreviewMini } from '../components/CardPreviewMini';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const TAG_COLORS: Record<string, string> = {
  Beast: '#22c55e', Fire: '#ef4444', Weather: '#60a5fa',
  Leader: '#c9a227', Weapon: '#9ca3af', Land: '#854d0e',
  Wild: '#a855f7', Flood: '#0ea5e9', Army: '#6366f1',
  Artifact: '#d97706', Wizard: '#7c3aed', Undead: '#4a5568',
};

// Build card ID → tags lookup
const CARD_TAG_MAP = new Map<string, string[]>();
for (const c of CARD_DEFS) CARD_TAG_MAP.set(c.id, [...c.tags]);

const containerStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24, marginBottom: 24,
};
const headerStyle: React.CSSProperties = { fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 16 };
const statBox: React.CSSProperties = {
  background: '#f9fafb', borderRadius: 8, padding: '12px 20px', textAlign: 'center' as const, minWidth: 100,
};

export default function AnalyticsPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'runRecords'), limit(100));
        const snap = await getDocs(q);
        const records: RunRecord[] = [];
        snap.forEach((d) => records.push(d.data() as RunRecord));
        records.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
        setRuns(records);
      } catch (err) {
        console.error('Failed to load run records:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Flatten all levels from all runs
  const allLevels = useMemo(() => runs.flatMap(r => r.levels || []), [runs]);
  const allRewards = useMemo(() => runs.flatMap(r => r.rewards || []), [runs]);

  // Summary stats — use level data, not run-level won flag
  const stats = useMemo(() => {
    if (runs.length === 0) return null;
    const completedRuns = runs.filter(r => r.endedAt);
    const wins = runs.filter(r => r.won).length;
    const passedLevels = allLevels.filter(l => l.passed).length;
    const failedLevels = allLevels.filter(l => !l.passed).length;
    const avgScore = allLevels.length > 0 ? allLevels.reduce((s, l) => s + l.actualScore, 0) / allLevels.length : 0;
    const levelsPerRun = runs.length > 0 ? allLevels.filter(l => l.passed).length / runs.length : 0;
    return {
      totalRuns: runs.length,
      completedRuns: completedRuns.length,
      wins,
      winRate: runs.length > 0 ? ((wins / runs.length) * 100).toFixed(1) : '0',
      totalLevels: allLevels.length,
      passedLevels,
      failedLevels,
      levelPassRate: allLevels.length > 0 ? ((passedLevels / allLevels.length) * 100).toFixed(1) : '0',
      avgScore: Math.round(avgScore),
      avgLevelsPerRun: levelsPerRun.toFixed(1),
    };
  }, [runs, allLevels]);

  // Chart 1: Level Scores — passed vs failed
  const scoreDistData = useMemo(() => {
    const buckets: Record<string, { wins: number; losses: number }> = {};
    const bucketSize = 25;
    for (const l of allLevels) {
      const bucketStart = Math.floor(l.actualScore / bucketSize) * bucketSize;
      const label = `${bucketStart}-${bucketStart + bucketSize}`;
      if (!buckets[label]) buckets[label] = { wins: 0, losses: 0 };
      if (l.passed) buckets[label].wins++;
      else buckets[label].losses++;
    }
    const sorted = Object.entries(buckets).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    return {
      labels: sorted.map(([k]) => k),
      datasets: [
        { label: 'Passed', data: sorted.map(([, v]) => v.wins), backgroundColor: '#22c55e' },
        { label: 'Failed', data: sorted.map(([, v]) => v.losses), backgroundColor: '#ef4444' },
      ],
    };
  }, [allLevels]);

  // Chart 2: Level Progress — how many runs reached each level
  const levelProgressData = useMemo(() => {
    const counts: Record<number, { passed: number; failed: number }> = {};
    for (const l of allLevels) {
      const idx = l.levelIndex;
      if (!counts[idx]) counts[idx] = { passed: 0, failed: 0 };
      if (l.passed) counts[idx].passed++;
      else counts[idx].failed++;
    }
    const maxLevel = Math.max(...Object.keys(counts).map(Number), 0);
    const labels: string[] = [];
    const passed: number[] = [];
    const failed: number[] = [];
    for (let i = 0; i <= maxLevel; i++) {
      labels.push(`Level ${i + 1}`);
      passed.push(counts[i]?.passed || 0);
      failed.push(counts[i]?.failed || 0);
    }
    return {
      labels,
      datasets: [
        { label: 'Passed', data: passed, backgroundColor: '#22c55e' },
        { label: 'Failed', data: failed, backgroundColor: '#ef4444' },
      ],
    };
  }, [allLevels]);

  // Chart 3: Most Selected Cards (rewards + draft)
  const mostSelectedData = useMemo(() => {
    const counts: Record<string, number> = {};
    // Reward picks
    for (const reward of allRewards) {
      for (const cardId of (reward.selectedCardIds || [])) {
        counts[cardId] = (counts[cardId] || 0) + 1;
      }
    }
    // Draft picks
    for (const r of runs) {
      if (r.draft?.selectedCardIds) {
        for (const cardId of r.draft.selectedCardIds) {
          counts[cardId] = (counts[cardId] || 0) + 1;
        }
      } else {
        // Backward compat
        for (const cardId of (r.draftPickedCardIds || [])) {
          counts[cardId] = (counts[cardId] || 0) + 1;
        }
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    return {
      labels: sorted.map(([id]) => id.replace(/-/g, ' ')),
      ids: sorted.map(([id]) => id),
      datasets: [{ label: 'Times picked', data: sorted.map(([, c]) => c), backgroundColor: '#3b82f6' }],
    };
  }, [allRewards, runs]);

  // Chart 4: Most Skipped Cards (rewards + draft)
  const mostSkippedData = useMemo(() => {
    const counts: Record<string, number> = {};
    // Reward skips
    for (const reward of allRewards) {
      for (const cardId of (reward.skippedCardIds || [])) {
        counts[cardId] = (counts[cardId] || 0) + 1;
      }
    }
    // Draft skips
    for (const r of runs) {
      if (r.draft?.skippedCardIds) {
        for (const cardId of r.draft.skippedCardIds) {
          counts[cardId] = (counts[cardId] || 0) + 1;
        }
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    return {
      labels: sorted.map(([id]) => id.replace(/-/g, ' ')),
      ids: sorted.map(([id]) => id),
      datasets: [{ label: 'Times skipped', data: sorted.map(([, c]) => c), backgroundColor: '#f59e0b' }],
    };
  }, [allRewards, runs]);

  // Chart 5: Win Rate by Level
  const winRateByLevelData = useMemo(() => {
    const levelStats: Record<number, { wins: number; total: number }> = {};
    for (const l of allLevels) {
      if (!levelStats[l.levelIndex]) levelStats[l.levelIndex] = { wins: 0, total: 0 };
      levelStats[l.levelIndex].total++;
      if (l.passed) levelStats[l.levelIndex].wins++;
    }
    const maxLevel = Math.max(...Object.keys(levelStats).map(Number), 0);
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 0; i <= maxLevel; i++) {
      const s = levelStats[i];
      if (!s) continue;
      labels.push(`Level ${i + 1}`);
      data.push(Math.round((s.wins / s.total) * 100));
    }
    return {
      labels,
      datasets: [{
        label: 'Pass Rate %',
        data,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.3,
      }],
    };
  }, [allLevels]);

  // Chart 6: Tag Distribution in passed vs failed hands
  const handCompositionData = useMemo(() => {
    const winTags: Record<string, number> = {};
    const loseTags: Record<string, number> = {};

    for (const level of allLevels) {
      const bucket = level.passed ? winTags : loseTags;
      for (const cardId of (level.handCardIds || [])) {
        const tags = CARD_TAG_MAP.get(cardId) || [];
        for (const tag of tags) {
          bucket[tag] = (bucket[tag] || 0) + 1;
        }
      }
    }

    const allTags = [...new Set([...Object.keys(winTags), ...Object.keys(loseTags)])];
    const winData = {
      labels: allTags,
      datasets: [{
        data: allTags.map(t => winTags[t] || 0),
        backgroundColor: allTags.map(t => TAG_COLORS[t] || '#999'),
      }],
    };
    const loseData = {
      labels: allTags,
      datasets: [{
        data: allTags.map(t => loseTags[t] || 0),
        backgroundColor: allTags.map(t => TAG_COLORS[t] || '#999'),
      }],
    };
    return { winData, loseData };
  }, [allLevels]);

  // Chart 7: Map node type choices
  const mapChoicesData = useMemo(() => {
    const selectedCounts: Record<string, number> = {};
    const availableCounts: Record<string, number> = {};
    for (const r of runs) {
      for (const mc of (r.mapChoices || [])) {
        selectedCounts[mc.selectedNodeType] = (selectedCounts[mc.selectedNodeType] || 0) + 1;
        for (const t of mc.availableNodeTypes) {
          availableCounts[t] = (availableCounts[t] || 0) + 1;
        }
      }
    }
    const types = [...new Set([...Object.keys(selectedCounts), ...Object.keys(availableCounts)])].filter(t => t !== 'start');
    return {
      labels: types.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
      datasets: [
        { label: 'Selected', data: types.map(t => selectedCounts[t] || 0), backgroundColor: '#22c55e' },
        { label: 'Available (not selected)', data: types.map(t => (availableCounts[t] || 0) - (selectedCounts[t] || 0)), backgroundColor: '#d1d5db' },
      ],
    };
  }, [runs]);

  // Hover card preview state
  const [hoverCard, setHoverCard] = useState<{ id: string; x: number; y: number } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCardPreview = (cardId: string, event: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const def = CARD_DEF_MAP.get(cardId);
    if (!def) return;
    setHoverCard({ id: cardId, x: event.clientX + 10, y: event.clientY - 100 });
  };

  const hideCardPreview = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoverCard(null), 100);
  };

  // Helper to render a card chip with thumbnail + hover preview
  const CardLabel = ({ cardId }: { cardId: string }) => {
    const def = CARD_DEF_MAP.get(cardId);
    const name = def?.name || cardId.replace(/-/g, ' ');
    const tag = def?.tags[0];
    const tagColor = tag ? TAG_COLORS[tag] : '#999';
    const artSrc = def?.art || `/art/${cardId}.png`;

    return (
      <span
        style={{
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}
        onMouseEnter={(e) => showCardPreview(cardId, e)}
        onMouseLeave={hideCardPreview}
      >
        <img
          src={artSrc}
          alt=""
          style={{
            width: 20, height: 20, borderRadius: 3, objectFit: 'cover',
            border: `1.5px solid ${tagColor}`, flexShrink: 0,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <span style={{ borderBottom: `1px dotted ${tagColor}80` }}>{name}</span>
      </span>
    );
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading analytics...</div>;
  if (runs.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No run data yet. Play some games!</div>;

  const barOpts = { responsive: true, plugins: { legend: { position: 'top' as const } } };
  const horizBarOpts = { ...barOpts, indexAxis: 'y' as const };
  const lineOpts = { responsive: true, plugins: { legend: { position: 'top' as const } }, scales: { y: { beginAtZero: true, max: 100 } } };
  const pieOpts = { responsive: true, plugins: { legend: { position: 'right' as const, labels: { font: { size: 10 } } } } };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: 22 }}>📊 Analytics</h2>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Data from {runs.length} runs, {allLevels.length} levels played
      </p>

      {/* Summary Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={statBox}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1f2937' }}>{stats.totalRuns}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Total Runs</div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{stats.winRate}%</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Run Win Rate</div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{stats.totalLevels}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Levels Played</div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{stats.levelPassRate}%</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Level Pass Rate</div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#6366f1' }}>{stats.avgScore}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Avg Level Score</div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{stats.avgLevelsPerRun}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Avg Levels/Run</div>
          </div>
        </div>
      )}

      {/* Charts in 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div style={containerStyle}>
          <div style={headerStyle}>Level Score Distribution</div>
          <Bar data={scoreDistData} options={{ ...barOpts, plugins: { ...barOpts.plugins, title: { display: true, text: 'Scores grouped by passed/failed levels' } } }} />
        </div>

        <div style={containerStyle}>
          <div style={headerStyle}>Level Progress</div>
          <Bar data={levelProgressData} options={{ ...barOpts, plugins: { ...barOpts.plugins, title: { display: true, text: 'How many times each level was passed vs failed' } } }} />
        </div>

        <div style={containerStyle}>
          <div style={headerStyle}>Pass Rate by Level</div>
          <Line data={winRateByLevelData} options={lineOpts} />
        </div>

        <div style={containerStyle}>
          <div style={headerStyle}>Map Node Choices</div>
          <Bar data={mapChoicesData} options={{ ...barOpts, plugins: { ...barOpts.plugins, title: { display: true, text: 'Selected vs available node types' } } }} />
        </div>

        <div style={containerStyle}>
          <div style={headerStyle}>Most Picked Cards</div>
          {mostSelectedData.labels.length > 0 ? (
            <>
              <Bar data={mostSelectedData} options={horizBarOpts} />
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(mostSelectedData.ids || mostSelectedData.labels).map((id, i) => {
                  const cardId = typeof id === 'string' && id.includes(' ') ? id.replace(/ /g, '-') : id;
                  return (
                    <span key={i} style={{ fontSize: 11, background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
                      <CardLabel cardId={cardId} /> ({mostSelectedData.datasets[0].data[i]})
                    </span>
                  );
                })}
              </div>
            </>
          ) : <div style={{ color: '#999', fontSize: 13, padding: 20 }}>No reward picks recorded yet</div>}
        </div>

        <div style={containerStyle}>
          <div style={headerStyle}>Most Skipped Cards</div>
          {mostSkippedData.labels.length > 0 ? (
            <>
              <Bar data={mostSkippedData} options={horizBarOpts} />
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(mostSkippedData.ids || mostSkippedData.labels).map((id, i) => {
                  const cardId = typeof id === 'string' && id.includes(' ') ? id.replace(/ /g, '-') : id;
                  return (
                    <span key={i} style={{ fontSize: 11, background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>
                      <CardLabel cardId={cardId} /> ({mostSkippedData.datasets[0].data[i]})
                    </span>
                  );
                })}
              </div>
            </>
          ) : <div style={{ color: '#999', fontSize: 13, padding: 20 }}>No skipped cards recorded yet</div>}
        </div>

        <div style={containerStyle}>
          <div style={headerStyle}>Tags in Passed Hands</div>
          {Object.keys(handCompositionData.winData.datasets[0]?.data || {}).length > 0
            ? <Pie data={handCompositionData.winData} options={pieOpts} />
            : <div style={{ color: '#999', fontSize: 13, padding: 20 }}>No passed level data yet</div>
          }
        </div>

        <div style={containerStyle}>
          <div style={headerStyle}>Tags in Failed Hands</div>
          {Object.keys(handCompositionData.loseData.datasets[0]?.data || {}).length > 0
            ? <Pie data={handCompositionData.loseData} options={pieOpts} />
            : <div style={{ color: '#999', fontSize: 13, padding: 20 }}>No failed level data yet</div>
          }
        </div>
      </div>

      {/* Floating card preview tooltip */}
      {hoverCard && (() => {
        const def = CARD_DEF_MAP.get(hoverCard.id);
        if (!def) return null;
        const top = Math.max(10, Math.min(hoverCard.y, window.innerHeight - 300));
        const left = Math.min(hoverCard.x, window.innerWidth - 200);
        return (
          <div
            style={{
              position: 'fixed', top, left, zIndex: 1000,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
            }}
          >
            <CardPreviewMini card={def} width={180} />
          </div>
        );
      })()}
    </div>
  );
}
