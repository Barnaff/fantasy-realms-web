import React, { useState, useMemo, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { scoreHand } from '../../src/engine/scoring';
import type { CardDef, CardInstance, Tag, CardRarity } from '../../src/types/card';
import type { ScoreResult, ScoreBreakdownEntry } from '../../src/types/game';
import { CARD_DEFS as STATIC_CARDS } from '../../src/data/cards';
import { CardPreviewMini } from '../components/CardPreviewMini';

const RARITY_ORDER: CardRarity[] = ['starting', 'common', 'rare', 'epic'];
const RARITY_COLORS_HEX: Record<CardRarity, string> = {
  starting: '#9ca3af', common: '#22c55e', rare: '#3b82f6', epic: '#f59e0b',
};

const TAG_COLORS: Record<string, string> = {
  Beast: '#22c55e', Fire: '#ef4444', Weather: '#60a5fa',
  Leader: '#c9a227', Weapon: '#9ca3af', Land: '#854d0e',
  Wild: '#a855f7', Flood: '#0ea5e9', Army: '#6366f1',
  Artifact: '#d97706', Wizard: '#7c3aed', Undead: '#4a5568',
};

const ALL_TAGS = ['Beast','Fire','Weather','Leader','Weapon','Land','Wild','Flood','Army','Artifact','Wizard','Undead'] as const;

function makeInstance(defId: string, index: number): CardInstance {
  return { instanceId: `sim_${index}_${defId}`, defId, modifiers: [] };
}

export default function SimulatorPage() {
  const [allCards, setAllCards] = useState<CardDef[]>([]);
  const [handIds, setHandIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [maxRarity, setMaxRarity] = useState<CardRarity>('epic');

  // Load cards
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'gameData', 'cards'));
        if (snap.exists()) {
          setAllCards((snap.data().items as CardDef[]) || []);
          return;
        }
      } catch { /* fallback */ }
      setAllCards(STATIC_CARDS as unknown as CardDef[]);
    })();
  }, []);

  // Score calculation
  const scoreResult: ScoreResult | null = useMemo(() => {
    if (handIds.length === 0) return null;
    const instances = handIds.map((id, i) => makeInstance(id, i));
    try {
      return scoreHand(instances);
    } catch {
      return null;
    }
  }, [handIds]);

  // Card lookup
  const cardMap = useMemo(() => {
    const m = new Map<string, CardDef>();
    for (const c of allCards) m.set(c.id, c);
    return m;
  }, [allCards]);

  // Filtered cards for picker
  const filteredCards = useMemo(() => {
    let list = allCards;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || c.id.toLowerCase().includes(s));
    }
    if (tagFilter.size > 0) {
      list = list.filter(c => c.tags.some(t => tagFilter.has(t)));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allCards, search, tagFilter]);

  const addCard = (id: string) => {
    if (handIds.length >= 7) return;
    setHandIds([...handIds, id]);
  };

  const removeCard = (index: number) => {
    setHandIds(handIds.filter((_, i) => i !== index));
  };

  const clearHand = () => setHandIds([]);

  const maxRarityIndex = RARITY_ORDER.indexOf(maxRarity);
  const rarityAllowed = (r: CardRarity) => RARITY_ORDER.indexOf(r) <= maxRarityIndex;

  const fillRandom = () => {
    const remaining = 7 - handIds.length;
    if (remaining <= 0 || allCards.length === 0) return;
    const available = allCards.filter(c => !handIds.includes(c.id) && rarityAllowed(c.rarity));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, remaining).map(c => c.id);
    setHandIds([...handIds, ...picked]);
  };

  const randomizeAll = () => {
    const available = allCards.filter(c => rarityAllowed(c.rarity));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    setHandIds(shuffled.slice(0, 7).map(c => c.id));
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h2 style={S.title}>Hand Simulator</h2>
      <p style={S.subtitle}>Select up to 7 cards to simulate a hand and see the full score breakdown.</p>

      <div style={S.layout}>
        {/* Left: Hand + Score */}
        <div style={S.leftPanel}>
          {/* Hand */}
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <h3 style={S.sectionTitle}>Hand ({handIds.length}/7)</h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Max rarity selector */}
                <span style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>Max:</span>
                {RARITY_ORDER.map(r => (
                  <button
                    key={r}
                    onClick={() => setMaxRarity(r)}
                    style={{
                      fontSize: 9, fontWeight: maxRarity === r ? 700 : 500,
                      padding: '2px 7px', borderRadius: 4,
                      border: `1.5px solid ${RARITY_COLORS_HEX[r]}`,
                      background: maxRarity === r ? RARITY_COLORS_HEX[r] : 'transparent',
                      color: maxRarity === r ? '#fff' : RARITY_COLORS_HEX[r],
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >
                    {r}
                  </button>
                ))}
                <div style={{ width: 1, height: 18, background: '#e5e7eb' }} />
                <button style={S.btnSmall} onClick={fillRandom} disabled={handIds.length >= 7}>
                  Fill Random
                </button>
                <button style={S.btnSmall} onClick={randomizeAll}>
                  Randomize All
                </button>
                <button style={{ ...S.btnSmall, background: '#fee2e2', color: '#dc2626' }} onClick={clearHand}>
                  Clear
                </button>
              </div>
            </div>

            {handIds.length === 0 ? (
              <div style={S.emptyHand}>Click cards below to add them to your hand</div>
            ) : (
              <div style={S.handGrid}>
                {handIds.map((id, i) => {
                  const def = cardMap.get(id);
                  if (!def) return null;
                  const entry = scoreResult?.breakdown[i];
                  const isBlanked = entry?.blanked ?? false;
                  return (
                    <div key={`${i}_${id}`} style={S.handSlotWrapper}>
                      <div style={{ position: 'relative' }}>
                        <CardPreviewMini
                          card={def}
                          width={130}
                          blanked={isBlanked}
                        />
                        <button style={S.removeBtn} onClick={() => removeCard(i)}>✕</button>
                      </div>
                      {/* Score under card */}
                      {entry && (
                        <div style={S.cardScoreSummary}>
                          <div style={S.miniScoreRow}>
                            <span>Base</span>
                            <span>{entry.baseValue}</span>
                          </div>
                          {entry.bonuses.map((b, bi) => (
                            <div key={`b${bi}`} style={{ ...S.miniScoreRow, color: '#166534' }}>
                              <span>{b.description}</span>
                              <span>+{b.value}</span>
                            </div>
                          ))}
                          {entry.penalties.map((p, pi) => (
                            <div key={`p${pi}`} style={{ ...S.miniScoreRow, color: '#dc2626' }}>
                              <span>{p.description}</span>
                              <span>{p.value}</span>
                            </div>
                          ))}
                          {isBlanked && (
                            <div style={{ ...S.miniScoreRow, color: '#dc2626', fontWeight: 700 }}>
                              <span>BLANKED</span><span>= 0</span>
                            </div>
                          )}
                          <div style={{
                            ...S.miniScoreRow,
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: 3,
                            marginTop: 2,
                            fontWeight: 800,
                            fontSize: 13,
                            color: entry.finalValue >= 0 ? '#2c1810' : '#dc2626',
                          }}>
                            <span>Total</span>
                            <span>{entry.finalValue}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {handIds.length < 7 && (
                  <div style={S.emptySlot}>
                    <span style={{ fontSize: 28, color: '#ccc' }}>+</span>
                    <span style={{ fontSize: 10, color: '#aaa' }}>Add card</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Score Breakdown */}
          {scoreResult && (
            <div style={S.section}>
              <div style={S.sectionHeader}>
                <h3 style={S.sectionTitle}>Score Breakdown</h3>
              </div>

              {/* Total */}
              <div style={S.totalScore}>
                <span style={{ fontSize: 14, color: '#666' }}>Total Score</span>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#2c1810' }}>
                  {scoreResult.totalScore}
                </span>
              </div>

              {/* Per-card breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scoreResult.breakdown.map((entry, i) => (
                  <BreakdownRow key={i} entry={entry} />
                ))}
              </div>

              {/* Relic bonuses */}
              {scoreResult.relicBonuses.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Relic Bonuses</h4>
                  {scoreResult.relicBonuses.map((rb, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#166534' }}>
                      +{rb.value} from {rb.relicName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Card Picker */}
        <div style={S.rightPanel}>
          <div style={S.section}>
            <h3 style={S.sectionTitle}>Card Pool ({filteredCards.length})</h3>

            {/* Filters */}
            <div style={{ marginBottom: 12 }}>
              <input
                style={{ ...S.searchInput, width: '100%', marginBottom: 8 }}
                placeholder="Search cards..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {ALL_TAGS.map(t => {
                  const active = tagFilter.has(t);
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        const next = new Set(tagFilter);
                        if (active) next.delete(t); else next.add(t);
                        setTagFilter(next);
                      }}
                      style={{
                        fontSize: 10,
                        fontWeight: active ? 700 : 500,
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: `1px solid ${TAG_COLORS[t] || '#ccc'}`,
                        background: active ? (TAG_COLORS[t] || '#888') : 'transparent',
                        color: active ? '#fff' : (TAG_COLORS[t] || '#888'),
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
                {tagFilter.size > 0 && (
                  <button
                    onClick={() => setTagFilter(new Set())}
                    style={{ fontSize: 10, padding: '2px 6px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', background: '#f3f4f6', color: '#888' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Card grid */}
            <div style={S.pickerGrid}>
              {filteredCards.map(card => {
                const inHand = handIds.includes(card.id);
                return (
                  <div key={card.id} style={{ position: 'relative', opacity: inHand ? 0.4 : 1 }}>
                    <CardPreviewMini
                      card={card}
                      width={140}
                      showEffects
                      onClick={!inHand && handIds.length < 7 ? () => addCard(card.id) : undefined}
                      style={{ cursor: inHand || handIds.length >= 7 ? 'default' : 'pointer' }}
                    />
                    {inHand && <div style={S.inHandBadge}>In Hand</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   Breakdown Row (detailed)
   ═══════════════════════════════════════════ */
function BreakdownRow({ entry }: { entry: ScoreBreakdownEntry }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      background: entry.blanked ? '#f9fafb' : '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '8px 12px',
      borderLeft: `4px solid ${entry.blanked ? '#999' : entry.finalValue >= 0 ? '#22c55e' : '#dc2626'}`,
    }}>
      {/* Header */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#aaa' }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ fontWeight: 600, fontSize: 13, color: entry.blanked ? '#999' : '#2c1810' }}>
            {entry.cardName}
          </span>
          {entry.blanked && (
            <span style={{ fontSize: 9, background: '#dc2626', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
              BLANKED
            </span>
          )}
        </div>
        <span style={{
          fontWeight: 800, fontSize: 16,
          color: entry.blanked ? '#999' : entry.finalValue >= 0 ? '#166534' : '#dc2626',
        }}>
          {entry.finalValue}
        </span>
      </div>

      {/* Details */}
      {expanded && (
        <div style={{ marginTop: 6, paddingLeft: 18 }}>
          <div style={{ ...S.detailRow, color: '#888' }}>
            <span>Base value</span>
            <span>{entry.baseValue}</span>
          </div>

          {entry.bonuses.map((b, i) => (
            <div key={`b${i}`} style={{ ...S.detailRow, color: '#166534' }}>
              <span>{b.description}</span>
              <span>+{b.value}</span>
            </div>
          ))}

          {entry.penalties.map((p, i) => (
            <div key={`p${i}`} style={{ ...S.detailRow, color: '#dc2626' }}>
              <span>{p.description}</span>
              <span>{p.value}</span>
            </div>
          ))}

          {entry.blanked && (
            <div style={{ ...S.detailRow, color: '#dc2626', fontWeight: 700 }}>
              <span>Card is blanked — scores zero</span>
              <span>= 0</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════ */
const S: Record<string, React.CSSProperties> = {
  title: { fontSize: 22, fontWeight: 700, color: '#1f2937', margin: 0 },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 20 },

  layout: { display: 'flex', gap: 24, alignItems: 'flex-start' },
  leftPanel: { flex: 1, minWidth: 0 },
  rightPanel: { width: 420, flexShrink: 0 },

  section: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 },

  handGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  handSlotWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
    width: 130,
  },
  cardScoreSummary: {
    width: '100%',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '4px 6px',
    fontSize: 10,
  },
  miniScoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    lineHeight: 1.6,
    gap: 4,
  },
  emptySlot: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #ddd',
    borderRadius: 8,
    minHeight: 120,
    background: '#fafafa',
  },
  emptyHand: {
    textAlign: 'center' as const,
    color: '#aaa',
    padding: 32,
    fontSize: 14,
  },
  removeBtn: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    background: '#fee2e2',
    border: 'none',
    borderRadius: 4,
    width: 20,
    height: 20,
    fontSize: 10,
    cursor: 'pointer',
    color: '#dc2626',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    lineHeight: 1.6,
  },

  totalScore: {
    textAlign: 'center' as const,
    padding: '12px 0',
    marginBottom: 12,
    background: '#f9fafb',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 2,
  },

  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    lineHeight: 1.8,
  },

  btnSmall: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    background: '#f3f4f6',
    cursor: 'pointer',
    color: '#374151',
  },

  searchInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 12,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    outline: 'none',
  },
  select: {
    padding: '6px 8px',
    fontSize: 12,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    outline: 'none',
    background: '#fff',
  },

  pickerGrid: {
    maxHeight: 'calc(100vh - 280px)',
    overflowY: 'auto' as const,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 8,
    padding: '4px 0',
  },

  tagBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: '#fff',
    padding: '1px 5px',
    borderRadius: 4,
  },
  baseValueBadge: {
    fontWeight: 800,
    fontSize: 13,
    color: '#c9a227',
    background: '#fef3c7',
    padding: '1px 6px',
    borderRadius: 6,
    border: '1px solid #f59e0b40',
  },
  inHandBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    background: '#22c55e',
    color: '#fff',
    fontSize: 8,
    fontWeight: 700,
    padding: '2px 5px',
    borderRadius: 4,
  },
};
