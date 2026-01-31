import type { Card as CardModel } from "../../../game/engine/model/types";

type CardProps = {
  card: CardModel;
  faceDown?: boolean;
};

const SUIT_LABELS: Record<CardModel["suit"], string> = {
  S: "♠️",
  H: "♥️",
  D: "♦️",
  C: "♣️"
};

export function Card({ card, faceDown = false }: CardProps) {
  if (faceDown) return <div className="card card--down" />;
  const isRed = card.suit === "H" || card.suit === "D";
  const colorClass = isRed ? "card--red" : "card--black";
  return (
    <div className={`card ${colorClass}`}>
      <span className="card__rank">{card.rank}</span>
      <span className="card__suit">{SUIT_LABELS[card.suit]}</span>
    </div>
  );
}
