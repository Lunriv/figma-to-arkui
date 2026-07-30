import assert from "node:assert/strict";
import test from "node:test";
import { nodesToJSON } from "./jsonNodeConversion";

const sceneNode = (
  document: Record<string, unknown>,
  styledTextSegments: StyledTextSegment[] = [],
): SceneNode =>
  ({
    id: document.id,
    name: document.name,
    type: document.type,
    exportAsync: async (settings: ExportSettings) => {
      assert.deepEqual(settings, { format: "JSON_REST_V1" });
      return { document: structuredClone(document) };
    },
    getStyledTextSegments: () => styledTextSegments,
  }) as unknown as SceneNode;

test("preserves ArkUI image and layout input without settings", async () => {
  const imageFills = [{ type: "IMAGE", imageRef: "image" }];
  const result = await nodesToJSON([
    sceneNode({
      id: "image",
      name: "Avatar",
      type: "RECTANGLE",
      visible: true,
      fills: imageFills,
      absoluteBoundingBox: { x: 12, y: 20, width: 96, height: 96 },
    }),
  ]);

  assert.equal(result[0].layoutSizingHorizontal, "FIXED");
  assert.equal(result[0].layoutSizingVertical, "FIXED");
  assert.deepEqual(result[0].fills, imageFills);
  assert.equal(result[0].width, 96);
  assert.equal(result[0].height, 96);
  assert.equal(result[0].x, 0);
  assert.equal(result[0].y, 0);
});

test("preserves styled text segments without color variable access", async () => {
  const segment = {
    characters: "ArkUI",
    start: 0,
    end: 5,
    fontName: { family: "HarmonyOS Sans", style: "Regular" },
    fontSize: 16,
    fontWeight: 400,
    fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }],
  } as unknown as StyledTextSegment;
  const result = await nodesToJSON([
    sceneNode(
      {
        id: "text",
        name: "Label",
        type: "TEXT",
        visible: true,
        characters: "ArkUI",
        style: { fontSize: 16, fontWeight: 400 },
        absoluteBoundingBox: { x: 0, y: 0, width: 44, height: 22 },
      },
      [segment],
    ),
  ]);

  assert.equal(result[0].styledTextSegments.length, 1);
  assert.equal(result[0].styledTextSegments[0].characters, "ArkUI");
  assert.equal(result[0].fontSize, 16);
});
