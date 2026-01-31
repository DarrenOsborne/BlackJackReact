import type { Outcome } from "../model/types";

export function payoutForOutcome(outcome: Outcome, bet: number, blackjackPayout: number) {
  switch (outcome) {
    case "BLACKJACK":
      return bet * (1 + blackjackPayout);
    case "WIN":
      return bet * 2;
    case "PUSH":
      return bet;
    case "SURRENDER":
      return bet * 0.5;
    case "LOSE":
    default:
      return 0;
  }
}
