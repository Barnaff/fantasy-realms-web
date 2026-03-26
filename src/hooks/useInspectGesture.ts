import { useRef, useState, useCallback, useEffect } from 'react';
import type { LongPressPosition } from './useLongPress.ts';
import type { ResolvedCard } from '../types/card.ts';

/**
 * Manages the "long-press to inspect" gesture at the container level.
 *
 * - On pointerdown on a card, starts a timer.
 * - After 200ms hold, shows the inspect preview.
 * - While still holding, if the finger slides to a different card,
 *   the preview updates to show that card instead.
 * - On pointerup, the preview dismisses.
 *
 * Cards register themselves via data attributes:
 *   data-inspect-id="someId"
 *
 * The caller provides a resolver: (id: string) => ResolvedCard | null
 */
export function useInspectGesture(
  resolver: (id: string) => ResolvedCard | null,
  { delay = 200 }: { delay?: number } = {},
) {
  const [inspectCard, setInspectCard] = useState<ResolvedCard | null>(null);
  const [inspectPos, setInspectPos] = useState<LongPressPosition | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = useRef(false);
  const currentId = useRef<string | null>(null);
  const startXY = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  const dismiss = useCallback(() => {
    clear();
    isActive.current = false;
    currentId.current = null;
    setInspectCard(null);
    setInspectPos(null);
  }, [clear]);

  const findCardAt = useCallback((x: number, y: number): { id: string; el: Element } | null => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    // Walk up to find [data-inspect-id]
    const cardEl = el.closest('[data-inspect-id]');
    if (!cardEl) return null;
    const id = cardEl.getAttribute('data-inspect-id');
    if (!id) return null;
    return { id, el: cardEl };
  }, []);

  const showCard = useCallback((id: string, el: Element, pointerY: number) => {
    const card = resolver(id);
    if (!card) return;
    const rect = el.getBoundingClientRect();
    currentId.current = id;
    try { navigator.vibrate?.(12); } catch { /* */ }
    setInspectCard(card);
    setInspectPos({
      x: rect.left + rect.width / 2,
      pointerY,
      rect,
    });
  }, [resolver]);

  // Container-level pointer handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dismiss();
    startXY.current = { x: e.clientX, y: e.clientY };

    const found = findCardAt(e.clientX, e.clientY);
    if (!found) return;

    timer.current = setTimeout(() => {
      isActive.current = true;
      showCard(found.id, found.el, e.clientY);
    }, delay);
  }, [delay, dismiss, findCardAt, showCard]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    // Before long-press fires: cancel if moved too far
    if (timer.current && startXY.current) {
      const dx = e.clientX - startXY.current.x;
      const dy = e.clientY - startXY.current.y;
      if (dx * dx + dy * dy > 100) {
        clear();
      }
    }

    // After long-press fired: track finger and update preview
    if (isActive.current) {
      const found = findCardAt(e.clientX, e.clientY);
      if (found && found.id !== currentId.current) {
        showCard(found.id, found.el, e.clientY);
      }
    }
  }, [clear, findCardAt, showCard]);

  const onPointerUp = useCallback(() => {
    clear();
    // Small delay so the click handler can check didLongPress
    if (isActive.current) {
      setTimeout(dismiss, 10);
    } else {
      dismiss();
    }
  }, [clear, dismiss]);

  const onPointerCancel = useCallback(() => {
    dismiss();
  }, [dismiss]);

  // Also dismiss on scroll
  useEffect(() => {
    if (!inspectCard) return;
    const handler = () => dismiss();
    window.addEventListener('scroll', handler, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handler, true);
  }, [inspectCard, dismiss]);

  return {
    inspectCard,
    inspectPos,
    dismiss,
    /** Spread these on the container element that holds the cards */
    containerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    /** Whether a long-press is currently active (use to suppress clicks) */
    isActive,
  };
}
