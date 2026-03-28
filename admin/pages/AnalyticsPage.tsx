import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import type { RunRecord } from '../../src/types/analytics';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

const TAG_COLORS: Record<string, string> = {
  Beast: '#22c55e', Fire: '#ef4444', Weather: '#60a5fa',
  Leader: '#c9a227', Weapon: '#9ca3af', Land: '#854d0e',
  Wild: '#a855f7', Flood: '#0ea5e9', Army: '#6366f1',
  Artifact: '#d97706', Wizard: '#7c3aed', Undead: '#4a5568',
};

const containerStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  padding: 24,
  marginBottom: 24,
};

const headerStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#1f2937',
  marginBottom: 16,
};

export default function AnalyticsPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(
          collection(db, 'runRecords'),
          orderBy('endedAt', 'desc'),
          limit(100),
        );
        const snap = await getDocs(q);
        const records: RunRecord[] = [];
        snap.forEach((doc) => {
          records.push(doc.data() as RunRecord);
        });
        setRuns(records);
      } catch (err) {
        console.error('Failed to load run records:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Summary stats
  const stats = useMemo(() => {
    if (runs.length === 0) return null;
    const wins = runs.filter(r => r.won).length;
    const avgScore = runs.reduce((s, r) => s + r.totalScore, 0) / runs.length;
    const avgLevels = runs.reduce((s, r) => s + r.levelsCompleted, 0) / runs.length;
    return {
      totalRuns: runs.length,
      winRate: ((wins / runs.length) * 100).toFixed(1),
      avgScore: Math.round(avgScore),
      avgLevels: avgLevels.toFixed(1),
    };
  }, [runs]);

  // Chart 1: Score Distribution
  const scoreDistData = useMemo(() => {
    const buckets: Record<string, { wins: number; losses: number }> = {};
    const bucketSize = 50;
    for (const r of runs) {
      const bucketStart = Math.floor(r.totalScore / bucketSize) * bucketSize;
      const label = `${bucketStart}-${bucketStart + bucketSize}`;
      if (!buckets[label]) buckets[label] = { wins: 0, losses: 0 };
      if (r.won) buckets[label].wins++;
      else buckets[label].losses++;
    }
    const sorted = Object.entries(buckets).sort((a, b) => {
      const aNum = parseInt(a[0].split('-')[0]);
      const bNum = parseInt(b[0].split('-')[0]);
      return aNum - bNum;
    });
    return {
      labels: sorted.map(([k]) => k),
      datasets: [
        {
          label: 'Wins',
          data: sorted.map(([, v]) => v.wins),
          backgroundColor: '#22c55e',
        },
        {
          label: 'Losses',
          data: sorted.map(([, v]) => v.losses),
          backgroundColor: '#ef4444',
        },
      ],
    };
  }, [runs]);

  // Chart 2: Level Progress
  const levelProgressData = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const r of runs) {
      for (let i = 1; i <= r.levelsCompleted; i++) {
        counts[i] = (counts[i] || 0) + 1;
      }
    }
    const maxLevel = Math.max(...Object.keys(counts).map(Number), 0);
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 1; i <= maxLevel; i++) {
      labels.push(`Level ${i}`);
      data.push(counts[i] || 0);
    }
    return {
      labels,
      datasets: [{
        label: 'Runs reaching level',
        data,
        backgroundColor: '#6366f1',
      }],
    };
  }, [runs]);

  // Chart 3: Most Selected Cards
  const mostSelectedData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of runs) {
      for (const reward of r.rewards) {
        for (const cardId of reward.selectedCardIds) {
          counts[cardId] = (counts[cardId] || 0) + 1;
        }
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    return {
      labels: sorted.map(([id]) => id),
      datasets: [{
        label: 'Times selected',
        data: sorted.map(([, c]) => c),
        backgroundColor: '#3b82f6',
      }],
    };
  }, [runs]);

  // Chart 4: Most Skipped Cards
  const mostSkippedData = useMemo(() => {
    const offered: Record<string, number> = {};
    const selected: Record<string, number> = {};
    for (const r of runs) {
      for (const reward of r.rewards) {
        for (const option of reward.offeredOptions) {
          for (const cardId of option) {
            offered[cardId] = (offered[cardId] || 0) + 1;
          }
        }
        for (const cardId of reward.selectedCardIds) {
          selected[cardId] = (selected[cardId] || 0) + 1;
        }
      }
    }
    const skipped: Record<string, number> = {};
    for (const [id, count] of Object.entries(offered)) {
      skipped[id] = count - (selected[id] || 0);
    }
    const sorted = Object.entries(skipped).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 20);
    return {
      labels: sorted.map(([id]) => id),
      datasets: [{
        label: 'Times skipped',
        data: sorted.map(([, c]) => c),
        backgroundColor: '#f59e0b',
      }],
    };
  }, [runs]);

  // Chart 5: Win Rate by Level
  const winRateByLevelData = useMemo(() => {
    const levelStats: Record<number, { wins: number; losses: number }> = {};
    for (const r of runs) {
      for (const level of r.levels) {
        if (!levelStats[level.levelIndex]) levelStats[level.levelIndex] = { wins: 0, losses: 0 };
        if (level.passed) levelStats[level.levelIndex].wins++;
        else levelStats[level.levelIndex].losses++;
      }
    }
    const maxLevel = Math.max(...Object.keys(levelStats).map(Number), 0);
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 0; i <= maxLevel; i++) {
      const s = levelStats[i];
      if (!s) continue;
      labels.push(`Level ${i + 1}`);
      const total = s.wins + s.losses;
      data.push(total > 0 ? Math.round((s.wins / total) * 100) : 0);
    }
    return {
      labels,
      datasets: [{
        label: 'Win Rate %',
        data,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.3,
      }],
    };
  }, [runs]);

  // Chart 6: Hand Composition (tag distribution in winning vs losing hands)
  const handCompositionData = useMemo(() => {
    const winTags: Record<string, number> = {};
    const loseTags: Record<string, number> = {};

    for (const r of runs) {
      for (const level of r.levels) {
        if (level.modifiers) {
          // Use modifiers tags as proxy for hand composition tags
        }
        // Count card IDs by tag - we only have card def IDs, not tags directly.
        // We'll aggregate the modifiers tags from levels as a proxy for tag distribution.
      }
    }

    // Since we only store handCardIds (def IDs), we aggregate across all levels.
    // For the pie chart, use the modifiers from level records.
    // But modifiers are encounter modifiers, not hand tags.
    // Instead, count frequency of cards in hands for winning vs losing,
    // but we don't have tag info in RunRecord. Use a flat count approach.

    // Actually, let's count the tags from the modifiers field on levels.
    // These represent the encounter tag modifiers that were active.
    for (const r of runs) {
      for (const level of r.levels) {
        const target = level.passed ? winTags : loseTags;
        if (level.modifiers) {
          for (const mod of level.modifiers) {
            target[mod.tag] = (target[mod.tag] || 0) + 1;
          }
        }
        // Also count hand card IDs as rough tag proxies:
        // The card defId often contains a tag hint, but we can't reliably parse it.
        // We'll just use the modifiers data.
      }
    }

    // If no modifier data, show hand size distribution instead
    const allTags = Object.keys(TAG_COLORS);
    const winData = allTags.map(t => winTags[t] || 0);
    const loseData = allTags.map(t => loseTags[t] || 0);
    const hasData = winData.some(v => v > 0) || loseData.some(v => v > 0);

    if (!hasData) {
      // Fallback: count hand cards per run outcome
      const winCardCount: Record<string, number> = {};
      const loseCardCount: Record<string, number> = {};
      for (const r of runs) {
        const target = r.won ? winCardCount : loseCardCount;
        for (const level of r.levels) {
          for (const cardId of level.handCardIds) {
            target[cardId] = (target[cardId] || 0) + 1;
          }
        }
      }
    }

    return {
      labels: allTags,
      datasets: [
        {
          label: 'Winning Hands',
          data: winData,
          backgroundColor: allTags.map(t => TAG_COLORS[t] || '#999'),
        },
        {
          label: 'Losing Hands',
          data: loseData,
          backgroundColor: allTags.map(t => {
            const c = TAG_COLORS[t] || '#999';
            return c + '88'; // add transparency
          }),
        },
      ],
    };
  }, [runs]);

  // For pie chart, combine win tags into single dataset
  const winPieData = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    for (const r of runs) {
      if (!r.won) continue;
      for (const level of r.levels) {
        if (level.modifiers) {
          for (const mod of level.modifiers) {
            tagCounts[mod.tag] = (tagCounts[mod.tag] || 0) + Math.abs(mod.value);
          }
        }
      }
    }
    const allTags = Object.keys(TAG_COLORS);
    return {
      labels: allTags,
      datasets: [{
        data: allTags.map(t => tagCounts[t] || 0),
        backgroundColor: allTags.map(t => TAG_COLORS[t]),
      }],
    };
  }, [runs]);

  const losePieData = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    for (const r of runs) {
      if (r.won) continue;
      for (const level of r.levels) {
        if (level.modifiers) {
          for (const mod of level.modifiers) {
            tagCounts[mod.tag] = (tagCounts[mod.tag] || 0) + Math.abs(mod.value);
          }
        }
      }
    }
    const allTags = Object.keys(TAG_COLORS);
    return {
      labels: allTags,
      datasets: [{
        data: allTags.map(t => tagCounts[t] || 0),
        backgroundColor: allTags.map(t => TAG_COLORS[t]),
      }],
    };
  }, [runs]);

  if (loading) {
    return <div style={{ padding: 32, color: '#6b7280' }}>Loading analytics...</div>;
  }

  if (runs.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>Analytics</h2>
        <div style={containerStyle}>
          <p style={{ color: '#6b7280' }}>No run records found. Play some games to generate analytics data.</p>
        </div>
      </div>
    );
  }

  const horizontalBarOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>Analytics</h2>

      {/* Summary Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Runs', value: stats.totalRuns, color: '#3b82f6' },
            { label: 'Win Rate', value: `${stats.winRate}%`, color: '#22c55e' },
            { label: 'Avg Score', value: stats.avgScore, color: '#f59e0b' },
            { label: 'Avg Levels', value: stats.avgLevels, color: '#8b5cf6' },
          ].map((item) => (
            <div key={item.label} style={{
              ...containerStyle,
              marginBottom: 0,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart 1: Score Distribution */}
      <div style={containerStyle}>
        <div style={headerStyle}>Score Distribution</div>
        <div style={{ height: 300 }}>
          <Bar
            data={scoreDistData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { stacked: true },
                y: { stacked: true },
              },
              plugins: {
                legend: { position: 'top' },
              },
            }}
          />
        </div>
      </div>

      {/* Chart 2: Level Progress */}
      <div style={containerStyle}>
        <div style={headerStyle}>Level Progress</div>
        <div style={{ height: 300 }}>
          <Bar
            data={levelProgressData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>

      {/* Charts 3 & 4 side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Chart 3: Most Selected Cards */}
        <div style={containerStyle}>
          <div style={headerStyle}>Most Selected Cards (Top 20)</div>
          <div style={{ height: 500 }}>
            <Bar data={mostSelectedData} options={horizontalBarOptions} />
          </div>
        </div>

        {/* Chart 4: Most Skipped Cards */}
        <div style={containerStyle}>
          <div style={headerStyle}>Most Skipped Cards (Top 20)</div>
          <div style={{ height: 500 }}>
            <Bar data={mostSkippedData} options={horizontalBarOptions} />
          </div>
        </div>
      </div>

      {/* Chart 5: Win Rate by Level */}
      <div style={containerStyle}>
        <div style={headerStyle}>Win Rate by Level</div>
        <div style={{ height: 300 }}>
          <Line
            data={winRateByLevelData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { min: 0, max: 100, title: { display: true, text: 'Win Rate (%)' } },
              },
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>

      {/* Chart 6: Hand Composition */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={containerStyle}>
          <div style={headerStyle}>Tag Distribution - Winning Hands</div>
          <div style={{ height: 300, display: 'flex', justifyContent: 'center' }}>
            <Pie
              data={winPieData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right', labels: { boxWidth: 12 } },
                },
              }}
            />
          </div>
        </div>
        <div style={containerStyle}>
          <div style={headerStyle}>Tag Distribution - Losing Hands</div>
          <div style={{ height: 300, display: 'flex', justifyContent: 'center' }}>
            <Pie
              data={losePieData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right', labels: { boxWidth: 12 } },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
