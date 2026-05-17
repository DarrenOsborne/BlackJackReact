import type { Hand as HandModel } from "./types";
import { evaluateHand } from "./handValue";

export function getUpcardValue(rank?: string) {
  if (!rank) return null;
  if (rank === "A") return 11;
  if (rank === "K" || rank === "Q" || rank === "J" || rank === "10") return 10;
  const value = Number(rank);
  return Number.isFinite(value) ? value : null;
}

export function shouldSplitPair(rank: string, upcard: number, dasAllowed: boolean) {
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
      return (upcard >= 3 && upcard <= 6) || (upcard === 2 && dasAllowed);
    case "5":
      return false;
    case "4":
      return (upcard === 5 || upcard === 6) && dasAllowed;
    case "3":
    case "2":
      return (upcard >= 4 && upcard <= 7) || ((upcard === 2 || upcard === 3) && dasAllowed);
    default:
      return false;
  }
}

export function getPerfectPlay(
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
  if (total === 10) return (upcardValue >= 2 && upcardValue <= 9) && rules.allowDouble ? "Double" : "Hit";
  if (total === 9) return (upcardValue >= 3 && upcardValue <= 6) && rules.allowDouble ? "Double" : "Hit";
  return "Hit";
}
