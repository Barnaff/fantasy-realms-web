import { useGameStore } from './hooks/useGameStore.ts';
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

function MapScreen() {
  const state = useGameStore(s => s.state);
  const selectMapNode = useGameStore(s => s.selectMapNode);
  const getAvailableMapNodes = useGameStore(s => s.getAvailableMapNodes);

  if (!state.run) return null;

  const availableNodes = getAvailableMapNodes();
  const availableNodeIds = availableNodes.map(n => n.id);

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-parchment-200/50 border-b border-parchment-300 gap-2">
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
        <RelicBar relics={state.relics} />
      </div>

      <MapView
        map={state.run.map}
        currentNodeId={state.run.currentNodeId}
        availableNodeIds={availableNodeIds}
        onSelectNode={selectMapNode}
      />
    </div>
  );
}

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

export default function App() {
  const phase = useGameStore(s => s.state.phase);

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
