import { describe, expect, it } from "vitest";
import { evaluateHand } from "../model/handValue";
import type { Card, Rank, Suit } from "../model/types";

const c = (rank: Rank, suit: Suit = "S"): Card => ({ rank, suit });

describe("evaluateHand", () => {
  it("detects blackjack", () => {
    const value = evaluateHand([c("A"), c("K")]);
    expect(value.total).toBe(21);
    expect(value.isBlackjack).toBe(true);
    expect(value.isSoft).toBe(true);
    expect(value.isBust).toBe(false);
  });

  it("handles soft totals", () => {
    const value = evaluateHand([c("A"), c("9"), c("A")]);
    expect(value.total).toBe(21);
    expect(value.isSoft).toBe(true);
  });

  it("handles hard totals", () => {
    const value = evaluateHand([c("A"), c("9"), c("9")]);
    expect(value.total).toBe(19);
    expect(value.isSoft).toBe(false);
  });
});
