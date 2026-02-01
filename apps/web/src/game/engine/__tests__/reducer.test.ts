import { describe, expect, it } from "vitest";
import { createInitialState } from "../model/state";
import { reduce } from "../model/reducer";
import type { Card, Rank, Rules, Suit } from "../model/types";

const c = (rank: Rank, suit: Suit = "S"): Card => ({ rank, suit });

const rules: Rules = {
  decks: 1,
  dealerStandsOnSoft17: true,
  blackjackPayout: 1.5,
  allowSurrender: true,
  allowDouble: true,
  allowSplit: true,
  allowResplitAces: false,
  allowHitSplitAces: false,
  allowDoubleAfterSplit: true,
  allowInsurance: true,
  maxHands: 4,
  penetration: 1
};

describe("reduce", () => {
  it("pays blackjack immediately", () => {
    const shoe = [c("A"), c("9"), c("K"), c("7")];
    let state = createInitialState({ bankroll: 100, rules, shoe });

    state = reduce(state, { type: "SET_BET", seatIndex: 0, amount: 10 });
    state = reduce(state, { type: "TOGGLE_READY", seatIndex: 0, ready: true });
    state = reduce(state, { type: "DEAL" });

    expect(state.phase).toBe("BETTING");
    expect(state.lastResult?.hands[0].outcome).toBe("BLACKJACK");
    expect(state.seats[0].bankroll).toBe(115);
  });

  it("handles player bust on hit", () => {
    const shoe = [c("10"), c("9"), c("8"), c("7"), c("9")];
    let state = createInitialState({ bankroll: 100, rules, shoe });

    state = reduce(state, { type: "SET_BET", seatIndex: 0, amount: 10 });
    state = reduce(state, { type: "TOGGLE_READY", seatIndex: 0, ready: true });
    state = reduce(state, { type: "DEAL" });
    state = reduce(state, { type: "HIT" });

    expect(state.phase).toBe("BETTING");
    expect(state.lastResult?.hands[0].outcome).toBe("LOSE");
    expect(state.seats[0].bankroll).toBe(90);
  });

  it("dealer hits soft 17 when configured", () => {
    const soft17Rules = { ...rules, dealerStandsOnSoft17: false, allowInsurance: false };
    const shoe = [c("9"), c("A"), c("8"), c("6"), c("9"), c("2")];
    let state = createInitialState({ bankroll: 100, rules: soft17Rules, shoe });

    state = reduce(state, { type: "SET_BET", seatIndex: 0, amount: 10 });
    state = reduce(state, { type: "TOGGLE_READY", seatIndex: 0, ready: true });
    state = reduce(state, { type: "DEAL" });
    state = reduce(state, { type: "STAND" });
    state = reduce(state, { type: "DEALER_PLAY" });

    expect(state.lastResult?.dealerTotal).toBe(18);
  });

  it("reshuffles the shoe and resets count", () => {
    let state = createInitialState({ bankroll: 100, rules });
    state = { ...state, discard: [c("A")], runningCount: 5 };

    state = reduce(state, { type: "RESHUFFLE", seed: 42 });

    expect(state.shoe.length).toBe(52);
    expect(state.discard.length).toBe(0);
    expect(state.runningCount).toBe(0);
  });

  it("splits a pair into two hands", () => {
    const shoe = [c("8"), c("5"), c("8"), c("9"), c("2"), c("3")];
    let state = createInitialState({ bankroll: 100, rules, shoe });

    state = reduce(state, { type: "SET_BET", seatIndex: 0, amount: 10 });
    state = reduce(state, { type: "TOGGLE_READY", seatIndex: 0, ready: true });
    state = reduce(state, { type: "DEAL" });
    state = reduce(state, { type: "SPLIT" });

    expect(state.seats[0].hands.length).toBe(2);
    expect(state.seats[0].hands[0].cards.length).toBe(2);
    expect(state.seats[0].hands[1].cards.length).toBe(2);
    expect(state.seats[0].bankroll).toBe(80);
  });

  it("pays insurance when dealer has blackjack", () => {
    const shoe = [c("9"), c("A"), c("7"), c("K")];
    let state = createInitialState({ bankroll: 100, rules, shoe });

    state = reduce(state, { type: "SET_BET", seatIndex: 0, amount: 10 });
    state = reduce(state, { type: "TOGGLE_READY", seatIndex: 0, ready: true });
    state = reduce(state, { type: "DEAL" });
    expect(state.phase).toBe("INSURANCE");

    state = reduce(state, { type: "TAKE_INSURANCE", amount: 5 });
    expect(state.phase).toBe("BETTING");
    expect(state.lastResult?.insurance[0]?.payout).toBe(15);
    expect(state.seats[0].bankroll).toBe(100);
  });
});
