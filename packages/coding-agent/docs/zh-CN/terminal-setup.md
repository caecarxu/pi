> 本文为简体中文译本；[查看英文原文](../terminal-setup.md)。

# 配置终端

大多数现代终端无需额外配置即可运行 Pi。如果修饰键、滚动、链接、图像、颜色或输入法编辑器（IME）位置不符合预期，可参考本页。

Pi 使用扩展按键协议，让终端能够区分 `Shift+Enter`、`Alt+Enter` 等组合键与普通的 `Enter`。终端代理、多路复用器和 IDE 内置终端可能会更改或丢弃这些信息。

## 故障排查

| 现象 | 从这里开始 |
|---|---|
| `Shift+Enter` 提交了内容，而不是换行 | 查看下方对应终端的说明；tmux 请参阅[在 tmux 中运行 Pi](tmux.md) |
| `Alt+Enter` 无法排入后续消息 | [WezTerm](#wezterm)、[Alacritty](#alacritty) 或 [Windows Terminal](#windows-terminal) |
| 全屏滚动异常缓慢 | [iTerm2](#iterm2) |
| 链接可用，但悬停时不显示预览 | [Ghostty](#ghostty) |
| 无法检测行内图像或颜色 | [覆盖检测到的能力](#override-detected-capabilities) |
| IME 候选窗口位置错误 | [WezTerm](#wezterm) 或 [IntelliJ IDEA 集成终端](#intellij-idea-integrated-terminal) |
| 只有在 tmux 中修饰键才失效 | [在 tmux 中运行 Pi](tmux.md) |

使用 `/hotkeys` 查看 Pi 当前生效的快捷键。要修改快捷键，请参阅[键位绑定](keybindings.md)。

## Kitty

Kitty 无需额外配置即可支持所需的键盘协议。

## iTerm2

常规终端模式无需额外配置。

### 修复全屏滚动缓慢

全屏模式下，Pi 会管理视口，因此 iTerm2 会发送鼠标滚轮事件，而不是滚动终端的原生历史记录。快速的触控板手势可能因此每次只移动约一行。

要更改此行为：

1. 打开 **iTerm2 > Settings > Advanced**。
2. 搜索 **Trackpad scrolls fast?**。
3. 将其设为 **No**。

这是 iTerm2 的全局设置，也可能改变原生触控板滚动行为。相关问题见 [iTerm2 issue 9619](https://gitlab.com/gnachman/iterm2/-/work_items/9619)。

## Apple Terminal

Pi 在可用时会启用增强按键报告。如果 Terminal.app 仍将 `Shift+Enter` 发送为普通 Return 或 `ESC` + Return，Pi 会使用 macOS 本地修饰键回退机制，并将其视为 `Shift+Enter`。未按住 Shift 时，`ESC` + Return 仍表示 `Alt+Enter`。

只有当 Pi 与 Terminal.app 在同一台 Mac 上运行时，此回退机制才有效。如果 Pi 通过 SSH 在另一台机器上运行，它无法检查本地修饰键状态。

## Ghostty

如果 `Alt+Backspace` 不工作，请将以下映射添加到 Ghostty 配置：

```text
keybind = alt+backspace=text:\x1b\x7f
```

macOS 上的配置文件位于 `~/Library/Application Support/com.mitchellh.ghostty/config`，Linux 上位于 `~/.config/ghostty/config`。

较早的 Claude Code 配置可能包含：

```text
keybind = shift+enter=text:\n
```

这会发送原始换行符，Pi 无法将它与 `Ctrl+J` 区分。如果旧 Claude Code 安装是你添加此映射的唯一原因，请将其删除。Pi 已将 `Ctrl+J` 绑定为换行的替代键，因此映射看起来可能有效，但仍会导致 Pi 和 tmux 收不到真正的 `Shift+Enter` 事件。

### 在全屏模式中打开链接

全屏模式下链接仍然可点击，但 Pi 捕获鼠标输入时，Ghostty 不会显示常规的悬停下划线或 URL 预览。在 macOS 上按住 `Shift+Command`，或在 Linux 上按住 `Shift+Ctrl`，即可使用 Ghostty 原生的链接处理。

## WezTerm

WezTerm 通常通过 xterm 扩展按键上报 `Shift+Enter`。要显式启用 Kitty 键盘协议，请创建 `~/.wezterm.lua`：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

### 在 macOS 上转发 Alt+Enter

macOS 上 WezTerm 默认将 `Option+Enter` 绑定为全屏。要将其用于 Pi 的后续消息队列，请将以下条目添加到 `config.keys` 表：

```lua
{
  key = 'Enter',
  mods = 'ALT',
  action = wezterm.action.SendString('\x1b[13;3u'),
}
```

完整的最简配置如下：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.keys = {
  {
    key = 'Enter',
    mods = 'ALT',
    action = wezterm.action.SendString('\x1b[13;3u'),
  },
}
return config
```

### 在 WSL 中定位 IME 候选窗口

如果 CJK 输入法候选项在 WSL 中没有跟随 Pi 的文本光标，请显示硬件光标：

```bash
export PI_HARDWARE_CURSOR=1
pi
```

也可以在 Pi 设置中将 `showHardwareCursor` 设为 `true`。

## Alacritty

Alacritty 通常会上报 `Shift+Enter`。在 macOS 上，`Option+Enter` 可能会被识别为普通 `Enter`。要将其转发给 Pi，请把以下内容添加到 `~/.config/alacritty/alacritty.toml`：

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

修改文件后重启 Alacritty。

## VS Code 集成终端

VS Code 1.109.5 及更高版本默认在集成终端中启用 Kitty 键盘协议。

旧版本请在 `keybindings.json` 中添加 `Shift+Enter` 终端绑定：

```json
{
  "key": "shift+enter",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b[13;2u" },
  "when": "terminalFocus"
}
```

用户级 `keybindings.json` 文件通常位于：

- macOS：`~/Library/Application Support/Code/User/keybindings.json`
- Linux：`~/.config/Code/User/keybindings.json`
- Windows：`%APPDATA%\\Code\\User\\keybindings.json`

## Zed 集成终端

将以下绑定添加到 Zed 的 `keymap.json`：

```json
{
  "context": "Terminal",
  "bindings": {
    "shift-enter": ["terminal::SendText", "\u001b[13;2u"],
    "ctrl--": ["terminal::SendText", "\u001b[45;5u"],
    "ctrl-alt-]": ["terminal::SendText", "\u001b[93;7u"]
  }
}
```

## Windows Terminal

Windows Terminal 使用 Pi 的 Windows 和 WSL 快捷键默认值。完整列表请参阅[键位绑定](keybindings.md)。

### 转发 Shift+Enter

Pi 在 Windows 原生运行时会检查本地 Shift 键状态；按住 Shift 时，Pi 会将普通 Return 或 `ESC` + Return 视为 `Shift+Enter`。此回退机制在 WSL 或 SSH 中无效。如果 `Shift+Enter` 仍然提交内容，请显式转发此按键。

按 `Ctrl+Shift+,`，或打开 **Settings > Open JSON file**，编辑 Windows Terminal 的 `settings.json`。将以下对象添加到 `actions` 数组：

```json
{
  "command": { "action": "sendInput", "input": "\u001b[13;2u" },
  "keys": "shift+enter"
}
```

完全退出并重新打开 Windows Terminal，然后确认 `Shift+Enter` 会在 Pi 中插入新行。

### 使用 Alt+Enter 添加后续消息

Windows Terminal 默认将 `Alt+Enter` 绑定为全屏。因此在 Windows 和 WSL 上，Pi 默认使用 `Ctrl+Q` 排入后续消息。

若要改用 `Alt+Enter`，请配置 Windows Terminal 转发此按键，并在 Pi 的 `keybindings.json` 中将 `app.message.followUp` 绑定到 `alt+enter`。参阅[键位绑定](keybindings.md#assign-keybindings)。

## xfce4-terminal 和 Terminator

这些终端无法可靠地区分带修饰键的 Enter 与普通 `Enter`。因此，`Ctrl+Enter` 或 `Shift+Enter` 等自定义快捷键可能无法使用。

需要这些快捷键时，请使用支持现代扩展按键的终端，例如 Kitty、Ghostty、WezTerm、iTerm2、Windows Terminal 或兼容版本的 Alacritty。

## IntelliJ IDEA 集成终端

IntelliJ IDEA 内置终端无法可靠地区分 `Shift+Enter` 和普通 `Enter`。请使用 `Ctrl+J` 换行，或在支持现代扩展按键的终端中运行 Pi。

如果 IME 候选窗口没有跟随文本光标，请显示硬件光标：

```bash
export PI_HARDWARE_CURSOR=1
pi
```

## 覆盖检测到的能力

Pi 会自动检测 OSC 8 超链接、行内图像协议和真彩色支持。终端代理或多路复用器可能导致检测结果不准确。

| 能力 | 环境变量 | 设置 |
|---|---|---|
| 超链接 | `PI_HYPERLINKS=1\|0\|auto` | `terminal.hyperlinks: true\|false\|"auto"` |
| 行内图像 | `PI_IMAGE_PROTOCOL=kitty\|iterm2\|none\|auto` | `terminal.images: "kitty"\|"iterm2"\|false\|"auto"` |
| 真彩色 | `PI_TRUE_COLOR=1\|0\|auto` | `terminal.trueColor: true\|false\|"auto"` |

设置优先于环境变量。未设置或使用 `auto` 时，会保留自动检测结果。

请只强制启用完整终端链路所支持的能力。不受支持的转义序列可能破坏渲染。权威取值定义请参阅[环境变量](environment-variables.md#pi-process-configuration)和[设置](settings.md)。

## 程序状态

Pi 使用[程序状态协议（OSC 7501）](https://www.superlogical.com/rex/docs/build/program-status)报告状态，让终端和 Agent 面板可以显示它正在工作、等待你响应、已完成还是失败：

| 状态 | 说明 |
|---|---|
| `working` | Agent 运行或压缩正在进行。消息内容为会话名称。 |
| `blocked` | 扩展对话框或登录流程正在等待你。消息内容为对话框标题。 |
| `done` | 运行已完成。消息内容为会话名称。 |
| `error` | 运行因未重试的错误而结束。消息内容为错误的第一行。 |
| `idle` | Pi 已启动，或你取消了运行。 |

状态报告绝不包含提示或模型输出。只有在终端回答协议支持查询后，Pi 才会发送报告；tmux 和 screen 不会转发这些报告。设置 `PI_PROGRAM_STATUS=1` 可无需询问而直接发送报告，设置为 `PI_PROGRAM_STATUS=0` 可关闭报告。
