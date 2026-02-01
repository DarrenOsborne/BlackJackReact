import { useEffect, useRef } from "react";

type BetControlsProps = {
  bet: number;
  onBetChange?: (amount: number) => void;
  onDeal?: () => void;
  canDeal?: boolean;
  countdownMs?: number;
  countdownTotalMs?: number;
};

type RepeatState = {
  timerId: number | null;
  delay: number;
  delta: number;
};

const REPEAT_START_DELAY = 320;
const REPEAT_ACCEL = 0.85;

export function BetControls({
  bet,
  onBetChange,
  onDeal,
  canDeal = true,
  countdownMs,
  countdownTotalMs
}: BetControlsProps) {
  const betRef = useRef(bet);
  const repeatRef = useRef<RepeatState>({ timerId: null, delay: REPEAT_START_DELAY, delta: 0 });
  const skipClickRef = useRef(false);
  const showCountdown =
    typeof countdownMs === "number" &&
    typeof countdownTotalMs === "number" &&
    countdownTotalMs > 0;
  const countdownPercent = showCountdown
    ? Math.max(0, Math.min(100, (countdownMs / countdownTotalMs) * 100))
    : 0;

  useEffect(() => {
    betRef.current = bet;
  }, [bet]);

  useEffect(() => {
    return () => stopRepeat();
  }, []);

  const applyDelta = (delta: number) => {
    if (!onBetChange) return;
    const next = Math.max(0, betRef.current + delta);
    if (next !== betRef.current) {
      onBetChange(next);
    }
  };

  const tickRepeat = () => {
    applyDelta(repeatRef.current.delta);
    repeatRef.current.delay = Math.max(0, Math.floor(repeatRef.current.delay * REPEAT_ACCEL));
    repeatRef.current.timerId = window.setTimeout(tickRepeat, repeatRef.current.delay);
  };

  const startRepeat = (delta: number) => {
    stopRepeat();
    repeatRef.current.delta = delta;
    repeatRef.current.delay = REPEAT_START_DELAY;
    applyDelta(delta);
    repeatRef.current.timerId = window.setTimeout(tickRepeat, repeatRef.current.delay);
  };

  const stopRepeat = () => {
    if (repeatRef.current.timerId !== null) {
      window.clearTimeout(repeatRef.current.timerId);
      repeatRef.current.timerId = null;
    }
  };

  const handlePointerDown = (delta: number) => () => {
    if (!onBetChange) return;
    skipClickRef.current = true;
    startRepeat(delta);
  };

  const handlePointerUp = () => {
    stopRepeat();
  };

  const handleClick = (delta: number) => () => {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    applyDelta(delta);
  };

  return (
    <div className="bet-controls">
      <span>Bet: {bet}</span>
      <button
        onPointerDown={handlePointerDown(5)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick(5)}
      >
        +5
      </button>
      <button
        onPointerDown={handlePointerDown(-5)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick(-5)}
      >
        -5
      </button>
      <button className="deal-button" onClick={onDeal} disabled={!onDeal || !canDeal}>
        Deal
        {showCountdown && (
          <span className="deal-progress" style={{ width: `${countdownPercent}%` }} />
        )}
      </button>
    </div>
  );
}
