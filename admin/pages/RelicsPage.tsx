import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';

const RELIC_EFFECT_IDS = [
  'tagBaseValueBonus', 'tagScoringBonus', 'riverSizeBonus', 'goldBonus',
  'healPool', 'flatScoreBonus', 'extraActions', 'blankReduction',
  'scoreMultiplier', 'handSizeBonus', 'discardEffectBonus', 'startingDraw',
] as const;

const RARITIES = ['common', 'rare', 'legendary'] as const;

interface Relic {
  id: string;
  name: string;
  description: string;
  rarity: string;
  effectId: string;
  params: Record<string, unknown>;
}

export default function RelicsPage() {
  const [relics, setRelics] = useState<Relic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Relic | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadRelics = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'gameData', 'relics'));
      if (snap.exists()) {
        setRelics(snap.data().items || []);
      }
    } catch (err) {
      console.error('Failed to load relics:', err);
      showToast('Failed to load relics', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadRelics(); }, [loadRelics]);

  const saveRelic = async (updated: Relic) => {
    try {
      const newRelics = relics.map((r) => (r.id === updated.id ? updated : r));
      await setDoc(doc(db, 'gameData', 'relics'), { items: newRelics });
      setRelics(newRelics);
      setExpandedId(null);
      setEditData(null);
      showToast(`Saved "${updated.name}"`);
    } catch (err) {
      console.error('Failed to save relic:', err);
      showToast('Failed to save relic', 'error');
    }
  };

  const addRelic = () => {
    const newRelic: Relic = {
      id: `relic_${Date.now()}`,
      name: 'New Relic',
      description: '',
      rarity: 'common',
      effectId: 'flatScoreBonus',
      params: {},
    };
    setRelics([newRelic, ...relics]);
    setExpandedId(newRelic.id);
    setEditData({ ...newRelic });
  };

  const deleteRelic = async (id: string) => {
    const newRelics = relics.filter((r) => r.id !== id);
    try {
      await setDoc(doc(db, 'gameData', 'relics'), { items: newRelics });
      setRelics(newRelics);
      setExpandedId(null);
      setEditData(null);
      showToast('Relic deleted');
    } catch (err) {
      console.error('Failed to delete:', err);
      showToast('Failed to delete relic', 'error');
    }
  };

  const toggleExpand = (relic: Relic) => {
    if (expandedId === relic.id) {
      setExpandedId(null);
      setEditData(null);
    } else {
      setExpandedId(relic.id);
      setEditData(JSON.parse(JSON.stringify(relic)));
    }
  };

  if (loading) return <div className="loading">Loading relics...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Relics ({relics.length})</h2>
        <button className="btn btn-primary" onClick={addRelic}>+ Add Relic</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Rarity</th>
            <th>Effect ID</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {relics.map((relic) => (
            <React.Fragment key={relic.id}>
              <tr
                className={expandedId === relic.id ? 'expanded' : ''}
                onClick={() => toggleExpand(relic)}
              >
                <td style={{ fontWeight: 600 }}>{relic.name}</td>
                <td>
                  <span className={`rarity-${relic.rarity}`}>
                    {relic.rarity.charAt(0).toUpperCase() + relic.rarity.slice(1)}
                  </span>
                </td>
                <td><code>{relic.effectId}</code></td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {relic.description}
                </td>
              </tr>
              {expandedId === relic.id && editData && (
                <tr className="edit-panel">
                  <td colSpan={4}>
                    <div onClick={(e) => e.stopPropagation()}>
                      <div className="edit-grid">
                        <div className="edit-field">
                          <label>Name</label>
                          <input
                            type="text"
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          />
                        </div>
                        <div className="edit-field">
                          <label>Rarity</label>
                          <select
                            value={editData.rarity}
                            onChange={(e) => setEditData({ ...editData, rarity: e.target.value })}
                          >
                            {RARITIES.map((r) => (
                              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="edit-field">
                          <label>Effect ID</label>
                          <select
                            value={editData.effectId}
                            onChange={(e) => setEditData({ ...editData, effectId: e.target.value })}
                          >
                            {RELIC_EFFECT_IDS.map((id) => (
                              <option key={id} value={id}>{id}</option>
                            ))}
                          </select>
                        </div>
                        <div className="edit-field">
                          <label>Params (JSON)</label>
                          <input
                            type="text"
                            value={JSON.stringify(editData.params || {})}
                            onChange={(e) => {
                              try {
                                setEditData({ ...editData, params: JSON.parse(e.target.value) });
                              } catch { /* allow typing */ }
                            }}
                            style={{ fontFamily: "'Courier New', monospace" }}
                          />
                        </div>
                        <div className="edit-field full-width">
                          <label>Description</label>
                          <textarea
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="edit-actions">
                        <button className="btn btn-success" onClick={() => saveRelic(editData)}>Save Relic</button>
                        <button className="btn btn-secondary" onClick={() => { setExpandedId(null); setEditData(null); }}>Cancel</button>
                        <button className="btn btn-danger" onClick={() => deleteRelic(relic.id)} style={{ marginLeft: 'auto' }}>Delete Relic</button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {relics.length === 0 && (
            <tr>
              <td colSpan={4}>
                <div className="empty-state"><p>No relics found.</p></div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
