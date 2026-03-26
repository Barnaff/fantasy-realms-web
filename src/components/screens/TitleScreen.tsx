import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../hooks/useGameStore.ts';

export function TitleScreen() {
  const newGame = useGameStore(s => s.newGame);
  const [seedInput, setSeedInput] = useState('');

  const handleStart = () => {
    const seed = seedInput.trim() ? parseInt(seedInput, 10) : undefined;
    newGame(isNaN(seed as number) ? undefined : seed);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-parchment-100 p-4 sm:p-8 safe-bottom">
      <div className="text-center max-w-sm w-full">
        <motion.h1
          className="font-display text-4xl sm:text-6xl text-ink mb-2 leading-tight"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        >
          Fantasy Realms
        </motion.h1>
        <motion.p
          className="text-ink-muted text-base sm:text-lg mb-6 sm:mb-8 font-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Build your hand. Master the river. Conquer the realm.
        </motion.p>

        <motion.div
          className="space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            onClick={handleStart}
            className="w-full bg-tag-leader text-white font-display text-base sm:text-xl px-6 py-3 sm:py-4 rounded-xl shadow-lg"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            New Adventure
          </motion.button>

          <input
            type="text"
            placeholder="Seed (optional)"
            value={seedInput}
            onChange={e => setSeedInput(e.target.value)}
            className="w-full bg-parchment-50 border border-parchment-300 rounded-xl px-4 py-2.5 text-sm text-ink placeholder-parchment-500 font-body"
          />
        </motion.div>

        <motion.div
          className="mt-10 text-ink-muted text-sm space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p>Collect 7 cards with powerful synergies</p>
          <p>Navigate a branching map of encounters</p>
          <p>Discover relics and shape your deck</p>
        </motion.div>
      </div>
    </div>
  );
}
