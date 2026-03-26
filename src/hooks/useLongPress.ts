import { useRef, useCallback } from 'react';

export interface LongPressPosition {
  /** Center X of the pressed element */
  x: number;
  /** The Y where the player is pressing (pointer clientY) */
  pointerY: number;
  /** The element's bounding rect */
  rect: DOMRect;
}

/**
 * Hook for long-press detection using pointer events.
 * Works on both touch and mouse, not consumed by framer-motion drag.
 *
 * The callback receives a `LongPressPosition` so the caller can
 * position a tooltip above the pressed element.
 */
export function useLongPress(
  onLongPress: ((pos: LongPressPosition) => void) | undefined,
  { delay = 200 }: { delay?: number } = {},
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didFire = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      didFire.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      if (!onLongPress) return;
      clear();

      const target = e.currentTarget as HTMLElement;
      timer.current = setTimeout(() => {
        didFire.current = true;
        try { navigator.vibrate?.(12); } catch { /* */ }
        const rect = target.getBoundingClientRect();
        onLongPress({
          x: rect.left + rect.width / 2,
          pointerY: startPos.current?.y ?? rect.top,
          rect,
        });
      }, delay);
    },
    [onLongPress, delay, clear],
  );

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (startPos.current && timer.current) {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        if (dx * dx + dy * dy > 100) {
          clear();
        }
      }
    },
    [clear],
  );

  const onPointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  return {
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerMove,
      onPointerCancel,
    },
    didLongPress: didFire,
  };
}
