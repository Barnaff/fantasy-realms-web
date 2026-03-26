import { useGameStore } from '../../hooks/useGameStore.ts';
import { motion } from 'framer-motion';

export function RestScreen() {
  const leaveRest = useGameStore(s => s.leaveRest);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-parchment-100 p-4 sm:p-8 safe-bottom">
      <motion.div
        className="text-center max-w-sm w-full bg-parchment-50 border-2 border-tag-beast/30 rounded-xl p-5 sm:p-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="text-4xl sm:text-5xl mb-3">🏕️</div>
        <h2 className="font-display text-lg sm:text-2xl text-ink mb-2">A Moment of Rest</h2>
        <p className="text-ink-muted font-body text-sm mb-5 leading-relaxed">
          You find a quiet clearing and take a moment to gather your thoughts.
          The path ahead grows more treacherous, but your resolve remains strong.
        </p>

        <motion.button
          onClick={leaveRest}
          className="bg-tag-beast text-white font-display px-8 py-3 rounded-xl shadow-lg text-base"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
        >
          Continue Journey
        </motion.button>
      </motion.div>
    </div>
  );
}
