type DiscardTrayProps = {
  count: number;
};

export function DiscardTray({ count }: DiscardTrayProps) {
  return (
    <div className="discard-tray">
      <div className="discard-tray__title">Discard</div>
      <div className="discard-tray__count">{count}</div>
    </div>
  );
}
