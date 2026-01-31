type ActionBarProps = {
  onHit?: () => void;
  onStand?: () => void;
  onDouble?: () => void;
  onSplit?: () => void;
  onSurrender?: () => void;
  canHit?: boolean;
  canStand?: boolean;
  canDouble?: boolean;
  canSplit?: boolean;
  canSurrender?: boolean;
};

export function ActionBar({
  onHit,
  onStand,
  onDouble,
  onSplit,
  onSurrender,
  canHit = true,
  canStand = true,
  canDouble = true,
  canSplit = true,
  canSurrender = true
}: ActionBarProps) {
  return (
    <div className="action-bar">
      <button onClick={onHit} disabled={!onHit || !canHit}>
        Hit
      </button>
      <button onClick={onStand} disabled={!onStand || !canStand}>
        Stand
      </button>
      <button onClick={onDouble} disabled={!onDouble || !canDouble}>
        Double
      </button>
      <button onClick={onSplit} disabled={!onSplit || !canSplit}>
        Split
      </button>
      <button onClick={onSurrender} disabled={!onSurrender || !canSurrender}>
        Surrender
      </button>
    </div>
  );
}
