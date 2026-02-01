import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Card } from "../../ui/components/Cards/Card";
import { Hand } from "../../ui/components/Cards/Hand";
import type { Card as CardModel, Hand as HandModel, Rank, Suit } from "../../game/engine/model/types";
import { updateRunningCount } from "../../game/engine/counting/hiLo";
import { createInitialState, DEFAULT_RULES, evaluateHand, reduce } from "../../game/engine";

type RangeOption = {
  label: string;
  min: number;
  max: number;
};

type PaceOption = {
  label: string;
  value: number;
};

type RoundIntervalOption = {
  label: string;
  value: number;
};

const RANGES: RangeOption[] = [
  { label: "5-10", min: 5, max: 10 },
  { label: "10-20", min: 10, max: 20 },
  { label: "20-50", min: 20, max: 50 }
];

const PACE_OPTIONS: PaceOption[] = [
  { label: "200ms", value: 200 },
  { label: "500ms", value: 500 },
  { label: "700ms", value: 700 },
  { label: "1000ms", value: 1000 },
  { label: "2000ms", value: 2000 }
];

const ROUND_INTERVALS: RoundIntervalOption[] = [
  { label: "Every round", value: 1 },
  { label: "Every 2 rounds", value: 2 },
  { label: "Every 5 rounds", value: 5 }
];

const ROUND_TRANSITIONS: PaceOption[] = [
  { label: "1s", value: 1000 },
  { label: "3s", value: 3000 },
  { label: "5s", value: 5000 }
];

const RANKS: Rank[] = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS: Suit[] = ["S", "H", "D", "C"];
const MAX_VISIBLE = 1;

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCard(): CardModel {
  return {
    rank: RANKS[Math.floor(Math.random() * RANKS.length)],
    suit: SUITS[Math.floor(Math.random() * SUITS.length)]
  };
}

export function Training() {
  const [active, setActive] = useState<"list" | "spam" | "live">("list");

  return (
    <section className="page training-page">
      <h1>Training</h1>
      {active === "list" ? (
        <div className="training-list">
          <button className="training-card" onClick={() => setActive("spam")}>
            <div className="training-card__title">Spam Count</div>
            <div className="training-card__desc">
              Rapid-fire running count drill with random check-ins.
            </div>
          </button>
          <button className="training-card" onClick={() => setActive("live")}>
            <div className="training-card__title">Live Count</div>
            <div className="training-card__desc">
              Track the count while a perfect player and dealer run rounds.
            </div>
          </button>
        </div>
      ) : active === "spam" ? (
        <SpamCount onBack={() => setActive("list")} />
      ) : (
        <LiveCount onBack={() => setActive("list")} />
      )}
    </section>
  );
}

type SpamCountProps = {
  onBack: () => void;
};

type Feedback = {
  correct: number;
  isCorrect: boolean;
};

function SpamCount({ onBack }: SpamCountProps) {
  const [range, setRange] = useState<RangeOption>(RANGES[0]);
  const [cards, setCards] = useState<CardModel[]>([]);
  const [runningCount, setRunningCount] = useState(0);
  const [cardsSincePrompt, setCardsSincePrompt] = useState(0);
  const [nextPromptAt, setNextPromptAt] = useState(() => randomInt(range.min, range.max));
  const [isPrompting, setIsPrompting] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const promptHint = useMemo(
    () => `Next check in ${range.min}-${range.max} cards`,
    [range.min, range.max]
  );

  const resetDrill = (nextRange: RangeOption = range) => {
    setCards([]);
    setRunningCount(0);
    setCardsSincePrompt(0);
    setNextPromptAt(randomInt(nextRange.min, nextRange.max));
    setIsPrompting(false);
    setAnswer("");
    setFeedback(null);
  };

  const handleRangeChange = (nextRange: RangeOption) => {
    setRange(nextRange);
    resetDrill(nextRange);
  };

  const handleNextCard = () => {
    if (isPrompting) return;
    const newCard = randomCard();
    setCards((prev) => {
      const next = [...prev, newCard];
      return next.slice(-MAX_VISIBLE);
    });
    setRunningCount((prev) => updateRunningCount(prev, newCard));
    setCardsSincePrompt((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= nextPromptAt) {
        setIsPrompting(true);
        setFeedback(null);
        setAnswer("");
      }
      return nextCount;
    });
  };

  const handleSubmit = () => {
    if (!isPrompting) return;
    const numeric = Number(answer);
    const isCorrect = Number.isFinite(numeric) && numeric === runningCount;
    setFeedback({ correct: runningCount, isCorrect });
    setIsPrompting(false);
    setCardsSincePrompt(0);
    setNextPromptAt(randomInt(range.min, range.max));
  };

  return (
    <div className="spam-count">
      <div className="spam-count__header">
        <div>
          <div className="spam-count__title">Spam Count</div>
          <div className="spam-count__hint">{promptHint}</div>
        </div>
        <div className="spam-count__actions">
          <button onClick={onBack}>Back</button>
          <button onClick={() => resetDrill()}>Reset</button>
        </div>
      </div>

      <div className="spam-count__range">
        {RANGES.map((option) => (
          <button
            key={option.label}
            className={option.label === range.label ? "active" : undefined}
            onClick={() => handleRangeChange(option)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="spam-count__board">
        <button className="spam-count__deal" onClick={handleNextCard} disabled={isPrompting}>
          New card
        </button>
        <div className={isPrompting ? "spam-count__cards spam-count__cards--locked" : "spam-count__cards"}>
          {cards.length === 0 ? (
            <div className="spam-count__empty">Press New card to start.</div>
          ) : (
            <div className="spam-count__card">
              <Card card={cards[cards.length - 1]} />
            </div>
          )}
        </div>
      </div>

      {isPrompting && (
        <div className="spam-count__prompt">
          <div className="spam-count__prompt-text">Running count?</div>
          <input
            type="number"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
          />
          <button onClick={handleSubmit}>Check</button>
        </div>
      )}

      {feedback && (
        <div
          className={
            feedback.isCorrect
              ? "spam-count__feedback spam-count__feedback--ok"
              : "spam-count__feedback spam-count__feedback--bad"
          }
        >
          {feedback.isCorrect
            ? "Correct. Keep going."
            : `Incorrect. Correct count: ${feedback.correct}.`}
        </div>
      )}
    </div>
  );
}

type LiveCountProps = {
  onBack: () => void;
};

function LiveCount({ onBack }: LiveCountProps) {
  const [pace, setPace] = useState<PaceOption>(PACE_OPTIONS[1]);
  const [roundInterval, setRoundInterval] = useState<RoundIntervalOption>(ROUND_INTERVALS[0]);
  const [roundTransition, setRoundTransition] = useState<PaceOption>(ROUND_TRANSITIONS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [dealerRevealPending, setDealerRevealPending] = useState(false);
  const [postRoundRevealPending, setPostRoundRevealPending] = useState(false);
  const prevResultRef = useRef<unknown>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const paceTimerRef = useRef<number | null>(null);

  const [state, dispatch] = useReducer(reduce, undefined, () =>
    createInitialState({ rules: DEFAULT_RULES, seed: randomSeed() })
  );
  const prevPhaseRef = useRef(state.phase);

  const totalCards = state.rules.decks * 52;
  const usedCards = totalCards - state.shoe.length;
  const needsShuffle = usedCards / totalCards >= state.rules.penetration;

  const activeHand = state.playerHands[state.activeHandIndex];
  const dealerUpcard = state.dealerHand.cards[0];
  const playerCardsCount = state.playerHands[0]?.cards.length ?? 0;

  const canSplit = useMemo(() => {
    if (!activeHand) return false;
    if (!state.rules.allowSplit) return false;
    if (activeHand.cards.length !== 2) return false;
    if (activeHand.cards[0].rank !== activeHand.cards[1].rank) return false;
    if (state.playerHands.length >= state.rules.maxHands) return false;
    if (state.bankroll < activeHand.bet) return false;
    if (activeHand.splitFromAce && !state.rules.allowResplitAces) return false;
    if (activeHand.cards[0].rank === "A" && activeHand.isSplitChild && !state.rules.allowResplitAces) {
      return false;
    }
    return true;
  }, [activeHand, state.bankroll, state.playerHands.length, state.rules]);

  const canDouble = useMemo(() => {
    if (!activeHand) return false;
    if (!state.rules.allowDouble) return false;
    if (activeHand.cards.length !== 2) return false;
    if (activeHand.isSplitChild && !state.rules.allowDoubleAfterSplit) return false;
    if (state.bankroll < activeHand.bet) return false;
    if (state.rules.doubleAllowedTotals) {
      const total = evaluateHand(activeHand.cards).total;
      return state.rules.doubleAllowedTotals.includes(total);
    }
    return true;
  }, [activeHand, state.bankroll, state.rules]);

  const perfectPlay = useMemo(
    () => getPerfectPlay(activeHand, dealerUpcard, state.rules, canSplit),
    [activeHand, dealerUpcard, state.rules, canSplit]
  );

  useEffect(() => {
    if (!state.lastResult) return;
    if (prevResultRef.current === state.lastResult) return;
    prevResultRef.current = state.lastResult;
    setRoundsCompleted((prev) => {
      const nextCount = prev + 1;
      if (nextCount % roundInterval.value === 0) {
        setIsPrompting(true);
        setIsRunning(false);
        setFeedback(null);
        setAnswer("");
      } else {
        if (transitionTimerRef.current) {
          window.clearTimeout(transitionTimerRef.current);
        }
        if (paceTimerRef.current) {
          window.clearTimeout(paceTimerRef.current);
          paceTimerRef.current = null;
        }
        setIsRunning(false);
        const delay = Math.max(roundTransition.value, pace.value);
        transitionTimerRef.current = window.setTimeout(() => {
          setIsRunning(true);
        }, delay);
      }
      return nextCount;
    });
  }, [state.lastResult, roundInterval.value, roundTransition.value, pace.value]);

  useEffect(() => {
    if (state.phase !== "DEALER_TURN") {
      setDealerRevealPending(false);
      return;
    }
    setDealerRevealPending(true);
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "BETTING" || !state.lastResult) {
      setPostRoundRevealPending(false);
      return;
    }
    const prevPhase = prevPhaseRef.current;
    if (prevPhase === "DEALER_TURN" || prevPhase === "BETTING") {
      setPostRoundRevealPending(false);
      return;
    }
    setPostRoundRevealPending(true);
    const timerId = window.setTimeout(() => {
      setPostRoundRevealPending(false);
    }, pace.value);
    return () => window.clearTimeout(timerId);
  }, [state.phase, state.lastResult, pace.value]);

  useEffect(() => {
    prevPhaseRef.current = state.phase;
  }, [state.phase]);

  useEffect(() => {
    if (!isRunning || isPrompting) return;
    const timerId = window.setTimeout(() => {
      stepRound();
    }, pace.value);
    paceTimerRef.current = timerId;
    return () => window.clearTimeout(timerId);
  }, [
    isRunning,
    isPrompting,
    pace.value,
    state.phase,
    state.activeHandIndex,
    state.dealerHand.cards.length,
    playerCardsCount,
    dealerRevealPending
  ]);

  const resetSession = () => {
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    if (paceTimerRef.current) {
      window.clearTimeout(paceTimerRef.current);
      paceTimerRef.current = null;
    }
    dispatch({ type: "RESHUFFLE", seed: randomSeed() });
    setIsRunning(false);
    setIsPrompting(false);
    setFeedback(null);
    setAnswer("");
    setRoundsCompleted(0);
    prevResultRef.current = 0;
  };

  const stepRound = () => {
    if (state.phase === "BETTING") {
      if (needsShuffle) {
        dispatch({ type: "RESHUFFLE", seed: randomSeed() });
      }
      dispatch({ type: "PLACE_BET", amount: 1 });
      dispatch({ type: "BEGIN_DEAL" });
      return;
    }

    if (state.phase === "DEALING") {
      const playerCards = state.playerHands[0]?.cards.length ?? 0;
      const dealerCards = state.dealerHand.cards.length;

      if (playerCards === 0 && dealerCards === 0) {
        dispatch({ type: "DEAL_PLAYER", handIndex: 0 });
        return;
      }
      if (playerCards === 1 && dealerCards === 0) {
        dispatch({ type: "DEAL_DEALER" });
        return;
      }
      if (playerCards === 1 && dealerCards === 1) {
        dispatch({ type: "DEAL_PLAYER", handIndex: 0 });
        return;
      }
      if (playerCards === 2 && dealerCards === 1) {
        dispatch({ type: "DEAL_DEALER" });
        return;
      }
      return;
    }

    if (state.phase === "INSURANCE") {
      dispatch({ type: "DECLINE_INSURANCE" });
      return;
    }

    if (state.phase === "PLAYER_TURN") {
      let action = perfectPlay;
      if (action === "Split" && !canSplit) {
        action = getPerfectPlay(activeHand, dealerUpcard, state.rules, false);
      }
      if (action === "Double" && !canDouble) {
        action = "Hit";
      }
      if (action === "Surrender" && !state.rules.allowSurrender) {
        action = "Hit";
      }

      switch (action) {
        case "Split":
          dispatch({ type: "SPLIT" });
          return;
        case "Double":
          dispatch({ type: "DOUBLE" });
          return;
        case "Stand":
          dispatch({ type: "STAND" });
          return;
        case "Surrender":
          dispatch({ type: "SURRENDER" });
          return;
        default:
          dispatch({ type: "HIT" });
          return;
      }
    }

    if (state.phase === "DEALER_TURN") {
      if (dealerRevealPending) {
        setDealerRevealPending(false);
        return;
      }
      dispatch({ type: "DEALER_TICK" });
    }
  };

  const handleSubmit = () => {
    const numeric = Number(answer);
    const isCorrect = Number.isFinite(numeric) && numeric === state.runningCount;
    setFeedback({ correct: state.runningCount, isCorrect });
    setIsPrompting(false);
    setIsRunning(true);
  };

  return (
    <div className="live-count">
      <div className="live-count__header">
        <div>
          <div className="live-count__title">Live Count</div>
          <div className="live-count__hint">
            Pace: {pace.label} | Ask: {roundInterval.label}
          </div>
        </div>
        <div className="live-count__actions">
          <button onClick={onBack}>Back</button>
          <button onClick={resetSession}>Reset</button>
        </div>
      </div>

      <div className="live-count__settings">
        <div className="live-count__setting">
          <div className="live-count__label">Pace</div>
          <div className="live-count__options">
            {PACE_OPTIONS.map((option) => (
              <button
                key={option.label}
                className={option.label === pace.label ? "active" : undefined}
                onClick={() => setPace(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="live-count__setting">
          <div className="live-count__label">Ask interval</div>
          <div className="live-count__options">
            {ROUND_INTERVALS.map((option) => (
              <button
                key={option.label}
                className={option.label === roundInterval.label ? "active" : undefined}
                onClick={() => setRoundInterval(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="live-count__setting">
          <div className="live-count__label">Round transition</div>
          <div className="live-count__options">
            {ROUND_TRANSITIONS.map((option) => (
              <button
                key={option.label}
                className={option.label === roundTransition.label ? "active" : undefined}
                onClick={() => setRoundTransition(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="live-count__setting">
          <div className="live-count__label">Control</div>
          <div className="live-count__options">
            <button onClick={() => setIsRunning(true)} disabled={isRunning || isPrompting}>
              Start
            </button>
            <button onClick={() => setIsRunning(false)} disabled={!isRunning}>
              Pause
            </button>
          </div>
        </div>
      </div>

      <div className="live-count__table">
        <div className="live-count__row">
          <div className="live-count__seat">
            <div className="live-count__seat-label">Dealer</div>
            <Hand
              cards={state.dealerHand.cards}
              hideFirstCard={
                state.phase === "PLAYER_TURN" ||
                state.phase === "INSURANCE" ||
                (state.phase === "DEALER_TURN" && dealerRevealPending) ||
                (state.phase === "BETTING" && postRoundRevealPending)
              }
              showTotal
            />
          </div>
          <div className="live-count__seat">
            <div className="live-count__seat-label">Player</div>
            {state.playerHands.length > 0 ? (
              state.playerHands.map((hand, index) => (
                <Hand key={`live-hand-${index}`} cards={hand.cards} label={`Hand ${index + 1}`} />
              ))
            ) : (
              <Hand cards={[]} label="Hand" />
            )}
          </div>
        </div>
        <div className="live-count__status">
          <div>Round: {state.roundId}</div>
          <div>Cards dealt: {usedCards}</div>
          <div>Perfect play: {perfectPlay}</div>
        </div>
      </div>

      {isPrompting && (
        <div className="live-count__prompt">
          <div className="live-count__prompt-text">What is the running count?</div>
          <input
            type="number"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
          />
          <button onClick={handleSubmit}>Check</button>
        </div>
      )}

      {feedback && (
        <div
          className={
            feedback.isCorrect
              ? "live-count__feedback live-count__feedback--ok"
              : "live-count__feedback live-count__feedback--bad"
          }
        >
          {feedback.isCorrect
            ? "Correct. Keep going."
            : `Incorrect. Correct count: ${feedback.correct}.`}
        </div>
      )}
    </div>
  );
}

function getUpcardValue(rank?: string) {
  if (!rank) return null;
  if (rank === "A") return 11;
  if (rank === "K" || rank === "Q" || rank === "J" || rank === "10") return 10;
  const value = Number(rank);
  return Number.isFinite(value) ? value : null;
}

function shouldSplitPair(rank: string, upcard: number, dasAllowed: boolean) {
  if (rank === "A") return true;
  if (rank === "10" || rank === "K" || rank === "Q" || rank === "J") return false;
  switch (rank) {
    case "9":
      return [2, 3, 4, 5, 6, 8, 9].includes(upcard);
    case "8":
      return true;
    case "7":
      return upcard >= 2 && upcard <= 7;
    case "6":
      return upcard >= 3 && upcard <= 6 || (upcard === 2 && dasAllowed);
    case "5":
      return false;
    case "4":
      return (upcard === 5 || upcard === 6) && dasAllowed;
    case "3":
    case "2":
      return upcard >= 4 && upcard <= 7 || ((upcard === 2 || upcard === 3) && dasAllowed);
    default:
      return false;
  }
}

function getPerfectPlay(
  hand: HandModel | undefined,
  dealerUpcard: { rank: string } | undefined,
  rules: { allowDouble: boolean; allowSurrender: boolean; allowDoubleAfterSplit: boolean },
  canSplit: boolean
) {
  if (!hand || !dealerUpcard) return "-";
  const upcardValue = getUpcardValue(dealerUpcard.rank);
  if (!upcardValue) return "-";

  const isPair = hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
  const isSoft = evaluateHand(hand.cards).isSoft;
  const total = evaluateHand(hand.cards).total;

  if (canSplit && isPair && shouldSplitPair(hand.cards[0].rank, upcardValue, rules.allowDoubleAfterSplit)) {
    return "Split";
  }

  if (rules.allowSurrender && hand.cards.length === 2) {
    if (total === 16 && (upcardValue === 9 || upcardValue === 10 || upcardValue === 11)) {
      return "Surrender";
    }
    if (total === 15 && upcardValue === 10) {
      return "Surrender";
    }
  }

  if (isSoft) {
    if (total >= 20) return "Stand";
    if (total === 19) return "Stand";
    if (total === 18) {
      if (upcardValue >= 3 && upcardValue <= 6) return rules.allowDouble ? "Double" : "Stand";
      if (upcardValue === 2 || upcardValue === 7 || upcardValue === 8) return "Stand";
      return "Hit";
    }
    if (total === 17) {
      if (upcardValue >= 3 && upcardValue <= 6) return rules.allowDouble ? "Double" : "Hit";
      return "Hit";
    }
    if (total === 16 || total === 15) {
      if (upcardValue >= 4 && upcardValue <= 6) return rules.allowDouble ? "Double" : "Hit";
      return "Hit";
    }
    if (total === 14 || total === 13) {
      if (upcardValue === 5 || upcardValue === 6) return rules.allowDouble ? "Double" : "Hit";
      return "Hit";
    }
  }

  if (total >= 17) return "Stand";
  if (total >= 13 && total <= 16) return upcardValue >= 2 && upcardValue <= 6 ? "Stand" : "Hit";
  if (total === 12) return upcardValue >= 4 && upcardValue <= 6 ? "Stand" : "Hit";
  if (total === 11) return upcardValue <= 10 && rules.allowDouble ? "Double" : "Hit";
  if (total === 10) return upcardValue >= 2 && upcardValue <= 9 && rules.allowDouble ? "Double" : "Hit";
  if (total === 9) return upcardValue >= 3 && upcardValue <= 6 && rules.allowDouble ? "Double" : "Hit";
  return "Hit";
}
