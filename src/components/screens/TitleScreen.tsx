import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../hooks/useGameStore.ts';
import { APP_VERSION } from '../../version.ts';
import changelogRaw from '../../../CHANGELOG.md?raw';

function ChangelogModal({ onClose }: { onClose: () => void }) {
  // Parse markdown into simple sections (skip the top-level # header)
  const sections = changelogRaw
    .split(/^## /m)
    .slice(1) // skip everything before first ## (the # Changelog header)
    .map(section => {
      const [header, ...body] = section.split('\n');
      return { header: header.trim(), body: body.join('\n').trim() };
    });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-parchment-50 rounded-2xl shadow-2xl max-w-md w-full max-h-[80dvh] flex flex-col overflow-hidden border border-parchment-300"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-parchment-300">
          <h2 className="font-display text-lg text-ink">Changelog</h2>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink text-xl leading-none px-2"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="font-display text-sm text-ink mb-2">{section.header}</h3>
              <div className="text-xs text-ink-muted font-body leading-relaxed space-y-1">
                {section.body.split('\n').map((line, j) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  if (trimmed.startsWith('### ')) {
                    return (
                      <p key={j} className="font-bold text-ink mt-2 mb-0.5">
                        {trimmed.replace('### ', '')}
                      </p>
                    );
                  }
                  if (trimmed.startsWith('- ')) {
                    return (
                      <p key={j} className="pl-3 relative">
                        <span className="absolute left-0 text-tag-leader">•</span>
                        {trimmed.replace('- ', '')}
                      </p>
                    );
                  }
                  return <p key={j}>{trimmed}</p>;
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function TitleScreen() {
  const newGame = useGameStore(s => s.newGame);
  const [seedInput, setSeedInput] = useState('');
  const [showChangelog, setShowChangelog] = useState(false);

  const handleStart = () => {
    const seed = seedInput.trim() ? parseInt(seedInput, 10) : undefined;
    newGame(isNaN(seed as number) ? undefined : seed);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[100dvh] bg-parchment-100 p-4 sm:p-8 safe-bottom">
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

      {/* Version tag — bottom right */}
      <motion.button
        className="absolute bottom-4 right-4 text-[10px] sm:text-xs text-ink-muted/50 hover:text-ink-muted font-body transition-colors"
        onClick={() => setShowChangelog(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        v{APP_VERSION}
      </motion.button>

      {/* Changelog modal */}
      <AnimatePresence>
        {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      </AnimatePresence>
    </div>
  );
}
