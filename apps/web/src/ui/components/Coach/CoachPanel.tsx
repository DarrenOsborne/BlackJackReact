type CoachPanelProps = {
  message?: string;
};

export function CoachPanel({ message = "Coach insights will appear here." }: CoachPanelProps) {
  return <aside className="coach-panel">{message}</aside>;
}
