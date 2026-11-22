> 本文为简体中文译本；[查看英文原文](../environment-variables.md)。

# 环境变量

Pi 以三种方式使用环境变量：

- `PI_OFFLINE` 等变量用于配置 Pi 进程。
- Pi 会设置进程标记，让子进程识别 Pi 是启动它的 Agent。
- LLM 可调用的 shell 工具执行命令时，会收到描述当前会话的 `PI_*` 变量。

Provider API 密钥变量单独列在[Providers](providers.md#use-an-api-key-from-the-environment)中。

## 进程标记

CLI 和 RPC 入口会设置两个进程标记：

- `AI_AGENT=pi` 是通用标记，可供工具识别 Pi 是启动该进程的 Agent。
- `PI_CODING_AGENT=true` 是 Pi 专用标记，可让子进程检测自己是否运行在 Pi 内。

子进程会继承这两个标记。它们不特定于某个会话；通过 SDK 嵌入 Pi 时也不会自动设置。

## Shell 工具的会话环境

`bash` 和 `powershell` 工具执行的命令会收到当前 Pi 会话状态：

| 变量 | 说明 |
|----------|-------------|
| `PI_SESSION_ID` | 当前会话 ID |
| `PI_SESSION_FILE` | 当前会话 JSONL 文件的绝对路径；临时会话中未设置 |
| `PI_PROVIDER` | 当前选定模型的 provider |
| `PI_MODEL` | 当前选定的模型 ID |
| `PI_REASONING_LEVEL` | 当前生效的推理级别：`off`、`minimal`、`low`、`medium`、`high`、`xhigh` 或 `max` |

每条命令启动时都会解析这些值。因此，切换模型或更改推理级别会影响下一条 shell 命令，无需重启 Pi。`PI_PROVIDER` 和 `PI_MODEL` 标识 Pi 选定的模型，不代表路由器可能在内部选择的其他上游模型。

如果被问到当前运行的是哪个模型或 provider，请检查这些变量，不要根据系统提示推断：

```bash
printf '%s/%s\n' "$PI_PROVIDER" "$PI_MODEL"
printf 'reasoning=%s session=%s\n' "$PI_REASONING_LEVEL" "$PI_SESSION_ID"
```

会话持久化时，可以直接检查会话文件：

```bash
if [ -n "$PI_SESSION_FILE" ]; then
  tail -n 1 "$PI_SESSION_FILE"
fi
```

这些变量会注入 LLM 可调用的 `bash` 和 `powershell` 工具，但不会注入用户输入的 `!` 或 `!!` 命令。

### 自定义 Shell 工具

使用 `createBashTool()` 或 `createPowerShellTool()` 创建的工具，在向 Pi 注册时默认会公开会话环境。注入发生在 `spawnHook` 之前，因此 hook 会在 `ctx.env` 中收到这些变量：

```typescript
const bashTool = createBashTool(cwd, {
  spawnHook: (ctx) => ({
    ...ctx,
    env: { ...ctx.env, CI: "1" },
  }),
});
```

可以独立于 spawn hook 关闭会话元数据：

```typescript
const powershellTool = createPowerShellTool(cwd, {
  exposeSessionEnvironment: false,
  spawnHook: (ctx) => ctx,
});
```

关闭后，Pi 会移除这些变量的继承值，避免嵌套启动的 Pi 进程暴露过期的父会话元数据。

## Pi 进程配置

以下变量由 Pi 自身读取：

| 变量 | 说明 |
|----------|-------------|
| `PI_CODING_AGENT_DIR` | 覆盖配置目录；默认为 `~/.pi/agent` |
| `PI_CODING_AGENT_SESSION_DIR` | 覆盖会话存储目录；`--session-dir` 优先级更高 |
| `PI_PACKAGE_DIR` | 覆盖包目录；Nix/Guix store 路径等场景可用 |
| `PI_OFFLINE` | 禁止自动网络活动，包括刷新模型目录 |
| `PI_SKIP_VERSION_CHECK` | 禁止请求 `pi.dev` 获取最新版本 |
| `PI_SELF_UPDATE_COMMAND` | `pi update` 用于更新 Pi 的命令；按空白符拆分，并支持 `{packageName}`、`{version}` 和 `{installSpec}` 占位符。优先级高于 `selfUpdateCommand` 设置。参见[自定义更新命令](cli.md#custom-update-command) |
| `PI_TELEMETRY` | 覆盖安装/更新遥测和 provider 归属标头：`1`/`true`/`yes` 或 `0`/`false`/`no` |
| `PI_CODEMODE_MAX_WORKERS` | 所有会话共享的最大并发 codemode worker 数；默认为 `2`。每个 worker 的脚本最多可使用 256 MB。一个进程运行多个会话（例如进程内子 Agent）时可调高此值。多出的脚本会等待空闲 worker。参见[Codemode](codemode.md) |
| `PI_CACHE_RETENTION` | 在 provider 支持时设为 `long`，以延长提示缓存保留时间 |
| `PI_SHARE_VIEWER_URL` | 覆盖 `/share` 使用的基础 URL |
| `PI_RADIUS_GATEWAY` | 覆盖 `/bug` 上传使用的 Radius gateway 源站 |
| `PI_CLEAR_ON_SHRINK` | 设为 `1`，在渲染内容缩短时清除空行；`terminal.clearOnShrink` 设置优先。参见[设置](settings.md) |
| `PI_HARDWARE_CURSOR` | 设为 `1` 以显示硬件光标；参见[终端设置](terminal-setup.md) |
| `PI_CLIPBOARD_OSC52` | 设为 `1`，在本地剪贴板写入后也通过 OSC 52 将复制的文本发送给终端（Pi 在 SSH 下也会这样做）。适用于远程客户端未设置 SSH 变量却能访问 Pi 的情况，例如从另一台机器连接的复用器，或远程 IDE 守护进程 |
| `PI_HYPERLINKS` | 用 `1`、`0` 或 `auto` 覆盖 OSC 8 超链接检测 |
| `PI_PROGRAM_STATUS` | 覆盖 OSC 7501 程序状态检测：`1` 始终报告，`0` 从不报告；否则仅在终端确认支持时报告。参见[终端设置](terminal-setup.md#program-status) |
| `PI_IMAGE_PROTOCOL` | 用 `kitty`、`iterm2`、`none` 或 `auto` 覆盖内嵌图像检测 |
| `PI_TRUE_COLOR` | 用 `1`、`0` 或 `auto` 覆盖真彩色检测 |
| `PI_TUI_ESC_TIMEOUT` | 独立 ESC 按键等待时间（毫秒）；SSH 下默认为 `100`，其他情况为 `10`。如果 Alt 键输入被误判为 Escape，可调高此值 |
| `VISUAL`、`EDITOR` | 未设置 `externalEditor` 时使用的外部编辑器回退值 |
| `HTTP_PROXY`、`HTTPS_PROXY` | 出站 HTTP 请求的代理 |

`ANTHROPIC_API_KEY`、`OPENAI_API_KEY` 等 provider 凭据及其专属配置见[Providers](providers.md#use-an-api-key-from-the-environment)。
