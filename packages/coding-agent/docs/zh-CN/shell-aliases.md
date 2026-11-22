> 本文为简体中文译本；[查看英文原文](../shell-aliases.md)。

# 配置 Shell 命令

Pi 会为每条 Bash 命令启动独立的非交互式 shell 进程。非交互式 Bash 默认不会展开别名，通常也不会加载交互式终端所用的启动文件。

使用 `shellPath` 选择 Bash 可执行文件，使用 `shellCommandPrefix` 在每条命令之前执行初始化操作。

## 了解 Pi 使用哪个 shell

| 命令来源 | 使用的 shell |
|---|---|
| 模型调用内置的 `bash` 工具 | Pi 解析出的 Bash 可执行文件 |
| 你输入 `!command` 或 `!!command` | 同一个已解析的 Bash 可执行文件 |
| 模型调用可选的 `powershell` 工具 | PowerShell 7（`pwsh.exe`）或 Windows PowerShell |
| 扩展提供或替换 shell 工具 | 该扩展实现的操作 |

Pi 通常使用 `bash -c` 调用 Bash。在 Unix 系统上，它依次尝试 `/bin/bash`、PATH 中的 `bash`，最后在 Bash 不可用时使用 `sh`。原生 Windows 会先检查配置的路径，再检查 Git Bash，最后检查 PATH 中的 `bash.exe`。

## 选择 Bash 可执行文件

如果 Pi 应使用特定可执行文件，可在 `~/.pi/agent/settings.json` 中设置 `shellPath`：

```json
{
  "shellPath": "~/.local/bin/bash"
}
```

在 Windows 上，请使用正斜杠或转义反斜杠：

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```

修改设置后运行 `/reload`。原生 Windows 的默认值请参阅[在 Windows 上运行 Pi](windows.md)。

## 在每条 Bash 命令前执行初始化

设置 `shellCommandPrefix`，即可在内置的 `bash` 工具以及用户输入的 `!` 或 `!!` 命令前加上初始化内容：

```json
{
  "shellCommandPrefix": "export CI=1"
}
```

Pi 会在前缀与请求的命令之间插入换行。每次执行命令都会重新运行前缀，因此请确保它速度快且不会等待交互输入。

## 启用 Bash 别名

不要解析完整的交互式 shell 配置文件；请将 Pi 需要的别名保存在兼容 Bash 的文件中。

创建 `~/.bash_aliases`：

```bash
alias ll='ls -la'
alias gs='git status --short'
```

然后配置 Pi 启用别名展开并加载该文件：

```json
{
  "shellCommandPrefix": "shopt -s expand_aliases\nsource ~/.bash_aliases"
}
```

运行 `/reload`，然后通过 Pi 验证别名：

```text
!ll
```

输出应与 `ls -la` 相同。

别名必须使用 Bash 兼容语法。不要在 Bash 中加载任意的 `.zshrc`，因为其中的 zsh 选项、函数和插件可能无法解析或行为不正确。

## 故障排查

### 前缀对 `!` 生效，但对扩展工具无效

`shellCommandPrefix` 只配置 Pi 内置的 Bash 执行。替换 `bash` 工具或提供自有 shell 操作的扩展，会自行控制其初始化过程。请查看该扩展的文档。

### 找不到 `shopt`

Pi 已回退到 `sh`，或者 `shellPath` 指向了非 Bash shell。使用 Bash 专属初始化（如 `shopt`）前，请安装 Bash 或将 `shellPath` 设为 Bash 可执行文件。

### 初始化命令等待输入

从 `shellCommandPrefix` 中移除交互式命令。前缀会在每条 Bash 命令执行前，于非交互式进程中运行。

完整的设置定义请参阅[Shell 设置](settings.md#shell)。
