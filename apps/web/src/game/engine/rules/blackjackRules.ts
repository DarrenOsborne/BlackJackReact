import type { Rules } from "../model/types";

export const DEFAULT_RULES: Rules = {
  decks: 6,
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
  penetration: 0.75
};
