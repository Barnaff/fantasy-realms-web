import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../src/firebase/config';
import { EffectEditorRow, EFFECT_META, type ScoringEffect } from '../components/EffectEditor';

const ALL_TAGS = [
  'Beast', 'Fire', 'Weather', 'Leader', 'Weapon', 'Land',
  'Wild', 'Flood', 'Army', 'Artifact', 'Wizard', 'Undead',
] as const;

const TAG_COLORS: Record<string, string> = {
  Beast: '#22c55e', Fire: '#ef4444', Weather: '#60a5fa',
  Leader: '#c9a227', Weapon: '#9ca3af', Land: '#854d0e',
  Wild: '#a855f7', Flood: '#0ea5e9', Army: '#6366f1',
  Artifact: '#d97706', Wizard: '#7c3aed', Undead: '#4a5568',
};

interface DiscardEffect {
  description: string;
  effectId: string;
  params: Record<string, unknown>;
}

type CardRarity = 'starting' | 'common' | 'rare' | 'epic';

const RARITY_COLORS_HEX: Record<CardRarity, string> = {
  starting: '#9ca3af', common: '#22c55e', rare: '#3b82f6', epic: '#f59e0b',
};

interface Card {
  id: string;
  name: string;
  tags: string[];
  baseValue: number;
  rarity: CardRarity;
  flavor?: string;
  art?: string;
  scoringEffects: ScoringEffect[];
  discardEffect: DiscardEffect | null;
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [rarityFilter, setRarityFilter] = useState<Set<CardRarity>>(new Set());
  const [powerMin, setPowerMin] = useState('');
  const [powerMax, setPowerMax] = useState('');
  const [effectFilter, setEffectFilter] = useState<'all' | 'has_bonus' | 'has_penalty' | 'has_blank' | 'no_effects'>('all');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadCards = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'gameData', 'cards'));
      if (snap.exists()) setCards(snap.data().items || []);
    } catch (err) {
      console.error('Failed to load cards:', err);
      showToast('Failed to load cards', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const saveCard = async (updated: Card) => {
    try {
      const isNew = !cards.find(c => c.id === updated.id);
      const newCards = isNew ? [updated, ...cards] : cards.map(c => c.id === updated.id ? updated : c);
      await setDoc(doc(db, 'gameData', 'cards'), { items: newCards });
      setCards(newCards);
      setEditCard(null);
      showToast(`Saved "${updated.name}"`);
    } catch (err) {
      console.error('Failed to save card:', err);
      showToast('Failed to save card', 'error');
    }
  };

  const deleteCard = async (id: string) => {
    if (!confirm('Delete this card permanently?')) return;
    const newCards = cards.filter(c => c.id !== id);
    try {
      await setDoc(doc(db, 'gameData', 'cards'), { items: newCards });
      setCards(newCards);
      setEditCard(null);
      showToast('Card deleted');
    } catch (err) {
      console.error('Failed to delete:', err);
      showToast('Failed to delete card', 'error');
    }
  };

  const addCard = () => {
    const newCard: Card = {
      id: `card-${Date.now()}`,
      name: 'New Card',
      tags: [],
      baseValue: 0,
      rarity: 'common' as CardRarity,
      flavor: '',
      scoringEffects: [],
      discardEffect: null,
    };
    setEditCard(newCard);
  };

  const filtered = cards.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchesTag = tagFilter.size === 0 || c.tags.some(t => tagFilter.has(t));
    const matchesRarity = rarityFilter.size === 0 || rarityFilter.has(c.rarity);
    const pMin = powerMin !== '' ? Number(powerMin) : -Infinity;
    const pMax = powerMax !== '' ? Number(powerMax) : Infinity;
    const matchesPower = c.baseValue >= pMin && c.baseValue <= pMax;

    let matchesEffect = true;
    if (effectFilter !== 'all') {
      const effects = c.scoringEffects || [];
      const hasBonus = effects.some(e => !e.effectId.includes('penalty') && !e.effectId.includes('blank'));
      const hasPenalty = effects.some(e => e.effectId.includes('penalty'));
      const hasBlank = effects.some(e => e.effectId.includes('blank'));
      if (effectFilter === 'has_bonus') matchesEffect = hasBonus;
      else if (effectFilter === 'has_penalty') matchesEffect = hasPenalty;
      else if (effectFilter === 'has_blank') matchesEffect = hasBlank;
      else if (effectFilter === 'no_effects') matchesEffect = effects.length === 0;
    }

    return matchesSearch && matchesTag && matchesRarity && matchesPower && matchesEffect;
  });

  if (loading) return <div className="loading">Loading cards...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Cards ({cards.length})</h2>
        <button className="btn btn-primary" onClick={addCard}>+ Add Card</button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search cards by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
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
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                padding: '3px 10px',
                borderRadius: 5,
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
            style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer', background: '#f3f4f6', color: '#888' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Rarity + Power + Effect filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'center' }}>
        {/* Rarity */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Rarity:</span>
          {(['starting', 'common', 'rare', 'epic'] as CardRarity[]).map(r => {
            const active = rarityFilter.has(r);
            return (
              <button
                key={r}
                onClick={() => {
                  const next = new Set(rarityFilter);
                  if (active) next.delete(r); else next.add(r);
                  setRarityFilter(next);
                }}
                style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  padding: '2px 8px', borderRadius: 4,
                  border: `1.5px solid ${RARITY_COLORS_HEX[r]}`,
                  background: active ? RARITY_COLORS_HEX[r] : 'transparent',
                  color: active ? '#fff' : RARITY_COLORS_HEX[r],
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Power range */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Power:</span>
          <input
            type="number"
            placeholder="Min"
            value={powerMin}
            onChange={e => setPowerMin(e.target.value)}
            style={{ width: 50, padding: '3px 6px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
          <span style={{ fontSize: 11, color: '#aaa' }}>–</span>
          <input
            type="number"
            placeholder="Max"
            value={powerMax}
            onChange={e => setPowerMax(e.target.value)}
            style={{ width: 50, padding: '3px 6px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        {/* Effect filter */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Effects:</span>
          {([
            { value: 'all', label: 'All', color: '#374151' },
            { value: 'has_bonus', label: '✦ Bonus', color: '#166534' },
            { value: 'has_penalty', label: '⚠ Penalty', color: '#dc2626' },
            { value: 'has_blank', label: '⊘ Blank', color: '#7f1d1d' },
            { value: 'no_effects', label: '∅ None', color: '#888' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setEffectFilter(opt.value)}
              style={{
                fontSize: 10, fontWeight: effectFilter === opt.value ? 700 : 500,
                padding: '2px 8px', borderRadius: 4,
                border: `1.5px solid ${effectFilter === opt.value ? (opt.color || '#374151') : '#d1d5db'}`,
                background: effectFilter === opt.value ? `${opt.color || '#374151'}15` : 'transparent',
                color: effectFilter === opt.value ? (opt.color || '#374151') : '#888',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Active filter count */}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>
          Showing {filtered.length} of {cards.length}
        </span>
      </div>

      {/* Card Grid */}
      <div style={styles.cardGrid}>
        {filtered.map(card => (
          <div
            key={card.id}
            style={styles.cardItem}
            onClick={() => setEditCard(JSON.parse(JSON.stringify(card)))}
          >
            <CardMiniPreview card={card} />
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: 40 }}>
            No cards found.
          </div>
        )}
      </div>

      {/* Modal Editor */}
      {editCard && (
        <CardEditorModal
          card={editCard}
          allCards={cards}
          onChange={setEditCard}
          onSave={() => saveCard(editCard)}
          onCancel={() => setEditCard(null)}
          onDelete={() => deleteCard(editCard.id)}
        />
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   Mini Card Preview (grid item)
   ═══════════════════════════════════════════════════ */
function CardMiniPreview({ card }: { card: Card }) {
  const primaryTag = card.tags[0] || 'Weapon';
  const color = TAG_COLORS[primaryTag] || '#888';
  const artUrl = card.art || `/art/${card.id}.webp`;
  const hasArt = card.art || card.id;

  return (
    <div style={{ ...styles.miniCard, borderColor: color }}>
      {/* Art */}
      <div style={styles.miniArt}>
        {hasArt ? (
          <img
            src={artUrl}
            alt=""
            style={styles.miniArtImg}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        <div style={{ ...styles.miniArtFallback, background: `${color}20` }}>
          <span style={{ fontSize: 18, color, opacity: 0.5 }}>{primaryTag[0]}</span>
        </div>
      </div>

      {/* Value circle */}
      <div style={{ ...styles.valueCircle, background: color }}>{card.baseValue}</div>

      {/* Tags */}
      <div style={styles.miniTags}>
        {card.tags.map(t => (
          <span key={t} style={{ ...styles.miniTag, background: TAG_COLORS[t] || '#888' }}>{t}</span>
        ))}
      </div>

      {/* Name */}
      <div style={styles.miniName}>{card.name}</div>

      {/* Effects text */}
      <div style={styles.miniEffects}>
        {(card.scoringEffects || []).map((eff, i) => {
          const isNeg = eff.effectId.includes('penalty') || eff.effectId.includes('blank');
          const prevEff = i > 0 ? card.scoringEffects[i - 1] : undefined;
          const showOr = prevEff?.orGroup && eff.orGroup && prevEff.orGroup === eff.orGroup;
          return (
            <React.Fragment key={i}>
              {showOr && (
                <div style={{ fontSize: 7, color: '#a09070', fontStyle: 'italic', textAlign: 'center' }}>- or -</div>
              )}
              <div style={{
                fontSize: 9,
                lineHeight: 1.3,
                color: isNeg ? '#dc2626' : '#166534',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {eff.description || formatEffect(eff)}
              </div>
            </React.Fragment>
          );
        })}
        {card.discardEffect && (
          <div style={{ fontSize: 9, color: '#7c3aed', lineHeight: 1.3 }}>
            ⤵ {card.discardEffect.description}
          </div>
        )}
        {(!card.scoringEffects || card.scoringEffects.length === 0) && !card.discardEffect && (
          <div style={{ fontSize: 9, color: '#aaa', fontStyle: 'italic' }}>No effects</div>
        )}
      </div>

      {/* Rarity gem */}
      {card.rarity && card.rarity !== 'starting' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 3 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: RARITY_COLORS_HEX[card.rarity],
            boxShadow: `0 0 4px ${RARITY_COLORS_HEX[card.rarity]}60`,
          }} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Full Card Preview (in modal)
   ═══════════════════════════════════════════════════ */
function CardPreview({ card }: { card: Card }) {
  const primaryTag = card.tags[0] || 'Weapon';
  const color = TAG_COLORS[primaryTag] || '#888';
  const artUrl = card.art || `/art/${card.id}.webp`;

  return (
    <div style={{ ...styles.previewCard, borderColor: color }}>
      {/* Header: value + tags */}
      <div style={styles.previewHeader}>
        <div style={{ ...styles.previewValue, background: color }}>{card.baseValue}</div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {card.tags.map(t => (
            <span key={t} style={{ ...styles.previewTag, background: TAG_COLORS[t] }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Name */}
      <div style={styles.previewName}>{card.name}</div>

      {/* Art */}
      <div style={styles.previewArtBox}>
        <img
          src={artUrl}
          alt=""
          style={styles.previewArtImg}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Scoring effects */}
      <div style={styles.previewEffects}>
        {(card.scoringEffects || []).map((eff, i) => {
          const isNeg = eff.effectId.includes('penalty') || eff.effectId.includes('blank');
          const prevEff = i > 0 ? card.scoringEffects[i - 1] : undefined;
          const showOr = prevEff?.orGroup && eff.orGroup && prevEff.orGroup === eff.orGroup;
          return (
            <React.Fragment key={i}>
              {showOr && (
                <div style={{ fontSize: 9, color: '#a09070', fontStyle: 'italic', textAlign: 'center' }}>- or -</div>
              )}
              <div style={{ fontSize: 10, color: isNeg ? '#dc2626' : '#166534', lineHeight: 1.3 }}>
                {eff.description || formatEffect(eff)}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Flavor */}
      {card.flavor && (
        <div style={styles.previewFlavor}>{card.flavor}</div>
      )}
    </div>
  );
}

function formatEffect(eff: ScoringEffect): string {
  const meta = EFFECT_META[eff.effectId];
  if (meta) return meta.generateText(eff.params);
  return `${eff.effectId}: ${JSON.stringify(eff.params)}`;
}

/* ═══════════════════════════════════════════════════
   Modal Card Editor
   ═══════════════════════════════════════════════════ */
function CardEditorModal({
  card, allCards, onChange, onSave, onCancel, onDelete,
}: {
  card: Card;
  allCards: Card[];
  onChange: (c: Card) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const update = (fields: Partial<Card>) => onChange({ ...card, ...fields });
  const [uploading, setUploading] = useState(false);

  const toggleTag = (tag: string) => {
    const tags = card.tags.includes(tag)
      ? card.tags.filter(t => t !== tag)
      : [...card.tags, tag];
    update({ tags });
  };

  const updateEffect = (index: number, newEff: ScoringEffect) => {
    const effects = [...(card.scoringEffects || [])];
    effects[index] = newEff;
    update({ scoringEffects: effects });
  };

  const addEffect = () => {
    update({
      scoringEffects: [...(card.scoringEffects || []), { description: '', effectId: 'flatBonus', params: {} }],
    });
  };

  const removeEffect = (index: number) => {
    const effects = [...(card.scoringEffects || [])];
    effects.splice(index, 1);
    update({ scoringEffects: effects });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `card-art/${card.id}.webp`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      update({ art: url });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onCancel}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 18 }}>
            {allCards.find(c => c.id === card.id) ? 'Edit Card' : 'New Card'}
          </h3>
          <button onClick={onCancel} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {/* Left: Preview */}
          <div style={styles.previewCol}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textAlign: 'center' }}>Preview</div>
            <CardPreview card={card} />

            {/* Image upload */}
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <label style={styles.uploadBtn}>
                {uploading ? 'Uploading...' : '📷 Upload Art'}
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Right: Editor */}
          <div style={styles.editorCol}>
            {/* Row: Name + Value + ID */}
            <div style={styles.row}>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Name</label>
                <input style={styles.input} value={card.name} onChange={e => update({ name: e.target.value })} />
              </div>
              <div style={{ flex: 0.7 }}>
                <label style={styles.label}>Base Value</label>
                <input style={styles.input} type="number" value={card.baseValue} onChange={e => update({ baseValue: Number(e.target.value) })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>ID</label>
                <input style={{ ...styles.input, opacity: 0.5 }} value={card.id} disabled />
              </div>
            </div>

            {/* Rarity */}
            <div>
              <label style={styles.label}>Rarity</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['starting', 'common', 'rare', 'epic'] as CardRarity[]).map(r => (
                  <button
                    key={r}
                    onClick={() => update({ rarity: r })}
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      fontWeight: card.rarity === r ? 700 : 500,
                      borderRadius: 6,
                      border: `2px solid ${RARITY_COLORS_HEX[r]}`,
                      background: card.rarity === r ? RARITY_COLORS_HEX[r] : 'transparent',
                      color: card.rarity === r ? '#fff' : RARITY_COLORS_HEX[r],
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {r === 'starting' ? '⬡ Starting' : r === 'common' ? '🟢 Common' : r === 'rare' ? '🔵 Rare' : '🟡 Epic'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label style={styles.label}>Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    style={{
                      ...styles.tagBtn,
                      background: card.tags.includes(tag) ? TAG_COLORS[tag] : '#e5e7eb',
                      color: card.tags.includes(tag) ? '#fff' : '#555',
                      fontWeight: card.tags.includes(tag) ? 700 : 400,
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Flavor */}
            <div>
              <label style={styles.label}>Flavor Text</label>
              <textarea
                style={styles.textarea}
                value={card.flavor || ''}
                onChange={e => update({ flavor: e.target.value })}
                rows={2}
              />
            </div>

            {/* Scoring Effects */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <label style={{ ...styles.label, marginBottom: 0 }}>Scoring Effects ({card.scoringEffects?.length || 0})</label>
                <button style={styles.addBtn} onClick={addEffect}>+ Add Effect</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(card.scoringEffects || []).map((eff, i) => (
                  <EffectEditorRow
                    key={i}
                    effect={eff}
                    cardIds={allCards.map(c => c.id)}
                    onChange={newEff => updateEffect(i, newEff)}
                    onRemove={() => removeEffect(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.modalFooter}>
          <button style={styles.btnDanger} onClick={onDelete}>Delete Card</button>
          <div style={{ flex: 1 }} />
          <button style={styles.btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={styles.btnSuccess} onClick={onSave}>Save Card</button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════ */
const styles: Record<string, React.CSSProperties> = {
  // Card Grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
    padding: '12px 0',
  },
  cardItem: {
    cursor: 'pointer',
    transition: 'transform 0.15s',
  },

  // Mini card
  miniCard: {
    background: '#fff',
    borderRadius: 8,
    border: '2px solid',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  miniArt: {
    height: 80,
    position: 'relative',
    overflow: 'hidden',
    background: '#f5f0e8',
  },
  miniArtImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  miniArtFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  valueCircle: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  miniTags: {
    display: 'flex',
    gap: 2,
    padding: '4px 6px',
    flexWrap: 'wrap',
  },
  miniTag: {
    fontSize: 8,
    fontWeight: 700,
    color: '#fff',
    padding: '1px 4px',
    borderRadius: 3,
  },
  miniName: {
    fontSize: 11,
    fontWeight: 700,
    padding: '0 6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: '#2c1810',
  },
  miniEffects: {
    fontSize: 9,
    color: '#888',
    padding: '2px 6px 6px',
  },

  // Preview card (in modal)
  previewCard: {
    width: 220,
    background: '#faf6ed',
    borderRadius: 10,
    border: '3px solid',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 8px 4px',
  },
  previewValue: {
    width: 28,
    height: 28,
    borderRadius: 14,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  previewTag: {
    fontSize: 9,
    fontWeight: 700,
    color: '#fff',
    padding: '1px 5px',
    borderRadius: 4,
  },
  previewName: {
    fontFamily: "'MedievalSharp', cursive, serif",
    fontSize: 14,
    fontWeight: 700,
    padding: '2px 8px 4px',
    color: '#2c1810',
  },
  previewArtBox: {
    height: 100,
    margin: '0 8px',
    borderRadius: 6,
    overflow: 'hidden',
    background: '#e8e0d0',
    border: '1px solid #d4c9b0',
  },
  previewArtImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  previewEffects: {
    padding: '6px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  previewFlavor: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#8a7a5a',
    padding: '0 8px 8px',
    lineHeight: 1.3,
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: '#fff',
    borderRadius: 14,
    maxWidth: 900,
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#888',
    padding: '4px 8px',
  },
  modalBody: {
    display: 'flex',
    gap: 24,
    padding: 20,
    overflow: 'auto',
    flex: 1,
  },
  previewCol: {
    flexShrink: 0,
    width: 230,
  },
  editorCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 0,
  },
  modalFooter: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    borderTop: '1px solid #e5e7eb',
    alignItems: 'center',
  },

  // Form elements
  row: { display: 'flex', gap: 10 },
  label: { fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 3 },
  input: {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },
  tagBtn: {
    border: 'none',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.1s',
  },
  addBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '3px 10px',
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: 600,
  },

  // Effect row
  effectRow: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderLeft: '3px solid',
    borderRadius: 6,
    padding: 10,
  },
  infoBtn: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: 4,
    width: 24,
    height: 24,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: 4,
    width: 24,
    height: 24,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
  },
  infoBox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 4,
    padding: '6px 10px',
    fontSize: 11,
    color: '#1e40af',
    marginTop: 6,
    lineHeight: 1.4,
  },

  // Buttons
  btnSuccess: {
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 20px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  btnSecondary: {
    background: '#e5e7eb',
    color: '#333',
    border: 'none',
    borderRadius: 6,
    padding: '8px 20px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  btnDanger: {
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
  },
  uploadBtn: {
    background: '#f3f4f6',
    border: '1px dashed #d1d5db',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 12,
    cursor: 'pointer',
    color: '#555',
    display: 'inline-block',
  },
};
