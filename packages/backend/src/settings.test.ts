import assert from "node:assert/strict";
import test from "node:test";
import { arkuiGenerationModes, defaultPluginSettings } from "types";

test("keeps ArkUI modes ordered with Component as default", () => {
  assert.deepEqual(arkuiGenerationModes, [
    "snippet",
    "component",
    "builder",
    "preview",
  ]);
  assert.equal(defaultPluginSettings.arkuiGenerationMode, "component");
});
