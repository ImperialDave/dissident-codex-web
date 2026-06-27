"use client";

import { useCallback, useRef, useState } from "react";

interface UseLongPressOptions {
  onTap: () => void;
  onLongPress: () => void;
  thresholdMs?: number;
  moveThresholdPx?: number;
  disabled?: boolean;
}

export function useLongPress({
  onTap,
  onLongPress,
  thresholdMs = 400,
  moveThresholdPx = 8,
  disabled = false,
}: UseLongPressOptions) {
  const longPressFiredRef = useRef(false);
  const movedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [isHolding, setIsHolding] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled || e.button !== 0) return;

      longPressFiredRef.current = false;
      movedRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      setIsHolding(true);

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      clearTimer();
      timerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        setIsHolding(false);
        onLongPress();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
      }, thresholdMs);
    },
    [disabled, clearTimer, onLongPress, thresholdMs]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!timerRef.current && !isHolding) return;
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      if (Math.hypot(dx, dy) > moveThresholdPx) {
        movedRef.current = true;
        clearTimer();
        setIsHolding(false);
      }
    },
    [clearTimer, isHolding, moveThresholdPx]
  );

  const onPointerUp = useCallback(() => {
    if (disabled) return;
    clearTimer();
    setIsHolding(false);

    if (!longPressFiredRef.current && !movedRef.current) {
      onTap();
    }

    longPressFiredRef.current = false;
    movedRef.current = false;
  }, [disabled, clearTimer, onTap]);

  const onPointerCancel = useCallback(() => {
    clearTimer();
    setIsHolding(false);
    longPressFiredRef.current = false;
    movedRef.current = false;
  }, [clearTimer]);

  return {
    isHolding,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}