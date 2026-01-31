import type { Card, Rank, Suit } from "./types";
import type { Rng } from "./rng";

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = [
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2"
];

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ rank, suit });
    }
  }
  return cards;
}

export function createShoe(decks: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < decks; i += 1) {
    cards.push(...createDeck());
  }
  return cards;
}

export function shuffle(cards: Card[], rng: Rng): Card[] {
  const result = cards.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
