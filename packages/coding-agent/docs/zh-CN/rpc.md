> 本文是简体中文译本，英文原文见[这里](../rpc.md)。

# RPC 模式

RPC 模式将 Pi 作为长期运行的子进程，通过 stdin 和 stdout 上的 JSON 记录进行控制。它适用于与语言无关的集成、进程隔离、IDE 和自定义用户界面。

对于进程内的 Node.js 或 Bun 集成，优先使用 [SDK](sdk.md)。对于基于子进程的 TypeScript 集成，优先使用导出的 `RpcClient`：它会启动 Pi、关联响应、提供带类型的命令方法，并将事件传递给监听器。

| 接口 | 进程边界 | 控制方式 | 最适用场景 |
|---|---|---|---|
| [SDK](sdk.md) | 进程内 | 直接调用 TypeScript 方法并接收事件 | 希望完整访问 API 的 Node.js 或 Bun 宿主 |
| RPC | 子进程 | JSONL 命令、响应和事件 | 其他语言、隔离进程、IDE 或自定义客户端 |

## 启动 RPC 模式

```bash
pi --mode rpc --no-session
```

常规 CLI 选项仍然可以选择工作目录、模型、工具、资源和会话行为。常用选项包括 `--provider`、`--model`、`--name`、`--no-session` 和 `--session-dir`。完整且与版本对应的接口见[命令行](cli.md)；已安装版本的准确接口以 `pi --help` 为准。

RPC 模式不接受 `@file` 提示参数。请改用 [`prompt`](rpc-commands.md#prompt) 命令发送提示。

## 协议记录

协议包含四类记录：

| 方向 | 记录 | 用途 |
|---|---|---|
| stdin | 命令 | 请求 Pi 发送提示、检查状态、更改配置或管理会话 |
| stdout | `response` | 报告一条命令是否成功并返回命令数据 |
| stdout | 会话事件 | 流式传输运行、消息、工具、队列、压缩和重试活动 |
| 双向 | 扩展 UI 记录 | 在 Pi 与客户端之间转发受支持的扩展交互 |

规范记录定义见 [RPC 命令](rpc-commands.md)、[JSON 事件流](json.md)和 [RPC 扩展 UI](rpc-extension-ui.md)。

### 关联命令与响应

每条命令都可带可选的字符串 `id`。匹配的响应会重复该值：

```json
{"id":"req-1","type":"get_state"}
{"id":"req-1","type":"response","command":"get_state","success":true,"data":{"...":"..."}}
```

只要可能同时有多条未完成命令，就应使用唯一 ID。命令处理是异步的，因此客户端应按 ID 关联，而不要依赖响应顺序。

会话事件通常没有命令 ID，因为它们描述的是会话活动。例外是 `bash_execution_update`：如果发起该事件的 [`bash`](rpc-commands.md#bash) 命令带有 ID，其输出事件也会重复该 ID。

`extension_ui_response` 使用其 `extension_ui_request` 提供的 ID。它不会产生常规命令响应。

## 分帧

RPC 使用严格的 JSONL 分帧。每条记录写成一个完整 JSON 对象，并以 LF（`\n`）结束。将 stdout 作为字节流或 UTF-8 流读取，并且只按 LF 拆分记录。为兼容 CRLF 输入，可去掉 LF 前可选的回车符。

不要使用会将 Unicode 行分隔符或段落分隔符视作记录边界的通用行读取器。尤其是 Node.js `readline` 也会按 `U+2028` 和 `U+2029` 拆分，而它们在 JSON 字符串中是有效字符。

持续读取 stdout。Pi 会遵循 stdout 背压，但停止读取的客户端可能让进程停滞。写命令时也要遵循 stdin 背压。stdout 专用于协议记录；诊断信息和应用日志写入 stderr。

## 运行生命周期

成功的 `prompt` 响应表示提示已被接受、排队或处理，并不表示模型工作已经完成：

```json
{"id":"req-2","type":"prompt","message":"Review this repository"}
{"id":"req-2","type":"response","command":"prompt","success":true,"data":{"disposition":"started"}}
```

`data.disposition` 报告提示的处理情况。如果值为 `"handled"`，则扩展命令或输入处理器已消费该提示，没有为此提示启动运行，因此不要等待 `agent_settled`。所有取值见 [RPC 命令](rpc-commands.md#prompt)。

收到该响应后仍需继续读取[事件](json.md)。`agent_end` 表示一次底层 agent 运行结束，但之后仍可能有重试、溢出恢复、压缩、引导消息或后续消息。若客户端需要确认 Pi 不会自动继续，应等待 `agent_settled`。

在发送提示前先订阅事件，以免错过快速完成的运行。`RpcClient.promptAndWait()` 会在内部处理此事。如果分别调用 `RpcClient` 方法，应先安装事件监听器，再调用 `prompt()`；只有运行处于活动状态时才调用 `waitForIdle()`。

## 错误

命令失败时会返回一条 `success: false` 的响应：

```json
{"id":"req-3","type":"response","command":"set_model","success":false,"error":"Model not found: invalid/model"}
```

JSON 格式错误时，会返回不带请求 ID 的解析响应：

```json
{"type":"response","command":"parse","success":false,"error":"Failed to parse command: Unexpected token..."}
```

成功响应仅表示命令处理成功。提示被接受后发生的 provider 故障和中止会出现在消息流和事件流中。

客户端还必须处理子进程启动失败、意外退出、stderr 诊断信息、取消和自身的截止时间。不要把 stderr 解析为协议数据。

## 关闭

关闭子进程的 stdin 可请求有序关闭。Pi 会释放活动运行时并等待待处理工作结束后再退出，因此应先留出时间等待其退出，再强制终止。客户端仍应处理进程信号和意外退出。

SIGTERM 和 SIGHUP 也会启动有序关闭。无论关闭是由 stdin EOF 还是信号启动，启动后一次 stdin EOF 或一个信号都不会中断关闭；第二个信号会立即退出。关闭 stdin 并同时发送 SIGTERM 是安全的。

扩展也可以通过 `ctx.shutdown()` 请求关闭。如果会话空闲且没有正在处理的命令，Pi 会立即关闭；否则，会在当前命令完成（对于 `prompt`，是在提示处理结束）或活动运行发出 `agent_settled` 后关闭。（如果请求时扩展启动的压缩仍在运行，则会等到下一条命令或运行结束。）

## 最小客户端

此 Python 示例使用二进制管道读取器，只按 LF 拆分，不会把 Unicode 分隔符当作协议边界：

```python
import json
import subprocess

process = subprocess.Popen(
    ["pi", "--mode", "rpc", "--no-session"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
)

assert process.stdin is not None
assert process.stdout is not None

command = {"id": "prompt-1", "type": "prompt", "message": "Hello"}
process.stdin.write(json.dumps(command).encode("utf-8") + b"\n")
process.stdin.flush()

while line := process.stdout.readline():
    record = json.loads(line)
    if record.get("type") == "message_update":
        update = record["assistantMessageEvent"]
        if update["type"] == "text_delta":
            print(update["delta"], end="", flush=True)
    elif record.get("type") == "agent_settled":
        print()
        break

process.stdin.close()
process.wait()
```

对于维护中的 TypeScript 客户端，请使用经过检查的 [RPC 客户端示例](vscode://file//Users/xuzh/git/pi/packages/coding-agent/examples/rpc-client.ts:1:1)。该示例指向 `dist/cli.js`，因此需要已构建的 Pi CLI。

## 参考

- [RPC 命令](rpc-commands.md)：所有 stdin 命令及其响应
- [JSON 事件流](json.md)：共享的 stdout 会话事件及流式重建
- [RPC 扩展 UI](rpc-extension-ui.md)：对话框、通知、响应和限制
- [消息类型](message-types.md)：响应和事件中使用的消息与内容块
- [会话文件格式](session-format.md)：会话命令返回的条目
- [`rpc-types.ts`](vscode://file//Users/xuzh/git/pi/packages/coding-agent/src/modes/rpc/rpc-types.ts:1:1)：导出的 TypeScript 协议定义
- [`RpcClient`](vscode://file//Users/xuzh/git/pi/packages/coding-agent/src/modes/rpc/rpc-client.ts:1:1)：子进程客户端实现

## 已迁移的参考锚点

此前位于此页的详细参考现在各有独立页面。以下锚点用于保留现有链接。

<a id="prompt"></a>
<a id="steer"></a>
<a id="follow_up"></a>
<a id="abort"></a>
<a id="clear_queue"></a>
<a id="new_session"></a>
<a id="get_state"></a>
<a id="get_messages"></a>
<a id="set_model"></a>
<a id="cycle_model"></a>
<a id="get_available_models"></a>
<a id="set_thinking_level"></a>
<a id="cycle_thinking_level"></a>
<a id="get_available_thinking_levels"></a>
<a id="set_steering_mode"></a>
<a id="set_follow_up_mode"></a>
<a id="compact"></a>
<a id="set_auto_compaction"></a>
<a id="set_auto_retry"></a>
<a id="abort_retry"></a>
<a id="bash"></a>
<a id="abort_bash"></a>
<a id="get_session_stats"></a>
<a id="export_html"></a>
<a id="switch_session"></a>
<a id="fork"></a>
<a id="clone"></a>
<a id="get_fork_messages"></a>
<a id="get_entries"></a>
<a id="get_tree"></a>
<a id="get_last_assistant_text"></a>
<a id="set_session_name"></a>
<a id="get_commands"></a>

命令详情已迁移至 [RPC 命令](rpc-commands.md)。

<a id="message_update-streaming"></a>
<a id="bash_execution_update"></a>
<a id="compaction_start--compaction_end"></a>
<a id="summarization_retry_scheduled--summarization_retry_attempt_start--summarization_retry_finished"></a>

事件详情已迁移至 [JSON 事件流](json.md)。

<a id="extension-ui-protocol"></a>

扩展交互详情已迁移至 [RPC 扩展 UI](rpc-extension-ui.md)。
