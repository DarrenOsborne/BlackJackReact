import type { Card, Hand, RoundState, Rules } from "./types";
import { DEFAULT_RULES } from "../rules/blackjackRules";
import { createShoe, shuffle } from "./deck";
import { mulberry32 } from "./rng";

export type InitOptions = {
  bankroll?: number;
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

  return {
    phase: "BETTING",
    shoe,
    discard: [],
    playerHands: [],
    activeHandIndex: 0,
    dealerHand: createEmptyHand(0),
    bankroll: options.bankroll ?? 1000,
    pendingBet: 0,
    insuranceBet: 0,
    insuranceOffered: false,
    runningCount: 0,
    rules,
    roundId: 1
  };
}
