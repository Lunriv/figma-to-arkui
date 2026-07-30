import { arkuiDefaultBuilder } from "./arkuiDefaultBuilder";
import type { ArkUIGenerationMode } from "types";

export type { ArkUIGenerationMode } from "types";

export type ArkUIOptions = Readonly<{
  generationMode?: ArkUIGenerationMode;
}>;

export const arkuiMain = (
  nodes: SceneNode[],
  options?: ArkUIOptions,
): string => arkuiDefaultBuilder(nodes, options?.generationMode);
