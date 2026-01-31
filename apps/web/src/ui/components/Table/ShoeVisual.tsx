type ShoeVisualProps = {
  remaining: number;
  total: number;
  cutCardPercent: number;
};

export function ShoeVisual({ remaining, total, cutCardPercent }: ShoeVisualProps) {
  return (
    <div className="shoe-visual">
      <div className="shoe-visual__title">Shoe</div>
      <div className="shoe-visual__count">
        {remaining} / {total}
      </div>
      <div className="shoe-visual__cut">Cut card: {Math.round(cutCardPercent)}%</div>
    </div>
  );
}
