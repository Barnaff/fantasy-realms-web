import { useGameStore } from '../../hooks/useGameStore.ts';
import { EVENT_DEFS } from '../../data/events.ts';
import { SeededRNG } from '../../utils/random.ts';
import { motion } from 'framer-motion';

export function EventScreen() {
  const state = useGameStore(s => s.state);
  const selectEventChoice = useGameStore(s => s.selectEventChoice);

  if (!state.run) return null;

  const rng = new SeededRNG(state.run.seed + state.run.encountersCleared * 50 + 999);
  const event = EVENT_DEFS[rng.nextInt(0, EVENT_DEFS.length - 1)];

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-parchment-100 p-3 sm:p-8 safe-bottom">
      <motion.div
        className="max-w-sm sm:max-w-lg w-full bg-parchment-50 border-2 border-parchment-400 rounded-xl p-4 sm:p-6 shadow-lg"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h2 className="font-display text-lg sm:text-2xl text-ink mb-2">{event.name}</h2>
        <p className="text-ink-muted font-body text-sm mb-4 sm:mb-6 italic leading-relaxed">
          {event.narrative}
        </p>

        <div className="space-y-2.5">
          {event.choices.map((choice, i) => (
            <motion.button
              key={i}
              onClick={() => selectEventChoice(i)}
              className="w-full text-left bg-parchment-100 border border-parchment-300 rounded-xl p-3 active:scale-[0.98] transition-all"
              whileHover={{ borderColor: '#c9a227', backgroundColor: 'rgba(243,217,160,0.3)' }}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <div className="font-display text-sm text-ink">{choice.label}</div>
              <div className="text-xs text-ink-muted mt-0.5">{choice.description}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
