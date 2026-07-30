import type {
  ConversionMessage,
  ConversionStartMessage,
  EmptyMessage,
  ErrorMessage,
  PluginSettings,
  SettingsChangedMessage,
} from "types";

const postBackendMessage = (message: unknown): void => {
  try {
    figma.ui.postMessage(message);
  } catch {
    // Codegen has no UI, so a messaging failure must not interrupt code generation.
  }
};

export const postEmptyMessage = (): void =>
  postBackendMessage({ type: "empty" } satisfies EmptyMessage);

export const postConversionStart = (): void =>
  postBackendMessage({ type: "conversionStart" } satisfies ConversionStartMessage);

export const postConversionComplete = (
  code: string,
  settings: PluginSettings,
): void =>
  postBackendMessage({ type: "code", code, settings } satisfies ConversionMessage);

export const postError = (error: string): void =>
  postBackendMessage({ type: "error", error } satisfies ErrorMessage);

export const postSettingsChanged = (settings: PluginSettings): void =>
  postBackendMessage({
    type: "pluginSettingsChanged",
    settings,
  } satisfies SettingsChangedMessage);
