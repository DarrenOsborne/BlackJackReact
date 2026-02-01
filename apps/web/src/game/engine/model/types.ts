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

export interface Seat {
  seatIndex: number;
  bankroll: number;
  pendingBet: number;
  ready: boolean;
  hands: Hand[];
  activeHandIndex: number;
  insuranceBet: number;
  insuranceOffered: boolean;
  skippedRound: boolean;
}

export type DealTarget =
  | { type: "SEAT"; seatIndex: number }
  | { type: "DEALER" };

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
  seatIndex: number;
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
  insurance: { seatIndex: number; bet: number; payout: number }[];
}

export interface RoundState {
  phase: Phase;
  shoe: Card[];
  discard: Card[];
  seats: Seat[];
  activeSeatIndex: number;
  dealerHand: Hand;
  dealQueue: DealTarget[];
  roundSeatOrder: number[];
  runningCount: number;
  rules: Rules;
  roundId: number;
  lastResult?: RoundResult;
}
