type DeckPenetrationBarProps = {
  percent: number;
  cutPercent: number;
};

export function DeckPenetrationBar({ percent, cutPercent }: DeckPenetrationBarProps) {
  return (
    <div className="deck-penetration">
      <div className="deck-penetration__bar" style={{ width: `${percent}%` }} />
      <div className="deck-penetration__cut" style={{ left: `${cutPercent}%` }} />
    </div>
  );
}
