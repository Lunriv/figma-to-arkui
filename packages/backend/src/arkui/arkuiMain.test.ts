import assert from "node:assert/strict";
import test from "node:test";
import * as backendExports from "../index";

const fill = (r: number, g: number, b: number, visible = true) => ({
  type: "SOLID",
  color: { r, g, b },
  visible,
});
const node = (properties: Record<string, unknown>): SceneNode =>
  properties as unknown as SceneNode;

test("generates a raw Snippet when requested", async () => {
  assert.equal(
    await backendExports.arkuiMain([], { generationMode: "snippet" }),
    `Stack() {
}
`,
  );
});

test("generates a fixed Component consistently", async () => {
  assert.equal(
    await backendExports.arkuiMain([]),
    `@Component
struct GeneratedPage {
  build() {
    Stack() {
    }
  }
}
`,
  );
});

test("generates a global Builder when requested", async () => {
  assert.equal(
    await backendExports.arkuiMain([], { generationMode: "builder" }),
    `@Builder
function GeneratedBuilder() {
  Stack() {
  }
}
`,
  );
});

test("generates an entry Preview when requested", async () => {
  assert.equal(
    await backendExports.arkuiMain([], { generationMode: "preview" }),
    `@Entry
@Preview
@Component
struct GeneratedPage {
  build() {
    Stack() {
    }
  }
}
`,
  );
});

test("generates Column for vertical auto layout", async () => {
  const frame = node({
    type: "FRAME",
    name: "Dashboard",
    visible: true,
    layoutMode: "VERTICAL",
    itemSpacing: 8,
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 16,
    width: 200,
    height: 88,
    x: 0,
    y: 0,
    fills: [fill(0.95, 0.96, 0.97)],
    cornerRadius: 12,
    children: [
      node({
        type: "TEXT",
        name: "Title",
        visible: true,
        characters: "Welcome",
        fontSize: 20,
        fontWeight: 700,
        textAlignHorizontal: "CENTER",
        width: 168,
        height: 24,
        x: 16,
        y: 12,
        fills: [fill(0.1, 0.2, 0.3)],
      }),
      node({
        type: "TEXT",
        name: "Subtitle",
        visible: true,
        characters: "Semantic layout",
        fontSize: 14,
        width: 168,
        height: 20,
        x: 16,
        y: 44,
        fills: [fill(0.2, 0.3, 0.4)],
      }),
    ],
  });

  const code = await backendExports.arkuiMain([frame]);
  assert.match(code, /Column\(\{ space: 8 \}\)/);
  assert.match(
    code,
    /\.padding\(\{ top: 12, right: 16, bottom: 12, left: 16 \}\)/,
  );
  assert.match(code, /\.width\(200\)/);
  assert.match(code, /\.fontWeight\(700\)/);
  assert.doesNotMatch(code, /\.position\(/);
});

test("uses intrinsic width only for HUG containers", async () => {
  const createButton = (layoutSizingHorizontal: "HUG" | "FIXED") =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      layoutSizingHorizontal,
      paddingTop: 8,
      paddingRight: 12,
      paddingBottom: 8,
      paddingLeft: 12,
      width: 72,
      height: 40,
      children: [
        node({
          type: "TEXT",
          visible: true,
          characters: "Button label",
          fontSize: 16,
          width: 48,
          height: 24,
        }),
      ],
    });

  const hugCode = await backendExports.arkuiMain([createButton("HUG")]);
  const fixedCode = await backendExports.arkuiMain([createButton("FIXED")]);

  assert.doesNotMatch(hugCode, /\.width\(72\)/);
  assert.match(hugCode, /\.height\(40\)/);
  assert.match(
    hugCode,
    /\.padding\(\{ top: 8, right: 12, bottom: 8, left: 12 \}\)/,
  );
  assert.match(fixedCode, /\.width\(72\)/);
});

test("uses intrinsic height for vertically HUG auto-layout containers", async () => {
  const createColumn = (layoutSizingVertical: "HUG" | "FIXED") =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      layoutSizingVertical,
      primaryAxisAlignItems: "CENTER",
      paddingTop: 10,
      paddingBottom: 10,
      width: 100,
      height: 80,
      children: [
        node({ type: "RECTANGLE", visible: true, width: 40, height: 20 }),
      ],
    });
  const hugCode = await backendExports.arkuiMain([createColumn("HUG")]);
  const fixedCode = await backendExports.arkuiMain([createColumn("FIXED")]);
  const rowCode = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      layoutSizingVertical: "HUG",
      counterAxisAlignItems: "MIN",
      width: 100,
      height: 40,
      children: [
        node({ type: "RECTANGLE", visible: true, width: 40, height: 20 }),
      ],
    }),
  ]);

  assert.doesNotMatch(hugCode, /\.height\(80\)/);
  assert.doesNotMatch(hugCode, /\.justifyContent\(/);
  assert.match(fixedCode, /\.height\(80\)/);
  assert.match(fixedCode, /\.justifyContent\(FlexAlign\.Center\)/);
  assert.doesNotMatch(rowCode, /\.height\(40\)/);
  assert.match(rowCode, /\.alignItems\(VerticalAlign\.Top\)/);
});

test("fuses strict single-text HUG buttons into one Row", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      layoutSizingHorizontal: "HUG",
      layoutSizingVertical: "HUG",
      primaryAxisAlignItems: "CENTER",
      counterAxisAlignItems: "CENTER",
      width: 88,
      height: 40,
      children: [
        node({
          type: "FRAME",
          visible: true,
          layoutMode: "VERTICAL",
          layoutSizingHorizontal: "HUG",
          primaryAxisAlignItems: "CENTER",
          counterAxisAlignItems: "CENTER",
          width: 88,
          height: 40,
          fills: [fill(0.4, 0.31, 0.64)],
          cornerRadius: 100,
          children: [
            node({
              type: "FRAME",
              visible: true,
              layoutMode: "HORIZONTAL",
              layoutSizingHorizontal: "HUG",
              primaryAxisAlignItems: "CENTER",
              counterAxisAlignItems: "CENTER",
              width: 88,
              height: 40,
              paddingTop: 10,
              paddingRight: 16,
              paddingBottom: 10,
              paddingLeft: 16,
              children: [
                node({
                  type: "TEXT",
                  visible: true,
                  characters: "Download",
                  fontSize: 14,
                  width: 56,
                  height: 20,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ]);

  assert.equal(code.match(/(?:Row|Column)\(/g)?.length, 1);
  assert.match(code, /Row\(\) \{[\s\S]*Text\("Download"\)/);
  assert.doesNotMatch(code, /\.height\(40\)/);
  assert.match(
    code,
    /\.padding\(\{ top: 10, right: 16, bottom: 10, left: 16 \}\)/,
  );
  assert.match(code, /\.backgroundColor\("#664FA3"\)/);
  assert.match(code, /\.borderRadius\(100\)/);
  assert.doesNotMatch(code, /\.width\(88\)/);
});

test("preserves necessary structure for fixed-width, multi-content, or height-mismatched buttons", async () => {
  const createButton = (
    layoutSizingHorizontal: "HUG" | "FIXED",
    children: SceneNode[],
    layoutSizingVertical?: "HUG" | "FIXED",
  ) =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      layoutSizingHorizontal,
      layoutSizingVertical,
      width: 88,
      height: 40,
      children: [
        node({
          type: "FRAME",
          visible: true,
          layoutMode: "VERTICAL",
          layoutSizingHorizontal: "HUG",
          width: 88,
          height: 40,
          fills: [fill(0.4, 0.31, 0.64)],
          cornerRadius: 100,
          children: [
            node({
              type: "FRAME",
              visible: true,
              layoutMode: "HORIZONTAL",
              layoutSizingHorizontal: "HUG",
              width: 88,
              height: 40,
              paddingTop: 10,
              paddingRight: 16,
              paddingBottom: 10,
              paddingLeft: 16,
              children,
            }),
          ],
        }),
      ],
    });
  const text = node({
    type: "TEXT",
    visible: true,
    characters: "Download",
    fontSize: 14,
    width: 56,
    height: 20,
  });
  const fixedCode = await backendExports.arkuiMain([
    createButton("FIXED", [text]),
  ]);
  const multipleCode = await backendExports.arkuiMain([
    createButton("HUG", [
      node({ type: "VECTOR", visible: true, width: 16, height: 16 }),
      text,
    ]),
  ]);
  const mismatchedHeightCode = await backendExports.arkuiMain([
    createButton(
      "HUG",
      [
        node({
          type: "TEXT",
          visible: true,
          characters: "Download",
          fontSize: 14,
          width: 56,
          height: 18,
        }),
      ],
      "HUG",
    ),
  ]);

  assert.match(fixedCode, /Column\(\)/);
  assert.match(fixedCode, /\.width\(88\)/);
  assert.match(fixedCode, /\.height\(40\)/);
  assert.match(multipleCode, /Column\(\)/);
  assert.ok((multipleCode.match(/Rect\(/g)?.length ?? 0) >= 1);
  assert.match(mismatchedHeightCode, /\.height\(40\)/);
});

test("maps main-axis and cross-axis alignment for horizontal auto layout", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      itemSpacing: 10,
      primaryAxisAlignItems: "SPACE_BETWEEN",
      counterAxisAlignItems: "CENTER",
      width: 160,
      height: 40,
      children: [
        node({ type: "RECTANGLE", visible: true, width: 20, height: 20 }),
        node({ type: "RECTANGLE", visible: true, width: 20, height: 20 }),
      ],
    }),
  ]);

  assert.match(code, /Row\(\)/);
  assert.doesNotMatch(code, /Row\(\{ space: 10 \}\)/);
  assert.match(code, /\.justifyContent\(FlexAlign\.SpaceBetween\)/);
  assert.doesNotMatch(code, /\.alignItems\(VerticalAlign\.Center\)/);
  assert.doesNotMatch(code, /\.position\(/);
});

test("omits default cross-axis alignment for Row and Column", async () => {
  const createLayout = (
    layoutMode: "HORIZONTAL" | "VERTICAL",
    counterAxisAlignItems: "CENTER" | "MIN",
  ) =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode,
      counterAxisAlignItems,
      width: 40,
      height: 40,
      children: [
        node({ type: "RECTANGLE", visible: true, width: 20, height: 20 }),
      ],
    });

  const centeredRow = await backendExports.arkuiMain([
    createLayout("HORIZONTAL", "CENTER"),
  ]);
  const centeredColumn = await backendExports.arkuiMain([
    createLayout("VERTICAL", "CENTER"),
  ]);
  const startedColumn = await backendExports.arkuiMain([
    createLayout("VERTICAL", "MIN"),
  ]);

  assert.doesNotMatch(centeredRow, /\.alignItems\(VerticalAlign\.Center\)/);
  assert.doesNotMatch(
    centeredColumn,
    /\.alignItems\(HorizontalAlign\.Center\)/,
  );
  assert.match(startedColumn, /\.alignItems\(HorizontalAlign\.Start\)/);
});

test("omits ineffective alignment when fixed children fill the container", async () => {
  const createRow = (width: number, height: number) =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "CENTER",
      counterAxisAlignItems: "CENTER",
      width,
      height,
      children: [
        node({ type: "RECTANGLE", visible: true, width: 20, height: 20 }),
        node({ type: "RECTANGLE", visible: true, width: 20, height: 20 }),
      ],
    });
  const fullCode = await backendExports.arkuiMain([createRow(40, 20)]);
  const remainderCode = await backendExports.arkuiMain([createRow(50, 30)]);

  assert.doesNotMatch(fullCode, /\.justifyContent\(|\.alignItems\(/);
  assert.match(remainderCode, /\.justifyContent\(FlexAlign\.Center\)/);
  assert.doesNotMatch(remainderCode, /\.alignItems\(VerticalAlign\.Center\)/);
});

test("omits default Column cross-axis alignment for intrinsically sized Text", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      counterAxisAlignItems: "CENTER",
      width: 100,
      height: 24,
      children: [
        node({
          type: "TEXT",
          visible: true,
          characters: "Label",
          width: 100,
          height: 24,
        }),
      ],
    }),
  ]);

  assert.doesNotMatch(code, /\.alignItems\(HorizontalAlign\.Center\)/);
});

test("collapses strict same-size transparent single-child containers", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      layoutSizingHorizontal: "FIXED",
      width: 120,
      height: 40,
      children: [
        node({
          type: "FRAME",
          visible: true,
          layoutMode: "HORIZONTAL",
          layoutSizingHorizontal: "FIXED",
          width: 120,
          height: 40,
          children: [
            node({
              type: "RECTANGLE",
              visible: true,
              width: 20,
              height: 20,
            }),
          ],
        }),
      ],
    }),
  ]);

  assert.doesNotMatch(code, /Column\(\)/);
  assert.match(code, /Row\(\)/);
});

test("preserves non-equivalent single-child containers", async () => {
  const createWrapper = (properties: Record<string, unknown>) =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      layoutSizingHorizontal: "FIXED",
      width: 120,
      height: 40,
      ...properties,
      children: [
        node({
          type: "FRAME",
          visible: true,
          layoutMode: "HORIZONTAL",
          layoutSizingHorizontal: "FIXED",
          width: 120,
          height: 40,
          children: [],
        }),
      ],
    });
  const cases = [
    createWrapper({ fills: [fill(1, 0, 0)] }),
    createWrapper({ width: 121 }),
    createWrapper({ layoutSizingHorizontal: "HUG" }),
    createWrapper({ reactions: [{}] }),
    createWrapper({ type: "COMPONENT" }),
  ];

  for (const source of cases) {
    const code = await backendExports.arkuiMain([source]);
    assert.match(code, /Column\(\)/);
  }

  const absoluteCode = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      layoutSizingHorizontal: "FIXED",
      width: 120,
      height: 40,
      children: [
        node({
          type: "FRAME",
          visible: true,
          layoutMode: "HORIZONTAL",
          layoutSizingHorizontal: "FIXED",
          layoutPositioning: "ABSOLUTE",
          width: 120,
          height: 40,
          children: [],
        }),
      ],
    }),
  ]);
  assert.match(absoluteCode, /Stack\(\)/);
});

test("generates ForEach for at least three non-interactive flow nodes with identical output", async () => {
  const createCard = (
    properties: Record<string, unknown> = {},
    childProperties: Record<string, unknown> = {},
  ) =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      width: 120,
      height: 40,
      ...properties,
      children: [
        node({
          type: "VECTOR",
          visible: true,
          width: 40,
          height: 40,
          ...childProperties,
        }),
      ],
    });
  const createList = (children: SceneNode[]) =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      itemSpacing: 8,
      width: 120,
      height: children.length * 40 + (children.length - 1) * 8,
      children,
    });
  const cards = (createSource: () => SceneNode, count = 3) =>
    Array.from({ length: count }, createSource);

  const repeated = await backendExports.arkuiMain([
    createList(cards(() => createCard())),
  ]);
  const pair = await backendExports.arkuiMain([
    createList(cards(() => createCard(), 2)),
  ]);
  const interactive = await backendExports.arkuiMain([
    createList(cards(() => createCard({ reactions: [{}] }))),
  ]);
  const absolute = await backendExports.arkuiMain([
    createList(
      cards(() =>
        createCard({}, { layoutPositioning: "ABSOLUTE", x: 0, y: 0 }),
      ),
    ),
  ]);
  const instances = await backendExports.arkuiMain([
    createList(cards(() => createCard({ type: "INSTANCE" }))),
  ]);

  assert.match(repeated, /ForEach\(\[0, 1, 2\]/);
  assert.match(repeated, /\(key: number\) => key\.toString\(\)/);
  assert.equal((repeated.match(/Rect\(/g) ?? []).length, 1);
  assert.doesNotMatch(pair, /ForEach\(/);
  assert.equal((pair.match(/Rect\(/g) ?? []).length, 2);
  assert.doesNotMatch(interactive, /ForEach\(/);
  assert.match(absolute, /ForEach\(\[0, 1, 2\]/);
  assert.match(instances, /ForEach\(\[0, 1, 2\]/);
});

test("positions multiple top-level nodes from a shared origin", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      name: "Left",
      visible: true,
      width: 10,
      height: 10,
      absoluteBoundingBox: { x: 40, y: 20, width: 10, height: 10 },
      fills: [fill(1, 0, 0)],
    }),
    node({
      type: "RECTANGLE",
      name: "Right",
      visible: true,
      width: 10,
      height: 10,
      absoluteBoundingBox: { x: 70, y: 35, width: 10, height: 10 },
      fills: [fill(0, 0, 1)],
    }),
  ]);

  assert.match(code, /\.position\(\{ x: 0, y: 0 \}\)/);
  assert.match(code, /\.position\(\{ x: 30, y: 15 \}\)/);
  assert.match(code, /    \}\n      \.width\(40\)\n      \.height\(25\)\n  \}/);
});

test("infers horizontal flow layout for plain Frames", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "NONE",
      width: 134,
      height: 40,
      x: 0,
      y: 0,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          x: 16,
          y: 10,
          width: 40,
          height: 20,
        }),
        node({
          type: "RECTANGLE",
          visible: true,
          x: 68,
          y: 10,
          width: 50,
          height: 20,
        }),
      ],
    }),
  ]);

  assert.match(code, /Row\(\{ space: 12 \}\)/);
  assert.match(
    code,
    /\.padding\(\{ top: 10, right: 16, bottom: 10, left: 16 \}\)/,
  );
  assert.doesNotMatch(code, /\.alignItems\(/);
  assert.doesNotMatch(code, /\.position\(/);
});

test("infers vertical flow layout for plain Frames", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "NONE",
      width: 104,
      height: 66,
      x: 0,
      y: 0,
      children: [
        node({
          type: "TEXT",
          visible: true,
          characters: "Title",
          x: 12,
          y: 8,
          width: 80,
          height: 20,
        }),
        node({
          type: "TEXT",
          visible: true,
          characters: "Subtitle",
          x: 12,
          y: 34,
          width: 80,
          height: 24,
        }),
      ],
    }),
  ]);

  assert.match(code, /Column\(\{ space: 6 \}\)/);
  assert.match(code, /\.alignItems\(HorizontalAlign\.Start\)/);
  assert.doesNotMatch(code, /\.position\(/);
});

test("absorbs 3px cross-axis jitter and boundary overflow in plain Frames", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "NONE",
      width: 100,
      height: 30,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          x: 0,
          y: -3,
          width: 30,
          height: 20,
        }),
        node({
          type: "RECTANGLE",
          visible: true,
          x: 40,
          y: 0,
          width: 30,
          height: 20,
        }),
      ],
    }),
  ]);

  assert.match(code, /Row\(\{ space: 10 \}\)/);
  assert.doesNotMatch(code, /\.position\(/);
});

test("preserves positioning for 4px cross-axis deviation in plain Frames", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "NONE",
      width: 100,
      height: 30,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          x: 0,
          y: -4,
          width: 30,
          height: 20,
        }),
        node({
          type: "RECTANGLE",
          visible: true,
          x: 40,
          y: 0,
          width: 30,
          height: 20,
        }),
      ],
    }),
  ]);

  assert.match(code, /Stack\(\)/);
  assert.match(code, /\.position\(\{ x: 0, y: -4 \}\)/);
});

test("preserves non-uniform inferred spacing with child margins", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "NONE",
      width: 110,
      height: 40,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          x: 10,
          y: 10,
          width: 20,
          height: 20,
        }),
        node({
          type: "RECTANGLE",
          visible: true,
          x: 40,
          y: 10,
          width: 20,
          height: 20,
        }),
        node({
          type: "RECTANGLE",
          visible: true,
          x: 80,
          y: 10,
          width: 20,
          height: 20,
        }),
      ],
    }),
  ]);

  assert.match(code, /Row\(\)/);
  assert.match(code, /\.margin\(\{ left: 10 \}\)/);
  assert.match(code, /\.margin\(\{ left: 20 \}\)/);
  assert.doesNotMatch(code, /Row\(\{ space:/);
  assert.doesNotMatch(code, /\.position\(/);
});

test("infers horizontal flow layout for multiple top-level nodes", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      visible: true,
      width: 10,
      height: 10,
      absoluteBoundingBox: { x: 40, y: 20, width: 10, height: 10 },
    }),
    node({
      type: "RECTANGLE",
      visible: true,
      width: 10,
      height: 10,
      absoluteBoundingBox: { x: 70, y: 20, width: 10, height: 10 },
    }),
  ]);

  assert.match(code, /Row\(\{ space: 20 \}\)/);
  assert.doesNotMatch(code, /\.position\(/);
});

test("reads each absolute child boundary once during flow inference", async () => {
  let boundaryReads = 0;
  const children = Array.from({ length: 3 }, (_, index) =>
    node({
      type: "RECTANGLE",
      visible: true,
      width: 10,
      height: 10,
      get absoluteBoundingBox() {
        boundaryReads++;
        return { x: index * 20, y: 0, width: 10, height: 10 };
      },
    }),
  );

  await backendExports.arkuiMain(children);

  assert.equal(boundaryReads, children.length * 2);
});

test("preserves Stack and actual positions for overlapping nodes", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "NONE",
      width: 100,
      height: 60,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          x: 10,
          y: 10,
          width: 50,
          height: 30,
        }),
        node({
          type: "RECTANGLE",
          visible: true,
          x: 30,
          y: 20,
          width: 50,
          height: 30,
        }),
      ],
    }),
  ]);

  assert.match(code, /Stack\(\)/);
  assert.equal(code.match(/\.position\(/g)?.length, 2);
});

test("omits position for a strictly centered single shape in a solid-color Stack", async () => {
  const createIndicator = (parent: Record<string, unknown>, x: number) =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "NONE",
      width: 376,
      height: 24,
      fills: [fill(0.95, 0.93, 0.97)],
      ...parent,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          layoutPositioning: "ABSOLUTE",
          x,
          y: 10,
          width: 108,
          height: 4,
        }),
      ],
    });
  const centered = await backendExports.arkuiMain([createIndicator({}, 134)]);
  const offset = await backendExports.arkuiMain([createIndicator({}, 133)]);
  const transparent = await backendExports.arkuiMain([
    createIndicator({ fills: undefined }, 134),
  ]);

  assert.doesNotMatch(centered, /\.position\(/);
  assert.match(offset, /\.position\(\{ x: 133, y: 10 \}\)/);
  assert.match(transparent, /\.position\(\{ x: 134, y: 10 \}\)/);
});

test("omits fully transparent non-interactive subtrees in free layouts", async () => {
  const createHiddenNode = (properties: Record<string, unknown> = {}) =>
    node({
      type: "FRAME",
      visible: true,
      layoutPositioning: "ABSOLUTE",
      opacity: 0,
      x: 24,
      y: 4,
      width: 24,
      height: 24,
      ...properties,
      children: [
        node({
          type: "VECTOR",
          visible: true,
          x: 2,
          y: 2,
          width: 20,
          height: 20,
        }),
      ],
    });
  const absolute = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "NONE",
      width: 64,
      height: 32,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          x: 0,
          y: 0,
          width: 20,
          height: 20,
        }),
        createHiddenNode(),
      ],
    }),
  ]);
  const flow = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      width: 64,
      height: 24,
      children: [
        node({ type: "RECTANGLE", visible: true, width: 20, height: 20 }),
        node({
          type: "RECTANGLE",
          visible: true,
          opacity: 0,
          width: 20,
          height: 20,
        }),
      ],
    }),
  ]);
  const interactive = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "NONE",
      width: 64,
      height: 32,
      children: [createHiddenNode({ reactions: [{}] })],
    }),
  ]);

  assert.doesNotMatch(
    absolute,
    /\.opacity\(0\)|\.position\(\{ x: 24, y: 4 \}\)/,
  );
  assert.match(flow, /\.opacity\(0\)/);
  assert.match(interactive, /\.opacity\(0\)/);
});

test("reflows absolute transparent single-text wrapper chains in auto layout", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      itemSpacing: 4,
      primaryAxisAlignItems: "SPACE_BETWEEN",
      counterAxisAlignItems: "CENTER",
      paddingTop: 8,
      paddingRight: 4,
      paddingBottom: 8,
      paddingLeft: 4,
      width: 372,
      height: 65,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          width: 48,
          height: 48,
          fills: [fill(1, 0, 0)],
        }),
        node({
          type: "FRAME",
          visible: true,
          layoutMode: "VERTICAL",
          layoutPositioning: "ABSOLUTE",
          width: 260,
          height: 28,
          x: 56,
          y: 19,
          children: [
            node({
              type: "FRAME",
              visible: true,
              width: 260,
              height: 28,
              children: [
                node({
                  type: "TEXT",
                  visible: true,
                  characters: "Label",
                  fontSize: 22,
                  textTruncation: "ENDING",
                  maxLines: 1,
                  width: 260,
                  height: 28,
                }),
              ],
            }),
          ],
        }),
        node({
          type: "RECTANGLE",
          visible: true,
          width: 96,
          height: 48,
          fills: [fill(0, 0, 1)],
        }),
      ],
    }),
  ]);

  assert.match(
    code,
    /Row\(\{ space: 4 \}\)[\s\S]*\.fill\("#FF0000"\)[\s\S]*Text\("Label"\)[\s\S]*\.layoutWeight\(1\)[\s\S]*\.fill\("#0000FF"\)/,
  );
  assert.doesNotMatch(code, /Row\(\) \{\s*Text\("Label"\)/);
  assert.doesNotMatch(code, /\.justifyContent\(FlexAlign\.SpaceBetween\)/);
  assert.doesNotMatch(code, /Stack\(\)/);
  assert.doesNotMatch(code, /\.position\(/);
  assert.doesNotMatch(code, /\.width\(260\)/);
});

test("preserves main-axis alignment for intrinsically sized reflowed Text", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "CENTER",
      width: 100,
      height: 24,
      children: [
        node({ type: "RECTANGLE", visible: true, width: 20, height: 24 }),
        node({
          type: "FRAME",
          visible: true,
          layoutPositioning: "ABSOLUTE",
          width: 80,
          height: 24,
          children: [
            node({
              type: "TEXT",
              visible: true,
              characters: "Label",
              width: 80,
              height: 24,
            }),
          ],
        }),
      ],
    }),
  ]);

  assert.match(code, /\.justifyContent\(FlexAlign\.Center\)/);
  assert.doesNotMatch(code, /\.position\(|\.width\(80\)/);
});

test("positions only absolute children in mixed auto layouts", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      itemSpacing: 8,
      paddingTop: 12,
      paddingRight: 16,
      paddingBottom: 12,
      paddingLeft: 16,
      width: 160,
      height: 88,
      children: [
        node({
          type: "TEXT",
          visible: true,
          characters: "Title",
          width: 128,
          height: 20,
          x: 16,
          y: 12,
        }),
        node({
          type: "TEXT",
          visible: true,
          characters: "Subtitle",
          width: 128,
          height: 20,
          x: 16,
          y: 40,
        }),
        node({
          type: "ELLIPSE",
          visible: true,
          layoutPositioning: "ABSOLUTE",
          width: 16,
          height: 16,
          x: 136,
          y: 8,
        }),
      ],
    }),
  ]);

  assert.match(code, /Stack\(\)/);
  assert.match(code, /Column\(\{ space: 8 \}\)/);
  assert.equal(code.match(/\.position\(/g)?.length, 1);
});

test("does not generate ArkUI clip for Figma clipping flags", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 120,
      height: 60,
      clipsContent: true,
      cornerRadius: 10,
      fills: [{ type: "IMAGE", visible: true }],
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          width: 40,
          height: 20,
          x: 100,
          y: 50,
          fills: [fill(1, 0, 0)],
        }),
      ],
    }),
  ]);

  assert.equal((code.match(/\.borderRadius\(10\)/g) ?? []).length, 1);
  assert.doesNotMatch(code, /\.clip\(true\)/);
});

test("generates corner radius only for containers with visible backgrounds", async () => {
  const createFrame = (fills?: unknown[]) =>
    node({
      type: "FRAME",
      visible: true,
      width: 40,
      height: 40,
      cornerRadius: 12,
      fills,
      children: [],
    });
  const transparentCode = await backendExports.arkuiMain([createFrame()]);
  const filledCode = await backendExports.arkuiMain([
    createFrame([fill(1, 0, 0)]),
  ]);

  assert.doesNotMatch(transparentCode, /\.borderRadius\(/);
  assert.match(filledCode, /\.borderRadius\(12\)/);
});

test("restores text line height letter spacing and vertical alignment", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "TEXT",
      visible: true,
      characters: "ArkUI",
      fontSize: 20,
      lineHeight: { unit: "PIXELS", value: 28 },
      letterSpacing: { unit: "PIXELS", value: 1.5 },
      textAlignVertical: "CENTER",
      width: 80,
      height: 28,
    }),
  ]);

  assert.match(code, /\.lineHeight\(28\)/);
  assert.match(code, /\.letterSpacing\(1\.5\)/);
  assert.match(code, /\.textVerticalAlign\(TextVerticalAlign\.CENTER\)/);
});

test("uses intrinsic width and preserves height for Text", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "TEXT",
      visible: true,
      characters: "Intrinsic width",
      fontSize: 16,
      width: 40,
      height: 24,
    }),
  ]);

  assert.doesNotMatch(code, /\.width\(/);
  assert.match(code, /\.height\(24\)/);
  assert.match(code, /\.fontSize\(16\)/);
});

test("omits the default Text font weight", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "TEXT",
      visible: true,
      characters: "Default font weight",
      fontWeight: 400,
      width: 80,
      height: 24,
    }),
  ]);

  assert.doesNotMatch(code, /\.fontWeight\(/);
});

test("omits the default font and black shape fill", async () => {
  const defaultFont = await backendExports.arkuiMain([
    node({
      type: "TEXT",
      visible: true,
      characters: "Default font",
      fontName: { family: "HarmonyOS Sans" },
      width: 80,
      height: 24,
    }),
  ]);
  const customFont = await backendExports.arkuiMain([
    node({
      type: "TEXT",
      visible: true,
      characters: "Custom font",
      fontName: { family: "Roboto" },
      width: 80,
      height: 24,
    }),
  ]);
  const blackShape = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      visible: true,
      width: 20,
      height: 20,
      fills: [fill(0, 0, 0)],
    }),
  ]);

  assert.doesNotMatch(defaultFont, /\.fontFamily\(/);
  assert.match(customFont, /\.fontFamily\("Roboto"\)/);
  assert.doesNotMatch(blackShape, /\.fill\(/);
});

test("omits zero edges in padding and margin objects", async () => {
  const padding = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      width: 48,
      height: 16,
      paddingTop: 0,
      paddingRight: 16,
      paddingBottom: 0,
      paddingLeft: 16,
      children: [],
    }),
  ]);
  const margin = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 24,
      height: 24,
      children: [
        node({
          type: "VECTOR",
          visible: true,
          x: 0,
          y: 4,
          width: 16,
          height: 16,
        }),
      ],
    }),
  ]);
  const zeroMargin = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 16,
      height: 16,
      children: [
        node({
          type: "VECTOR",
          visible: true,
          x: 0,
          y: 0,
          width: 16,
          height: 16,
        }),
      ],
    }),
  ]);

  assert.match(padding, /\.padding\(\{ right: 16, left: 16 \}\)/);
  assert.match(margin, /\.margin\(\{ top: 4, right: 8, bottom: 4 \}\)/);
  assert.doesNotMatch(padding, /top: 0|bottom: 0/);
  assert.doesNotMatch(margin, /left: 0/);
  assert.doesNotMatch(zeroMargin, /\.margin\(/);
});

test("generates color opacity using ArkUI rules", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      visible: true,
      width: 20,
      height: 20,
      fills: [
        {
          type: "SOLID",
          color: { r: 1, g: 0, b: 0 },
          opacity: 0.5,
          visible: true,
        },
      ],
    }),
    node({
      type: "RECTANGLE",
      visible: true,
      width: 20,
      height: 20,
      fills: [fill(1, 0, 0)],
    }),
  ]);

  assert.match(code, /\.fill\("#80FF0000"\)/);
  assert.match(code, /\.fill\("#FF0000"\)/);
  assert.doesNotMatch(code, /#FFFF0000/);
});

test("places fixed shape size and uniform radius in the constructor", async () => {
  const rectangle = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      visible: true,
      width: 40,
      height: 20,
      cornerRadius: 8,
      fills: [fill(1, 0, 0)],
    }),
  ]);
  const ellipse = await backendExports.arkuiMain([
    node({
      type: "ELLIPSE",
      visible: true,
      width: 24,
      height: 16,
      fills: [fill(0, 0, 1)],
    }),
  ]);
  const placeholder = await backendExports.arkuiMain([
    node({ type: "VECTOR", visible: true, width: 12, height: 14 }),
  ]);

  assert.match(rectangle, /Rect\(\{ width: 40, height: 20, radius: 8 \}\)/);
  assert.match(ellipse, /Ellipse\(\{ width: 24, height: 16 \}\)/);
  assert.match(placeholder, /Rect\(\{ width: 12, height: 14 \}\)/);
  for (const code of [rectangle, ellipse, placeholder])
    assert.doesNotMatch(code, /\.(?:width|height|radiusWidth|radiusHeight)\(/);
});

test("uses the topmost visible fill", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      name: "Fill",
      visible: true,
      width: 20,
      height: 20,
      x: 0,
      y: 0,
      fills: [fill(1, 0, 0), fill(0, 1, 0, false), fill(0, 0, 1)],
    }),
  ]);

  assert.match(code, /\.fill\("#0000FF"\)/);
});

test("uses sized placeholder images for image fills", async () => {
  const code = await backendExports.arkuiMain([
    node({
      id: "12:34",
      type: "RECTANGLE",
      name: "Photo",
      visible: true,
      width: 320,
      height: 180,
      x: 8,
      y: 6,
      cornerRadius: 12,
      fills: [{ type: "IMAGE", visible: true, scaleMode: "FILL" }],
      base64: "data:image/png;base64,iVBORw0KGgo=",
    }),
  ]);

  assert.match(code, /Image\("https:\/\/placehold\.co\/320x180"\)/);
  assert.doesNotMatch(code, /base64/);
  assert.doesNotMatch(code, /app\.media/);
  assert.doesNotMatch(code, /\.objectFit\(/);
  assert.match(code, /\.backgroundColor\("#E5E7EB"\)/);
  assert.match(code, /\.borderRadius\(12\)/);
});

test("applies image radius only to the Image inside Stack", async () => {
  const createImageContainer = (properties: Record<string, unknown> = {}) =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      width: 96,
      height: 96,
      cornerRadius: 16,
      fills: [{ type: "IMAGE", visible: true }],
      ...properties,
      children: [
        node({
          type: "TEXT",
          visible: true,
          characters: "Label",
          width: 40,
          height: 20,
        }),
      ],
    });
  const plain = await backendExports.arkuiMain([createImageContainer()]);
  const bordered = await backendExports.arkuiMain([
    createImageContainer({
      strokes: [fill(1, 0, 0)],
      strokeWeight: 2,
      strokeAlign: "INSIDE",
    }),
  ]);
  const interactive = await backendExports.arkuiMain([
    createImageContainer({ reactions: [{}] }),
  ]);
  const effected = await backendExports.arkuiMain([
    createImageContainer({
      effects: [{ type: "LAYER_BLUR", visible: true, radius: 4 }],
    }),
  ]);

  assert.match(plain, /Stack\(\)[\s\S]*Image\(/);
  assert.equal(plain.match(/\.borderRadius\(16\)/g)?.length, 1);
  assert.equal(bordered.match(/\.borderRadius\(16\)/g)?.length, 2);
  assert.equal(interactive.match(/\.borderRadius\(16\)/g)?.length, 2);
  assert.equal(effected.match(/\.borderRadius\(16\)/g)?.length, 2);
});

test("omits overlays for empty auto-layout image containers", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      paddingTop: 8,
      paddingRight: 16,
      paddingBottom: 8,
      paddingLeft: 16,
      width: 280,
      height: 205,
      fills: [{ type: "IMAGE", visible: true }],
      children: [
        node({
          type: "FRAME",
          visible: true,
          layoutMode: "VERTICAL",
          width: 280,
          height: 205,
          children: [],
        }),
      ],
    }),
  ]);

  assert.match(code, /Stack\(\)/);
  assert.match(code, /Image\("https:\/\/placehold\.co\/280x205"\)/);
  assert.doesNotMatch(code, /Row\(\)|\.width\("100%"\)/);
});

test("uses a sized placeholder and preserves radius for images with empty children", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      visible: true,
      width: 116,
      height: 119,
      opacity: 0.5,
      cornerRadius: 8,
      fills: [fill(0.93, 0.9, 0.94), { type: "IMAGE", visible: true }],
      children: [],
    }),
  ]);

  assert.match(code, /Image\("https:\/\/placehold\.co\/116x119"\)/);
  assert.match(code, /\.borderRadius\(8\)/);
  assert.match(code, /\.opacity\(0\.5\)/);
  assert.doesNotMatch(code, /Rect\(\)/);
});

test("inherits parent radius for same-size images in rounded containers", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      width: 96,
      height: 96,
      cornerRadius: 1000,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          width: 96,
          height: 96,
          x: 0,
          y: 0,
          fills: [{ type: "IMAGE", visible: true }],
        }),
      ],
    }),
  ]);

  assert.match(
    code,
    /Image\("https:\/\/placehold\.co\/96x96"\)[\s\S]*\.borderRadius\(1000\)/,
  );
});

test("does not inherit radius when an image does not fully cover its rounded container", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      width: 96,
      height: 96,
      cornerRadius: 1000,
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          width: 95,
          height: 96,
          x: 0,
          y: 0,
          fills: [{ type: "IMAGE", visible: true }],
        }),
      ],
    }),
  ]);

  assert.doesNotMatch(code, /\.borderRadius\(1000\)/);
});

test("does not inherit ancestor radius across transparent wrappers", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      width: 96,
      height: 96,
      cornerRadius: 1000,
      children: [
        node({
          type: "FRAME",
          visible: true,
          layoutMode: "VERTICAL",
          width: 96,
          height: 96,
          children: [
            node({
              type: "RECTANGLE",
              visible: true,
              width: 96,
              height: 96,
              x: 0,
              y: 0,
              fills: [{ type: "IMAGE", visible: true }],
            }),
          ],
        }),
      ],
    }),
  ]);

  assert.doesNotMatch(code, /\.borderRadius\(1000\)/);
});

test("uses native shape placeholders for vector nodes", async () => {
  const code = await backendExports.arkuiMain([
    node({
      id: "56:78",
      type: "VECTOR",
      visible: true,
      width: 16,
      height: 16,
      base64: "data:image/png;base64,iVBORw0KGgo=",
    }),
  ]);

  assert.match(code, /Rect\(\{ width: 16, height: 16 \}\)/);
  assert.match(code, /\.fill\("#E5E7EB"\)/);
  assert.doesNotMatch(code, /Image\(/);
  assert.doesNotMatch(code, /base64/);
});

test("collapses transparent single-vector slots into placeholder shapes with margins", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 24,
      height: 24,
      children: [
        node({
          type: "VECTOR",
          visible: true,
          layoutPositioning: "ABSOLUTE",
          x: 4,
          y: 4,
          width: 16,
          height: 16,
        }),
      ],
    }),
  ]);

  assert.match(code, /Rect\(\{ width: 16, height: 16 \}\)/);
  assert.doesNotMatch(code, /\.(?:width|height)\(16\)/);
  assert.match(code, /\.margin\(4\)/);
  assert.doesNotMatch(code, /Stack\(\)|\.position\(/);
});

test("keeps only the outer size for strictly centered transparent icon wrapper chains", async () => {
  const createChain = (leafX: number, middleFills?: unknown[]) =>
    node({
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "CENTER",
      width: 48,
      height: 48,
      children: [
        node({
          type: "FRAME",
          visible: true,
          layoutMode: "VERTICAL",
          x: 4,
          y: 4,
          width: 40,
          height: 40,
          cornerRadius: 100,
          fills: middleFills,
          children: [
            node({
              type: "FRAME",
              visible: true,
              layoutMode: "HORIZONTAL",
              primaryAxisAlignItems: "CENTER",
              x: 0,
              y: 0,
              width: 40,
              height: 40,
              children: [
                node({
                  type: "FRAME",
                  visible: true,
                  x: 8,
                  y: 8,
                  width: 24,
                  height: 24,
                  children: [
                    node({
                      type: "VECTOR",
                      visible: true,
                      layoutPositioning: "ABSOLUTE",
                      x: leafX,
                      y: 4,
                      width: 16,
                      height: 16,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  const fused = await backendExports.arkuiMain([createChain(4)]);
  const offset = await backendExports.arkuiMain([createChain(0)]);
  const styled = await backendExports.arkuiMain([
    createChain(4, [fill(1, 0, 0)]),
  ]);

  assert.equal((fused.match(/(?:Row|Column)\(/g) ?? []).length, 1);
  assert.match(fused, /Rect\(\{ width: 16, height: 16 \}\)/);
  assert.match(fused, /\.width\(48\)/);
  assert.match(fused, /\.height\(48\)/);
  assert.doesNotMatch(fused, /\.position\(|\.margin\(/);
  assert.ok((offset.match(/(?:Row|Column)\(/g) ?? []).length > 1);
  assert.ok((styled.match(/(?:Row|Column)\(/g) ?? []).length > 1);
  assert.match(styled, /\.backgroundColor\("#FF0000"\)/);
});

test("preserves structure for non-placeholder icon slots", async () => {
  const createSlot = (
    properties: Record<string, unknown>,
    children: SceneNode[],
  ) =>
    node({
      type: "FRAME",
      visible: true,
      width: 24,
      height: 24,
      ...properties,
      children,
    });
  const vector = (properties: Record<string, unknown> = {}) =>
    node({
      type: "VECTOR",
      visible: true,
      layoutPositioning: "ABSOLUTE",
      x: 4,
      y: 4,
      width: 16,
      height: 16,
      ...properties,
    });
  const cases = [
    createSlot({ fills: [fill(1, 0, 0)] }, [vector()]),
    createSlot({}, [vector(), vector({ x: 2, y: 2 })]),
    createSlot({}, [vector({ x: 12 })]),
    createSlot({}, [
      node({
        type: "RECTANGLE",
        visible: true,
        layoutPositioning: "ABSOLUTE",
        x: 4,
        y: 4,
        width: 16,
        height: 16,
      }),
    ]),
  ];

  for (const source of cases) {
    const code = await backendExports.arkuiMain([source]);
    assert.match(code, /Stack\(\)/);
    assert.match(code, /\.position\(/);
    assert.doesNotMatch(code, /\.margin\(4\)/);
  }
});

test("does not change native shape structure for complex styles", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      visible: true,
      width: 40,
      height: 20,
      fills: [fill(1, 0, 0)],
      strokes: [fill(0, 0, 0)],
      effects: [{ type: "DROP_SHADOW", visible: true }],
      rotation: 15,
      base64: "data:image/png;base64,iVBORw0KGgo=",
    }),
  ]);

  assert.match(code, /Rect\(\{ width: 40, height: 20 \}\)/);
  assert.match(code, /\.fill\("#FF0000"\)/);
  assert.doesNotMatch(code, /Image\(|base64/);
});

test("uses ArkUI four-corner borderRadius for non-uniform radii", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 120,
      height: 60,
      rectangleCornerRadii: [4, 8, 12, 16],
      fills: [fill(1, 0, 0)],
      children: [],
    }),
  ]);

  assert.match(
    code,
    /\.borderRadius\(\{ topLeft: 4, topRight: 8, bottomRight: 12, bottomLeft: 16 \}\)/,
  );
  assert.doesNotMatch(code, /\.clip\(/);
});

test("generates border only for strictly equivalent Figma strokes", async () => {
  const createFrame = (strokeAlign: string, strokes: unknown[]) =>
    node({
      type: "FRAME",
      visible: true,
      width: 120,
      height: 60,
      strokeAlign,
      strokeWeight: 2,
      strokes,
      fills: [fill(1, 1, 1)],
      children: [],
    });
  const supported = await backendExports.arkuiMain([
    createFrame("INSIDE", [fill(1, 0, 0)]),
  ]);
  const centered = await backendExports.arkuiMain([
    createFrame("CENTER", [fill(1, 0, 0)]),
  ]);
  const black = await backendExports.arkuiMain([
    createFrame("INSIDE", [fill(0, 0, 0)]),
  ]);
  const gradient = await backendExports.arkuiMain([
    createFrame("INSIDE", [{ type: "GRADIENT_LINEAR", visible: true }]),
  ]);

  assert.match(supported, /\.border\(\{ width: 2, color: "#FF0000" \}\)/);
  assert.match(black, /\.border\(\{ width: 2 \}\)/);
  assert.doesNotMatch(centered, /\.border\(/);
  assert.doesNotMatch(gradient, /\.border\(/);
});

test("converts linear gradient directions stops and ArkUI opacity", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 120,
      height: 60,
      fills: [
        {
          type: "GRADIENT_LINEAR",
          visible: true,
          gradientHandlePositions: [
            { x: 0, y: 0.5 },
            { x: 1, y: 0.5 },
            { x: 0, y: 1 },
          ],
          gradientStops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 0.5 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
          ],
        },
      ],
      children: [],
    }),
  ]);

  assert.match(
    code,
    /\.linearGradient\(\{ angle: 90, colors: \[\["#80FF0000", 0\], \["#0000FF", 1\]\] \}\)/,
  );
  assert.doesNotMatch(code, /\.backgroundColor\("#E5E7EB"\)/);

  const shifted = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 120,
      height: 60,
      fills: [
        {
          type: "GRADIENT_LINEAR",
          visible: true,
          gradientHandlePositions: [
            { x: 0.2, y: 0.5 },
            { x: 0.8, y: 0.5 },
          ],
          gradientStops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
          ],
        },
      ],
      children: [],
    }),
  ]);
  assert.doesNotMatch(shifted, /\.linearGradient\(/);
  assert.match(shifted, /\.backgroundColor\("#E5E7EB"\)/);

  const defaultAngle = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 60,
      height: 120,
      fills: [
        {
          type: "GRADIENT_LINEAR",
          visible: true,
          gradientHandlePositions: [
            { x: 0.5, y: 0 },
            { x: 0.5, y: 1 },
          ],
          gradientStops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
          ],
        },
      ],
      children: [],
    }),
  ]);
  assert.match(defaultAngle, /\.linearGradient\(\{ colors:/);
  assert.doesNotMatch(defaultAngle, /angle: 180/);
});

test("does not bypass strict border generation for pure image nodes", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      visible: true,
      width: 96,
      height: 96,
      fills: [{ type: "IMAGE", visible: true }],
      strokes: [fill(1, 0, 0)],
      strokeWeight: 2,
      strokeAlign: "INSIDE",
    }),
  ]);

  assert.match(code, /Image\("https:\/\/placehold\.co\/96x96"\)/);
  assert.match(code, /\.border\(\{ width: 2, color: "#FF0000" \}\)/);
});

test("preserves width and generates ellipsis only with complete truncation constraints", async () => {
  const createText = (
    textTruncation: string,
    maxLines?: number,
    layoutSizingHorizontal?: string,
  ) =>
    node({
      type: "TEXT",
      visible: true,
      characters: "A long text that needs truncation",
      width: 80,
      height: 40,
      textTruncation,
      maxLines,
      layoutSizingHorizontal,
    });
  const truncated = await backendExports.arkuiMain([createText("ENDING", 2)]);
  const incomplete = await backendExports.arkuiMain([createText("ENDING")]);
  const hug = await backendExports.arkuiMain([createText("ENDING", 2, "HUG")]);

  assert.match(truncated, /\.width\(80\)/);
  assert.match(truncated, /\.maxLines\(2\)/);
  assert.match(
    truncated,
    /\.textOverflow\(\{ overflow: TextOverflow\.Ellipsis \}\)/,
  );
  assert.doesNotMatch(truncated, /\.ellipsisMode\(/);
  assert.doesNotMatch(
    incomplete,
    /\.width\(|\.maxLines\(|\.textOverflow\(|\.ellipsisMode\(/,
  );
  assert.doesNotMatch(
    hug,
    /\.width\(|\.maxLines\(|\.textOverflow\(|\.ellipsisMode\(/,
  );
});

test("applies rotate around the component center for non-zero rotation", async () => {
  const rotated = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      visible: true,
      width: 40,
      height: 20,
      rotation: 30,
    }),
  ]);
  const plain = await backendExports.arkuiMain([
    node({
      type: "RECTANGLE",
      visible: true,
      width: 40,
      height: 20,
      rotation: 0,
    }),
  ]);

  assert.match(rotated, /\.rotate\(\{ angle: 30 \}\)/);
  assert.doesNotMatch(plain, /\.rotate\(/);
});

test("maps foreground and background blur to the corresponding ArkUI APIs", async () => {
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 80,
      height: 40,
      effects: [
        { type: "LAYER_BLUR", visible: true, radius: 6 },
        { type: "BACKGROUND_BLUR", visible: true, radius: 8 },
        { type: "LAYER_BLUR", visible: false, radius: 99 },
      ],
      children: [],
    }),
  ]);

  assert.match(code, /\.blur\(6\)/);
  assert.match(code, /\.backdropBlur\(8\)/);
  assert.doesNotMatch(code, /99|backgroundBlurStyle/);

  const ambiguous = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 80,
      height: 40,
      effects: [
        { type: "LAYER_BLUR", visible: true, radius: 4 },
        { type: "LAYER_BLUR", visible: true, radius: 8 },
      ],
      children: [],
    }),
  ]);
  assert.doesNotMatch(ambiguous, /\.blur\(/);
});

test("strictly maps drop shadows without degrading inner shadows", async () => {
  const shadow = (color: object, offsetX: number, radius = 4, offsetY = 2) => ({
    type: "DROP_SHADOW",
    visible: true,
    blendMode: "NORMAL",
    showShadowBehindNode: false,
    color,
    offset: { x: offsetX, y: offsetY },
    radius,
    spread: 0,
  });
  const code = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 80,
      height: 40,
      fills: [fill(1, 1, 1)],
      effects: [
        shadow({ r: 0, g: 0, b: 0, a: 0.25 }, 1),
        { ...shadow({ r: 1, g: 0, b: 0, a: 0.5 }, 3, 8) },
        {
          type: "INNER_SHADOW",
          visible: true,
          color: { r: 0, g: 0, b: 1, a: 1 },
          offset: { x: 0, y: 0 },
          radius: 10,
          spread: 0,
        },
        { ...shadow({ r: 0, g: 1, b: 0, a: 1 }, 5), spread: 2 },
        {
          ...shadow({ r: 1, g: 1, b: 0, a: 1 }, 7),
          showShadowBehindNode: true,
        },
      ],
      children: [],
    }),
  ]);

  assert.equal((code.match(/\.shadow\(/g) ?? []).length, 2);
  assert.match(
    code,
    /\.shadow\(\{ radius: 4, color: "#40000000", offsetX: 1, offsetY: 2 \}\)/,
  );
  assert.match(
    code,
    /\.shadow\(\{ radius: 8, color: "#80FF0000", offsetX: 3, offsetY: 2 \}\)/,
  );
  assert.ok((code.match(/Stack\(\)/g) ?? []).length >= 2);
  assert.doesNotMatch(code, /#0000FF|#00FF00|#FFFF00|radius: 10|fill: true/);

  const defaults = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 40,
      height: 40,
      effects: [shadow({ r: 0, g: 0, b: 0, a: 1 }, 0, 4, 0)],
      children: [],
    }),
  ]);
  assert.match(defaults, /\.shadow\(\{ radius: 4 \}\)/);

  const innerOnly = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 40,
      height: 40,
      effects: [
        {
          type: "INNER_SHADOW",
          visible: true,
          color: { r: 0, g: 0, b: 0, a: 1 },
          offset: { x: 0, y: 0 },
          radius: 4,
        },
      ],
      children: [
        node({
          type: "RECTANGLE",
          visible: true,
          width: 40,
          height: 40,
        }),
      ],
    }),
  ]);
  assert.doesNotMatch(innerOnly, /Stack\(\)|\.shadow\(/);

  const positioned = await backendExports.arkuiMain([
    node({
      type: "FRAME",
      visible: true,
      width: 100,
      height: 100,
      children: [
        node({
          type: "FRAME",
          visible: true,
          layoutPositioning: "ABSOLUTE",
          x: 10,
          y: 20,
          width: 40,
          height: 40,
          opacity: 0.5,
          fills: [fill(1, 1, 1)],
          effects: [
            shadow({ r: 0, g: 0, b: 0, a: 0.25 }, 1),
            shadow({ r: 1, g: 0, b: 0, a: 0.5 }, 3, 8),
          ],
          children: [],
        }),
      ],
    }),
  ]);
  assert.equal((positioned.match(/\.position\(/g) ?? []).length, 1);
  assert.equal((positioned.match(/\.opacity\(/g) ?? []).length, 1);
  assert.match(
    positioned,
    /\.shadow\([\s\S]*\.shadow\([\s\S]*\.opacity\(0\.5\)[\s\S]*\.position\(\{ x: 10, y: 20 \}\)/,
  );

  const text = await backendExports.arkuiMain([
    node({
      type: "TEXT",
      visible: true,
      characters: "Text shadow",
      width: 80,
      height: 24,
      effects: [
        shadow({ r: 0, g: 0, b: 0, a: 0.25 }, 1),
        shadow({ r: 1, g: 0, b: 0, a: 0.5 }, 3, 8),
      ],
    }),
  ]);
  assert.match(
    text,
    /\.textShadow\(\[\{ radius: 4,[\s\S]*\{ radius: 8,[\s\S]*\]\)/,
  );
  assert.doesNotMatch(text, /Stack\(\)|\.shadow\(/);
});

test("preserves child structure for complex containers", async () => {
  const code = await backendExports.arkuiMain([
    node({
      id: "1:1",
      type: "FRAME",
      visible: true,
      width: 120,
      height: 60,
      x: 0,
      y: 0,
      clipsContent: true,
      fills: [{ type: "IMAGE", visible: true, scaleMode: "FILL" }],
      strokes: [fill(0, 0, 0)],
      effects: [{ type: "DROP_SHADOW", visible: true }],
      children: [
        node({
          type: "TEXT",
          visible: true,
          characters: "Preserved content",
          width: 80,
          height: 24,
          x: 20,
          y: 18,
          fills: [fill(0, 0, 0)],
        }),
      ],
    }),
  ]);

  assert.match(code, /Stack\(\)/);
  assert.match(code, /Column\(\)/);
  assert.match(code, /Image\("https:\/\/placehold\.co\/120x60"\)/);
  assert.match(code, /Text\("Preserved content"\)/);
  assert.doesNotMatch(code, /\.position\(/);
  assert.doesNotMatch(code, /base64|app\.media/);
});

test("does not expose ArkUI internals from the backend root entry", () => {
  assert.equal("arkuiDefaultBuilder" in backendExports, false);
});
