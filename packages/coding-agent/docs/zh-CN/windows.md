> 本文为简体中文译本；[查看英文原文](../windows.md)。

# 在 Windows 上运行 Pi

你可以将 Pi 作为 Windows 原生进程运行，也可以在 Windows Subsystem for Linux（WSL）中运行。Windows 原生模式默认使用 Git Bash 执行 Bash 命令，也可以选择向模型开放 PowerShell。WSL 中的 Pi 使用 Linux 环境及其 Bash 安装。

请先按照主[快速入门](quickstart.md)安装 Pi 并完成身份验证。本文介绍如何选择和配置命令环境。

## 选择 Windows 原生模式或 WSL

| 环境 | 命令环境 | 适用场景 |
|---|---|---|
| Windows 原生模式，使用 Git Bash | 内置 `bash` 工具和 `!` 命令使用 Git Bash | 文件和开发工具主要位于 Windows 上 |
| Windows 原生模式，使用 `powershell` 工具 | 模型工具调用使用 PowerShell；`!` 命令仍可使用 Bash | 任务依赖 PowerShell 模块或 Windows 原生命令 |
| WSL | 所选 WSL 发行版中的 Linux Bash 和工具 | 文件和工具链已经位于 Linux 或 WSL 中 |

## 在 Windows 原生模式下使用 Git Bash

对大多数 Windows 原生用户来说，安装 [Git for Windows](https://git-scm.com/download/win) 就足够了。

Pi 按以下顺序查找 Bash：

1. `~/.pi/agent/settings.json` 中的 `shellPath`
2. `%ProgramFiles%\Git\bin\bash.exe` 中的 Git Bash
3. `%ProgramFiles(x86)%\Git\bin\bash.exe` 中的 Git Bash
4. `PATH` 中的 `bash.exe`，包括 Cygwin、MSYS2 或旧版 WSL Bash

启动 Pi 并输入以下命令，以验证 shell：

```text
!printf 'Bash is working\n'
```

如果 Pi 找不到 Bash，它会报告检查过的位置。请安装 Git for Windows、将其他 Bash 可执行文件加入 `PATH`，或配置 `shellPath`。

## 让模型使用 PowerShell

可选的 `powershell` 工具在可用时通过 `pwsh.exe` 运行命令，否则回退到 Windows PowerShell。它会使用 `-NoProfile -NonInteractive -ExecutionPolicy Bypass` 启动 PowerShell。管理员强制实施的执行策略仍可能优先生效。

PowerShell 按以下顺序查找：

1. `PATH` 中的 `pwsh.exe`
2. `%ProgramFiles%\PowerShell\7\pwsh.exe`
3. `PATH` 中的 `powershell.exe`
4. `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`

若要将面向模型的 `bash` 工具替换为 `powershell`，请将以下内容加入 `~/.pi/agent/settings.json`：

```json
{
  "defaultTools": ["read", "powershell", "edit", "write"]
}
```

`["-bash", "+powershell"]` 也能实现相同效果，同时保留你配置的其他默认工具。

重启 Pi，然后让它运行一条无害的 PowerShell 命令。编辑器中的 `!` 和 `!!` 命令仍使用 Bash。只有当 Pi 作为 Windows 原生进程运行时，`powershell` 工具才可用。

有关其他工具组合，请参阅[设置](settings.md#工具)。

## WSL

Windows 上的 WSL 路径转换以及 WSL 中额外的 Git 分支轮询都能识别 `/mnt/<drive>`，不识别自定义挂载根目录。

从 Windows 使用旧版 WSL `bash.exe` 启动器时，Pi 会通过 stdin 发送命令，以避免命令行引号问题。

## 使用自定义 Bash 可执行文件

如果 Bash 安装在 Pi 不会自动查找的位置，请设置 `shellPath`：

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```

JSON 使用反斜杠表示转义序列。写入带反斜杠的 Windows 路径时，每个反斜杠都要写两次，如上例所示。

有关命令前缀、别名和完整 shell 解析行为，请参阅[配置 shell 命令](shell-aliases.md)。

## 选择终端

Windows 终端通过控制台主机（conhost）运行 Pi。有些终端捆绑了较新版本；另一些使用 Windows 内置的旧版本，其中的错误会影响 Pi。

我们推荐使用 [Windows Terminal](https://aka.ms/terminal)。它始终附带较新的 conhost，Pi 也主要在该终端中进行测试。

最后更新：2026 年 10 月。

| 终端 | Conhost | 状态 |
|---|---|---|
| [Windows Terminal](https://aka.ms/terminal) | 随附，当前版本 | 推荐 |
| [VS Code](https://code.visualstudio.com)、[Tabby](https://tabby.sh)、WezTerm nightly | 随附，当前版本 | 可用 |
| [Alacritty](https://alacritty.org) | 内置版本；除非将 Windows Terminal 中的 `conpty.dll` 和 `OpenConsole.exe` 放在 `alacritty.exe` 旁边 | 只有放入这两个文件后才可用 |
| WezTerm 20240203 及更早版本 | 随附，旧版本 | [已知问题](#已知问题) |
| 经典控制台（`cmd.exe` 或不带 Windows Terminal 的 PowerShell）、mintty（Git Bash）、ConEmu、Cmder、[Hyper](https://hyper.is)、Windows OpenSSH | 内置版本 | [已知问题](#已知问题) |

## 配置 Windows Terminal

Windows Terminal 会保留或改写某些组合键。请参阅 [Windows Terminal](terminal-setup.md#windows-terminal)，了解如何配置 `Shift+Enter` 和 `Alt+Enter`；Pi 在 Windows 和 WSL 上的默认快捷键见[按键绑定](keybindings.md)。

## 已知问题

这些问题来自 conhost。Microsoft 已在其源代码中修复，但尚未说明何时会将修复带入 Windows 内置的 conhost。

| 问题 | 影响范围 | 解决方法 |
|---|---|---|
| 从全屏切换到普通模式，或在全屏模式按 `Ctrl+G`，会导致会话崩溃（[#9186](https://github.com/earendil-works/pi/issues/9186)、[microsoft/terminal#17515](https://github.com/microsoft/terminal/issues/17515)） | 内置 conhost | 使用带有当前版本 conhost 的终端，或使用 `--tui-mode regular` 启动 Pi |
| 提示中出现类似 `;0;rgb:0000/0000/0000` 的文本，且 BEL 会打开外部编辑器（[#10256](https://github.com/earendil-works/pi/issues/10256)） | 另一终端后方的内置 conhost：mintty、Windows OpenSSH | 使用带有当前版本 conhost 的终端 |
| 提示中出现类似 `79` 或 `55` 的片段（[#10717](https://github.com/earendil-works/pi/issues/10717)） | WezTerm 20240203 | 使用 WezTerm nightly |
| 普通模式下，每次按键都会将输入行重绘到新的一行（[#6300](https://github.com/earendil-works/pi/issues/6300)） | 内置 conhost、经典控制台 | 使用全屏模式（默认），或使用带有当前版本 conhost 的终端 |
