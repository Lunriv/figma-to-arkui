import {
  arkuiMain,
  nodesToJSON,
  postError,
  postSettingsChanged,
  run,
} from "backend";
import {
  arkuiGenerationModes,
  defaultPluginSettings,
  type ArkUIGenerationMode,
  type PluginSettings,
  type SettingWillChangeMessage,
} from "types";

const STORAGE_KEY = "figmaToArkUISettings";
let settings = defaultPluginSettings;
let isRunning = false;
let shouldRegenerate = false;

const isGenerationMode = (value: unknown): value is ArkUIGenerationMode =>
  typeof value === "string" &&
  arkuiGenerationModes.includes(value as ArkUIGenerationMode);

const loadSettings = async (): Promise<PluginSettings> => {
  const stored = await figma.clientStorage.getAsync(STORAGE_KEY);
  settings = {
    arkuiGenerationMode: isGenerationMode(stored?.arkuiGenerationMode)
      ? stored.arkuiGenerationMode
      : defaultPluginSettings.arkuiGenerationMode,
  };
  return settings;
};

const regenerate = async (): Promise<void> => {
  if (isRunning) {
    shouldRegenerate = true;
    return;
  }
  isRunning = true;
  try {
    do {
      shouldRegenerate = false;
      try {
        await run(settings);
      } catch (error) {
        postError(error instanceof Error ? error.message : String(error));
      }
    } while (shouldRegenerate);
  } finally {
    isRunning = false;
  }
};

const startPlugin = (): void => {
  figma.showUI(__html__, { width: 450, height: 700, themeColors: true });
  let initialized = false;

  figma.on("selectionchange", regenerate);
  figma.ui.onmessage = async (message: SettingWillChangeMessage | { type: string }) => {
    if (message.type === "ui-ready" && !initialized) {
      initialized = true;
      await loadSettings();
      postSettingsChanged(settings);
      await regenerate();
      return;
    }
    if (
      message.type === "pluginSettingWillChange" &&
      "key" in message &&
      message.key === "arkuiGenerationMode" &&
      isGenerationMode(message.value)
    ) {
      settings = { arkuiGenerationMode: message.value };
      await figma.clientStorage.setAsync(STORAGE_KEY, settings);
      postSettingsChanged(settings);
      await regenerate();
    }
  };
};

const startCodegen = async (): Promise<void> => {
  await loadSettings();
  figma.codegen.on("generate", async ({ language, node }) => {
    if (language !== "arkui") return [];
    const converted = await nodesToJSON([node]);
    return [
      {
        title: "ArkUI",
        code: arkuiMain(converted as unknown as SceneNode[], {
          generationMode: settings.arkuiGenerationMode,
        }),
        language: "TYPESCRIPT",
      },
    ];
  });
};

if (figma.mode === "codegen") startCodegen();
else if (figma.mode === "default" || figma.mode === "inspect") startPlugin();
