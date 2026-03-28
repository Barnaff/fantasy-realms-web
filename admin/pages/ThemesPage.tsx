import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';

const ALL_TAGS = [
  'Beast', 'Fire', 'Weather', 'Leader', 'Weapon', 'Land',
  'Wild', 'Flood', 'Army', 'Artifact', 'Wizard', 'Undead',
];

interface Modifier {
  tag: string;
  value: number;
}

interface Theme {
  id: string;
  name: string;
  flavor: string;
  modifiers: Modifier[];
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Theme | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadThemes = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'gameData', 'themes'));
      if (snap.exists()) {
        setThemes(snap.data().items || []);
      }
    } catch (err) {
      console.error('Failed to load themes:', err);
      showToast('Failed to load themes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadThemes(); }, [loadThemes]);

  const saveTheme = async (updated: Theme) => {
    try {
      const newThemes = themes.map((t) => (t.id === updated.id ? updated : t));
      await setDoc(doc(db, 'gameData', 'themes'), { items: newThemes });
      setThemes(newThemes);
      setExpandedId(null);
      setEditData(null);
      showToast(`Saved "${updated.name}"`);
    } catch (err) {
      console.error('Failed to save theme:', err);
      showToast('Failed to save theme', 'error');
    }
  };

  const addTheme = () => {
    const newTheme: Theme = {
      id: `theme_${Date.now()}`,
      name: 'New Theme',
      flavor: '',
      modifiers: [],
    };
    setThemes([newTheme, ...themes]);
    setExpandedId(newTheme.id);
    setEditData({ ...newTheme });
  };

  const deleteTheme = async (id: string) => {
    const newThemes = themes.filter((t) => t.id !== id);
    try {
      await setDoc(doc(db, 'gameData', 'themes'), { items: newThemes });
      setThemes(newThemes);
      setExpandedId(null);
      setEditData(null);
      showToast('Theme deleted');
    } catch (err) {
      console.error('Failed to delete:', err);
      showToast('Failed to delete theme', 'error');
    }
  };

  const toggleExpand = (theme: Theme) => {
    if (expandedId === theme.id) {
      setExpandedId(null);
      setEditData(null);
    } else {
      setExpandedId(theme.id);
      setEditData(JSON.parse(JSON.stringify(theme)));
    }
  };

  if (loading) return <div className="loading">Loading themes...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Themes ({themes.length})</h2>
        <button className="btn btn-primary" onClick={addTheme}>+ Add Theme</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Flavor</th>
            <th># Modifiers</th>
            <th>Modifiers</th>
          </tr>
        </thead>
        <tbody>
          {themes.map((theme) => (
            <React.Fragment key={theme.id}>
              <tr
                className={expandedId === theme.id ? 'expanded' : ''}
                onClick={() => toggleExpand(theme)}
              >
                <td style={{ fontWeight: 600 }}>{theme.name}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {theme.flavor}
                </td>
                <td>{theme.modifiers?.length || 0}</td>
                <td>
                  {(theme.modifiers || []).map((m, i) => (
                    <span
                      key={i}
                      className={`modifier-pill ${m.value >= 0 ? 'positive' : 'negative'}`}
                    >
                      {m.tag} {m.value >= 0 ? '+' : ''}{m.value}
                    </span>
                  ))}
                </td>
              </tr>
              {expandedId === theme.id && editData && (
                <tr className="edit-panel">
                  <td colSpan={4}>
                    <ThemeEditor
                      theme={editData}
                      onChange={setEditData}
                      onSave={() => saveTheme(editData)}
                      onCancel={() => { setExpandedId(null); setEditData(null); }}
                      onDelete={() => deleteTheme(theme.id)}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {themes.length === 0 && (
            <tr>
              <td colSpan={4}>
                <div className="empty-state"><p>No themes found.</p></div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );
}

function ThemeEditor({
  theme,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  theme: Theme;
  onChange: (t: Theme) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const update = (fields: Partial<Theme>) => onChange({ ...theme, ...fields });

  const updateModifier = (index: number, fields: Partial<Modifier>) => {
    const modifiers = [...theme.modifiers];
    modifiers[index] = { ...modifiers[index], ...fields };
    update({ modifiers });
  };

  const addModifier = () => {
    update({
      modifiers: [...theme.modifiers, { tag: 'Beast', value: 0 }],
    });
  };

  const removeModifier = (index: number) => {
    const modifiers = [...theme.modifiers];
    modifiers.splice(index, 1);
    update({ modifiers });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="edit-grid">
        <div className="edit-field">
          <label>Name</label>
          <input
            type="text"
            value={theme.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className="edit-field">
          <label>ID</label>
          <input type="text" value={theme.id} disabled style={{ opacity: 0.5 }} />
        </div>
        <div className="edit-field full-width">
          <label>Flavor</label>
          <textarea
            value={theme.flavor}
            onChange={(e) => update({ flavor: e.target.value })}
            rows={3}
          />
        </div>
        <div className="edit-field full-width">
          <label>
            Modifiers ({theme.modifiers.length})
            <button className="btn btn-sm btn-secondary" style={{ marginLeft: 8 }} onClick={addModifier}>
              + Add Modifier
            </button>
          </label>
          <div className="effects-list">
            {theme.modifiers.map((mod, i) => (
              <div key={i} className="effect-item">
                <select
                  value={mod.tag}
                  onChange={(e) => updateModifier(i, { tag: e.target.value })}
                >
                  {ALL_TAGS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={mod.value}
                  onChange={(e) => updateModifier(i, { value: Number(e.target.value) })}
                  style={{ width: 100 }}
                />
                <span
                  className={`modifier-pill ${mod.value >= 0 ? 'positive' : 'negative'}`}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {mod.tag} {mod.value >= 0 ? '+' : ''}{mod.value}
                </span>
                <button className="btn btn-sm btn-danger" onClick={() => removeModifier(i)}>
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="edit-actions">
        <button className="btn btn-success" onClick={onSave}>Save Theme</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onDelete} style={{ marginLeft: 'auto' }}>Delete Theme</button>
      </div>
    </div>
  );
}
