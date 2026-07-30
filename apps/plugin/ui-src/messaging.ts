import type {
  ArkUIGenerationMode,
  SettingWillChangeMessage,
  UIMessage,
} from "types";

export const postModeChange = (value: ArkUIGenerationMode): void => {
  const message: SettingWillChangeMessage = {
    type: "pluginSettingWillChange",
    key: "arkuiGenerationMode",
    value,
  };
  parent.postMessage({ pluginMessage: message } satisfies UIMessage, "*");
};
