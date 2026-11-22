# Pi

> 本文为英文文档的简体中文译本；[查看英文原文](../index.md)。

Pi 是一个可扩展的 AI Agent，可在终端中运行。给它一个目标和工作目录，它就能检查文件、运行命令、编辑内容，并完成多步骤任务。

Pi 可用于软件开发、研究笔记、写作、数据文件处理或个人兴趣项目。你可以直接使用 Pi，也可以让它适配你的工作流程，或通过 SDK 构建由 Pi 驱动的其他应用。

## 开始使用 Pi

第一次使用 Pi？请参阅[快速入门](quickstart.md)，了解如何安装 Pi、连接模型并完成第一个任务。

如果已经安装 Pi，可以根据需要选择：

- [交互式使用 Pi](usage.md)：添加文件、运行命令、指导持续进行的工作并导出结果。
- [选择模型](models.md)，或连接订阅账号、API 密钥、本地模型或兼容端点。
- [继续会话或创建分支](sessions.md)：恢复工作，或在保留历史的同时探索另一种方案。
- [配置 Pi](configuration.md)：设置偏好、工作目录、指令和可复用资源。
- 阅读[Pi 的工作原理](how-pi-works.md)，了解工具、上下文、会话和 Agent 循环。

## 中文文档目录

### 入门与使用

- [快速入门](quickstart.md)
- [在终端中使用 Pi](usage.md)
- [Pi 的工作原理](how-pi-works.md)
- [Pi 包](packages.md)

### 会话与上下文

- [会话与上下文](sessions.md)
- [会话文件格式](session-format.md)
- [压缩参考](compaction.md)

### 模型与供应商

- [选择模型](models.md)
- [模型配置](models-configuration.md)
- [模型供应商](providers.md)
- [自定义供应商](custom-provider.md)
- [虚拟模型](virtual-models.md)
- [使用 llama.cpp 运行本地模型](llama-cpp.md)
- [使用 NVIDIA RTX 和 llama.cpp 运行 Pi](nvidia-rtx-llama-cpp.md)

### 配置与自定义

- [配置](configuration.md)
- [设置参考](settings.md)
- [环境变量](environment-variables.md)
- [配置 Shell 命令](shell-aliases.md)
- [快捷键参考](keybindings.md)
- [使用主题自定义 Pi](themes.md)
- [扩展指南](extensions.md)
- [提示模板](prompt-templates.md)
- [Skills（技能）](skills.md)
- [Codemode](codemode.md)

### CLI、自动化与集成

- [命令行](cli.md)
- [CLI 集成](cli-integration.md)
- [JSON 事件流](json.md)
- [RPC 模式](rpc.md)
- [RPC 命令](rpc-commands.md)
- [RPC 扩展 UI](rpc-extension-ui.md)
- [SDK](sdk.md)
- [MCP 服务器](mcp.md)
- [消息类型](message-types.md)
- [斜杠命令](slash-commands.md)
- [终端 UI](tui.md)

### 平台与安全

- [安全运行 Pi](security.md)
- [在隔离环境中运行 Pi](containerization.md)
- [配置终端](terminal-setup.md)
- [在 tmux 中运行 Pi](tmux.md)
- [在 Windows 上运行 Pi](windows.md)
- [使用 Termux 在 Android 上运行 Pi](termux.md)

## 自定义 Pi

Pi 可以复用提示词、加载专门的指令、添加可执行的集成、调整终端界面、连接模型服务，并将这些资源打包分发。使用[快速入门](quickstart.md)，挑选满足需求的最小机制。

## 自动化或嵌入 Pi

- 使用[打印模式](cli.md)执行一次性或脚本化任务。
- 使用 [JSON 事件流模式](json.md)读取单次运行产生的结构化事件。
- 使用 [RPC 模式](rpc.md)控制独立运行的 Pi 进程。
- 使用 [TypeScript SDK](sdk.md)在应用中运行 Pi。

## 查找参考和设置信息

可在参考文档中查阅 [CLI 选项](cli.md)、[设置](settings.md)、[供应商](providers.md)、[按键绑定](keybindings.md)和[环境变量](environment-variables.md)。

平台相关帮助请参阅[终端设置](terminal-setup.md)、[Windows](windows.md)、[tmux](tmux.md)、[Android 上的 Termux](termux.md)或[容器化](containerization.md)。

## 安全使用

Pi 的工具和扩展使用 Pi 进程本身的权限。项目的信任设置决定 Pi 会加载哪些项目资源，但不会隔离工具调用。使用不可信文件、仓库、扩展或无人值守自动化之前，请阅读[安全说明](security.md)。
