import type { PluginSettings } from "types";
import { nodesToJSON } from "./altNodes/jsonNodeConversion";
import { arkuiMain } from "./arkui/arkuiMain";
import {
  postConversionComplete,
  postConversionStart,
  postEmptyMessage,
  postError,
} from "./messaging";

const MAX_NODE_COUNT = 4000;

const countNodes = (nodes: ReadonlyArray<SceneNode>): number => {
  let count = 0;
  const pending = [...nodes];
  while (pending.length) {
    const node = pending.pop()!;
    count++;
    if ("children" in node) pending.push(...node.children);
  }
  return count;
};

export const run = async (settings: PluginSettings): Promise<void> => {
  const selection = figma.currentPage.selection;
  if (!selection.length) return postEmptyMessage();

  const nodeCount = countNodes(selection);
  if (nodeCount > MAX_NODE_COUNT)
    return postError(
      `Selection too large (${nodeCount} nodes). Please select a smaller frame.`,
    );

  postConversionStart();
  const nodes = await nodesToJSON(selection);
  if (!nodes.length) return postEmptyMessage();
  postConversionComplete(
    arkuiMain(nodes as unknown as SceneNode[], {
      generationMode: settings.arkuiGenerationMode,
    }),
    settings,
  );
};
