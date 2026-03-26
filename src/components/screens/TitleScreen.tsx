import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../hooks/useGameStore.ts';
import { useAuthStore } from '../../hooks/useAuthStore.ts';
import { APP_VERSION } from '../../version.ts';
import changelogRaw from '../../../CHANGELOG.md?raw';

/* ═══════════════════════════════════════════════════════════
   Changelog modal
   ═══════════════════════════════════════════════════════════ */

function ChangelogModal({ onClose }: { onClose: () => void }) {
  const sections = changelogRaw
    .split(/^## /m)
    .slice(1)
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
        <div className="flex items-center justify-between px-5 py-3 border-b border-parchment-300">
          <h2 className="font-display text-lg text-ink">Changelog</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none px-2">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="font-display text-sm text-ink mb-2">{section.header}</h3>
              <div className="text-xs text-ink-muted font-body leading-relaxed space-y-1">
                {section.body.split('\n').map((line, j) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  if (trimmed.startsWith('### ')) return <p key={j} className="font-bold text-ink mt-2 mb-0.5">{trimmed.replace('### ', '')}</p>;
                  if (trimmed.startsWith('- ')) return <p key={j} className="pl-3 relative"><span className="absolute left-0 text-tag-leader">•</span>{trimmed.replace('- ', '')}</p>;
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

/* ═══════════════════════════════════════════════════════════
   Stats modal
   ═══════════════════════════════════════════════════════════ */

function StatsModal({ onClose }: { onClose: () => void }) {
  const stats = useAuthStore(s => s.stats);
  const user = useAuthStore(s => s.user);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-parchment-50 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-parchment-300"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-parchment-300">
          <h2 className="font-display text-lg text-ink">Player Stats</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none px-2">✕</button>
        </div>
        <div className="px-5 py-4 space-y-2">
          {user && (
            <div className="text-xs text-ink-muted mb-3">
              {user.isAnonymous ? 'Playing as Guest' : (user.displayName || user.email || 'Signed in')}
            </div>
          )}
          {stats ? (
            <div className="grid grid-cols-2 gap-2">
              <StatItem label="Total Runs" value={stats.totalRuns} />
              <StatItem label="Victories" value={stats.victories} />
              <StatItem label="Defeats" value={stats.defeats} />
              <StatItem label="Best Score" value={stats.bestScore} />
              <StatItem label="Best Run" value={`${stats.bestRunEncounters} enc.`} />
              <StatItem label="Encounters Won" value={stats.totalEncountersCleared} />
              <StatItem label="Gold Earned" value={stats.totalGoldEarned} />
              <StatItem label="Win Rate" value={stats.totalRuns > 0 ? `${Math.round((stats.victories / stats.totalRuns) * 100)}%` : '—'} />
            </div>
          ) : (
            <p className="text-ink-muted text-sm text-center py-4">No stats yet. Start a game!</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-parchment-100 rounded-lg p-2.5 text-center">
      <div className="font-display text-base text-ink">{value}</div>
      <div className="text-[10px] text-ink-muted">{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Auth section — shown above the game buttons
   ═══════════════════════════════════════════════════════════ */

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

function AuthSection() {
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const upgradeAccount = useAuthStore(s => s.upgradeAccount);
  const logout = useAuthStore(s => s.logout);

  if (loading) {
    return <div className="text-ink-muted text-xs animate-pulse">Signing in...</div>;
  }

  // Still waiting for auto-anonymous sign-in
  if (!user) {
    return <div className="text-ink-muted text-xs animate-pulse">Signing in...</div>;
  }

  // Signed in (anonymous or Google)
  return (
    <div className="flex items-center justify-between w-full text-xs">
      <div className="flex items-center gap-2 min-w-0">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-parchment-300 flex items-center justify-center text-[10px] text-ink-muted font-bold">
            {user.isAnonymous ? '?' : (user.displayName?.[0] || 'U')}
          </div>
        )}
        <span className="text-ink-muted truncate">
          {user.isAnonymous ? 'Guest' : (user.displayName || 'Player')}
        </span>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {user.isAnonymous ? (
          <button
            onClick={upgradeAccount}
            className="flex items-center gap-1.5 text-ink font-body hover:underline bg-white border border-parchment-300 px-2.5 py-1 rounded-lg shadow-sm"
          >
            <GoogleIcon />
            <span>Sign in</span>
          </button>
        ) : (
          <button onClick={logout} className="text-ink-muted/50 hover:text-ink-muted">
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Title Screen
   ═══════════════════════════════════════════════════════════ */

export function TitleScreen() {
  const newGame = useGameStore(s => s.newGame);
  const user = useAuthStore(s => s.user);
  const [seedInput, setSeedInput] = useState('');
  const [showChangelog, setShowChangelog] = useState(false);
  const [showStats, setShowStats] = useState(false);

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

        {/* Auth section */}
        <motion.div
          className="mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <AuthSection />
        </motion.div>

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

          {user && (
            <button
              onClick={() => setShowStats(true)}
              className="w-full bg-parchment-50 border border-parchment-300 text-ink font-display text-sm px-6 py-2.5 rounded-xl hover:shadow transition-shadow active:scale-[0.98]"
            >
              Player Stats
            </button>
          )}

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

      {/* Version tag */}
      <motion.button
        className="absolute bottom-4 right-4 text-[10px] sm:text-xs text-ink-muted/50 hover:text-ink-muted font-body transition-colors"
        onClick={() => setShowChangelog(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        v{APP_VERSION}
      </motion.button>

      {/* Modals */}
      <AnimatePresence>
        {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      </AnimatePresence>
    </div>
  );
}
