export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "10"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";

export type Phase =
  | "BETTING"
  | "DEALING"
  | "INSURANCE"
  | "PLAYER_TURN"
  | "DEALER_TURN"
  | "ROUND_END";

export type HandStatus = "ACTIVE" | "STOOD" | "BUST" | "BLACKJACK" | "SURRENDERED";

export type Outcome = "WIN" | "LOSE" | "PUSH" | "BLACKJACK" | "SURRENDER";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface Hand {
  cards: Card[];
  bet: number;
  status: HandStatus;
  isDoubled: boolean;
  isSplitChild: boolean;
  splitFromAce: boolean;
}

export interface Rules {
  decks: number;
  dealerStandsOnSoft17: boolean;
  blackjackPayout: number;
  allowSurrender: boolean;
  allowDouble: boolean;
  allowSplit: boolean;
  allowResplitAces: boolean;
  allowHitSplitAces: boolean;
  allowDoubleAfterSplit: boolean;
  allowInsurance: boolean;
  maxHands: number;
  penetration: number;
  doubleAllowedTotals?: number[];
}

export interface HandResult {
  handIndex: number;
  outcome: Outcome;
  payout: number;
  playerTotal: number;
  dealerTotal: number;
}

export interface RoundResult {
  hands: HandResult[];
  dealerTotal: number;
  dealerBust: boolean;
  dealerBlackjack: boolean;
  insuranceBet: number;
  insurancePayout: number;
}

export interface RoundState {
  phase: Phase;
  shoe: Card[];
  discard: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
  dealerHand: Hand;
  bankroll: number;
  pendingBet: number;
  insuranceBet: number;
  insuranceOffered: boolean;
  runningCount: number;
  rules: Rules;
  roundId: number;
  lastResult?: RoundResult;
}
