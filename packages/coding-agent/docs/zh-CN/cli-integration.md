> 本文是简体中文译本，英文原文见[这里](../cli-integration.md)。

# CLI 集成

默认情况下，运行 `pi` 会打开交互式终端界面。输入或输出通过管道传递或重定向时，Pi 会改用打印模式。你也可以为脚本和应用显式选择打印、JSON 或 RPC 模式。

四种模式使用相同的 agent、会话、资源和工具。模式决定输入如何进入 Pi、输出如何呈现，以及进程是否继续运行以接收更多命令。

SDK 不是 CLI 模式。它会将 agent 直接嵌入 Node.js 或 Bun 进程。若直接使用 TypeScript API 优于进程边界，请参阅 [SDK](sdk.md)。

## 选择模式

| 模式 | 接口 | 生命周期 | 适用场景 |
|---|---|---|---|
| 交互模式 | 终端 UI | 直到用户退出 | 用户直接使用 Pi 工作 |
| 打印模式 | stdout 上的最终文本 | 单次调用 | 脚本需要最终 assistant 响应 |
| JSON 模式 | stdout 上的 JSONL 事件 | 单次调用 | 进程需要运行过程的结构化进度 |
| RPC | JSONL 命令、响应和事件 | 长期运行 | 进程需要双向控制 |

CLI 选项仍可独立于模式选择工作目录、模型、工具、资源和会话持久化设置。完整启动选项见[命令行](cli.md)。

## 将结果打印到 stdout

打印模式运行给定提示，将最终 assistant 文本写到 stdout，然后退出：

```bash
pi --print "Summarize the changes in this repository"
```

如果只需要最终文本（包括命令替换、管道和一次性任务），请使用打印模式。它不会公开中间事件。

打印模式将错误写入 stderr。最终 assistant 响应的停止原因若为 `error` 或 `aborted`，退出状态将为非零。如果响应因模型输出 token 上限而截断（停止原因 `length`），部分文本仍会打印到 stdout，同时向 stderr 写入警告，并以非零状态退出。

如果没有显式选择模式，非 TTY 的 stdin 或 stdout 也会选择打印模式。因此传递管道输入或输出时无需添加 `--print`。

## 流式传输 JSON 事件

JSON 模式先写入会话头，然后以换行分隔的 JSON 形式输出 agent 和会话事件：

```bash
pi --mode json "Review this repository" > events.jsonl
```

这是结构化事件输出，不是单个 JSON 结果，也不限制模型响应的格式。

所有提示都必须在进程启动时提供。进程会为该次运行流式传输事件，然后退出；它不接受后续命令。

assistant 响应失败或被中止时会显示在事件流中，但这本身不会导致非零退出状态。只有调用抛出错误时，Pi 才仍会以非零状态退出。

流式的 `message_update` 记录包含增量，而非不断增长的消息快照。使用增量事件组装实时输出，随后用 `message_end` 中的权威消息替换。

`agent_end` 之后仍可能发生自动恢复或排队工作。`agent_settled` 表示当前运行的自动工作已结束。

stdout 专用于 JSONL。诊断信息和应用日志写入 stderr。有关分帧、事件形状和重建规则，请参阅 [JSON 事件流](json.md)。

## 使用 RPC 控制 Pi

RPC 模式会让 Pi 持续运行，由另一个进程发送命令并接收响应和事件：

```bash
pi --mode rpc --no-session
```

命令以 JSON 对象形式写入 stdin。响应和事件以 JSON 对象形式写入 stdout。每条记录占一行。

需要关联请求的命令应添加 `id`。匹配的响应会重复该 ID。事件通常没有命令 ID，因为它们描述会话活动，而非单个请求。

成功的 `prompt` 响应表示提示已被接受、排队或处理，并不表示运行已完成。如果需要确认完成，应继续读取事件直到 `agent_settled`。

RPC 命令可以更改模型、检查状态、管理会话、运行 shell 命令并响应扩展 UI 请求。

扩展对话框使用请求-响应子协议。其他扩展 UI 更新属于通知，客户端可以显示，也可以忽略。交互模式以外的 TUI 专属扩展能力不可用或功能受限。

对于 Node.js 或 TypeScript 集成，优先使用 `@earendil-works/pi-coding-agent` 中的 `RpcClient`。它会启动 Pi RPC 子进程、关联请求、提供带类型的命令方法，并将会话事件传递给监听器。

[RPC 客户端示例](vscode://file//Users/xuzh/git/pi/packages/coding-agent/examples/rpc-client.ts:1:1)会发送一条提示、流式传输文本和工具活动、等待 `agent_settled`，然后关闭子进程。该示例包含在仓库的 TypeScript 检查中。

`RpcClient.promptAndWait()` 会在发送提示前安装事件监听器，避免运行过快而产生竞态。若分开执行操作，应先订阅再调用 `prompt()`；只有运行处于活动状态时才调用 `waitForIdle()`。

客户端需要一个可运行的 Pi CLI 路径。仓库示例指向 `dist/cli.js`，因此在检出代码库中运行示例前必须先构建包。

如果不使用 `RpcClient` 自行构建客户端，请先阅读 [RPC 协议](rpc.md)，然后使用 [RPC 命令](rpc-commands.md)和 [JSON 事件流](json.md)作为线协议参考。

## Fork 并重新命名 Pi

源码 fork 可以通过 `package.json` 更改 CLI 名称和配置目录：

```json
{
  "piConfig": {
    "name": "my-agent",
    "configDir": ".my-agent"
  }
}
```

更改顶层 `bin` 字段即可设置可执行文件名称。这些设置会影响 CLI 横幅、配置路径和派生的环境变量名称。

## 示例和参考

- [RPC 客户端](vscode://file//Users/xuzh/git/pi/packages/coding-agent/examples/rpc-client.ts:1:1)：带类型的 Node.js 集成
- [RPC 扩展 UI](vscode://file//Users/xuzh/git/pi/packages/coding-agent/examples/rpc-extension-ui.ts:1:1)：支持扩展对话框的自定义终端客户端
- [命令行](cli.md)：启动选项和模式选择
- [JSON 事件流](json.md)：JSON 事件参考
- [RPC 协议](rpc.md)：RPC 生命周期、分帧、错误和关闭
- [RPC 命令](rpc-commands.md)：命令及响应参考
- [RPC 扩展 UI](rpc-extension-ui.md)：扩展交互子协议
- [SDK 示例](../../examples/sdk/)：进程内 TypeScript 集成
