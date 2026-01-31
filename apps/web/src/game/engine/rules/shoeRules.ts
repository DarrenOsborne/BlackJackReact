import type { Card } from "../model/types";

export type ShoeRules = {
  decks: number;
  penetration: number;
};

export function shouldShuffle(shoe: Card[], discard: Card[], rules: ShoeRules) {
  const totalCards = rules.decks * 52;
  const used = totalCards - shoe.length;
  const penetration = used / totalCards;
  return penetration >= rules.penetration;
}
