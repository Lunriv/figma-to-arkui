import { PluginUI } from "plugin-ui";
import { useEffect, useState } from "react";
import {
  defaultPluginSettings,
  type ConversionMessage,
  type ErrorMessage,
  type Message,
  type PluginSettings,
  type SettingsChangedMessage,
} from "types";
import { postModeChange } from "./messaging";

interface AppState {
  code: string;
  isLoading: boolean;
  settings: PluginSettings;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    code: "",
    isLoading: true,
    settings: defaultPluginSettings,
  });

  useEffect(() => {
    window.onmessage = ({ data }: MessageEvent) => {
      const message = data.pluginMessage as Message;
      switch (message.type) {
        case "conversionStart":
          setState((state) => ({ ...state, code: "", isLoading: true }));
          break;
        case "code": {
          const conversion = message as ConversionMessage;
          setState({
            code: conversion.code,
            isLoading: false,
            settings: conversion.settings,
          });
          break;
        }
        case "pluginSettingsChanged":
          setState((state) => ({
            ...state,
            settings: (message as SettingsChangedMessage).settings,
          }));
          break;
        case "empty":
          setState((state) => ({ ...state, code: "", isLoading: false }));
          break;
        case "error":
          setState((state) => ({
            ...state,
            code: `// Error: ${(message as ErrorMessage).error}`,
            isLoading: false,
          }));
      }
    };
    parent.postMessage({ pluginMessage: { type: "ui-ready" } }, "*");
    return () => {
      window.onmessage = null;
    };
  }, []);

  return (
    <PluginUI
      code={state.code}
      isLoading={state.isLoading}
      settings={state.settings}
      onModeChange={postModeChange}
    />
  );
}
