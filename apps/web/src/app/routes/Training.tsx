import { useMemo, useState } from "react";
import { Card } from "../../ui/components/Cards/Card";
import type { Card as CardModel, Rank, Suit } from "../../game/engine/model/types";
import { updateRunningCount } from "../../game/engine/counting/hiLo";

type RangeOption = {
  label: string;
  min: number;
  max: number;
};

const RANGES: RangeOption[] = [
  { label: "5-10", min: 5, max: 10 },
  { label: "10-20", min: 10, max: 20 },
  { label: "20-50", min: 20, max: 50 }
];

const RANKS: Rank[] = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS: Suit[] = ["S", "H", "D", "C"];
const MAX_VISIBLE = 1;

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
  const [active, setActive] = useState<"list" | "spam">("list");

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
        </div>
      ) : (
        <SpamCount onBack={() => setActive("list")} />
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
        <div
          className={
            isPrompting ? "spam-count__cards spam-count__cards--locked" : "spam-count__cards"
          }
        >
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
            feedback.isCorrect ? "spam-count__feedback spam-count__feedback--ok" : "spam-count__feedback spam-count__feedback--bad"
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