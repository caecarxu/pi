> 本文为简体中文译本；[查看英文原文](../settings.md)。

# 设置参考

本文列出用户可配置的设置项、类型、默认值和用途。项目设置会覆盖 Agent 目录中的设置。资源列表会合并。关于文件位置和信任行为，请参阅[配置](configuration.md)。

在 `settings.json` 中添加 `"$schema": "https://pi.dev/schemas/settings.schema.json"`，即可启用编辑器校验和自动补全。

## 模型与思考

<a id="model-cycling"></a>

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultProvider` | string | 自动 | 启动时使用的 AI 供应商。 |
| `defaultModel` | string | 自动 | 启动时使用的模型 ID。 |
| `defaultThinkingLevel` | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"` | `"medium"` | 启动时的思考级别。 |
| `modelThinkingLevels` | object | 无 | 按精确的 `provider/modelId` 设置各模型的启动思考级别。 |
| `thinkingBudgets` | object | 内置预算 | 为 `minimal`、`low`、`medium` 和 `high` 思考级别设置 token 预算。 |
| `enabledModels` | `string[]` | 所有可用模型 | 用于启动选择和模型轮换的模型模式，格式与 `--models` 相同。 |
| `hideThinkingBlock` | boolean | `false` | 在对话记录中隐藏思考块。 |
| `showCacheMissNotices` | boolean | `false` | 显示重要缓存未命中、成功预热缓存、压缩用量和供应商恢复的提示。 |
| `cacheWarming` | `"off" \| "streaming" \| "idle"` | `"idle"` | 活跃运行期间保持符合条件的供应商提示缓存；值为 `"idle"` 时，两次运行间最多保持 30 分钟。 `"streaming"` 仅在活跃运行期间预热。仅全局设置有效。 |

只有模型声明了缓存生存期，且 Pi 估算可避免的缓存未命中成本至少为 $0.05 时，才会预热缓存。刷新用量会计入会话总量，但不会进入模型上下文。`/session` 会显示下一步判断；扩展可以通过 `cache_warming_decision` 覆盖它。参阅[提示缓存生存期](models.md#prompt-cache-lifetimes)。

关于模型选择和思考控制，请参阅[选择模型](models.md)。

## 交互

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `steeringMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | 排队的引导消息如何送入模型。 |
| `followUpMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | 排队的后续消息如何送入模型。 |
| `externalEditor` | string | 依次使用 `$VISUAL`、`$EDITOR`，再使用平台默认值 | 外部编辑器快捷键启动的命令。 |
| `doubleEscapeAction` | `"tree" \| "fork" \| "none"` | `"tree"` | 编辑器为空时双击 Escape 执行的操作。 |
| `treeFilterMode` | `"default" \| "no-tools" \| "user-only" \| "labeled-only" \| "all"` | `"default"` | `/tree` 初始使用的筛选模式。 |
| `defaultProjectTrust` | `"ask" \| "always" \| "never"` | `"ask"` | 项目信任的回退行为。**只能在 Agent 目录设置中配置。** |

## 工具

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultTools` | `string[]` | `read`、`bash`、`edit`、`write` | 启动时启用的工具。普通名称会替换默认工具；`+name` 添加工具，`-name` 移除工具。空数组会禁用所有内置工具，但不会禁用扩展或 SDK 工具。 |
| `codemode.mode` | `"on" \| "only"` | `"on"` | `codemode` 工具启用时如何呈现其他工具。`on`：在已声明工具的说明后附上脚本调用提示，并且 `codemode` 只列出未声明的工具。`only`：`codemode` 列出脚本可调用的全部工具，并将启用中的内置工具和扩展工具对模型隐藏，让模型通过 `codemode` 访问它们。 |
| `codemode.inlineBudget` | number | `3000` | `codemode` 工具说明可用于列出工具声明的预估 token 数（字符数 / 4）。放不下的工具会被省略，可通过 `searchTools()` 查找。`0` 表示只列出命名空间。 |

可用的内置工具有 `read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find` 和 `ls`。`defaultTools` 也可以指定由内置扩展注册但初始未启用的 `codemode`、`tool_search`，以及其他初始未启用的扩展工具。

如果列表只包含 `+name` 和 `-name` 项，就会修改继承的工具选择，而不是完全替换它。例如，以下配置会在默认工具之外启用 `codemode`：

```json
{
  "defaultTools": ["+codemode"]
}
```

以下配置会以 `powershell` 替换 `bash` 并启用 `grep`：`["-bash", "+powershell", "+grep"]`。项目设置会叠加在用户设置之上：只包含 `+name` 和 `-name` 的项目列表会修改用户的工具选择；包含普通名称的项目列表则会替换它。在同一列表中，先用普通名称形成选择，再按顺序应用 `+name` 和 `-name`。

`/reload` 会启用新加入 `defaultTools` 的工具，但不会禁用已移除的工具，也不会重新启用你此前手动关闭且配置未变的工具。使用普通名称的 `--tools`、`--no-tools` 和 `--no-builtin-tools` 会覆盖 `defaultTools`，重新加载时也一样。

CLI 工具选项只对本次运行覆盖此设置。如果 `--tools` 只包含 `+name` 和 `-name`，则会修改解析后的 `defaultTools` 选择，例如 `pi --tools +codemode`。执行 `/reload` 时这些项也会应用于重新加载的设置，因此用 `-name` 移除的工具仍会保持移除。参阅[命令行](cli.md#tools)。

## 会话与上下文

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `sessionDir` | string | Agent 会话目录 | 会话存储目录。相对路径按工作目录解析。`PI_CODING_AGENT_SESSION_DIR` 和 `--session-dir` 可以覆盖此设置。 |
| `sessionShareDestination` | `"auto" \| "gist" \| "radius"` | `"auto"` | `/share` 使用的目标位置。`auto` 在已登录 Radius 时使用 Radius，否则创建 GitHub gist。`gist` 始终使用 gist。`radius` 需要登录 Radius，且不会回退到 gist。 |

### 上下文压缩

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `compaction.enabled` | boolean | `true` | 启用自动压缩。 |
| `compaction.reserveTokens` | number | `16384` | 剩余可用上下文 token 低于此值时开始自动压缩。 |
| `compaction.keepRecentTokens` | number | `20000` | 不经摘要而保留的近期 token 数。 |
| `compaction.modelOverrides` | object | 无 | 按精确的 `provider/modelId` 设置模型专属 token 数值。 |

<a id="per-model-compaction-overrides"></a>

压缩 token 数值必须是非负安全整数。每个数值分别按匹配的模型覆盖项、普通压缩设置、内置默认值的顺序解析。查找模型之前会先合并项目和用户对象。

关于触发条件、摘要和校验行为，请参阅[压缩参考](compaction.md)。

### 分支摘要

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `branchSummary.reserveTokens` | number | `16384` | 汇总分支历史时预留的 token 数。 |
| `branchSummary.skipPrompt` | boolean | `false` | 跳过分支摘要提示，默认不生成摘要。 |

## 终端与显示

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `theme` | string | `"system"` | 内置或自定义主题。`system` 会根据终端主题生成颜色。 |
| `quietStartup` | boolean \| `"header"` | `false` | `true` 会隐藏启动标题和已加载资源列表。`"header"` 保留标题（版本和快捷键提示），但隐藏模型范围行和已加载资源列表。 |
| `tuiMode` | `"regular" \| "fullscreen"` | `"fullscreen"` | 交互式终端界面模式。 |
| `fullscreenExitOutput` | `"transcript" \| "resume-hint"` | `"transcript"` | 退出全屏模式时输出的内容。 |
| `fullscreenScrollbar` | `"auto" \| "always" \| "hidden"` | `"auto"` | 全屏对话记录滚动条的行为。 |
| `fullscreenCopyOnSelect` | boolean | `true` | 全屏模式下自动复制所选文本。 |
| `fullscreenWheelScrollLines` | `"auto"` \| number | `"auto"` | 全屏模式下每次鼠标滚轮事件滚动的行数，范围为 1 到 100。`"auto"` 在本地 macOS 终端中每次移动一行，因为这些终端已对滚轮和触控板输入做加速；其他环境（包括 SSH）会加速快速滚动，最多每次移动 6 行。按住 Alt 滚动时距离为 5 倍。 |
| `editorPaddingX` | number | `0` | 编辑器水平内边距，范围为 0 到 3 个单元格。 |
| `outputPad` | `0 \| 1` | `1` | 对话记录中的消息、工具输出、`!` 命令输出和摘要块的水平内边距。 |
| `autocompleteMaxVisible` | number | `5` | 自动补全可见条目数，范围为 3 到 20。 |
| `showHardwareCursor` | boolean | `false` | 使用终端光标代替 Pi 绘制的光标。Pi 仍会为输入法定位光标。 |
| `terminal.showImages` | boolean | `true` | 在支持的终端中显示行内图像。 |
| `terminal.imageWidthCells` | number | `60` | 行内图像的首选宽度，单位为终端单元格。 |
| `terminal.clearOnShrink` | boolean | `false` | 渲染内容缩小时清空多余行。未设置时，`PI_CLEAR_ON_SHRINK=1` 会启用此行为。 |
| `terminal.showTerminalProgress` | boolean | `false` | 在终端标签页中显示 OSC 9;4 进度。 |
| `terminal.hyperlinks` | `boolean \| "auto"` | `"auto"` | 覆盖 OSC 8 超链接检测结果。 |
| `terminal.images` | `"kitty" \| "iterm2" \| "auto" \| false` | `"auto"` | 覆盖行内图像协议检测结果。 |
| `terminal.trueColor` | `boolean \| "auto"` | `"auto"` | 覆盖真彩色检测结果。 |
| `images.autoResize` | boolean | `true` | 将图像缩放到不超过 2000 × 2000 像素，再发送给模型。 |
| `images.blockImages` | boolean | `false` | 阻止向模型发送图像。 |
| `markdown.codeBlockIndent` | string | `"  "` | 渲染代码块时添加的缩进前缀。 |
| `markdown.mermaid` | `"off" \| "final" \| "streaming"` | `"streaming"` | Mermaid 图表的渲染模式。 |

主题格式和平台细节请参阅[主题](themes.md)和[配置终端](terminal-setup.md)。

## 网络与重试

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `transport` | `"auto" \| "sse" \| "websocket" \| "websocket-cached"` | `"auto"` | 对支持多种传输方式的 AI 供应商指定首选传输方式。 |
| `httpProxy` | string | 无 | 将代理 URL 作为 `HTTP_PROXY` 和 `HTTPS_PROXY` 应用于 Pi 管理的 HTTP 客户端。**只能在 Agent 目录设置中配置。** |
| `httpIdleTimeoutMs` | number \| `"disabled"` | `300000` | HTTP 标头和正文的空闲超时（毫秒）。设为 `0` 或 `"disabled"` 可关闭。 |
| `websocketConnectTimeoutMs` | number \| `"disabled"` | `15000` | WebSocket 连接超时（毫秒）。设为 `0` 或 `"disabled"` 可关闭。 |
| `retry.enabled` | boolean | `true` | 启用针对瞬时故障的 Agent 级自动重试。 |
| `retry.maxRetries` | number | `3` | Agent 级最大重试次数。 |
| `retry.baseDelayMs` | number | `2000` | 指数退避的初始延迟（毫秒）。 |
| `retry.maxAgentDelayMs` | number | `60000` | Agent 级最大重试延迟（毫秒）。 |
| `retry.provider.timeoutMs` | number | `httpIdleTimeoutMs` | 供应商请求超时（毫秒）。 |
| `retry.provider.maxRetries` | number | `0` | 供应商级重试次数。 |
| `retry.provider.maxRetryDelayMs` | number | `60000` | 服务器要求的最大延迟（毫秒）。设为 `0` 可取消上限。 |

除非确实需要供应商级重试，否则请将 `retry.provider.maxRetries` 保持为 `0`。供应商级重试可能会延迟 Pi 自行处理配额和用量上限错误。

## Shell

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `shellPath` | string | 平台默认值 | 自定义 shell 可执行文件路径。支持路径开头使用 `~`。 |
| `shellCommandPrefix` | string | 无 | 添加到每条 shell 命令之前的前缀。 |
| `npmCommand` | `string[]` | `npm` | 用于查询和安装 npm 包的命令及参数。 |
| `selfUpdateCommand` | `string[]` | 无 | `pi update` 用于更新 Pi 的命令及参数，支持 `{packageName}`、`{version}` 和 `{installSpec}` 占位符。`PI_SELF_UPDATE_COMMAND` 的优先级更高。**只能在 Agent 目录设置中配置。**参阅[自定义更新命令](cli.md#custom-update-command)。 |

关于 shell 设置和包管理器行为，请参阅[Shell 别名](shell-aliases.md)和[Pi 包](packages.md)。

## 资源

用户设置中的资源路径相对于 Agent 目录解析。项目设置中的路径相对于项目的 `.pi` 目录解析。支持绝对路径和 `~`。

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `packages` | array | `[]` | npm、git 或本地 Pi 包源。参阅[Pi 包](packages.md)。 |
| `extensions` | `string[]` | `[]` | 扩展文件或目录。 |
| `skills` | `string[]` | `[]` | Skill 文件或目录。 |
| `prompts` | `string[]` | `[]` | 提示模板文件或目录。 |
| `themes` | `string[]` | `[]` | 主题文件或目录。 |
| `enableSkillCommands` | boolean | `true` | 将 Skill 注册为 `/skill:name` 命令。 |

资源数组支持使用 `!pattern` 排除匹配项、使用 `+path` 精确纳入、使用 `-path` 精确排除。Pi 会加载用户级和项目设置中列出的资源。

内置扩展在 `extensions` 中的名称分别是 `builtin:mcp`、`builtin:llama.cpp`、`builtin:codemode` 和 `builtin:tool-search`。它们默认加载；使用 `-builtin:mcp` 可禁用其中一个。项目设置中的 `+builtin:<name>` 或 `-builtin:<name>` 会覆盖用户设置。`pi config` 会在 Built-in 下列出它们；`--no-extensions` 也会禁用它们，而 `-e builtin:<name>` 可以显式加载某个内置扩展。

## 更新、遥测与警告

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `collapseChangelog` | boolean | `false` | 更新后显示精简的变更日志，也会将扩展包的变更日志压缩为每个包一行。 |
| `enableInstallTelemetry` | boolean | `true` | 启用匿名安装/更新报告以及选定的供应商归因标头。此项不控制更新检查。 |
| `enableAnalytics` | boolean | `false` | 同意共享分析数据。目前仅实验性的首次运行设置会使用此项。 |
| `warnings.anthropicExtraUsage` | boolean | `true` | 当 Anthropic 订阅认证可能产生额外付费用量时发出警告。 |
