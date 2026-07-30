import { getPlaceholderImage } from "../common/images";
import {
  commonLetterSpacing,
  commonLineHeight,
} from "../common/commonTextHeightSpacing";
import type { ArkUIGenerationMode } from "./arkuiMain";

type Bounds = Readonly<{ x: number; y: number; width: number; height: number }>;
type LayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL";
type ColorValue = Readonly<{ r: number; g: number; b: number; a?: number }>;
type PaintValue = Readonly<{
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: ColorValue;
  gradientHandlePositions?: ReadonlyArray<Readonly<{ x: number; y: number }>>;
  gradientStops?: ReadonlyArray<
    Readonly<{ position: number; color: ColorValue }>
  >;
}>;
type EffectValue = Readonly<{
  type?: string;
  visible?: boolean;
  blendMode?: string;
  color?: ColorValue;
  offset?: Readonly<{ x: number; y: number }>;
  radius?: number;
  spread?: number;
  showShadowBehindNode?: boolean;
}>;
type NodeValue = Readonly<{
  type: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  layoutMode?: LayoutMode;
  layoutSizingHorizontal?: "FIXED" | "HUG" | "FILL";
  layoutSizingVertical?: "FIXED" | "HUG" | "FILL";
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  absoluteBoundingBox?: Bounds | null;
  children?: ReadonlyArray<SceneNode>;
  fills?: unknown;
  strokes?: unknown;
  strokeWeight?: number;
  strokeAlign?: "INSIDE" | "OUTSIDE" | "CENTER";
  strokeDashes?: ReadonlyArray<number>;
  cornerRadius?: unknown;
  rectangleCornerRadii?: ReadonlyArray<number>;
  rotation?: number;
  effects?: ReadonlyArray<EffectValue>;
  characters?: string;
  fontSize?: unknown;
  fontWeight?: unknown;
  fontName?: unknown;
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textTruncation?: "DISABLED" | "ENDING";
  maxLines?: number;
  reactions?: ReadonlyArray<unknown>;
}>;
type FlowLayout = Readonly<{
  mode: Exclude<LayoutMode, "NONE">;
  children: SceneNode[];
  gaps: number[];
  spacing?: number;
  crossAlignment: "MIN" | "CENTER" | "MAX";
  padding?: Readonly<{
    top: number;
    right: number;
    bottom: number;
    left: number;
  }>;
}>;
type FusedTextButton = Readonly<{
  text: SceneNode;
  height?: number;
  padding: string;
  backgroundColor: string;
  radius: number;
}>;
type RenderedFlowChild = Readonly<{
  line: string;
  isRepeatable: boolean;
}>;
type FlowEntry = Readonly<{ source: SceneNode; box: Bounds }>;

const containers = new Set([
  "COMPONENT",
  "COMPONENT_SET",
  "FRAME",
  "GROUP",
  "INSTANCE",
  "SECTION",
  "SLOT",
]);
const flowJitterTolerance = 3;
const textAlignments: Readonly<Record<string, string>> = {
  CENTER: "TextAlign.Center",
  JUSTIFIED: "TextAlign.Justify",
  RIGHT: "TextAlign.End",
};
const textVerticalAlignments: Readonly<Record<string, string>> = {
  BOTTOM: "TextVerticalAlign.BOTTOM",
  CENTER: "TextVerticalAlign.CENTER",
  TOP: "TextVerticalAlign.TOP",
};
const mainAxisAlignments: Readonly<Record<string, string>> = {
  CENTER: "FlexAlign.Center",
  MAX: "FlexAlign.End",
  SPACE_BETWEEN: "FlexAlign.SpaceBetween",
};
const horizontalAlignments: Readonly<Record<string, string>> = {
  MIN: "HorizontalAlign.Start",
  CENTER: "HorizontalAlign.Center",
  MAX: "HorizontalAlign.End",
};
const verticalAlignments: Readonly<Record<string, string>> = {
  MIN: "VerticalAlign.Top",
  CENTER: "VerticalAlign.Center",
  MAX: "VerticalAlign.Bottom",
};
const value = (node: SceneNode): NodeValue => node as unknown as NodeValue;
const isNonInteractiveTree = (source: SceneNode): boolean => {
  const node = value(source);
  return (
    !node.reactions?.length && (node.children ?? []).every(isNonInteractiveTree)
  );
};
const number = (input: number): string =>
  Number.isInteger(input) ? String(input) : String(Number(input.toFixed(3)));
const edgeModifier = (
  name: "margin" | "padding",
  top: number,
  right: number,
  bottom: number,
  left: number,
): string => {
  if (top === right && top === bottom && top === left)
    return top ? `.${name}(${number(top)})` : "";
  const edges: string[] = [];
  if (top) edges.push(`top: ${number(top)}`);
  if (right) edges.push(`right: ${number(right)}`);
  if (bottom) edges.push(`bottom: ${number(bottom)}`);
  if (left) edges.push(`left: ${number(left)}`);
  return `.${name}({ ${edges.join(", ")} })`;
};
const indent = (source: string, level: number): string =>
  source
    .split("\n")
    .map((line) => (line ? `${"  ".repeat(level)}${line}` : line))
    .join("\n");
const style = (component: string, modifiers: string[]): string =>
  modifiers.length
    ? `${component}\n${modifiers.map((modifier) => `  ${modifier}`).join("\n")}`
    : component;

const topPaintFrom = (source: unknown): PaintValue | undefined => {
  const values = Array.isArray(source) ? source : [];
  for (let index = values.length - 1; index >= 0; index--) {
    const paint = values[index] as PaintValue;
    if (paint?.visible !== false) return paint;
  }
};
const topPaint = (node: NodeValue): PaintValue | undefined =>
  topPaintFrom(node.fills);
const visiblePaints = (source: unknown): PaintValue[] =>
  Array.isArray(source)
    ? source.filter(
        (paint): paint is PaintValue =>
          !!paint && (paint as PaintValue).visible !== false,
      )
    : [];
const bounds = (node: NodeValue): Bounds | undefined =>
  node.width !== undefined && node.height !== undefined
    ? { x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height }
    : (node.absoluteBoundingBox ?? undefined);
const isTransparentWrapper = (node: NodeValue): boolean =>
  containers.has(node.type) &&
  (node.opacity === undefined || node.opacity === 1) &&
  (node.strokes === undefined ||
    (Array.isArray(node.strokes) &&
      visiblePaints(node.strokes).length === 0)) &&
  !node.effects?.some(
    (effect) => effect.visible === true && effect.type !== "INNER_SHADOW",
  ) &&
  !node.rotation &&
  (node.paddingTop ?? 0) === 0 &&
  (node.paddingRight ?? 0) === 0 &&
  (node.paddingBottom ?? 0) === 0 &&
  (node.paddingLeft ?? 0) === 0 &&
  (node.fills === undefined || (Array.isArray(node.fills) && !topPaint(node)));
const singleVisibleChild = (node: NodeValue): SceneNode | undefined => {
  let child: SceneNode | undefined;
  for (const candidate of node.children ?? []) {
    if (value(candidate).visible === false) continue;
    if (child) return;
    child = candidate;
  }
  return child;
};
const sameSizeTransparentChild = (node: NodeValue): SceneNode | undefined => {
  if (
    !isTransparentWrapper(node) ||
    node.layoutPositioning === "ABSOLUTE" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE" ||
    node.reactions?.length
  )
    return;
  const child = singleVisibleChild(node);
  if (!child) return;
  const childNode = value(child);
  const parentBox = bounds(node);
  const childBox = bounds(childNode);
  if (
    childNode.type === "TEXT" ||
    childNode.layoutPositioning === "ABSOLUTE" ||
    !parentBox ||
    !childBox ||
    Math.abs(parentBox.width - childBox.width) > 0.5 ||
    Math.abs(parentBox.height - childBox.height) > 0.5 ||
    (node.layoutSizingHorizontal === "HUG") !==
      (childNode.layoutSizingHorizontal === "HUG")
  )
    return;
  return child;
};
const placeholderSlot = (
  node: NodeValue,
): Readonly<{ child: SceneNode; margin: string }> | undefined => {
  if (!isTransparentWrapper(node)) return;
  const child = singleVisibleChild(node);
  if (!child) return;
  const childNode = value(child);
  if (
    childNode.children !== undefined ||
    containers.has(childNode.type) ||
    childNode.type === "TEXT" ||
    childNode.type === "RECTANGLE" ||
    childNode.type === "ELLIPSE"
  )
    return;
  const parentBox = bounds(node);
  const childBox = bounds(childNode);
  if (!parentBox || !childBox) return;
  const x =
    typeof childNode.x === "number"
      ? childNode.x
      : node.absoluteBoundingBox && childNode.absoluteBoundingBox
        ? childNode.absoluteBoundingBox.x - node.absoluteBoundingBox.x
        : undefined;
  const y =
    typeof childNode.y === "number"
      ? childNode.y
      : node.absoluteBoundingBox && childNode.absoluteBoundingBox
        ? childNode.absoluteBoundingBox.y - node.absoluteBoundingBox.y
        : undefined;
  if (x === undefined || y === undefined) return;
  const right = parentBox.width - x - childBox.width;
  const bottom = parentBox.height - y - childBox.height;
  if (x < 0 || y < 0 || right < 0 || bottom < 0) return;
  return {
    child,
    margin: edgeModifier("margin", y, right, bottom, x),
  };
};
const unwrapTransparentText = (source: SceneNode): SceneNode | undefined => {
  const node = value(source);
  if (node.type === "TEXT") return source;
  if (!isTransparentWrapper(node)) return;
  const child = singleVisibleChild(node);
  return child && unwrapTransparentText(child);
};
const centeredPlaceholderLeaf = (node: NodeValue): SceneNode | undefined => {
  if (
    !isTransparentWrapper(node) ||
    node.layoutPositioning === "ABSOLUTE" ||
    (node.layoutMode !== "HORIZONTAL" && node.layoutMode !== "VERTICAL") ||
    node.primaryAxisAlignItems !== "CENTER"
  )
    return;
  let current = node;
  for (;;) {
    const child = singleVisibleChild(current);
    if (!child) return;
    const childNode = value(child);
    const parentBox = bounds(current);
    const childBox = bounds(childNode);
    if (!parentBox || !childBox) return;
    const x = childNode.x ?? childBox.x - parentBox.x;
    const y = childNode.y ?? childBox.y - parentBox.y;
    if (
      Math.abs(x - (parentBox.width - childBox.width) / 2) > 0.5 ||
      Math.abs(y - (parentBox.height - childBox.height) / 2) > 0.5
    )
      return;
    if (
      childNode.children === undefined &&
      !containers.has(childNode.type) &&
      childNode.type !== "TEXT" &&
      childNode.type !== "RECTANGLE" &&
      childNode.type !== "ELLIPSE"
    )
      return child;
    if (
      !isTransparentWrapper(childNode) ||
      childNode.layoutPositioning === "ABSOLUTE" ||
      childNode.reactions?.length
    )
      return;
    current = childNode;
  }
};
const arkuiColor = (
  source: ColorValue,
  opacity = source.a ?? 1,
): string | undefined => {
  if (
    ![source.r, source.g, source.b, opacity].every(
      (channel) => typeof channel === "number" && Number.isFinite(channel),
    )
  )
    return;
  const hex = (channel: number) =>
    Math.round(Math.min(1, Math.max(0, channel)) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${opacity === 1 ? "" : hex(opacity)}${hex(source.r)}${hex(source.g)}${hex(source.b)}`;
};
const color = (paint: PaintValue): string | undefined =>
  paint.type === "SOLID" && paint.color
    ? arkuiColor(paint.color, (paint.opacity ?? 1) * (paint.color.a ?? 1))
    : undefined;
const centeredColorSurfacePrimitive = (
  node: NodeValue,
): SceneNode | undefined => {
  const paints = visiblePaints(node.fills);
  if (
    !containers.has(node.type) ||
    paints.length !== 1 ||
    !color(paints[0]) ||
    node.reactions?.length ||
    node.rotation ||
    node.effects?.some((effect) => effect.visible === true) ||
    (node.paddingTop ?? 0) !== 0 ||
    (node.paddingRight ?? 0) !== 0 ||
    (node.paddingBottom ?? 0) !== 0 ||
    (node.paddingLeft ?? 0) !== 0
  )
    return;
  const child = singleVisibleChild(node);
  if (!child) return;
  const childNode = value(child);
  if (
    (childNode.type !== "RECTANGLE" && childNode.type !== "ELLIPSE") ||
    childNode.children !== undefined ||
    childNode.layoutPositioning !== "ABSOLUTE" ||
    childNode.reactions?.length ||
    childNode.rotation ||
    childNode.effects?.some((effect) => effect.visible === true) ||
    childNode.opacity === 0 ||
    visiblePaints(childNode.strokes).length > 0 ||
    topPaint(childNode)?.type === "IMAGE"
  )
    return;
  const parentBox = bounds(node);
  const childBox = bounds(childNode);
  if (
    !parentBox ||
    !childBox ||
    childNode.x === undefined ||
    childNode.y === undefined
  )
    return;
  if (
    Math.abs(childNode.x - (parentBox.width - childBox.width) / 2) > 0.5 ||
    Math.abs(childNode.y - (parentBox.height - childBox.height) / 2) > 0.5
  )
    return;
  return child;
};
const cornerRadiusValue = (node: NodeValue): string | undefined => {
  if (
    typeof node.cornerRadius === "number" &&
    Number.isFinite(node.cornerRadius) &&
    node.cornerRadius > 0
  )
    return number(node.cornerRadius);
  const radii = node.rectangleCornerRadii;
  if (
    radii?.length !== 4 ||
    !radii.every((radius) => Number.isFinite(radius) && radius >= 0) ||
    !radii.some(Boolean)
  )
    return;
  if (radii.every((radius) => radius === radii[0])) return number(radii[0]);
  return `{ topLeft: ${number(radii[0])}, topRight: ${number(radii[1])}, bottomRight: ${number(radii[2])}, bottomLeft: ${number(radii[3])} }`;
};
const borderModifier = (node: NodeValue): string | undefined => {
  const paints = visiblePaints(node.strokes);
  if (
    node.strokeAlign !== "INSIDE" ||
    typeof node.strokeWeight !== "number" ||
    !Number.isFinite(node.strokeWeight) ||
    node.strokeWeight <= 0 ||
    paints.length !== 1 ||
    node.strokeDashes?.length
  )
    return;
  const strokeColor = color(paints[0]);
  if (!strokeColor) return;
  return `.border({ width: ${number(node.strokeWeight)}${strokeColor === "#000000" ? "" : `, color: "${strokeColor}"`} })`;
};
const linearGradientModifier = (
  node: NodeValue,
  paint?: PaintValue,
): string | undefined => {
  if (
    paint?.type !== "GRADIENT_LINEAR" ||
    !paint.gradientHandlePositions ||
    paint.gradientHandlePositions.length < 2 ||
    !paint.gradientStops ||
    paint.gradientStops.length < 2
  )
    return;
  const [start, end] = paint.gradientHandlePositions;
  const box = bounds(node);
  if (!box) return;
  const dx = (end.x - start.x) * box.width;
  const dy = (end.y - start.y) * box.height;
  const length = Math.hypot(dx, dy);
  const expectedLength =
    length && (Math.abs(box.width * dx) + Math.abs(box.height * dy)) / length;
  if (
    ![start.x, start.y, end.x, end.y, dx, dy].every(Number.isFinite) ||
    !length ||
    Math.abs(start.x + end.x - 1) > 0.001 ||
    Math.abs(start.y + end.y - 1) > 0.001 ||
    Math.abs(length - expectedLength) > 0.5
  )
    return;
  const stops: string[] = [];
  let previousPosition = -Infinity;
  for (const stop of paint.gradientStops) {
    if (
      !Number.isFinite(stop.position) ||
      stop.position < 0 ||
      stop.position > 1 ||
      stop.position < previousPosition
    )
      return;
    const stopColor = arkuiColor(
      stop.color,
      (paint.opacity ?? 1) * (stop.color.a ?? 1),
    );
    if (!stopColor) return;
    stops.push(`["${stopColor}", ${number(stop.position)}]`);
    previousPosition = stop.position;
  }
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  const angleValue = number(((angle % 360) + 360) % 360);
  return `.linearGradient({ ${angleValue === "180" ? "" : `angle: ${angleValue}, `}colors: [${stops.join(", ")}] })`;
};
const hasAdvancedVisuals = (node: NodeValue): boolean =>
  !!node.effects?.some(
    (effect) => effect.visible === true && effect.type !== "INNER_SHADOW",
  ) ||
  !!node.rotation ||
  visiblePaints(node.strokes).length > 0 ||
  !!node.rectangleCornerRadii?.some(Boolean) ||
  topPaint(node)?.type === "GRADIENT_LINEAR";
const fusedTextButton = (node: NodeValue): FusedTextButton | undefined => {
  const wrappers: NodeValue[] = [];
  let current = node;
  let currentSource: SceneNode | undefined;
  for (const mode of ["HORIZONTAL", "VERTICAL", "HORIZONTAL"] as const) {
    if (
      !containers.has(current.type) ||
      current.layoutMode !== mode ||
      current.layoutSizingHorizontal !== "HUG" ||
      current.layoutPositioning === "ABSOLUTE" ||
      hasAdvancedVisuals(current) ||
      (current.opacity !== undefined && current.opacity !== 1) ||
      (current.primaryAxisAlignItems !== undefined &&
        current.primaryAxisAlignItems !== "CENTER") ||
      (current.counterAxisAlignItems !== undefined &&
        current.counterAxisAlignItems !== "CENTER") ||
      (current.fills !== undefined && !Array.isArray(current.fills))
    )
      return;
    const child = singleVisibleChild(current);
    if (!child) return;
    wrappers.push(current);
    currentSource = child;
    current = value(currentSource);
  }
  if (
    current.type !== "TEXT" ||
    current.layoutPositioning === "ABSOLUTE" ||
    (current.opacity !== undefined && current.opacity !== 1)
  )
    return;
  const height = wrappers[0].height;
  if (
    typeof height !== "number" ||
    wrappers.some((wrapper) => wrapper.height !== height)
  )
    return;
  const paddingLayers = wrappers.filter(
    (wrapper) =>
      (wrapper.paddingTop ?? 0) !== 0 ||
      (wrapper.paddingRight ?? 0) !== 0 ||
      (wrapper.paddingBottom ?? 0) !== 0 ||
      (wrapper.paddingLeft ?? 0) !== 0,
  );
  const styleLayers = wrappers.filter(
    (wrapper) =>
      !!topPaint(wrapper) ||
      (wrapper.cornerRadius !== undefined && wrapper.cornerRadius !== 0),
  );
  if (paddingLayers.length !== 1 || styleLayers.length !== 1) return;
  const styleLayer = styleLayers[0];
  const paint = topPaint(styleLayer);
  const backgroundColor = paint && color(paint);
  if (
    !backgroundColor ||
    typeof styleLayer.cornerRadius !== "number" ||
    styleLayer.cornerRadius <= 0
  )
    return;
  const paddingLayer = paddingLayers[0];
  const top = paddingLayer.paddingTop ?? 0;
  const right = paddingLayer.paddingRight ?? 0;
  const bottom = paddingLayer.paddingBottom ?? 0;
  const left = paddingLayer.paddingLeft ?? 0;
  const naturalHeight =
    node.layoutSizingVertical === "HUG" &&
    typeof current.height === "number" &&
    Math.abs(current.height + top + bottom - height) <= 0.5;
  return {
    text: currentSource!,
    ...(naturalHeight ? {} : { height }),
    padding: edgeModifier("padding", top, right, bottom, left),
    backgroundColor,
    radius: styleLayer.cornerRadius,
  };
};
const sourceBounds = (
  source: SceneNode,
  absolute: boolean,
): Bounds | undefined => {
  const node = value(source);
  return absolute ? (node.absoluteBoundingBox ?? undefined) : bounds(node);
};
const unionBounds = (
  nodes: SceneNode[],
  absolute = false,
): Bounds | undefined => {
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const source of nodes) {
    const box = sourceBounds(source, absolute);
    if (!box) continue;
    x = Math.min(x, box.x);
    y = Math.min(y, box.y);
    right = Math.max(right, box.x + box.width);
    bottom = Math.max(bottom, box.y + box.height);
  }
  if (x !== Infinity) return { x, y, width: right - x, height: bottom - y };
};
const flowCandidate = (
  entries: FlowEntry[],
  mode: Exclude<LayoutMode, "NONE">,
  area: Bounds,
):
  | (Omit<FlowLayout, "padding"> & Readonly<{ variance: number; area: Bounds }>)
  | undefined => {
  const ordered = [...entries];
  const horizontal = mode === "HORIZONTAL";
  ordered.sort((left, right) =>
    horizontal ? left.box.x - right.box.x : left.box.y - right.box.y,
  );
  const gaps: number[] = [];
  let gapTotal = 0;
  for (let index = 1; index < ordered.length; index++) {
    const previous = ordered[index - 1].box;
    const current = ordered[index].box;
    const gap = horizontal
      ? current.x - previous.x - previous.width
      : current.y - previous.y - previous.height;
    if (gap < -0.5) return;
    gaps.push(gap);
    gapTotal += gap;
  }
  let anchor: 0 | 1 | 2 | undefined;
  for (const candidateAnchor of [0, 1, 2] as const) {
    const firstBox = ordered[0].box;
    const first = horizontal
      ? firstBox.y + (firstBox.height * candidateAnchor) / 2
      : firstBox.x + (firstBox.width * candidateAnchor) / 2;
    if (
      ordered.every(({ box }) => {
        const current = horizontal
          ? box.y + (box.height * candidateAnchor) / 2
          : box.x + (box.width * candidateAnchor) / 2;
        return Math.abs(current - first) <= flowJitterTolerance;
      })
    ) {
      anchor = candidateAnchor;
      break;
    }
  }
  if (anchor === undefined) return;
  const average = gaps.length ? gapTotal / gaps.length : 0;
  const variance = gaps.reduce((sum, gap) => sum + (gap - average) ** 2, 0);
  return {
    mode,
    children: ordered.map(({ source }) => source),
    gaps,
    spacing: gaps.every((gap) => Math.abs(gap - average) <= 0.5)
      ? average
      : undefined,
    crossAlignment: (["MIN", "CENTER", "MAX"] as const)[anchor],
    variance,
    area,
  };
};
const inferFlow = (
  children: SceneNode[],
  parentBox: Bounds | undefined,
  absolute = false,
): FlowLayout | undefined => {
  if (!children.length) return;
  const entries: FlowEntry[] = [];
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const source of children) {
    const box = sourceBounds(source, absolute);
    if (!box) return;
    entries.push({ source, box });
    x = Math.min(x, box.x);
    y = Math.min(y, box.y);
    right = Math.max(right, box.x + box.width);
    bottom = Math.max(bottom, box.y + box.height);
  }
  const area = { x, y, width: right - x, height: bottom - y };
  const horizontal = flowCandidate(entries, "HORIZONTAL", area);
  const vertical = flowCandidate(entries, "VERTICAL", area);
  const candidate =
    horizontal && vertical
      ? horizontal.variance < vertical.variance
        ? horizontal
        : vertical
      : (horizontal ?? vertical);
  if (!candidate) return;
  const padding = parentBox
    ? {
        top: candidate.area.y - parentBox.y,
        right:
          parentBox.x +
          parentBox.width -
          candidate.area.x -
          candidate.area.width,
        bottom:
          parentBox.y +
          parentBox.height -
          candidate.area.y -
          candidate.area.height,
        left: candidate.area.x - parentBox.x,
      }
    : undefined;
  if (
    padding &&
    (padding.top < -flowJitterTolerance ||
      padding.right < -flowJitterTolerance ||
      padding.bottom < -flowJitterTolerance ||
      padding.left < -flowJitterTolerance)
  )
    return;
  return {
    ...candidate,
    padding: padding && {
      top: Math.max(0, padding.top),
      right: Math.max(0, padding.right),
      bottom: Math.max(0, padding.bottom),
      left: Math.max(0, padding.left),
    },
  };
};
const withFlowMargin = (
  source: string,
  mode: Exclude<LayoutMode, "NONE">,
  gap?: number,
): string =>
  gap
    ? style(source, [
        `.margin({ ${mode === "HORIZONTAL" ? "left" : "top"}: ${number(gap)} })`,
      ])
    : source;
const compressRepeatedLines = (children: RenderedFlowChild[]): string[] => {
  const compressed: string[] = [];
  for (let start = 0; start < children.length; ) {
    let end = start + 1;
    while (
      children[start].isRepeatable &&
      end < children.length &&
      children[end].isRepeatable &&
      children[end].line === children[start].line
    )
      end++;
    const count = end - start;
    if (count < 3) {
      for (let index = start; index < end; index++)
        compressed.push(children[index].line);
    } else {
      const keys = Array.from({ length: count }, (_, key) => key).join(", ");
      compressed.push(
        `ForEach([${keys}], () => {\n${indent(children[start].line, 1)}\n}, (key: number) => key.toString())`,
      );
    }
    start = end;
  }
  return compressed;
};
const placeholderColor = "#E5E7EB";
const layoutPadding = (node: NodeValue, inferred?: FlowLayout) => ({
  top: inferred?.padding?.top ?? node.paddingTop ?? 0,
  right: inferred?.padding?.right ?? node.paddingRight ?? 0,
  bottom: inferred?.padding?.bottom ?? node.paddingBottom ?? 0,
  left: inferred?.padding?.left ?? node.paddingLeft ?? 0,
});
const renderedAxisSize = (
  source: SceneNode,
  horizontal: boolean,
): number | undefined => {
  const node = value(source);
  const box = bounds(node);
  if (
    !box ||
    (horizontal &&
      (node.type === "TEXT" || node.layoutSizingHorizontal === "HUG"))
  )
    return;
  return horizontal ? box.width : box.height;
};
const hasMainAxisRemainder = (
  node: NodeValue,
  mode: LayoutMode,
  children: SceneNode[],
  spacing: number | undefined,
  inferred?: FlowLayout,
): boolean => {
  const horizontal = mode === "HORIZONTAL";
  const box = bounds(node);
  if (!box) return true;
  if (
    (horizontal && node.layoutSizingHorizontal === "HUG") ||
    (!horizontal && node.layoutSizingVertical === "HUG")
  )
    return false;
  const padding = layoutPadding(node, inferred);
  const available =
    (horizontal ? box.width : box.height) -
    (horizontal ? padding.left + padding.right : padding.top + padding.bottom);
  let used =
    spacing !== undefined
      ? spacing * Math.max(0, children.length - 1)
      : (inferred?.gaps.reduce((sum, gap) => sum + gap, 0) ?? 0);
  for (const child of children) {
    const size = renderedAxisSize(child, horizontal);
    if (size === undefined) return true;
    used += size;
  }
  return Math.abs(available - used) > 0.5;
};
const hasCrossAxisRemainder = (
  node: NodeValue,
  mode: LayoutMode,
  children: SceneNode[],
  inferred?: FlowLayout,
): boolean => {
  const horizontal = mode === "VERTICAL";
  const box = bounds(node);
  if (!box || (horizontal && node.layoutSizingHorizontal === "HUG"))
    return true;
  const padding = layoutPadding(node, inferred);
  const available =
    (horizontal ? box.width : box.height) -
    (horizontal ? padding.left + padding.right : padding.top + padding.bottom);
  for (const child of children) {
    const size = renderedAxisSize(child, horizontal);
    if (size === undefined || Math.abs(available - size) > 0.5) return true;
  }
  return false;
};
const flowModifiers = (
  node: NodeValue,
  mode: LayoutMode,
  children: SceneNode[],
  spacing?: number,
  inferred?: FlowLayout,
  suppressMainAlignment = false,
): string[] => {
  const modifiers: string[] = [];
  const { top, right, bottom, left } = layoutPadding(node, inferred);
  if (top || right || bottom || left)
    modifiers.push(edgeModifier("padding", top, right, bottom, left));
  const mainAlignment = mainAxisAlignments[node.primaryAxisAlignItems ?? ""];
  if (
    mainAlignment &&
    !suppressMainAlignment &&
    hasMainAxisRemainder(node, mode, children, spacing, inferred)
  )
    modifiers.push(`.justifyContent(${mainAlignment})`);
  const crossAlignment = (
    mode === "HORIZONTAL" ? verticalAlignments : horizontalAlignments
  )[inferred?.crossAlignment ?? node.counterAxisAlignItems ?? ""];
  const defaultCrossAlignment =
    mode === "HORIZONTAL" ? "VerticalAlign.Center" : "HorizontalAlign.Center";
  if (
    crossAlignment &&
    crossAlignment !== defaultCrossAlignment &&
    hasCrossAxisRemainder(node, mode, children, inferred)
  )
    modifiers.push(`.alignItems(${crossAlignment})`);
  return modifiers;
};

const sizeModifiers = (node: NodeValue, omitWidth = false): string[] => {
  const box = bounds(node);
  if (!box) return [];
  const truncates = textTruncates(node);
  const omitHeight =
    node.layoutSizingVertical === "HUG" &&
    containers.has(node.type) &&
    (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL");
  const modifiers: string[] = [];
  if (
    !omitWidth &&
    !(node.type === "TEXT" && !truncates) &&
    node.layoutSizingHorizontal !== "HUG"
  )
    modifiers.push(`.width(${number(box.width)})`);
  if (!omitHeight) modifiers.push(`.height(${number(box.height)})`);
  return modifiers;
};

const textTruncates = (node: NodeValue): boolean =>
  node.type === "TEXT" &&
  node.layoutSizingHorizontal !== "HUG" &&
  node.textTruncation === "ENDING" &&
  typeof node.maxLines === "number" &&
  Number.isInteger(node.maxLines) &&
  node.maxLines > 0 &&
  !!bounds(node);

const effectModifiers = (node: NodeValue): string[] => {
  const modifiers: string[] = [];
  let layerBlur: EffectValue | undefined;
  let backgroundBlur: EffectValue | undefined;
  let hasMultipleLayerBlurs = false;
  let hasMultipleBackgroundBlurs = false;
  for (const effect of node.effects ?? []) {
    if (
      effect.visible !== true ||
      typeof effect.radius !== "number" ||
      !Number.isFinite(effect.radius) ||
      effect.radius <= 0
    )
      continue;
    if (effect.type === "LAYER_BLUR") {
      hasMultipleLayerBlurs = !!layerBlur;
      layerBlur = effect;
    } else if (effect.type === "BACKGROUND_BLUR") {
      hasMultipleBackgroundBlurs = !!backgroundBlur;
      backgroundBlur = effect;
    }
  }
  if (hasMultipleLayerBlurs) layerBlur = undefined;
  if (hasMultipleBackgroundBlurs) backgroundBlur = undefined;
  if (layerBlur) modifiers.push(`.blur(${number(layerBlur.radius!)})`);
  if (backgroundBlur)
    modifiers.push(`.backdropBlur(${number(backgroundBlur.radius!)})`);
  if (
    typeof node.rotation === "number" &&
    Number.isFinite(node.rotation) &&
    node.rotation !== 0
  )
    modifiers.push(`.rotate({ angle: ${number(node.rotation)} })`);
  return modifiers;
};
const shadowOptions = (node: NodeValue): string[] => {
  const options: string[] = [];
  for (const effect of node.effects ?? []) {
    if (
      effect.type !== "DROP_SHADOW" ||
      effect.visible !== true ||
      effect.blendMode !== "NORMAL" ||
      effect.showShadowBehindNode !== false ||
      (effect.spread ?? 0) !== 0 ||
      !effect.color ||
      !effect.offset ||
      typeof effect.radius !== "number" ||
      ![effect.radius, effect.offset.x, effect.offset.y].every(
        Number.isFinite,
      ) ||
      effect.radius < 0
    )
      continue;
    const shadowColor = arkuiColor(effect.color);
    if (!shadowColor) continue;
    const fields = [`radius: ${number(effect.radius)}`];
    if (shadowColor !== "#000000") fields.push(`color: "${shadowColor}"`);
    if (effect.offset.x) fields.push(`offsetX: ${number(effect.offset.x)}`);
    if (effect.offset.y) fields.push(`offsetY: ${number(effect.offset.y)}`);
    options.push(`{ ${fields.join(", ")} }`);
  }
  return options;
};
const shadowModifiers = (node: NodeValue): string[] =>
  node.type === "TEXT"
    ? []
    : shadowOptions(node).map((options) => `.shadow(${options})`);
const textShadowModifier = (node: NodeValue): string | undefined => {
  const options = shadowOptions(node);
  if (options.length)
    return `.textShadow(${options.length === 1 ? options[0] : `[${options.join(", ")}]`})`;
};
const nodeStyle = (
  component: string,
  modifiers: string[],
  node: NodeValue,
): string => {
  const shadows = shadowModifiers(node);
  if (!shadows.length) return style(component, modifiers);
  const positionIndex = modifiers.findIndex((modifier) =>
    modifier.startsWith(".position("),
  );
  if (shadows.length === 1) {
    const styled = [...modifiers];
    styled.splice(
      positionIndex < 0 ? styled.length : positionIndex,
      0,
      shadows[0],
    );
    return style(component, styled);
  }
  const outer: string[] = [];
  const inner = modifiers.filter((modifier) => {
    const isOuter =
      modifier.startsWith(".opacity(") ||
      modifier.startsWith(".blur(") ||
      modifier.startsWith(".backdropBlur(") ||
      modifier.startsWith(".rotate(") ||
      modifier.startsWith(".position(");
    if (isOuter) outer.push(modifier);
    return !isOuter;
  });
  let rendered = style(component, [...inner, shadows[0]]);
  for (let index = 1; index < shadows.length; index++)
    rendered = style(`Stack() {\n${indent(rendered, 1)}\n}`, [shadows[index]]);
  return style(rendered, outer);
};

const commonModifiers = (
  node: NodeValue,
  parent?: NodeValue,
  position = false,
  origin?: Readonly<{ x: number; y: number }>,
  omitWidth = false,
): string[] => {
  const modifiers = sizeModifiers(node, omitWidth);
  const box = bounds(node);
  if (node.opacity !== undefined && node.opacity !== 1)
    modifiers.push(`.opacity(${number(node.opacity)})`);
  modifiers.push(...effectModifiers(node));
  if (position && box) {
    const parentBox = parent && bounds(parent);
    const positionBox = origin ? (node.absoluteBoundingBox ?? box) : box;
    const x = origin
      ? positionBox.x - origin.x
      : (node.x ?? box.x - (parentBox?.x ?? 0));
    const y = origin
      ? positionBox.y - origin.y
      : (node.y ?? box.y - (parentBox?.y ?? 0));
    modifiers.push(`.position({ x: ${number(x)}, y: ${number(y)} })`);
  }
  return modifiers;
};

const nativeShapeComponent = (
  name: "Ellipse" | "Rect",
  node: NodeValue,
  modifiers: string[],
  radius?: string,
): string => {
  const box = bounds(node);
  if (!box) return `${name}()`;
  const hasWidth = node.layoutSizingHorizontal !== "HUG";
  modifiers.splice(0, hasWidth ? 2 : 1);
  return `${name}({ ${hasWidth ? `width: ${number(box.width)}, ` : ""}height: ${number(box.height)}${radius ? `, radius: ${radius}` : ""} })`;
};

const inheritedImageRadius = (
  node: NodeValue,
  parent?: NodeValue,
): string | undefined => {
  const ownRadius = cornerRadiusValue(node);
  if (ownRadius) return ownRadius;
  const parentRadius = parent && cornerRadiusValue(parent);
  if (!parent || !containers.has(parent.type) || !parentRadius) return;
  const imageBox = bounds(node);
  const parentBox = bounds(parent);
  if (
    !imageBox ||
    !parentBox ||
    Math.abs(imageBox.width - parentBox.width) > 0.5 ||
    Math.abs(imageBox.height - parentBox.height) > 0.5 ||
    Math.abs(node.x ?? imageBox.x) > 0.5 ||
    Math.abs(node.y ?? imageBox.y) > 0.5
  )
    return;
  return parentRadius;
};

const renderImage = (
  node: NodeValue,
  parent: NodeValue | undefined,
  modifiers: string[],
): string => {
  const box = bounds(node);
  const imageModifiers = [`.backgroundColor("${placeholderColor}")`];
  const radius = inheritedImageRadius(node, parent);
  if (radius !== undefined) imageModifiers.push(`.borderRadius(${radius})`);
  const border = borderModifier(node);
  if (border) imageModifiers.push(border);
  imageModifiers.push(...modifiers);
  return nodeStyle(
    `Image(${JSON.stringify(getPlaceholderImage(box?.width ?? 0, box?.height ?? 0))})`,
    imageModifiers,
    node,
  );
};

const isEmptyImageOverlay = (
  node: NodeValue,
  children: SceneNode[],
  absoluteChildren: SceneNode[],
): boolean => {
  if (children.length !== 1 || absoluteChildren.length) return false;
  const overlay = value(children[0]);
  if (
    !isTransparentWrapper(overlay) ||
    overlay.type === "COMPONENT" ||
    overlay.type === "INSTANCE" ||
    overlay.layoutPositioning === "ABSOLUTE" ||
    overlay.reactions?.length ||
    overlay.children?.length ||
    overlay.effects?.some((effect) => effect.visible === true)
  )
    return false;
  const parentBox = bounds(node);
  const overlayBox = bounds(overlay);
  return !!(
    parentBox &&
    overlayBox &&
    Math.abs(parentBox.width - overlayBox.width) <= 0.5 &&
    Math.abs(parentBox.height - overlayBox.height) <= 0.5 &&
    Math.abs(overlay.x ?? overlayBox.x - parentBox.x) <= 0.5 &&
    Math.abs(overlay.y ?? overlayBox.y - parentBox.y) <= 0.5
  );
};

const render = (
  source: SceneNode,
  parent?: NodeValue,
  position = false,
  origin?: Readonly<{ x: number; y: number }>,
  omitWidth = false,
): string => {
  const node = value(source);
  if (
    node.visible === false ||
    (position && node.opacity === 0 && isNonInteractiveTree(source))
  )
    return "";
  const fill = topPaint(node);
  const fillColor = fill && color(fill);
  if (fill?.type === "IMAGE" && !node.children?.length)
    return renderImage(
      node,
      parent,
      commonModifiers(node, parent, position, origin),
    );
  const slot = !position && containers.has(node.type) && placeholderSlot(node);
  if (slot)
    return slot.margin
      ? style(render(slot.child), [slot.margin])
      : render(slot.child);
  const button =
    !position &&
    node.layoutMode === "HORIZONTAL" &&
    node.layoutSizingHorizontal === "HUG" &&
    fusedTextButton(node);
  if (button)
    return style(`Row() {\n${indent(render(button.text, node), 1)}\n}`, [
      ...(button.height === undefined
        ? []
        : [`.height(${number(button.height)})`]),
      button.padding,
      `.backgroundColor("${button.backgroundColor}")`,
      `.borderRadius(${number(button.radius)})`,
    ]);
  const transparentChild = !position && sameSizeTransparentChild(node);
  if (transparentChild) return render(transparentChild, node);
  const modifiers = commonModifiers(node, parent, position, origin, omitWidth);

  if (node.type === "TEXT") {
    const textModifiers: string[] = [];
    if (typeof node.fontSize === "number")
      textModifiers.push(`.fontSize(${number(node.fontSize)})`);
    if (typeof node.fontWeight === "number" && node.fontWeight !== 400)
      textModifiers.push(`.fontWeight(${number(node.fontWeight)})`);
    if (typeof node.fontSize === "number" && node.lineHeight) {
      const lineHeight = commonLineHeight(node.lineHeight, node.fontSize);
      if (lineHeight) textModifiers.push(`.lineHeight(${number(lineHeight)})`);
    }
    if (typeof node.fontSize === "number" && node.letterSpacing) {
      const letterSpacing = commonLetterSpacing(
        node.letterSpacing,
        node.fontSize,
      );
      if (letterSpacing)
        textModifiers.push(`.letterSpacing(${number(letterSpacing)})`);
    }
    if (fillColor) textModifiers.push(`.fontColor("${fillColor}")`);
    const textShadow = textShadowModifier(node);
    if (textShadow) textModifiers.push(textShadow);
    const alignment = textAlignments[node.textAlignHorizontal ?? ""];
    if (alignment) textModifiers.push(`.textAlign(${alignment})`);
    const verticalAlignment =
      textVerticalAlignments[node.textAlignVertical ?? ""];
    if (verticalAlignment)
      textModifiers.push(`.textVerticalAlign(${verticalAlignment})`);
    const font = node.fontName as { family?: string } | undefined;
    if (font?.family && font.family !== "HarmonyOS Sans")
      textModifiers.push(`.fontFamily(${JSON.stringify(font.family)})`);
    if (textTruncates(node))
      textModifiers.push(
        `.maxLines(${number(node.maxLines!)})`,
        ".textOverflow({ overflow: TextOverflow.Ellipsis })",
      );
    return nodeStyle(
      `Text(${JSON.stringify(node.characters ?? "")})`,
      [...textModifiers, ...modifiers],
      node,
    );
  }

  if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
    const radius = cornerRadiusValue(node);
    const gradient = linearGradientModifier(node, fill);
    const border = borderModifier(node);
    const usesContainer =
      (node.type === "RECTANGLE" &&
        !!(gradient || border || radius?.startsWith("{"))) ||
      (node.type === "ELLIPSE" && !!border);
    const shapeColor = fill && !fillColor ? placeholderColor : fillColor;
    if (gradient)
      modifiers.splice(position ? -1 : modifiers.length, 0, gradient);
    else if (shapeColor && (usesContainer || shapeColor !== "#000000"))
      modifiers.splice(
        position ? -1 : modifiers.length,
        0,
        `.${usesContainer ? "backgroundColor" : "fill"}("${shapeColor}")`,
      );
    if (usesContainer && node.type === "ELLIPSE")
      modifiers.splice(
        position ? -1 : modifiers.length,
        0,
        '.borderRadius("50%")',
      );
    else if (node.type === "RECTANGLE" && radius && usesContainer) {
      modifiers.splice(
        position ? -1 : modifiers.length,
        0,
        `.borderRadius(${radius})`,
      );
    }
    if (border) modifiers.splice(position ? -1 : modifiers.length, 0, border);
    return nodeStyle(
      usesContainer
        ? "Stack() {\n}"
        : nativeShapeComponent(
            node.type === "RECTANGLE" ? "Rect" : "Ellipse",
            node,
            modifiers,
            node.type === "RECTANGLE" ? radius : undefined,
          ),
      modifiers,
      node,
    );
  }

  if (node.children === undefined && !containers.has(node.type))
    return nodeStyle(
      nativeShapeComponent("Rect", node, modifiers),
      [`.fill("${placeholderColor}")`, ...modifiers],
      node,
    );

  const centeredLeaf = !position && centeredPlaceholderLeaf(node);
  const visibleChildren = (
    centeredLeaf ? [centeredLeaf] : (node.children ?? [])
  ).filter((child) => value(child).visible !== false);
  const explicitMode =
    node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL"
      ? node.layoutMode
      : undefined;
  const absoluteChildren: SceneNode[] = [];
  let reflowedTexts: Map<SceneNode, SceneNode> | undefined;
  const flowChildren = explicitMode
    ? visibleChildren.filter((child) => {
        if (
          child === centeredLeaf ||
          value(child).layoutPositioning !== "ABSOLUTE"
        )
          return true;
        const text = unwrapTransparentText(child);
        if (text) {
          (reflowedTexts ??= new Map()).set(child, text);
          return true;
        }
        absoluteChildren.push(child);
        return false;
      })
    : visibleChildren;
  const inferred =
    !explicitMode &&
    !flowChildren.some((child) => value(child).layoutPositioning === "ABSOLUTE")
      ? inferFlow(flowChildren, bounds(node))
      : undefined;
  const mode = explicitMode ?? inferred?.mode;
  const orderedFlowChildren = inferred?.children ?? flowChildren;
  const textReflows = reflowedTexts;
  const layoutChildren = textReflows
    ? orderedFlowChildren.map((child) => textReflows.get(child) ?? child)
    : orderedFlowChildren;
  const weightedTitleText =
    explicitMode === "HORIZONTAL" &&
    node.primaryAxisAlignItems === "SPACE_BETWEEN" &&
    visibleChildren.length === 3 &&
    flowChildren.length === 3 &&
    absoluteChildren.length === 0 &&
    reflowedTexts?.size === 1 &&
    value(flowChildren[1]).type !== "TEXT"
      ? reflowedTexts.get(flowChildren[1])
      : undefined;
  const spacing = explicitMode
    ? node.primaryAxisAlignItems !== "SPACE_BETWEEN" || weightedTitleText
      ? node.itemSpacing
      : undefined
    : inferred?.spacing;
  const flowComponent = mode
    ? `${mode === "HORIZONTAL" ? "Row" : "Column"}(${spacing ? `{ space: ${number(spacing)} }` : ""})`
    : undefined;
  const needsWrapper =
    !!mode && (fill?.type === "IMAGE" || absoluteChildren.length > 0);
  const emptyImageOverlay =
    fill?.type === "IMAGE" &&
    !!mode &&
    isEmptyImageOverlay(node, orderedFlowChildren, absoluteChildren);
  const centeredPrimitive =
    !mode && visibleChildren.length === 1
      ? centeredColorSurfacePrimitive(node)
      : undefined;
  let component = flowComponent ?? "Stack()";
  let childLines: string[];
  if (mode) {
    const flowLines = compressRepeatedLines(
      orderedFlowChildren.map((child, index): RenderedFlowChild => {
        const text =
          weightedTitleText && index === 1 ? weightedTitleText : null;
        const source = text ?? reflowedTexts?.get(child) ?? child;
        const rendered = text
          ? style(render(source, node, false, undefined, true), [
              ".layoutWeight(1)",
            ])
          : render(source, node);
        return {
          line: withFlowMargin(
            rendered,
            mode,
            inferred && inferred.spacing === undefined
              ? inferred.gaps[index - 1]
              : undefined,
          ),
          isRepeatable: isNonInteractiveTree(source),
        };
      }),
    );
    if (needsWrapper) {
      childLines = [];
      if (fill?.type === "IMAGE")
        childLines.push(renderImage(node, undefined, sizeModifiers(node)));
      if (!emptyImageOverlay)
        childLines.push(
          style(
            `${flowComponent} {${flowLines.length ? `\n${indent(flowLines.join("\n"), 1)}\n` : "\n"}}`,
            [
              '.width("100%")',
              '.height("100%")',
              ...flowModifiers(
                node,
                mode,
                layoutChildren,
                spacing,
                inferred,
                !!weightedTitleText,
              ),
            ],
          ),
        );
      childLines.push(
        ...absoluteChildren.map((child) => render(child, node, true)),
      );
      component = "Stack()";
    } else childLines = flowLines;
  } else {
    childLines = visibleChildren
      .map((child) => render(child, node, child !== centeredPrimitive))
      .filter(Boolean);
    if (fill?.type === "IMAGE")
      childLines.unshift(renderImage(node, undefined, sizeModifiers(node)));
  }
  const children = childLines.join("\n");
  const gradient = linearGradientModifier(node, fill);
  const border = borderModifier(node);
  if (fillColor)
    modifiers.splice(
      position ? -1 : modifiers.length,
      0,
      `.backgroundColor("${fillColor}")`,
    );
  else if (gradient)
    modifiers.splice(position ? -1 : modifiers.length, 0, gradient);
  else if (fill && fill.type !== "IMAGE")
    modifiers.splice(
      position ? -1 : modifiers.length,
      0,
      `.backgroundColor("${placeholderColor}")`,
    );
  const radius = cornerRadiusValue(node);
  const omitOuterImageRadius =
    fill?.type === "IMAGE" &&
    visiblePaints(node.strokes).length === 0 &&
    !node.effects?.some((effect) => effect.visible === true) &&
    isNonInteractiveTree(source);
  if ((fill || border) && radius && !omitOuterImageRadius)
    modifiers.splice(
      position ? -1 : modifiers.length,
      0,
      `.borderRadius(${radius})`,
    );
  if (border) modifiers.splice(position ? -1 : modifiers.length, 0, border);
  if (mode && !needsWrapper)
    modifiers.splice(
      position ? -1 : modifiers.length,
      0,
      ...flowModifiers(
        node,
        mode,
        layoutChildren,
        spacing,
        inferred,
        !!weightedTitleText,
      ),
    );
  return nodeStyle(
    `${component} {${children ? `\n${indent(children, 1)}\n` : "\n"}}`,
    modifiers,
    node,
  );
};

export const arkuiDefaultBuilder = (
  nodes: SceneNode[],
  generationMode: ArkUIGenerationMode = "component",
): string => {
  const visible = nodes.filter((node) => value(node).visible !== false);
  let body = visible.length === 1 ? render(visible[0]) : "";
  if (visible.length !== 1) {
    const area = unionBounds(visible, true);
    const inferred = inferFlow(visible, area, true);
    const children = (inferred?.children ?? visible)
      .map((node, index) => {
        const rendered = render(node, undefined, !inferred, area);
        return inferred
          ? withFlowMargin(
              rendered,
              inferred.mode,
              inferred.spacing === undefined
                ? inferred.gaps[index - 1]
                : undefined,
            )
          : rendered;
      })
      .filter(Boolean)
      .join("\n");
    const spacing = inferred?.spacing;
    const component = inferred
      ? `${inferred.mode === "HORIZONTAL" ? "Row" : "Column"}(${spacing ? `{ space: ${number(spacing)} }` : ""})`
      : "Stack()";
    body = style(
      `${component} {${children ? `\n${indent(children, 1)}\n` : "\n"}}`,
      [
        ...(area
          ? [`.width(${number(area.width)})`, `.height(${number(area.height)})`]
          : []),
        ...(inferred
          ? flowModifiers(
              { type: "FRAME" },
              inferred.mode,
              inferred.children,
              inferred.spacing,
              inferred,
            )
          : []),
      ],
    );
  }
  if (generationMode === "snippet") return `${body}\n`;
  if (generationMode === "builder")
    return `@Builder
function GeneratedBuilder() {
${indent(body, 1)}
}
`;
  return `${generationMode === "preview" ? "@Entry\n@Preview\n" : ""}@Component
struct GeneratedPage {
  build() {
${indent(body, 2)}
  }
}
`;
};
