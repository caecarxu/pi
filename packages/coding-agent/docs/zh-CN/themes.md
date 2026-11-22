> 本文为简体中文译本；[查看英文原文](../themes.md)。

# 使用主题自定义 Pi

主题控制 Pi 在交互模式和 HTML 导出中使用的颜色。Pi 内置 `system`、`dark` 和 `light` 主题。你可以选择固定主题、跟随终端的浅色或深色外观，也可以创建自己的调色板。

## 使用终端颜色

默认主题是 `system`。它根据终端主题生成 Pi 的颜色，让 Pi 融入终端，而不是另行套用自己的调色板：

- Pi 会查询终端的默认前景色、背景色和 16 种 ANSI 颜色。
- Pi 的每种颜色都从一种 ANSI 颜色中选取色相，例如错误信息使用红色，链接使用蓝色。
- Pi 会调整每种颜色的亮度，使其与背景至少达到指定对比度。正文文本在背景和每个面板上都保持至少 4.5:1 的 WCAG 对比度。
- 终端在浅色和深色外观之间切换时，Pi 会重新查询颜色并重建主题。

主题会根据终端报告的信息自适应：

| 终端报告内容 | 结果 |
|---|---|
| 背景色和 ANSI 颜色 | 使用终端调色板中的颜色，并针对实际背景进行调整。 |
| 仅背景色 | 使用 Pi 自带的色相，并针对实际背景进行调整。 |
| 未报告颜色 | 使用 ANSI 颜色索引和终端默认颜色，由终端负责渲染。次要文本会变淡，面板不设置背景色。 |

Pi 启动时会向终端查询颜色。终端通常会在几毫秒内响应，Pi 最多等待 100 毫秒后显示启动标题。如果终端没有及时响应，Pi 会使用 ANSI 颜色回退方案；之后即使颜色才到达（例如通过较慢的 SSH 连接），Pi 仍会应用这些颜色。`system` 是保留名称，同名自定义主题会被忽略。

<a id="selecting-a-theme"></a>

## 选择主题

打开 `/settings` 并选择 **Theme**。你可以为所有终端外观使用同一主题，也可以为浅色和深色终端分别指定主题。

选择结果会保存为 `theme` [设置](settings.md#terminal-and-display)：

```json
{
  "theme": "dark"
}
```

未设置 `theme` 时，Pi 使用 `system`。

自动模式按“浅色主题/深色主题”的顺序存储：

```json
{
  "theme": "light/dark"
}
```

Pi 根据终端报告的背景色和前景色判断其为浅色还是深色。如果终端没有报告背景色，Pi 会依次使用终端的浅色/深色通知、`COLORFGBG` 环境变量，最后默认为深色。同一判断也用于从浅色/深色主题对中选择主题，以及确定 `system` 的外观。启用自动模式后，终端报告外观变化时 Pi 会切换主题。主题名称不能包含 `/`，因为 Pi 将它保留为此设置格式的分隔符。

使用 `--use-theme` 可为本次运行选择初始主题，而不更改已保存的设置：

```bash
pi --use-theme light
pi --use-theme light/dark
```

命令行选项请参阅[CLI 资源](cli.md#resources)。

## 创建自定义主题

复制一个[内置主题](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/src/modes/interactive/theme)，或创建符合[架构](https://pi.dev/schemas/theme.schema.json)的新 JSON 文件。内置主题使用 OKHSL 颜色，并为多个角色共用的颜色定义变量，因此可以直接调整色相、饱和度或亮度。

1. 将文件保存为 `<agent-dir>/themes/my-theme.json`。Agent 目录默认为 `~/.pi/agent`。
2. 将其 `name` 设为 `my-theme`。
3. 修改 `vars` 和 `colors` 中的值。
4. 在 `/settings` 中选择 `my-theme`。

主题名应与文件名相同。Pi 只会热重载位于 `<agent-dir>/themes/<name>.json` 的活动用户主题。若主题来自其他位置，添加或修改后运行 `/reload`。

## 了解主题文件

| 属性 | 必需 | 用途 |
|---|---|---|
| `$schema` | 否 | 启用基于 Pi 已发布架构的编辑器校验和自动补全。 |
| `name` | 是 | 标识选择器和设置中的主题。必须唯一，不能包含 `/`，也不能是 `system`。 |
| `appearance` | 否 | `"dark"` 或 `"light"`：主题所针对的背景外观。省略时，Pi 根据主题颜色检测。 |
| `vars` | 否 | 定义可复用颜色值。变量可以引用其他变量。 |
| `colors` | 是 | 为终端 UI 角色指定颜色。架构会标明必需和可选角色。 |
| `export` | 否 | 覆盖 HTML 导出中的页面和面板背景。 |

主题对象采用严格校验：只接受文档中列出的顶层字段和颜色 token。在 `vars` 下定义可复用自定义颜色；`colors` 或 `export` 中的自定义键以及额外顶层元数据都会被拒绝。

颜色可采用以下六种格式：

| 格式 | 示例 | 含义 |
|---|---|---|
| RGB 十六进制 | `"#0af"` 或 `"#00aaff"` | 三位或六位 sRGB 颜色。 |
| OKLCH | `"oklch(62% 0.1 200)"` | 感知亮度、色度和色相。 |
| OKHSL | `"okhsl(250 60% 55%)"` | 色相、饱和度和亮度。饱和度相对于该色相和亮度下 sRGB 色域允许的最大值，因此每个值都在色域内，同一饱和度看起来也同样鲜艳。 |
| 256 色索引 | `39` | 从 `0` 到 `255` 的 ANSI 调色板索引。 |
| 变量引用 | `"primary"` | `vars` 中对应条目的值。 |
| 终端默认色 | `""` | 终端默认的前景色或背景色。 |

终端默认颜色会以终端自身的颜色显示。在 HTML 导出或扩展颜色计算等需要具体值的场景中，Pi 会使用终端报告的默认颜色；如果终端没有报告，则根据主题外观猜测黑色或白色。

Pi 会解析链式变量引用。变量缺失或存在循环引用时，主题无效。终端支持时 Pi 使用真彩色；否则会将 OKLCH 映射到 sRGB，并为 256 色终端近似转换颜色。HTML 导出会将 OKHSL 转换为十六进制，因为 CSS 不支持 OKHSL。如果颜色与源值不同，请检查终端的真彩色检测和对比度设置。参阅[配置终端](terminal-setup.md#override-detected-capabilities)。

精确的属性、必需颜色和允许的值类型请参阅[主题 JSON 架构](https://pi.dev/schemas/theme.schema.json)。

主题文件无效时，Pi 会在启动和执行 `/reload` 时报告。

## 查找要修改的颜色

主题颜色描述的是界面角色，而非单个组件。可通过以下分组在架构中查找相关部分：

| 区域 | 颜色名称 |
|---|---|
| 通用界面 | `accent`、`border*`、`text`、`muted`、`dim`、`success`、`error`、`warning` |
| 选择和全屏界面 | `selectedBg`、`searchMatch*`、`scrollbar*` |
| 消息 | `userMessage*`、`customMessage*`、`thinkingText` |
| 工具执行 | `toolPendingBg`、`toolSuccessBg`、`toolErrorBg`、`toolTitle`、`toolOutput` |
| Markdown | `md*` |
| 工具差异 | `toolDiff*` |
| 语法高亮 | `syntax*` |
| 编辑器模式 | `thinking*`、`bashMode` |
| HTML 导出 | `export.pageBg`、`export.cardBg`、`export.infoBg` |

架构是格式参考。内置主题包含完整的值，可供复制和调整。

五种颜色为可选项，省略时会继承其他颜色：

| 可选颜色 | 回退值 |
|---|---|
| `scrollbarTrack` | `muted` |
| `scrollbarThumb` | `text` |
| `searchMatchBg` | `selectedBg` |
| `searchMatchText` | `text` |
| `thinkingMax` | `thinkingXhigh` |

省略 `export` 颜色时，Pi 会根据 `userMessageBg` 推导 HTML 页面和面板的背景色。

## 从项目或 Pi 包加载主题

将项目主题放入 `.pi/themes/`。授予[项目目录信任](security.md#understand-project-trust)后才会加载项目主题。

你也可以通过 `themes` 设置加载主题文件或目录，或将主题打包到 Pi 包中分发。参阅[配置](configuration.md)、[设置](settings.md#resources)和[Pi 包](packages.md)。

每个已加载主题的名称必须唯一。出现重复名称时，Pi 会报告资源冲突。
