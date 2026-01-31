import type { Card } from "../model/types";

export function hiLoValue(card: Card) {
  switch (card.rank) {
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
      return 1;
    case "7":
    case "8":
    case "9":
      return 0;
    case "10":
    case "J":
    case "Q":
    case "K":
    case "A":
      return -1;
    default:
      return 0;
  }
}

export function updateRunningCount(runningCount: number, card: Card) {
  return runningCount + hiLoValue(card);
}

export function updateRunningCountForCards(runningCount: number, cards: Card[]) {
  return cards.reduce((count, card) => updateRunningCount(count, card), runningCount);
}
