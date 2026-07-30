# FigmaToArkUI

**English** | [简体中文](README.zh-CN.md)

[![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

FigmaToArkUI is a Figma plugin that generates HarmonyOS ArkUI code exclusively. It is a modified version of Bernardo Ferrari's [FigmaToCode](https://github.com/bernaferrari/FigmaToCode), with all non-ArkUI generators, the Debug App, HTML preview, and color and gradient panels removed.

## Capabilities

- Infers Figma flow layout as ArkUI `Row` and `Column` where possible, while preserving `Stack` and positions for genuine overlap.
- Maps supported typography and visual properties, including corner radii, borders, linear gradients, shadows, foreground and background blur, and rotation.
- Uses sized visible placeholders for image fills and preserves the applicable corner radius.
- Produces code for Figma plugin and Dev Mode codegen workflows with four output modes.

## Build

### Package Manager

This project uses [pnpm](https://pnpm.io/installation). Install pnpm using the official instructions before building.

### Build the Plugin

From the repository root, install dependencies and create the Figma plugin bundle:

```bash
pnpm install
pnpm build
```

The build output is written to:

```text
apps/plugin/dist/code.js
apps/plugin/dist/index.html
```

Run the complete test, type-check, and build workflow before release:

```bash
pnpm check
```

## Load in Figma

1. Open the plugin development menu in Figma Desktop.
2. Choose to import a plugin from a manifest.
3. Select the repository root [`manifest.json`](manifest.json).
4. Select a frame or node, then run the plugin.

Generated image fills use `https://placehold.co/<width>x<height>` as visible placeholders. The plugin does not request network access because it never fetches these URLs at runtime.

## Output Modes

| Mode | Generated output | Best for |
| --- | --- | --- |
| `Snippet` | A UI block with no wrapper declaration. | Embedding in an existing `build()` method. |
| `Component` | A standalone `@Component` without `@Entry`. | Reusable page or feature components. This is the default mode. |
| `Builder` | A global `@Builder` function. | Reusing a generated block in ArkUI composition. |
| `Preview` | An `@Entry`, `@Preview`, and `@Component` page. | Inspecting generated output in isolation. |

## Project Structure

```text
apps/plugin         Figma plugin entry point and UI build
packages/backend    Node conversion and ArkUI generator
packages/plugin-ui  ArkUI-only plugin UI
packages/types      Shared settings and message types
packages/tsconfig   Shared TypeScript configuration
```

## License and Attribution

This project is a modified version of FigmaToCode and is distributed under the [GNU General Public License v3](LICENSE). The original project is by Bernardo Ferrari. The ArkUI-only changes were made by Lunriv in 2026. See [NOTICE](NOTICE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

This project is provided as-is, without warranty. Public redistribution of modified versions must continue to meet the GPLv3 source and license obligations.
