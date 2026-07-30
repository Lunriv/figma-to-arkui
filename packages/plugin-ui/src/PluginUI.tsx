import { Info } from "lucide-react";
import { useState } from "react";
import type { ArkUIGenerationMode, PluginSettings } from "types";
import { About } from "./components/About";
import { CodePanel } from "./components/CodePanel";
import { EmptyState } from "./components/EmptyState";
import { Loading } from "./components/Loading";
import { ModeSelector } from "./components/ModeSelector";

export interface PluginUIProps {
  code: string;
  isLoading: boolean;
  settings: PluginSettings;
  onModeChange: (mode: ArkUIGenerationMode) => void;
}

export const PluginUI = ({
  code,
  isLoading,
  settings,
  onModeChange,
}: PluginUIProps) => {
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  return (
    <div className="plugin-shell">
      <header className="toolbar">
        <ModeSelector
          value={settings.arkuiGenerationMode}
          onChange={(mode) => {
            setIsAboutVisible(false);
            onModeChange(mode);
          }}
        />
        <button
          type="button"
          className={isAboutVisible ? "icon-button active" : "icon-button"}
          onClick={() => setIsAboutVisible((value) => !value)}
          aria-label="About"
          title="About"
        >
          <Info size={16} />
        </button>
      </header>
      <main>
        {isAboutVisible ? (
          <About />
        ) : isLoading ? (
          <Loading />
        ) : code ? (
          <CodePanel code={code} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
};
