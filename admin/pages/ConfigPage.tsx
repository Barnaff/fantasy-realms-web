import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';

interface GameConfig {
  baseGoldReward: {
    normal: number;
    elite: number;
    boss: number;
  };
  goldPerExcessPoints: number;
  startingPoolSize: number;
  maxRiverDiscards: number;
  handSize: number;
  maxHandRedraws: number;
}

const DEFAULT_CONFIG: GameConfig = {
  baseGoldReward: { normal: 10, elite: 25, boss: 50 },
  goldPerExcessPoints: 1,
  startingPoolSize: 10,
  maxRiverDiscards: 3,
  handSize: 7,
  maxHandRedraws: 3,
};

export default function ConfigPage() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'gameData', 'config'));
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as GameConfig);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      showToast('Failed to load config', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'gameData', 'config'), config);
      showToast('Configuration saved');
    } catch (err) {
      console.error('Failed to save config:', err);
      showToast('Failed to save config', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateGold = (tier: 'normal' | 'elite' | 'boss', value: number) => {
    setConfig({
      ...config,
      baseGoldReward: { ...config.baseGoldReward, [tier]: value },
    });
  };

  if (loading) return <div className="loading">Loading configuration...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Game Configuration</h2>
        <button
          className="btn btn-success"
          onClick={saveConfig}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="config-form">
        <div className="config-section">
          <h3>Gold Rewards</h3>
          <div className="config-field">
            <label>Normal Encounter</label>
            <input
              type="number"
              value={config.baseGoldReward.normal}
              onChange={(e) => updateGold('normal', Number(e.target.value))}
            />
          </div>
          <div className="config-field">
            <label>Elite Encounter</label>
            <input
              type="number"
              value={config.baseGoldReward.elite}
              onChange={(e) => updateGold('elite', Number(e.target.value))}
            />
          </div>
          <div className="config-field">
            <label>Boss Encounter</label>
            <input
              type="number"
              value={config.baseGoldReward.boss}
              onChange={(e) => updateGold('boss', Number(e.target.value))}
            />
          </div>
          <div className="config-field">
            <label>Gold per Excess Points</label>
            <input
              type="number"
              value={config.goldPerExcessPoints}
              onChange={(e) => setConfig({ ...config, goldPerExcessPoints: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="config-section">
          <h3>Game Rules</h3>
          <div className="config-field">
            <label>Starting Pool Size</label>
            <input
              type="number"
              value={config.startingPoolSize}
              onChange={(e) => setConfig({ ...config, startingPoolSize: Number(e.target.value) })}
            />
          </div>
          <div className="config-field">
            <label>Max River Discards</label>
            <input
              type="number"
              value={config.maxRiverDiscards}
              onChange={(e) => setConfig({ ...config, maxRiverDiscards: Number(e.target.value) })}
            />
          </div>
          <div className="config-field">
            <label>Hand Size</label>
            <input
              type="number"
              value={config.handSize}
              onChange={(e) => setConfig({ ...config, handSize: Number(e.target.value) })}
            />
          </div>
          <div className="config-field">
            <label>Max Hand Redraws</label>
            <input
              type="number"
              min={0}
              max={10}
              value={config.maxHandRedraws}
              onChange={(e) => setConfig({ ...config, maxHandRedraws: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
