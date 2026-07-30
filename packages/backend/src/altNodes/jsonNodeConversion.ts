import { calculateRectangleFromBoundingBox } from "../common/commonPosition";
import { AltNode } from "../alt_api_types";

const nodeNameCounters: Map<string, number> = new Map();

function adjustChildrenOrder(node: any) {
  if (!node.itemReverseZIndex || !node.children || node.layoutMode === "NONE") {
    return;
  }

  const children = node.children;
  const absoluteChildren = [];
  const fixedChildren = [];

  // Single pass to separate absolute and fixed children
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (child.layoutPositioning === "ABSOLUTE") {
      absoluteChildren.push(child);
    } else {
      fixedChildren.unshift(child); // Add to beginning to maintain original order
    }
  }

  // Combine the arrays (reversed absolute children + original order fixed children)
  node.children = [...absoluteChildren, ...fixedChildren];
}

/**
 * Recursively process both JSON node and Figma node to update with data not available in JSON
 * This now includes the functionality from convertNodeToAltNode
 * @param jsonNode The JSON node to process
 * @param figmaNode The corresponding Figma node
 * @param parentNode Optional parent node reference to set
 * @param parentCumulativeRotation Optional parent cumulative rotation to inherit
 * @returns Potentially modified jsonNode, array of nodes (for inlined groups), or null
 */
const processNodePair = async (
  jsonNode: AltNode,
  figmaNode: SceneNode,
  parentNode?: AltNode,
  parentCumulativeRotation: number = 0,
): Promise<AltNode | AltNode[] | null> => {
  if (!jsonNode.id) return null;
  if (jsonNode.visible === false) return null;

  // Handle node type-specific conversions (from convertNodeToAltNode)
  const nodeType = jsonNode.type;

  // Store the cumulative rotation (parent's cumulative + node's own)
  if (parentNode) {
    // Only add cumulative when there is a parent. This is useful for the GROUP -> FRAME transformation, where
    // we want to move the rotation of the GROUP to children, but want to se FRAME to 0.
    jsonNode.cumulativeRotation = parentCumulativeRotation;
  }

  // Handle empty frames and convert to rectangles
  if (
    (nodeType === "FRAME" ||
      nodeType === "INSTANCE" ||
      nodeType === "COMPONENT" ||
      nodeType === "COMPONENT_SET") &&
    (!jsonNode.children || jsonNode.children.length === 0)
  ) {
    // Convert to rectangle
    (jsonNode as any).type = "RECTANGLE";
    return processNodePair(
      jsonNode,
      figmaNode,
      parentNode,
      parentCumulativeRotation,
    );
  }

  if ("rotation" in jsonNode && jsonNode.rotation) {
    jsonNode.rotation = -jsonNode.rotation * (180 / Math.PI);
  }

  // Inline all GROUP nodes by processing their children directly
  if (nodeType === "GROUP" && jsonNode.children) {
    const processedChildren = [];

    if (
      Array.isArray(jsonNode.children) &&
      figmaNode &&
      "children" in figmaNode
    ) {
      // Get visible JSON children (filters out nodes with visible: false)
      const visibleJsonChildren = jsonNode.children.filter(
        (child) => child.visible !== false,
      ) as AltNode[];

      // Map figma children to their IDs for matching
      const figmaChildrenById = new Map();
      figmaNode.children.forEach((child) => {
        figmaChildrenById.set(child.id, child);
      });

      // Process all visible JSON children that have matching Figma nodes
      for (const child of visibleJsonChildren) {
        const figmaChild = figmaChildrenById.get(child.id);
        if (!figmaChild) continue; // Skip if no matching Figma node found

        const processedChild = await processNodePair(
          child,
          figmaChild,
          parentNode, // The group's parent
          parentCumulativeRotation + (jsonNode.rotation || 0),
        );

        // Push the processed group children directly
        if (processedChild !== null) {
          if (Array.isArray(processedChild)) {
            processedChildren.push(...processedChild);
          } else {
            processedChildren.push(processedChild);
          }
        }
      }
    }

    // Simply return the processed children; skip splicing parent's children
    return processedChildren;
  }

  // Return null for unsupported nodes
  if (nodeType === "SLICE") {
    return null;
  }

  // Set parent reference if parent is provided
  if (parentNode) {
    (jsonNode as any).parent = parentNode;
  }

  // Ensure node has a unique name with simple numbering
  const cleanName = jsonNode.name.trim();

  // Track names with simple counter
  const count = nodeNameCounters.get(cleanName) || 0;
  nodeNameCounters.set(cleanName, count + 1);

  // For first occurrence, use original name; for duplicates, add sequential suffix
  jsonNode.uniqueName =
    count === 0
      ? cleanName
      : `${cleanName}_${count.toString().padStart(2, "0")}`;

  // Handle text-specific properties
  if (figmaNode.type === "TEXT") {
    let styledTextSegments = figmaNode.getStyledTextSegments([
      "fontName",
      "fills",
      "fontSize",
      "fontWeight",
      "hyperlink",
      "indentation",
      "letterSpacing",
      "lineHeight",
      "listOptions",
      "textCase",
      "textDecoration",
      "textStyleId",
      "fillStyleId",
      "openTypeFeatures",
    ]);

    // Assign unique IDs to each segment
    if (styledTextSegments.length > 0) {
      const baseSegmentName = (jsonNode.uniqueName || jsonNode.name)
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .toLowerCase();

      // Add a uniqueId to each segment
      styledTextSegments = styledTextSegments.map((segment, index) => {
        const mutableSegment: any = Object.assign({}, segment);

        // For single segments, don't add index suffix
        if (styledTextSegments.length === 1) {
          (mutableSegment as any).uniqueId = `${baseSegmentName}_span`;
        } else {
          // For multiple segments, add index suffix
          (mutableSegment as any).uniqueId =
            `${baseSegmentName}_span_${(index + 1).toString().padStart(2, "0")}`;
        }
        return mutableSegment;
      });

      jsonNode.styledTextSegments = styledTextSegments;
    }

    // Inline text style.
    Object.assign(jsonNode, jsonNode.style);
    if (!jsonNode.textAutoResize) {
      jsonNode.textAutoResize = "NONE";
    }
  }

  // Always copy size and position
  if ("absoluteBoundingBox" in jsonNode && jsonNode.absoluteBoundingBox) {
    if (jsonNode.parent) {
      // Extract width and height from bounding box and rotation. This is necessary because Figma JSON API doesn't have width and height.
      const rect = calculateRectangleFromBoundingBox(
        {
          width: jsonNode.absoluteBoundingBox.width,
          height: jsonNode.absoluteBoundingBox.height,
          x:
            jsonNode.absoluteBoundingBox.x -
            (jsonNode.parent?.absoluteBoundingBox.x || 0),
          y:
            jsonNode.absoluteBoundingBox.y -
            (jsonNode.parent?.absoluteBoundingBox.y || 0),
        },
        -((jsonNode.rotation || 0) + (jsonNode.cumulativeRotation || 0)),
      );

      jsonNode.width = rect.width;
      jsonNode.height = rect.height;
      jsonNode.x = rect.left;
      jsonNode.y = rect.top;
    } else {
      jsonNode.width = jsonNode.absoluteBoundingBox.width;
      jsonNode.height = jsonNode.absoluteBoundingBox.height;
      jsonNode.x = 0;
      jsonNode.y = 0;
    }
  }

  // Some places check if paddingLeft exists. This makes sure they all exist, even if 0.
  if ("layoutMode" in jsonNode && jsonNode.layoutMode) {
    if (jsonNode.paddingLeft === undefined) {
      jsonNode.paddingLeft = 0;
    }
    if (jsonNode.paddingRight === undefined) {
      jsonNode.paddingRight = 0;
    }
    if (jsonNode.paddingTop === undefined) {
      jsonNode.paddingTop = 0;
    }
    if (jsonNode.paddingBottom === undefined) {
      jsonNode.paddingBottom = 0;
    }
  }

  // Set default layout properties if missing
  if (!jsonNode.layoutMode) jsonNode.layoutMode = "NONE";
  if (!jsonNode.layoutSizingHorizontal)
    jsonNode.layoutSizingHorizontal = "FIXED";
  if (!jsonNode.layoutSizingVertical) jsonNode.layoutSizingVertical = "FIXED";
  if (!jsonNode.primaryAxisAlignItems) {
    jsonNode.primaryAxisAlignItems = "MIN";
  }
  if (!jsonNode.counterAxisAlignItems) {
    jsonNode.counterAxisAlignItems = "MIN";
  }

  // If layout sizing is HUG but there are no children, set it to FIXED
  const hasChildren =
    "children" in jsonNode &&
    jsonNode.children &&
    Array.isArray(jsonNode.children) &&
    jsonNode.children.length > 0;

  if (jsonNode.layoutSizingHorizontal === "HUG" && !hasChildren) {
    jsonNode.layoutSizingHorizontal = "FIXED";
  }
  if (jsonNode.layoutSizingVertical === "HUG" && !hasChildren) {
    jsonNode.layoutSizingVertical = "FIXED";
  }

  // Process children recursively if both have children
  if (
    "children" in jsonNode &&
    jsonNode.children &&
    Array.isArray(jsonNode.children) &&
    "children" in figmaNode
  ) {
    // Get only visible JSON children
    const visibleJsonChildren = jsonNode.children.filter(
      (child) => child.visible !== false,
    ) as AltNode[];

    // Create a map of figma children by ID for easier matching
    const figmaChildrenById = new Map();
    figmaNode.children.forEach((child) => {
      figmaChildrenById.set(child.id, child);
    });

    const cumulative =
      parentCumulativeRotation +
      (jsonNode.type === "GROUP" ? jsonNode.rotation || 0 : 0);

    // Process children and handle potential null returns
    const processedChildren = [];

    // Process all visible JSON children that have matching Figma nodes
    for (const child of visibleJsonChildren) {
      const figmaChild = figmaChildrenById.get(child.id);
      if (!figmaChild) continue; // Skip if no matching Figma node found

      const processedChild = await processNodePair(
        child,
        figmaChild,
        jsonNode,
        cumulative,
      );

      if (processedChild !== null) {
        if (Array.isArray(processedChild)) {
          processedChildren.push(...processedChild);
        } else {
          processedChildren.push(processedChild);
        }
      }
    }

    // Replace children array with processed children
    jsonNode.children = processedChildren;

    adjustChildrenOrder(jsonNode);
  }

  return jsonNode;
};

/**
 * Convert Figma nodes to JSON format with parent references added
 * @param nodes The Figma nodes to convert to JSON
 * @returns JSON representation of the nodes with parent references
 */
export const nodesToJSON = async (
  nodes: ReadonlyArray<SceneNode>,
): Promise<AltNode[]> => {
  // Reset name counters for each conversion
  nodeNameCounters.clear();
  // First get the JSON representation of nodes with rotation handling
  const nodeResults = await Promise.all(
    nodes.map(async (node) => {
      // Export node to JSON
      const nodeDoc = (
        (await node.exportAsync({
          format: "JSON_REST_V1",
        })) as any
      ).document;

      let nodeCumulativeRotation = 0;

      // Wire GROUPs into FRAME.
      if (node.type === "GROUP") {
        nodeDoc.type = "FRAME";

        // Fix rotation for children.
        if ("rotation" in nodeDoc && nodeDoc.rotation) {
          nodeCumulativeRotation = -nodeDoc.rotation * (180 / Math.PI);
          nodeDoc.rotation = 0;
        }
      }

      return {
        nodeDoc,
        nodeCumulativeRotation,
      };
    }),
  );

  // Now process each top-level node pair (JSON node + Figma node)
  const result: AltNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const processedNode = await processNodePair(
      nodeResults[i].nodeDoc,
      nodes[i],
      undefined,
      nodeResults[i].nodeCumulativeRotation,
    );
    if (processedNode !== null) {
      if (Array.isArray(processedNode)) {
        // If processNodePair returns an array (inlined group), add all nodes
        result.push(...processedNode);
      } else {
        // If it returns a single node, add it directly
        result.push(processedNode);
      }
    }
  }

  return result;
};
