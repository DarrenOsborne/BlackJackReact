import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { TableLayout } from "../../ui/components/Table/TableLayout";
import { ShoeVisual } from "../../ui/components/Table/ShoeVisual";
import { DiscardTray } from "../../ui/components/Table/DiscardTray";
import { DeckPenetrationBar } from "../../ui/components/Table/DeckPenetrationBar";
import { Hand } from "../../ui/components/Cards/Hand";
import { BetControls } from "../../ui/components/Controls/BetControls";
import {
  DEFAULT_RULES,
  createEmptyHand,
  createInitialState,
  evaluateHand,
  reduce,
  type Hand as HandModel
} from "../../game/engine";

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);
const AUTO_DEAL_MS = 20000;
const TURN_MS = 20000;

export function Play() {
  const [state, dispatch] = useReducer(reduce, undefined, () =>
    createInitialState({ rules: DEFAULT_RULES, seed: randomSeed() })
  );
  const [bet, setBet] = useState(10);
  const [dealCountdownMs, setDealCountdownMs] = useState<number | null>(null);
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const [turnCountdownMs, setTurnCountdownMs] = useState<number | null>(null);
  const [dealerRevealPending, setDealerRevealPending] = useState(false);
  const [postRoundRevealPending, setPostRoundRevealPending] = useState(false);
  const prevPhaseRef = useRef(state.phase);

  useLayoutEffect(() => {
    if (state.phase !== "DEALER_TURN") {
      setDealerRevealPending(false);
      return;
    }
    setDealerRevealPending(true);
  }, [state.phase]);

  const dealerNeedsHit = useMemo(() => {
    if (state.phase !== "DEALER_TURN") return false;
    const dealerValue = evaluateHand(state.dealerHand.cards);
    if (dealerValue.isBust) return false;
    if (dealerValue.total < 17) return true;
    if (dealerValue.total > 17) return false;
    if (dealerValue.isSoft && !state.rules.dealerStandsOnSoft17) return true;
    return false;
  }, [state.phase, state.dealerHand.cards, state.rules.dealerStandsOnSoft17]);

  useEffect(() => {
    if (state.phase !== "DEALER_TURN") return;
    const timerId = window.setTimeout(() => {
      if (dealerRevealPending) {
        setDealerRevealPending(false);
        if (!dealerNeedsHit) {
          dispatch({ type: "DEALER_TICK" });
        }
        return;
      }
      dispatch({ type: "DEALER_TICK" });
    }, 700);
    return () => window.clearTimeout(timerId);
  }, [state.phase, state.dealerHand.cards.length, dealerRevealPending, dealerNeedsHit]);

  useLayoutEffect(() => {
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
    }, 700);
    return () => window.clearTimeout(timerId);
  }, [state.phase, state.lastResult]);

  useEffect(() => {
    prevPhaseRef.current = state.phase;
  }, [state.phase]);
  useEffect(() => {
    if (state.phase === "PLAYER_TURN") {
      setTurnDeadline(Date.now() + TURN_MS);
      return;
    }
    setTurnDeadline(null);
    setTurnCountdownMs(null);
  }, [state.phase, state.activeHandIndex]);

  const totalCards = state.rules.decks * 52;
  const usedCards = totalCards - state.shoe.length;
  const penetrationPercent = Math.min(100, Math.max(0, (usedCards / totalCards) * 100));
  const cutPercent = state.rules.penetration * 100;

  const activeHand = state.playerHands[state.activeHandIndex];
  const activeValue = activeHand ? evaluateHand(activeHand.cards) : undefined;
  const hideDealerHole =
    state.phase === "PLAYER_TURN" ||
    state.phase === "INSURANCE" ||
    (state.phase === "DEALER_TURN" && dealerRevealPending) ||
    (state.phase === "BETTING" && postRoundRevealPending);
  const dealerHasCards = state.dealerHand.cards.length > 0;
  const seatResults = useMemo(() => {
    if (!state.lastResult) return [];
    const seatMap = new Map<number, { outcomes: string[]; payout: number }>();

    state.lastResult.hands.forEach((hand) => {
      const seatIndex =
        typeof (hand as { seatIndex?: number }).seatIndex === "number"
          ? (hand as { seatIndex: number }).seatIndex
          : 0;
      const existing = seatMap.get(seatIndex) ?? { outcomes: [], payout: 0 };
      existing.outcomes.push(hand.outcome);
      existing.payout += hand.payout;
      seatMap.set(seatIndex, existing);
    });

    return Array.from(seatMap.entries()).map(([seatIndex, data]) => ({
      seatIndex,
      outcomes: data.outcomes,
      payout: data.payout
    }));
  }, [state.lastResult]);
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

  const dealerUpcard = state.dealerHand.cards[0];
  const strategyText = useMemo(
    () => getPerfectPlay(activeHand, dealerUpcard, state.rules, canSplit),
    [activeHand, dealerUpcard, state.rules, canSplit]
  );
  const canHit = state.phase === "PLAYER_TURN" && activeHand?.status === "ACTIVE";
  const canStand = state.phase === "PLAYER_TURN" && activeHand?.status === "ACTIVE";

  const canDouble = useMemo(() => {
    if (!activeHand) return false;
    if (!state.rules.allowDouble) return false;
    if (activeHand.cards.length !== 2) return false;
    if (activeHand.isSplitChild && !state.rules.allowDoubleAfterSplit) return false;
    if (state.bankroll < activeHand.bet) return false;
    if (state.rules.doubleAllowedTotals && activeValue) {
      return state.rules.doubleAllowedTotals.includes(activeValue.total);
    }
    return true;
  }, [activeHand, activeValue, state.bankroll, state.rules]);

  const canSurrender = useMemo(() => {
    if (!activeHand) return false;
    if (!state.rules.allowSurrender) return false;
    return activeHand.cards.length === 2;
  }, [activeHand, state.rules.allowSurrender]);

  const maxInsurance = state.playerHands[0]?.bet ? state.playerHands[0].bet / 2 : 0;
  const canInsure = state.bankroll >= maxInsurance && maxInsurance > 0;

  const canDeal = state.phase === "BETTING" && bet > 0 && bet <= state.bankroll;
  const needsShuffle = usedCards / totalCards >= state.rules.penetration;

  const handleDeal = () => {
    if (!canDeal) return;
    if (needsShuffle) {
      dispatch({ type: "RESHUFFLE", seed: randomSeed() });
    }
    dispatch({ type: "PLACE_BET", amount: bet });
    dispatch({ type: "DEAL" });
  };

  const handleShuffle = () => {
    dispatch({ type: "RESHUFFLE", seed: randomSeed() });
  };

  const resetTurnTimer = () => {
    setTurnDeadline(Date.now() + TURN_MS);
  };

  useEffect(() => {
    if (!turnDeadline) {
      setTurnCountdownMs(null);
      return;
    }

    let timerId: number;
    const tick = () => {
      const remaining = Math.max(0, turnDeadline - Date.now());
      setTurnCountdownMs(remaining);
      if (remaining <= 0) {
        dispatch({ type: "STAND" });
        return;
      }
      timerId = window.setTimeout(tick, 120);
    };

    tick();

    return () => {
      if (timerId) window.clearTimeout(timerId);
    };
  }, [turnDeadline]);

  useEffect(() => {
    if (state.phase !== "BETTING" || !state.lastResult || !canDeal) {
      setDealCountdownMs(null);
      return;
    }

    const start = Date.now();
    let timerId: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, AUTO_DEAL_MS - elapsed);
      setDealCountdownMs(remaining);
      if (remaining <= 0) {
        handleDeal();
        return;
      }
      timerId = window.setTimeout(tick, 120);
    };

    tick();

    return () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [state.phase, state.lastResult, canDeal]);

  return (
    <section className="page play-page">
      <TableLayout>
        <div className="table-content">
          <div className="table-header">
            <div className="table-meta">
              <ShoeVisual
                remaining={state.shoe.length}
                total={totalCards}
                cutCardPercent={cutPercent}
              />
              <DiscardTray count={state.discard.length} />
              <TableStat label="Running Count" value={state.runningCount} />
              <TableStat label="Round" value={state.roundId} />
              <TableStat label="Perfect Play" value={strategyText} />
            </div>
            <DeckPenetrationBar percent={penetrationPercent} cutPercent={cutPercent} />
          </div>

          <div className="table-surface">
            <div className="dealer-row">
              <div className="dealer-area">
                <h2>Dealer</h2>
                <div className="dealer-content">
                  <div className="dealer-hand">
                    <Hand
                      cards={state.dealerHand.cards}
                      label={hideDealerHole ? "Dealer (hole hidden)" : "Dealer"}
                      hideFirstCard={hideDealerHole}
                      showTotal
                      status={state.dealerHand.status}
                    />
                  </div>
                  {state.lastResult && (
                    <div className="dealer-results">
                      <div className="dealer-results__title">Round results</div>
                      <div>
                        Dealer total: {state.lastResult.dealerTotal} | Dealer blackjack:{" "}
                        {state.lastResult.dealerBlackjack ? "Yes" : "No"}
                      </div>
                      {state.lastResult.insuranceBet > 0 && (
                        <div>Insurance payout: {state.lastResult.insurancePayout}</div>
                      )}
                      {seatResults.map((seat) => (
                        <div key={`seat-${seat.seatIndex}`}>
                          Seat {seat.seatIndex + 1}: {seat.outcomes.join(", ")} (payout {seat.payout})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="dealer-side">
                <div className="payouts payouts--side">
                  <h3>Payouts</h3>
                  <p>Blackjack: 3:2</p>
                  <p>Win: 1:1</p>
                  <p>Push: Bet returned</p>
                  <p>Insurance: 2:1</p>
                  <p>Surrender: Lose half</p>                  <p>Dealer stands on soft 17 (S17)</p>                  <p>Double after split allowed</p>
                </div>
              </div>
            </div>

            <div className="player-area">
              <h2>Players</h2>
              <div className="player-spots">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={`spot-${index}`}
                    className={`player-spot ${index === 0 ? "active" : ""}`}
                  >
                    <div className="player-spot__title">Seat {index + 1}</div>
                    {index === 0 ? (
                      state.playerHands.length > 0 ? (
                        state.playerHands.map((hand, handIndex) => {
                          const handResult = state.lastResult?.hands.find(
                            (result) => result.handIndex === handIndex
                          );

                          return (
                            <PlayerHandView
                              key={`hand-${handIndex}`}
                              hand={hand}
                              label={`Hand ${handIndex + 1}`}
                              isActive={
                                state.phase === "PLAYER_TURN" && handIndex === state.activeHandIndex
                              }
                              resultOutcome={handResult?.outcome}
                              canHit={handIndex === state.activeHandIndex ? canHit : false}
                              canDouble={handIndex === state.activeHandIndex ? canDouble : false}
                              canSplit={handIndex === state.activeHandIndex ? canSplit : false}
                              canStand={handIndex === state.activeHandIndex ? canStand : false}
                              canSurrender={handIndex === state.activeHandIndex ? canSurrender : false}
                              onHit={() => {
                                resetTurnTimer();
                                dispatch({ type: "HIT" });
                              }}
                              onDouble={() => {
                                resetTurnTimer();
                                dispatch({ type: "DOUBLE" });
                              }}
                              onSplit={() => {
                                resetTurnTimer();
                                dispatch({ type: "SPLIT" });
                              }}
                              onStand={() => dispatch({ type: "STAND" })}
                              onSurrender={() => dispatch({ type: "SURRENDER" })}
                              countdownMs={
                                handIndex === state.activeHandIndex ? turnCountdownMs : undefined
                              }
                              countdownTotalMs={TURN_MS}
                            />
                          );
                        })
                      ) : (
                        <PlayerHandView
                          hand={createEmptyHand(0)}
                          label="Hand 1"
                          isActive={false}
                          showBet={false}
                          showTotal={false}
                        />
                      )
                    ) : (
                      <div>Empty</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bankroll-strip">
            <div className="bankroll-item">Bankroll: {state.bankroll}</div>
            {state.insuranceBet > 0 && (
              <div className="bankroll-item">Insurance: {state.insuranceBet}</div>
            )}
          </div>
        </div>
      </TableLayout>

      {state.phase === "BETTING" && (
        <div className="round-controls">
          <BetControls
            bet={bet}
            onBetChange={setBet}
            onDeal={handleDeal}
            canDeal={canDeal}
            countdownMs={dealCountdownMs ?? undefined}
            countdownTotalMs={AUTO_DEAL_MS}
          />
          {needsShuffle && (
            <button onClick={handleShuffle}>Shuffle Shoe</button>
          )}
        </div>
      )}

      {state.phase === "INSURANCE" && (
        <div className="insurance-controls">
          <div>Dealer shows an Ace. Insurance?</div>
          <button
            onClick={() => dispatch({ type: "TAKE_INSURANCE", amount: maxInsurance })}
            disabled={!canInsure}
          >
            Take Insurance ({maxInsurance})
          </button>
          <button onClick={() => dispatch({ type: "DECLINE_INSURANCE" })}>No Thanks</button>
        </div>
      )}

    </section>
  );
}

type PlayerHandViewProps = {
  hand: HandModel;
  label: string;
  isActive: boolean;
  showBet?: boolean;
  showTotal?: boolean;
  resultOutcome?: string;
  canHit?: boolean;
  canDouble?: boolean;
  canSplit?: boolean;
  canStand?: boolean;
  canSurrender?: boolean;
  onHit?: () => void;
  onDouble?: () => void;
  onSplit?: () => void;
  onStand?: () => void;
  onSurrender?: () => void;
  countdownMs?: number | null;
  countdownTotalMs?: number;
};

function PlayerHandView({
  hand,
  label,
  isActive,
  showBet = true,
  showTotal = true,
  resultOutcome,
  canHit = false,
  canDouble = false,
  canSplit = false,
  canStand = false,
  canSurrender = false,
  onHit,
  onDouble,
  onSplit,
  onStand,
  onSurrender,
  countdownMs,
  countdownTotalMs
}: PlayerHandViewProps) {
  const showActions = isActive && (canHit || canStand || canDouble || canSplit || canSurrender);
  const showResult = Boolean(resultOutcome);
  const showCountdown =
    typeof countdownMs === "number" &&
    typeof countdownTotalMs === "number" &&
    countdownTotalMs > 0;
  const countdownPercent = showCountdown
    ? Math.max(0, Math.min(100, (countdownMs / countdownTotalMs) * 100))
    : 0;
  const actionSlot = showActions ? (
    <HandActionSlot onHit={onHit} onDouble={onDouble} canHit={canHit} canDouble={canDouble} />
  ) : undefined;

  return (
    <div className={isActive ? "player-hand player-hand--active" : "player-hand"}>
      <Hand
        cards={hand.cards}
        label={label}
        status={hand.status}
        showTotal={showTotal}
        actionSlot={actionSlot}
      />
      {showBet && <div>Bet: {hand.bet}</div>}
      {isActive && !showResult && <div>Active</div>}
      {showResult ? (
        <div className="hand-actions">
          <div className={`hand-result ${getOutcomeClass(resultOutcome)}`}>{resultOutcome}</div>
        </div>
      ) : (
        showActions && (
        <div className="hand-actions">
          <button className="stand-button" onClick={onStand} disabled={!canStand || !onStand}>
            Stand
            {showCountdown && (
              <span className="stand-progress" style={{ width: `${countdownPercent}%` }} />
            )}
          </button>
          <button onClick={onSurrender} disabled={!canSurrender || !onSurrender}>
            Surrender
          </button>
          <button onClick={onSplit} disabled={!canSplit || !onSplit}>
            Split
          </button>
        </div>
        )
      )}
    </div>
  );
}

type TableStatProps = {
  label: string;
  value: string | number;
};

function getOutcomeClass(outcome?: string) {
  if (!outcome) return "";
  const normalized = outcome.toUpperCase();
  if (normalized.includes("LOSE")) return "hand-result--lose";
  if (normalized.includes("WIN") || normalized.includes("BLACKJACK")) return "hand-result--win";
  if (normalized.includes("PUSH")) return "hand-result--push";
  return "";
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
function TableStat({ label, value }: TableStatProps) {
  return (
    <div className="table-stat">
      <div className="table-stat__title">{label}</div>
      <div className="table-stat__value">{value}</div>
    </div>
  );
}

type HandActionSlotProps = {
  onHit?: () => void;
  onDouble?: () => void;
  canHit?: boolean;
  canDouble?: boolean;
};

function HandActionSlot({ onHit, onDouble, canHit = false, canDouble = false }: HandActionSlotProps) {
  return (
    <div className="action-card">
      <button onClick={onHit} disabled={!canHit || !onHit}>
        Hit
      </button>
      <button onClick={onDouble} disabled={!canDouble || !onDouble}>
        Double
      </button>
    </div>
  );
}

