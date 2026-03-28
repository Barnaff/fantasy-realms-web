import React, { useState } from 'react';

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

export const SCORING_EFFECT_IDS = [
  'bonusPerTag', 'penaltyPerTag', 'bonusIfTagPresent', 'bonusIfTagAbsent',
  'penaltyIfTagAbsent', 'blankTag', 'blankIfTagPresent', 'blankIfTagAbsent',
  'flatBonus', 'flatPenalty', 'bonusIfCardPresent', 'penaltyIfCardPresent',
  'bonusPerOtherTag', 'clearPenaltiesOnTag', 'copyTagsOfHighest',
] as const;

export interface ScoringEffect {
  description: string;
  effectId: string;
  params: Record<string, unknown>;
}

/* ══════════════════════════════════════════
   Effect metadata: category, description, param schema
   ══════════════════════════════════════════ */
interface ParamField {
  key: string;
  label: string;
  type: 'number' | 'tag' | 'cardId' | 'text';
}

interface EffectMeta {
  label: string;
  category: 'bonus' | 'penalty' | 'blank' | 'utility';
  description: string;
  params: ParamField[];
  generateText: (params: Record<string, unknown>) => string;
}

const EFFECT_META: Record<string, EffectMeta> = {
  bonusPerTag: {
    label: 'Bonus Per Tag',
    category: 'bonus',
    description: 'Adds bonus for EACH card with the specified tag in hand.',
    params: [
      { key: 'tag', label: 'Tag', type: 'tag' },
      { key: 'bonus', label: 'Bonus per card', type: 'number' },
    ],
    generateText: p => `+${p.bonus || 0} for each ${p.tag || '?'} in hand`,
  },
  penaltyPerTag: {
    label: 'Penalty Per Tag',
    category: 'penalty',
    description: 'Subtracts points for each card with the specified tag.',
    params: [
      { key: 'tag', label: 'Tag', type: 'tag' },
      { key: 'penalty', label: 'Penalty per card', type: 'number' },
    ],
    generateText: p => `-${p.penalty || 0} for each ${p.tag || '?'}`,
  },
  bonusIfTagPresent: {
    label: 'Bonus If Tag Present',
    category: 'bonus',
    description: 'Bonus if at least one card of the tag is in hand.',
    params: [
      { key: 'tag', label: 'Tag', type: 'tag' },
      { key: 'bonus', label: 'Bonus', type: 'number' },
    ],
    generateText: p => `+${p.bonus || 0} if any ${p.tag || '?'} is present`,
  },
  bonusIfTagAbsent: {
    label: 'Bonus If Tag Absent',
    category: 'bonus',
    description: 'Bonus if NO cards of the tag are in hand.',
    params: [
      { key: 'tag', label: 'Tag', type: 'tag' },
      { key: 'bonus', label: 'Bonus', type: 'number' },
    ],
    generateText: p => `+${p.bonus || 0} if no ${p.tag || '?'} in hand`,
  },
  penaltyIfTagAbsent: {
    label: 'Penalty If Tag Absent',
    category: 'penalty',
    description: 'Penalty if no cards of the tag are present.',
    params: [
      { key: 'tag', label: 'Tag', type: 'tag' },
      { key: 'penalty', label: 'Penalty', type: 'number' },
    ],
    generateText: p => `-${p.penalty || 0} unless any ${p.tag || '?'} is present`,
  },
  blankTag: {
    label: 'Blank Tag',
    category: 'blank',
    description: 'BLANKS all cards with the specified tag. Blanked cards score 0.',
    params: [
      { key: 'tag', label: 'Tag to blank', type: 'tag' },
    ],
    generateText: p => `Blanks all ${p.tag || '?'}`,
  },
  blankIfTagPresent: {
    label: 'Blanked If Tag Present',
    category: 'blank',
    description: 'THIS card is blanked if a card with the specified tag is in hand.',
    params: [
      { key: 'tag', label: 'Tag', type: 'tag' },
    ],
    generateText: p => `BLANKED if any ${p.tag || '?'} is present`,
  },
  blankIfTagAbsent: {
    label: 'Blanked If Tag Absent',
    category: 'blank',
    description: 'THIS card is blanked if no cards of the specified tag are in hand.',
    params: [
      { key: 'tag', label: 'Tag', type: 'tag' },
    ],
    generateText: p => `BLANKED unless any ${p.tag || '?'} is present`,
  },
  flatBonus: {
    label: 'Flat Bonus',
    category: 'bonus',
    description: 'Simple flat bonus always added to score.',
    params: [
      { key: 'bonus', label: 'Bonus', type: 'number' },
    ],
    generateText: p => `+${p.bonus || 0} flat bonus`,
  },
  flatPenalty: {
    label: 'Flat Penalty',
    category: 'penalty',
    description: 'Simple flat penalty always subtracted.',
    params: [
      { key: 'penalty', label: 'Penalty', type: 'number' },
    ],
    generateText: p => `-${p.penalty || 0} flat penalty`,
  },
  bonusIfCardPresent: {
    label: 'Bonus If Card Present',
    category: 'bonus',
    description: 'Bonus if a specific card (by ID) is in hand.',
    params: [
      { key: 'cardId', label: 'Card ID', type: 'cardId' },
      { key: 'bonus', label: 'Bonus', type: 'number' },
    ],
    generateText: p => `+${p.bonus || 0} if ${p.cardId || '?'} is in hand`,
  },
  penaltyIfCardPresent: {
    label: 'Penalty If Card Present',
    category: 'penalty',
    description: 'Penalty if a specific card is in hand.',
    params: [
      { key: 'cardId', label: 'Card ID', type: 'cardId' },
      { key: 'penalty', label: 'Penalty', type: 'number' },
    ],
    generateText: p => `-${p.penalty || 0} if ${p.cardId || '?'} is in hand`,
  },
  bonusPerOtherTag: {
    label: 'Bonus Per Other Tag',
    category: 'bonus',
    description: 'Bonus for each OTHER card (not this one) with the specified tag.',
    params: [
      { key: 'tag', label: 'Tag', type: 'tag' },
      { key: 'bonus', label: 'Bonus per card', type: 'number' },
    ],
    generateText: p => `+${p.bonus || 0} for each other ${p.tag || '?'} in hand`,
  },
  clearPenaltiesOnTag: {
    label: 'Clear Penalties On Tag',
    category: 'utility',
    description: 'Removes all penalties from cards with the specified tag.',
    params: [
      { key: 'tag', label: 'Tag', type: 'tag' },
    ],
    generateText: p => `Clears penalties on all ${p.tag || '?'}`,
  },
  copyTagsOfHighest: {
    label: 'Copy Tags Of Highest',
    category: 'utility',
    description: 'Copies the tags of the highest base-value card in hand.',
    params: [],
    generateText: () => 'Copies tags of highest-value card',
  },
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  bonus: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  penalty: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
  blank: { bg: '#fef2f2', border: '#7f1d1d', text: '#7f1d1d' },
  utility: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
};

/* ══════════════════════════════════════════
   Main Effect Editor Component
   ══════════════════════════════════════════ */
export function EffectEditorRow({
  effect,
  cardIds,
  onChange,
  onRemove,
}: {
  effect: ScoringEffect;
  cardIds: string[];
  onChange: (eff: ScoringEffect) => void;
  onRemove: () => void;
}) {
  const [showJson, setShowJson] = useState(false);
  const [useCustomDesc, setUseCustomDesc] = useState(!!effect.description);

  const meta = EFFECT_META[effect.effectId];
  const cat = meta?.category || 'bonus';
  const colors = CATEGORY_COLORS[cat];

  const autoDesc = meta?.generateText(effect.params) || '';
  const displayDesc = useCustomDesc && effect.description ? effect.description : autoDesc;

  const setEffectId = (id: string) => {
    const newMeta = EFFECT_META[id];
    // Build default params from the new effect's schema
    const defaultParams: Record<string, unknown> = {};
    for (const p of newMeta?.params || []) {
      if (p.type === 'number') defaultParams[p.key] = 0;
      else if (p.type === 'tag') defaultParams[p.key] = 'Beast';
      else defaultParams[p.key] = '';
    }
    onChange({
      ...effect,
      effectId: id,
      params: defaultParams,
      description: '',
    });
    setUseCustomDesc(false);
  };

  const setParam = (key: string, value: unknown) => {
    const newParams = { ...effect.params, [key]: value };
    const newAutoDesc = meta?.generateText(newParams) || '';
    onChange({
      ...effect,
      params: newParams,
      description: useCustomDesc ? effect.description : newAutoDesc,
    });
  };

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}30`,
      borderLeft: `4px solid ${colors.border}`,
      borderRadius: 8,
      padding: 12,
    }}>
      {/* Header: type selector + category badge + actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <select
          value={effect.effectId}
          onChange={e => setEffectId(e.target.value)}
          style={{ ...s.select, flex: 1 }}
        >
          <optgroup label="Bonuses">
            {Object.entries(EFFECT_META).filter(([, m]) => m.category === 'bonus').map(([id, m]) => (
              <option key={id} value={id}>{m.label}</option>
            ))}
          </optgroup>
          <optgroup label="Penalties">
            {Object.entries(EFFECT_META).filter(([, m]) => m.category === 'penalty').map(([id, m]) => (
              <option key={id} value={id}>{m.label}</option>
            ))}
          </optgroup>
          <optgroup label="Blanking">
            {Object.entries(EFFECT_META).filter(([, m]) => m.category === 'blank').map(([id, m]) => (
              <option key={id} value={id}>{m.label}</option>
            ))}
          </optgroup>
          <optgroup label="Utility">
            {Object.entries(EFFECT_META).filter(([, m]) => m.category === 'utility').map(([id, m]) => (
              <option key={id} value={id}>{m.label}</option>
            ))}
          </optgroup>
        </select>

        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          padding: '2px 6px', borderRadius: 4,
          background: colors.border, color: '#fff',
        }}>
          {cat}
        </span>

        <button onClick={() => setShowJson(!showJson)} style={s.iconBtn} title="Show JSON">
          {'{ }'}
        </button>
        <button onClick={onRemove} style={{ ...s.iconBtn, background: '#fee2e2', color: '#dc2626' }} title="Remove">
          ✕
        </button>
      </div>

      {/* Description */}
      {meta && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 8, lineHeight: 1.4 }}>
          {meta.description}
        </div>
      )}

      {/* Param fields — custom UI per type */}
      {meta && meta.params.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          {meta.params.map(p => (
            <ParamInput
              key={p.key}
              field={p}
              value={effect.params[p.key]}
              cardIds={cardIds}
              onChange={v => setParam(p.key, v)}
            />
          ))}
        </div>
      )}

      {/* Generated card text */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        padding: '6px 10px',
        marginTop: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#888' }}>Card Text</span>
          <label style={{ fontSize: 10, color: '#888', cursor: 'pointer', marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={useCustomDesc}
              onChange={e => {
                setUseCustomDesc(e.target.checked);
                if (!e.target.checked) {
                  onChange({ ...effect, description: autoDesc });
                }
              }}
              style={{ marginRight: 4 }}
            />
            Custom override
          </label>
        </div>

        {useCustomDesc ? (
          <input
            style={s.input}
            value={effect.description || ''}
            onChange={e => onChange({ ...effect, description: e.target.value })}
            placeholder="Custom card text..."
          />
        ) : (
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: colors.text,
            padding: '2px 0',
          }}>
            {autoDesc || '(configure params above)'}
          </div>
        )}
      </div>

      {/* JSON preview */}
      {showJson && (
        <pre style={{
          background: '#1e1e2e',
          color: '#a6e3a1',
          borderRadius: 6,
          padding: 10,
          fontSize: 10,
          marginTop: 8,
          overflow: 'auto',
          lineHeight: 1.4,
        }}>
          {JSON.stringify({
            description: displayDesc,
            effectId: effect.effectId,
            params: effect.params,
          }, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Param Input — renders appropriate control per type
   ══════════════════════════════════════════ */
function ParamInput({
  field, value, cardIds, onChange,
}: {
  field: ParamField;
  value: unknown;
  cardIds: string[];
  onChange: (v: unknown) => void;
}) {
  return (
    <div style={{ minWidth: 120 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: '#555', display: 'block', marginBottom: 2 }}>
        {field.label}
      </label>

      {field.type === 'tag' && (
        <select
          style={s.select}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select tag...</option>
          {ALL_TAGS.map(t => (
            <option key={t} value={t} style={{ color: TAG_COLORS[t] }}>
              {t}
            </option>
          ))}
        </select>
      )}

      {field.type === 'number' && (
        <input
          type="number"
          style={{ ...s.input, width: 80 }}
          value={(value as number) ?? 0}
          onChange={e => onChange(Number(e.target.value))}
        />
      )}

      {field.type === 'cardId' && (
        <select
          style={s.select}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select card...</option>
          {cardIds.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      )}

      {field.type === 'text' && (
        <input
          type="text"
          style={s.input}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/* Shared inline styles */
const s: Record<string, React.CSSProperties> = {
  input: {
    width: '100%',
    padding: '5px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 5,
    fontSize: 12,
    outline: 'none',
  },
  select: {
    padding: '5px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 5,
    fontSize: 12,
    outline: 'none',
    background: '#fff',
  },
  iconBtn: {
    background: '#f3f4f6',
    border: '1px solid #ddd',
    borderRadius: 4,
    width: 28,
    height: 28,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#555',
    flexShrink: 0,
  },
};

/* Re-export for use in CardsPage */
export { EFFECT_META };
