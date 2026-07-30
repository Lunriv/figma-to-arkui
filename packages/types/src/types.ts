export const arkuiGenerationModes = [
  "snippet",
  "component",
  "builder",
  "preview",
] as const;

export type ArkUIGenerationMode = (typeof arkuiGenerationModes)[number];

export interface PluginSettings {
  arkuiGenerationMode: ArkUIGenerationMode;
}

export const defaultPluginSettings: PluginSettings = {
  arkuiGenerationMode: "component",
};

export interface Message {
  type: string;
}

export interface UIMessage {
  pluginMessage: Message;
}

export type EmptyMessage = Message & { type: "empty" };
export type ConversionStartMessage = Message & { type: "conversionStart" };
export type ConversionMessage = Message & {
  type: "code";
  code: string;
  settings: PluginSettings;
};
export type ErrorMessage = Message & { type: "error"; error: string };
export type SettingsChangedMessage = Message & {
  type: "pluginSettingsChanged";
  settings: PluginSettings;
};
export type SettingWillChangeMessage = Message & {
  type: "pluginSettingWillChange";
  key: keyof PluginSettings;
  value: PluginSettings[keyof PluginSettings];
};
