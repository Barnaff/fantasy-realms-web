import { useGameStore } from '../../hooks/useGameStore.ts';
import { motion } from 'framer-motion';

export function BossIntroScreen() {
  const state = useGameStore(s => s.state);
  const encounter = state.encounter;

  if (!encounter) return null;

  const handleContinue = () => {
    useGameStore.setState(prev => ({
      state: { ...prev.state, phase: 'player_turn' },
    }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-parchment-100 p-4 sm:p-8 safe-bottom">
      <div className="text-center max-w-sm w-full">
        <motion.div
          className="text-4xl sm:text-6xl mb-3"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          💀
        </motion.div>
        <motion.h2
          className="font-display text-2xl sm:text-4xl text-tag-fire mb-1"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          BOSS
        </motion.h2>
        <motion.h3
          className="font-display text-lg sm:text-2xl text-ink mb-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {encounter.name}
        </motion.h3>

        {encounter.bossStipulation && (
          <motion.div
            className="bg-tag-fire/10 border-2 border-tag-fire rounded-xl p-3 sm:p-4 mb-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="font-display text-xs text-tag-fire uppercase mb-1 tracking-wider">Stipulation</div>
            <div className="text-ink font-bold text-sm">{encounter.bossStipulation.description}</div>
          </motion.div>
        )}

        <div className="text-ink-muted mb-4 text-sm">
          Score required: <strong className="text-ink text-lg">{encounter.scoreThreshold}</strong>
        </div>

        <motion.button
          onClick={handleContinue}
          className="bg-tag-fire text-white font-display text-base px-8 py-3 rounded-xl shadow-lg"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
        >
          Begin Battle
        </motion.button>
      </div>
    </div>
  );
}
