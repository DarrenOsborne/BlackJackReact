import type { ReactNode } from "react";
import type { Card as CardModel, HandStatus } from "../../../game/engine/model/types";
import { evaluateHand } from "../../../game/engine/model/handValue";
import { Card } from "./Card";

type HandProps = {
  cards: CardModel[];
  label?: string;
  hideFirstCard?: boolean;
  showTotal?: boolean;
  status?: HandStatus;
  actionSlot?: ReactNode;
};

export function Hand({
  cards,
  label,
  hideFirstCard = false,
  showTotal = true,
  status,
  actionSlot
}: HandProps) {
  const value = evaluateHand(cards);
  const totalLabel = hideFirstCard ? "?" : value.total.toString();
  const statusLabel = status && status !== "ACTIVE" ? status : "";
  const labelText = label ?? "";

  return (
    <div className="hand">
      <div className="hand__label">{labelText}</div>
      <div className="hand__cards">
        {cards.map((card, index) => (
          <Card
            key={`${card.rank}-${card.suit}-${index}`}
            card={card}
            faceDown={hideFirstCard && index === 1}
          />
        ))}
        {actionSlot}
      </div>
      {showTotal && <div className="hand__total">Total: {totalLabel}</div>}
      <div className="hand__status">{statusLabel}</div>
    </div>
  );
}
