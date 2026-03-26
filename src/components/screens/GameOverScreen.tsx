import { useGameStore } from '../../hooks/useGameStore.ts';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export function GameOverScreen() {
  const state = useGameStore(s => s.state);
  const resetToTitle = useGameStore(s => s.resetToTitle);

  if (!state.run) return null;

  const isVictory = state.phase === 'victory';

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-parchment-100 p-4 sm:p-8 safe-bottom">
      <div className="text-center max-w-sm w-full">
        <motion.h2
          className={clsx('font-display text-3xl sm:text-5xl mb-4', isVictory ? 'text-tag-beast' : 'text-tag-fire')}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          {isVictory ? 'Victory!' : 'Defeat'}
        </motion.h2>

        <motion.div
          className="bg-parchment-50 border border-parchment-300 rounded-xl p-4 sm:p-6 mb-4 space-y-2 text-sm"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="text-ink-muted">
            Encounters Cleared: <strong className="text-ink">{state.run.encountersCleared}</strong>
          </div>
          <div className="text-ink-muted">
            Total Score: <strong className="text-ink text-xl sm:text-2xl">{state.run.totalScore}</strong>
          </div>
          <div className="text-ink-muted">
            Gold Earned: <strong className="text-gold">{state.run.gold}</strong>
          </div>
          <div className="text-ink-muted">
            Pool Size: <strong className="text-ink">{state.run.pool.length}</strong>
          </div>
          <div className="text-ink-muted">
            Relics: <strong className="text-ink">{state.relics.length}</strong>
          </div>
          <div className="text-[10px] text-parchment-500 mt-3 pt-2 border-t border-parchment-200">
            Seed: {state.run.seed}
          </div>
        </motion.div>

        {state.lastScoreResult && state.encounter && (
          <div className="text-ink-muted text-xs mb-4">
            Final encounter: {state.encounter.name}
            <br />
            Score: {state.lastScoreResult.totalScore} / {state.encounter.scoreThreshold}
          </div>
        )}

        <motion.button
          onClick={resetToTitle}
          className="bg-tag-leader text-white font-display text-base px-8 py-3 rounded-xl shadow-lg"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
        >
          Play Again
        </motion.button>
      </div>
    </div>
  );
}
