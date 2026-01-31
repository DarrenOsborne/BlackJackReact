type SpeedToggleProps = {
  value: "slow" | "normal" | "fast";
  onChange?: (value: "slow" | "normal" | "fast") => void;
};

export function SpeedToggle({ value, onChange }: SpeedToggleProps) {
  return (
    <div className="speed-toggle">
      <button onClick={() => onChange?.("slow")} aria-pressed={value === "slow"}>
        Slow
      </button>
      <button onClick={() => onChange?.("normal")} aria-pressed={value === "normal"}>
        Normal
      </button>
      <button onClick={() => onChange?.("fast")} aria-pressed={value === "fast"}>
        Fast
      </button>
    </div>
  );
}
