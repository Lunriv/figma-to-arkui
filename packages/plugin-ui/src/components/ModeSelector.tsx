import {
  arkuiGenerationModes,
  type ArkUIGenerationMode,
} from "types";

const labels: Record<ArkUIGenerationMode, string> = {
  snippet: "Snippet",
  component: "Component",
  builder: "Builder",
  preview: "Preview",
};

export const ModeSelector = ({
  value,
  onChange,
}: {
  value: ArkUIGenerationMode;
  onChange: (mode: ArkUIGenerationMode) => void;
}) => (
  <div className="mode-selector" role="tablist" aria-label="Output mode">
    {arkuiGenerationModes.map((mode) => (
      <button
        type="button"
        role="tab"
        aria-selected={value === mode}
        className={value === mode ? "mode-option active" : "mode-option"}
        key={mode}
        onClick={() => onChange(mode)}
      >
        {labels[mode]}
      </button>
    ))}
  </div>
);
