# 配置

> 本文为简体中文译本；[查看英文原文](../configuration.md)。

Pi 支持用户级配置和项目配置。用户级配置位于 Agent 目录，默认是 `~/.pi/agent`。项目配置位于工作目录下的 `.pi` 目录中，Pi 取得[项目目录信任](security.md#understand-project-trust)后才会加载。唯一例外是 `sessionDir`：Pi 会在判定信任状态之前读取它，以便定位会话。

交互模式下，使用 `/settings` 修改常用偏好。其他选项可以让 Pi 帮你更新配置，也可以直接编辑相应文件。手动修改设置、键位绑定、指令或资源后，运行 `/reload`。

## Agent 目录

下表中的 `<agent-dir>` 表示 Agent 目录。可通过环境变量 `PI_CODING_AGENT_DIR` 或 SDK 的 [`agentDir`](sdk.md) 选项设置其位置。

| 路径 | 用途 |
|---|---|
| `<agent-dir>/settings.json` | 用户级[设置](settings.md)，包括偏好、默认值、资源路径和 Pi 包声明。 |
| `<agent-dir>/keybindings.json` | 自定义终端 UI 和应用[键位绑定](keybindings.md)。 |
| `<agent-dir>/mcp.json` | 在所有项目中可用的 [MCP 服务器](mcp.md)。 |
| `<agent-dir>/models.json` | [兼容端点、模型和模型覆盖项](models.md#configure-a-compatible-endpoint)。 |
| `<agent-dir>/auth.json` | 已保存的 API 密钥和 OAuth 凭据。 |
| `<agent-dir>/AGENTS.override.md`、`AGENTS.md`、`AGENTS.MD`、`CLAUDE.md` 或 `CLAUDE.MD` | 在所有工作目录中生效的用户指令。 |
| `<agent-dir>/SYSTEM.md` | 替换 Pi 默认系统提示。 |
| `<agent-dir>/APPEND_SYSTEM.md` | 向 Pi 的系统提示追加指令。 |
| `<agent-dir>/extensions/` | 用户[扩展](extensions.md)。 |
| `<agent-dir>/skills/` | 用户[技能](skills.md)及其支持文件。 |
| `<agent-dir>/prompts/` | 作为斜杠命令提供的用户[提示模板](prompt-templates.md)。 |
| `<agent-dir>/themes/` | 用户[主题](themes.md)文件。 |

## 项目 `.pi` 目录

| 路径 | 用途 |
|---|---|
| `.pi/settings.json` | 项目级[设置](settings.md)、资源路径和 Pi 包声明。 |
| `.pi/mcp.json` | 项目的 [MCP 服务器](mcp.md)。 |
| `.pi/SYSTEM.md` | 替换此项目的系统提示。 |
| `.pi/APPEND_SYSTEM.md` | 向系统提示追加项目专用指令。 |
| `.pi/extensions/` | 项目扩展。 |
| `.pi/skills/` | 项目技能及其支持文件。 |
| `.pi/prompts/` | 作为斜杠命令提供的项目提示模板。 |
| `.pi/themes/` | 项目主题文件。 |

对于 `SYSTEM.md` 和 `APPEND_SYSTEM.md`，受信任的项目文件优先于对应的 Agent 目录文件。同名文件不会合并。

## 上下文文件

上下文文件与项目 `.pi` 配置相互独立。Pi 会从 Agent 目录、工作目录及其父目录中加载上下文文件。只要 Pi 在该文件所在目录或其下级目录运行，该上下文文件就会生效。

同一目录中的 `AGENTS.override.md` 会取代 `AGENTS.md` 或 `CLAUDE.md`。它不会屏蔽 Agent 目录或其他目录中的上下文文件。

发现上下文文件不需要项目目录信任。
