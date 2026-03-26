import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

const STORAGE_KEY = 'fr-hide-tutorial';

interface TutorialStep {
  title: string;
  text: string;
  icon: string;
}

const STEPS: TutorialStep[] = [
  {
    title: 'Your Hand',
    text: 'You start with 7 cards. Build the strongest combo by the end of the encounter!',
    icon: '🃏',
  },
  {
    title: 'Draw a Card',
    text: 'Each turn, draw one card from the deck (face-down) or the river (face-up cards).',
    icon: '⬆️',
  },
  {
    title: 'Discard a Card',
    text: 'After drawing, you must discard one card from your hand to the river.',
    icon: '⬇️',
  },
  {
    title: 'Synergies & Penalties',
    text: 'Cards boost or penalize each other. Green arrows = bonus, red arrows = penalty. Long-press any card to inspect it.',
    icon: '🔗',
  },
  {
    title: 'Blanking',
    text: 'Some powerful cards "blank" others — blanked cards lose all value and abilities. Watch out!',
    icon: '🚫',
  },
  {
    title: 'End of Encounter',
    text: 'The encounter ends after 10 discards. Your 7-card hand is scored — beat the target to advance!',
    icon: '🏆',
  },
];

export function TutorialOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isLast = activeStep === STEPS.length - 1;
  const isFirst = activeStep === 0;

  // Scroll to step when activeStep changes via buttons
  const scrollToStep = useCallback((idx: number) => {
    const el = slideRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  // Track scroll position to update active dot
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!container) return;
        const scrollLeft = container.scrollLeft;
        const slideWidth = container.clientWidth;
        const idx = Math.round(scrollLeft / slideWidth);
        setActiveStep(Math.max(0, Math.min(idx, STEPS.length - 1)));
      });
    }
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  function handleNext() {
    if (isLast) return;
    const next = activeStep + 1;
    setActiveStep(next);
    scrollToStep(next);
  }

  function handleBack() {
    if (isFirst) return;
    const prev = activeStep - 1;
    setActiveStep(prev);
    scrollToStep(prev);
  }

  function handlePlay() {
    if (dontShow) {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
    }
    onDismiss();
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(30,20,10,0.65)', backdropFilter: 'blur(3px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-parchment-100 border-2 border-amber-700/40 rounded-2xl shadow-2xl max-w-[340px] w-full flex flex-col overflow-hidden">
        {/* Step indicator dots */}
        <div className="flex justify-center gap-1.5 pt-4 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveStep(i); scrollToStep(i); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeStep ? 'w-5 bg-amber-600' : i < activeStep ? 'w-2.5 bg-amber-400' : 'w-2.5 bg-parchment-300'
              }`}
            />
          ))}
        </div>

        {/* Scrollable slides */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {STEPS.map((s, i) => (
            <div
              key={i}
              ref={(el) => { slideRefs.current[i] = el; }}
              className="flex-shrink-0 w-full snap-center overflow-hidden px-6 py-3"
            >
              <div className="flex flex-col items-center text-center">
                <div className="text-4xl mb-2">{s.icon}</div>
                <h3 className="font-display text-ink text-lg mb-1.5">{s.title}</h3>
                <p className="text-ink/75 text-sm leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom section: buttons + checkbox */}
        <div className="px-5 pb-4 pt-2">
          <div className="flex gap-2">
            <button
              onClick={isFirst ? handlePlay : handleBack}
              className="flex-1 py-2 px-3 text-xs text-ink/50 border border-parchment-300 rounded-xl active:scale-95 transition-transform"
            >
              {isFirst ? 'Skip' : 'Back'}
            </button>
            <button
              onClick={isLast ? handlePlay : handleNext}
              className="flex-1 py-2.5 px-3 text-sm font-display text-parchment-50 bg-amber-700 rounded-xl active:scale-95 transition-transform shadow-md"
            >
              {isLast ? "Let's Play!" : 'Next'}
            </button>
          </div>
          {isLast && (
            <label className="flex items-center justify-center gap-2 mt-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-700 rounded"
              />
              <span className="text-xs text-ink/40">Don't show again</span>
            </label>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Returns true if the tutorial should be shown (first encounter, not dismissed) */
export function shouldShowTutorial(encountersCleared: number): boolean {
  if (encountersCleared > 0) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}
