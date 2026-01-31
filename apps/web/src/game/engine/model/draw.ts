import type { Card } from "./types";

export function drawCard(shoe: Card[]) {
  if (shoe.length === 0) {
    throw new Error("Shoe is empty");
  }
  return { card: shoe[0], shoe: shoe.slice(1) };
}

export function drawCards(shoe: Card[], count: number) {
  const cards: Card[] = [];
  let nextShoe = shoe;
  for (let i = 0; i < count; i += 1) {
    const draw = drawCard(nextShoe);
    cards.push(draw.card);
    nextShoe = draw.shoe;
  }
  return { cards, shoe: nextShoe };
}
