import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';

interface Choice {
  label: string;
  description: string;
  effectId: string;
  params: Record<string, unknown>;
}

interface GameEvent {
  id: string;
  name: string;
  narrative: string;
  choices: Choice[];
}

export default function EventsPage() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<GameEvent | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'gameData', 'events'));
      if (snap.exists()) {
        setEvents(snap.data().items || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      showToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const saveEvent = async (updated: GameEvent) => {
    try {
      const newEvents = events.map((e) => (e.id === updated.id ? updated : e));
      await setDoc(doc(db, 'gameData', 'events'), { items: newEvents });
      setEvents(newEvents);
      setExpandedId(null);
      setEditData(null);
      showToast(`Saved "${updated.name}"`);
    } catch (err) {
      console.error('Failed to save event:', err);
      showToast('Failed to save event', 'error');
    }
  };

  const addEvent = () => {
    const newEvent: GameEvent = {
      id: `event_${Date.now()}`,
      name: 'New Event',
      narrative: '',
      choices: [],
    };
    setEvents([newEvent, ...events]);
    setExpandedId(newEvent.id);
    setEditData({ ...newEvent });
  };

  const deleteEvent = async (id: string) => {
    const newEvents = events.filter((e) => e.id !== id);
    try {
      await setDoc(doc(db, 'gameData', 'events'), { items: newEvents });
      setEvents(newEvents);
      setExpandedId(null);
      setEditData(null);
      showToast('Event deleted');
    } catch (err) {
      console.error('Failed to delete:', err);
      showToast('Failed to delete event', 'error');
    }
  };

  const toggleExpand = (event: GameEvent) => {
    if (expandedId === event.id) {
      setExpandedId(null);
      setEditData(null);
    } else {
      setExpandedId(event.id);
      setEditData(JSON.parse(JSON.stringify(event)));
    }
  };

  if (loading) return <div className="loading">Loading events...</div>;

  return (
    <>
      <div className="page-header">
        <h2>Events ({events.length})</h2>
        <button className="btn btn-primary" onClick={addEvent}>+ Add Event</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Narrative Preview</th>
            <th># Choices</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <React.Fragment key={event.id}>
              <tr
                className={expandedId === event.id ? 'expanded' : ''}
                onClick={() => toggleExpand(event)}
              >
                <td style={{ fontWeight: 600 }}>{event.name}</td>
                <td style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.narrative}
                </td>
                <td>{event.choices?.length || 0}</td>
              </tr>
              {expandedId === event.id && editData && (
                <tr className="edit-panel">
                  <td colSpan={3}>
                    <EventEditor
                      event={editData}
                      onChange={setEditData}
                      onSave={() => saveEvent(editData)}
                      onCancel={() => { setExpandedId(null); setEditData(null); }}
                      onDelete={() => deleteEvent(event.id)}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={3}>
                <div className="empty-state"><p>No events found.</p></div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  );
}

function EventEditor({
  event,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  event: GameEvent;
  onChange: (e: GameEvent) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const update = (fields: Partial<GameEvent>) => onChange({ ...event, ...fields });

  const updateChoice = (index: number, fields: Partial<Choice>) => {
    const choices = [...event.choices];
    choices[index] = { ...choices[index], ...fields };
    update({ choices });
  };

  const addChoice = () => {
    update({
      choices: [...event.choices, { label: '', description: '', effectId: '', params: {} }],
    });
  };

  const removeChoice = (index: number) => {
    const choices = [...event.choices];
    choices.splice(index, 1);
    update({ choices });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="edit-grid">
        <div className="edit-field">
          <label>Name</label>
          <input
            type="text"
            value={event.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className="edit-field">
          <label>ID</label>
          <input type="text" value={event.id} disabled style={{ opacity: 0.5 }} />
        </div>
        <div className="edit-field full-width">
          <label>Narrative</label>
          <textarea
            value={event.narrative}
            onChange={(e) => update({ narrative: e.target.value })}
            rows={4}
          />
        </div>
        <div className="edit-field full-width">
          <label>
            Choices ({event.choices.length})
            <button className="btn btn-sm btn-secondary" style={{ marginLeft: 8 }} onClick={addChoice}>
              + Add Choice
            </button>
          </label>
          <div className="choices-list">
            {event.choices.map((choice, i) => (
              <div key={i} className="choice-item">
                <div className="choice-fields">
                  <input
                    type="text"
                    placeholder="Label"
                    value={choice.label}
                    onChange={(e) => updateChoice(i, { label: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Effect ID"
                    value={choice.effectId}
                    onChange={(e) => updateChoice(i, { effectId: e.target.value })}
                  />
                  <textarea
                    placeholder="Description"
                    value={choice.description}
                    onChange={(e) => updateChoice(i, { description: e.target.value })}
                    rows={2}
                  />
                  <input
                    type="text"
                    placeholder="Params JSON"
                    value={JSON.stringify(choice.params || {})}
                    onChange={(e) => {
                      try {
                        updateChoice(i, { params: JSON.parse(e.target.value) });
                      } catch { /* allow typing */ }
                    }}
                    style={{ fontFamily: "'Courier New', monospace", gridColumn: '1 / -1' }}
                  />
                </div>
                <div style={{ marginTop: 6 }}>
                  <button className="btn btn-sm btn-danger" onClick={() => removeChoice(i)}>
                    Remove Choice
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="edit-actions">
        <button className="btn btn-success" onClick={onSave}>Save Event</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onDelete} style={{ marginLeft: 'auto' }}>Delete Event</button>
      </div>
    </div>
  );
}
