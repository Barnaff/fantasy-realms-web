import { useState, useEffect, useRef } from 'react';
import { useGameStore } from './hooks/useGameStore.ts';
import { useAuthStore } from './hooks/useAuthStore.ts';
import { TitleScreen } from './components/screens/TitleScreen.tsx';
import { GameBoard } from './components/board/GameBoard.tsx';
import { MapView } from './components/map/MapView.tsx';
import { ScoringScreen } from './components/screens/ScoringScreen.tsx';
import { PostEncounterScreen } from './components/screens/PostEncounterScreen.tsx';
import { MerchantScreen } from './components/screens/MerchantScreen.tsx';
import { EventScreen } from './components/screens/EventScreen.tsx';
import { BossIntroScreen } from './components/screens/BossIntroScreen.tsx';
import { GameOverScreen } from './components/screens/GameOverScreen.tsx';
import { RestScreen } from './components/screens/RestScreen.tsx';
import { RelicBar } from './components/ui/RelicBar.tsx';
import { saveGameState, loadGameState, updateStatsAfterRun, deleteSave } from './firebase/saveload.ts';

/** Phases where we save — between encounters + during encounters */
const SAVE_PHASES = new Set([
  'map', 'post_encounter', 'merchant', 'event', 'rest',
  'encounter_start', 'player_turn', 'hand_finalization', 'boss_intro',
  'scoring',
]);

/* ═══════════════════════════════════════════════════════════
   Auto-save hook — saves at checkpoint phases only
   ═══════════════════════════════════════════════════════════ */

function useAutoSave() {
  const user = useAuthStore(s => s.user);
  const state = useGameStore(s => s.state);
  const refreshStats = useAuthStore(s => s.refreshStats);
  const prevPhaseRef = useRef(state.phase);

  // Save at checkpoint phases
  useEffect(() => {
    if (!user || !state.run) return;
    if (SAVE_PHASES.has(state.phase)) {
      saveGameState(user.uid, state).catch(err =>
        console.warn('[Save] Failed:', err),
      );
    }
  }, [state.phase, user]);

  // On run end (game_over / victory), update stats and delete save
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;

    if (!user) return;
    if ((state.phase === 'game_over' || state.phase === 'victory') && prevPhase !== state.phase) {
      (async () => {
        try {
          await updateStatsAfterRun(user.uid, {
            encountersCleared: state.run?.encountersCleared ?? 0,
            bestScoreThisRun: state.run?.totalScore ?? 0,
            goldEarned: state.run?.gold ?? 0,
            won: state.phase === 'victory',
          });
          await deleteSave(user.uid);
          refreshStats();
        } catch (err) {
          console.warn('[Save] Failed to update stats on run end:', err);
        }
      })();
    }
  }, [state.phase, user]);
}

/* ═══════════════════════════════════════════════════════════
   Restore saved game on login
   ═══════════════════════════════════════════════════════════ */

function useRestoreOnLogin() {
  const user = useAuthStore(s => s.user);
  const phase = useGameStore(s => s.state.phase);
  const restoreState = useGameStore(s => s.restoreState);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!user || restoredRef.current) return;
    if (phase !== 'title') return; // only restore when on title screen

    restoredRef.current = true;
    loadGameState(user.uid).then(saved => {
      if (saved?.run) {
        restoreState(saved);
        console.log('[Save] Restored run from checkpoint');
      }
    }).catch(err => {
      console.warn('[Save] Failed to load:', err);
    });
  }, [user]);
}

/* ═══════════════════════════════════════════════════════════
   Map screen
   ═══════════════════════════════════════════════════════════ */

function MapScreen() {
  const state = useGameStore(s => s.state);
  const selectMapNode = useGameStore(s => s.selectMapNode);
  const getAvailableMapNodes = useGameStore(s => s.getAvailableMapNodes);
  const forfeitRun = useGameStore(s => s.forfeitRun);
  const [showForfeit, setShowForfeit] = useState(false);

  if (!state.run) return null;

  const availableNodes = getAvailableMapNodes();
  const availableNodeIds = availableNodes.map(n => n.id);

  return (
    <div className="h-[100dvh] flex flex-col bg-parchment-100">
      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-parchment-200/50 border-b border-parchment-300 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap min-w-0">
          <span className="font-display text-xs sm:text-sm text-ink-muted">
            Pool: <strong className="text-ink">{state.run.pool.length}</strong>
          </span>
          <span className="font-display text-xs sm:text-sm text-gold">
            Gold: <strong>{state.run.gold}</strong>
          </span>
          <span className="font-display text-xs sm:text-sm text-ink-muted">
            Score: <strong className="text-ink">{state.run.totalScore}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <RelicBar relics={state.relics} />
          <button
            onClick={() => setShowForfeit(true)}
            className="text-[10px] sm:text-xs text-ink-muted/40 hover:text-tag-fire transition-colors px-1"
            title="Forfeit run"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Forfeit confirmation */}
      {showForfeit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForfeit(false)}>
          <div className="bg-parchment-50 rounded-2xl shadow-2xl max-w-xs w-full p-5 text-center border border-parchment-300" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg text-ink mb-2">Forfeit Run?</h3>
            <p className="text-ink-muted text-sm mb-4">
              Your progress will be lost. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForfeit(false)}
                className="flex-1 py-2 text-sm text-ink border border-parchment-300 rounded-xl active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowForfeit(false); forfeitRun(); }}
                className="flex-1 py-2 text-sm text-white bg-tag-fire rounded-xl active:scale-95 transition-transform shadow-md"
              >
                Forfeit
              </button>
            </div>
          </div>
        </div>
      )}

      <MapView
        map={state.run.map}
        currentNodeId={state.run.currentNodeId}
        availableNodeIds={availableNodeIds}
        onSelectNode={selectMapNode}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Game screen (encounter)
   ═══════════════════════════════════════════════════════════ */

function GameScreen() {
  const state = useGameStore(s => s.state);

  return (
    <div className="min-h-screen bg-parchment-100">
      {state.run && (
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-parchment-200/50 border-b border-parchment-300 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="font-display text-xs sm:text-sm text-gold">
              Gold: <strong>{state.run.gold}</strong>
            </span>
            <span className="font-display text-xs sm:text-sm text-ink-muted">
              Total: <strong className="text-ink">{state.run.totalScore}</strong>
            </span>
          </div>
          <RelicBar relics={state.relics} />
        </div>
      )}
      <GameBoard />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   App root
   ═══════════════════════════════════════════════════════════ */

export default function App() {
  const phase = useGameStore(s => s.state.phase);

  // Initialize Firebase auth listener once
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init();
    return unsubscribe;
  }, []);

  // Auto-save at checkpoints & restore on login
  useAutoSave();
  useRestoreOnLogin();

  switch (phase) {
    case 'title':
      return <TitleScreen />;
    case 'map':
      return <MapScreen />;
    case 'encounter_start':
    case 'player_turn':
    case 'hand_finalization':
      return <GameScreen />;
    case 'boss_intro':
      return <BossIntroScreen />;
    case 'scoring':
      return <ScoringScreen />;
    case 'post_encounter':
      return <PostEncounterScreen />;
    case 'merchant':
      return <MerchantScreen />;
    case 'event':
      return <EventScreen />;
    case 'rest':
      return <RestScreen />;
    case 'game_over':
    case 'victory':
      return <GameOverScreen />;
    default:
      return <TitleScreen />;
  }
}
