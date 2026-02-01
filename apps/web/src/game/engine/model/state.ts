import type { Card, Hand, RoundState, Rules, Seat } from "./types";
import { DEFAULT_RULES } from "../rules/blackjackRules";
import { createShoe, shuffle } from "./deck";
import { mulberry32 } from "./rng";

export type InitOptions = {
  bankroll?: number;
  seatCount?: number;
  rules?: Partial<Rules>;
  seed?: number;
  shoe?: Card[];
};

export function createEmptyHand(bet = 0): Hand {
  return {
    cards: [],
    bet,
    status: "ACTIVE",
    isDoubled: false,
    isSplitChild: false,
    splitFromAce: false
  };
}

export function createInitialState(options: InitOptions = {}): RoundState {
  const rules = { ...DEFAULT_RULES, ...options.rules };
  let shoe = options.shoe ?? createShoe(rules.decks);

  if (!options.shoe) {
    const seed = options.seed ?? 1;
    shoe = shuffle(shoe, mulberry32(seed));
  }

  const seatCount = options.seatCount ?? 1;
  const bankroll = options.bankroll ?? 1000;
  const seats: Seat[] = Array.from({ length: seatCount }).map((_, index) => ({
    seatIndex: index,
    bankroll,
    pendingBet: 10,
    ready: false,
    hands: [],
    activeHandIndex: 0,
    insuranceBet: 0,
    insuranceOffered: false,
    skippedRound: false
  }));

  return {
    phase: "BETTING",
    shoe,
    discard: [],
    seats,
    activeSeatIndex: 0,
    dealerHand: createEmptyHand(0),
    dealQueue: [],
    roundSeatOrder: [],
    runningCount: 0,
    rules,
    roundId: 1
  };
}
