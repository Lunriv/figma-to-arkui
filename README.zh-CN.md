# FigmaToArkUI

[English](README.md) | **简体中文**

[![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

FigmaToArkUI 是一个只生成 HarmonyOS ArkUI 代码的 Figma 插件。项目修改自 Bernardo Ferrari 的 [FigmaToCode](https://github.com/bernaferrari/FigmaToCode)，删除了其他语言生成器、Debug App、HTML 预览、颜色与渐变面板，只保留 ArkUI 所需的数据链路。

## 能力

- 尽可能将 Figma 流式布局推断为 ArkUI `Row` 和 `Column`，真实重叠则保留 `Stack` 与位置关系。
- 映射已支持的文字与视觉属性，包括圆角、边框、线性渐变、阴影、前景和背景模糊以及旋转。
- 图片填充使用带尺寸的可见占位符，并保留适用的圆角。
- 面向 Figma 插件和 Dev Mode Codegen 工作流，提供四种输出模式。

## 构建

### 包管理器

本项目使用 [pnpm](https://pnpm.io/installation)。构建前请按官方说明安装 pnpm。

### 构建插件

在仓库根目录安装依赖并生成 Figma 插件构建产物：

```bash
pnpm install
pnpm build
```

构建产物位于：

```text
apps/plugin/dist/code.js
apps/plugin/dist/index.html
```

发布前可运行完整的测试、类型检查和构建流程：

```bash
pnpm check
```

## 在 Figma 中加载

1. 在 Figma Desktop 中打开插件开发菜单。
2. 选择从 manifest 导入插件。
3. 选择仓库根目录的 [manifest.json](manifest.json)。
4. 选择一个 Frame 或节点后运行插件。

生成代码中的图片使用 `https://placehold.co/<width>x<height>` 作为可见占位符。插件运行时不会访问该地址，因此 manifest 不申请网络权限。

## 输出模式

| 模式 | 生成结果 | 适用场景 |
| --- | --- | --- |
| `Snippet` | 不带包装声明的 UI 代码块。 | 嵌入已有 `build()` 方法。 |
| `Component` | 不带 `@Entry` 的独立 `@Component`。 | 可复用的页面或功能组件，也是默认模式。 |
| `Builder` | 全局 `@Builder` 函数。 | 在 ArkUI 组合中复用生成代码块。 |
| `Preview` | 带 `@Entry`、`@Preview` 和 `@Component` 的页面。 | 独立查看生成结果。 |

## 项目结构

```text
apps/plugin         Figma 插件入口与 UI 构建
packages/backend    节点转换与 ArkUI 生成器
packages/plugin-ui  ArkUI-only 插件界面
packages/types      共享设置与消息类型
packages/tsconfig   共享 TypeScript 配置
```

## 许可证与来源

本项目是 FigmaToCode 的修改版本，整体继续使用 [GNU General Public License v3](LICENSE)。原项目归 Bernardo Ferrari 所有；ArkUI-only 修改由 Lunriv 于 2026 年完成。详细信息见 [NOTICE](NOTICE) 与 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

本项目按现状提供，不附带任何担保。公开分发修改版本时，必须继续遵守 GPLv3 的源码与许可证义务。
