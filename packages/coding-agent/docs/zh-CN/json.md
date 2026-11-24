> 本文为简体中文译本；[查看英文原文](../json.md)。

# JSON 事件流

JSON 模式会为单次调用输出结构化进度：

```bash
pi --mode json "Review this repository"
```

Pi 会先写入一个会话头，随后写入会话事件；提供的提示处理完毕后进程退出。RPC 模式会输出相同结构的会话事件，但由于它是双向、长时间运行的协议，因此没有会话头。参见 [RPC 模式](rpc.md)。

本文是 JSON 和 RPC 模式共用事件的权威参考。消息值采用[共享消息类型](message-types.md)。

## 分帧与进程 I/O

该流使用严格的 JSONL 分帧。每条记录是一个以 LF（`\n`）结束的 JSON 对象。仅按 LF 切分记录，并去掉可选的前置回车符。Unicode 行分隔符和段落分隔符可出现在 JSON 字符串中，不是记录边界。

Node.js `readline` 不适合此流，因为它也会识别这些 Unicode 分隔符。请使用字节或 UTF-8 流解码器，并按 LF 切分。

持续读取 stdout。如果读取方停止消费记录，管道缓冲区填满时 Pi 可能会阻塞。stdout 专用于 JSONL；诊断信息和应用日志写入 stderr。

## 会话头

JSON 模式的第一条记录是当前[会话头](session-format.md#sessionheader)：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path"}
```

RPC 模式不会输出此记录。请使用 [`get_state`](rpc-commands.md#get_state) 获取当前会话 ID 和文件。

## 事件顺序

一次基本运行会生成如下记录：

```json
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{"role":"user","content":"Review this repository","timestamp":1733234401000}}
{"type":"message_end","message":{"role":"user","content":"Review this repository","timestamp":1733234401000}}
{"type":"message_start","message":{"role":"assistant","content":[],"stopReason":"pending","...":"..."}}
{"type":"message_update","usage":{"...":"..."},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello"}}
{"type":"message_end","message":{"role":"assistant","...":"..."}}
{"type":"turn_end","message":{"role":"assistant","...":"..."},"toolResults":[]}
{"type":"agent_end","messages":[{"...":"..."}],"willRetry":false}
{"type":"agent_settled","aborted":false}
```

`agent_end` 表示一轮底层 Agent 运行结束。自动重试、上下文溢出恢复、压缩重试、引导消息或后续工作仍可能继续。`agent_settled` 表示 Pi 在这次会话级运行中已没有待处理的自动工作。

## Agent 和轮次事件

| 事件 | 字段 | 含义 |
|---|---|---|
| `agent_start` | 无 | 一轮底层 Agent 运行已开始。 |
| `agent_end` | `messages`、`willRetry` | 这轮底层运行已结束。`messages` 包含本轮生成的消息。 |
| `agent_settled` | `aborted` | Pi 不会通过重试、压缩恢复或排队消息自动继续。若运行因中止而结束，则 `aborted` 为 `true`。 |
| `turn_start` | 无 | 一轮 assistant 轮次已开始。 |
| `turn_end` | `message`、`toolResults` | 一条 assistant 回复及其产生的工具调用已完成。 |

一轮包含一条 assistant 回复，以及该回复产生的所有工具调用和工具结果。

## 消息事件

| 事件 | 字段 | 含义 |
|---|---|---|
| `message_start` | `message` | 一条消息已开始。 |
| `message_update` | `usage`、`assistantMessageEvent` | assistant 消息发出了一次内容块更新。 |
| `message_end` | `message` | 一条消息已完成。这是权威的最终消息。 |

### 重建流式消息

在线路上传输的 `message_update` 记录仅包含增量。它们不包含 SDK 事件中的累计 `message` 字段，也不包含任何 `assistantMessageEvent.partial` 快照，从而使流大小保持线性增长。

嵌套事件类型如下：

| 类型 | 除 `type` 外的字段 | 含义 |
|---|---|---|
| `start` | 无 | provider 流已开始；累计的 `partial` 字段不会在线路上传输。 |
| `text_start` | `contentIndex` | 文本块已开始。 |
| `text_delta` | `contentIndex`、`delta` | 将文本追加到此块。 |
| `text_end` | `contentIndex`、`content` | 文本块已结束，字段中包含权威内容。 |
| `thinking_start` | `contentIndex` | 思考块已开始。 |
| `thinking_delta` | `contentIndex`、`delta` | 将思考文本追加到此块。 |
| `thinking_end` | `contentIndex`、`content` | 思考块已结束，字段中包含权威内容。 |
| `toolcall_start` | `contentIndex`、`id`、`toolName` | 工具调用块已开始。 |
| `toolcall_delta` | `contentIndex`、`delta` | 将序列化的参数数据追加到此块。 |
| `toolcall_end` | `contentIndex`、`toolCall` | 工具调用已结束，字段中包含完整的 `ToolCall`。 |
| `done` | `reason`、`message` | provider 流成功完成。 |
| `error` | `reason`、`error` | provider 流以错误或中止消息结束。 |

常规 Agent 循环会将 provider 层的 `start`、`done` 和 `error` 转换成 `message_start` 和 `message_end` 会话事件，而不是作为 `message_update` 发出。若调用方构造了相应会话事件，导出的 `JsonAgentSessionEvent` 转换类型仍允许这些事件。

使用 `contentIndex` 确定内容块。实时显示时可以缓冲 `delta` 字段；但在收到 `text_end`、`thinking_end` 或 `toolcall_end` 后，应以其中的完整内容替换重建结果。收到 `message_end.message` 后，应以它替换整条部分消息。

顶层 `usage` 是 provider 对该 assistant 回复报告的最新累计用量。若 provider 在流式传输时不报告用量，该值在完成前可能一直为零。

```json
{"type":"message_update","usage":{"input":100,"output":1,"cacheRead":0,"cacheWrite":0,"totalTokens":101,"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0,"total":0}},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello "}}
```

## 工具执行事件

| 事件 | 字段 | 含义 |
|---|---|---|
| `tool_execution_start` | `toolCallId`、`toolName`、`args` | 工具执行已开始。 |
| `tool_execution_update` | `toolCallId`、`toolName`、`args`、`partialResult` | 工具报告了部分结果。 |
| `tool_execution_end` | `toolCallId`、`toolName`、`result`、`isError`、`durationMs` | 工具执行已结束。`durationMs` 是用单调时钟测量的工具 `execute()` 耗时；工具未运行时省略此字段。 |

使用 `toolCallId` 关联整个生命周期。`partialResult` 是工具提供的最新部分结果。它会替换还是扩展之前的更新，取决于该工具结果的约定。

```json
{"type":"tool_execution_start","toolCallId":"call_abc123","toolName":"bash","args":{"command":"ls -la"}}
{"type":"tool_execution_update","toolCallId":"call_abc123","toolName":"bash","args":{"command":"ls -la"},"partialResult":{"content":[{"type":"text","text":"partial output"}],"details":{}}}
{"type":"tool_execution_end","toolCallId":"call_abc123","toolName":"bash","result":{"content":[{"type":"text","text":"complete output"}],"details":{}},"isError":false}
```

## 队列与状态事件

| 事件 | 字段 | 含义 |
|---|---|---|
| `queue_update` | `steering`、`followUp` | 待处理的引导消息队列或后续消息队列已更改。两个字段都包含当前完整队列。 |
| `entry_appended` | `entry` | 扩展通过 `pi.appendEntry()` 向会话添加了自定义条目。 |
| `session_info_changed` | `name` | 会话显示名称已更改。若未提供 `name`，表示已清除名称。 |
| `thinking_level_changed` | `level` | 当前思考级别已更改。 |

`entry` 值采用持久化的[会话条目类型](session-format.md#entry-types)。

## 压缩事件

`compaction_start` 会报告开始压缩的原因：

```json
{"type":"compaction_start","reason":"threshold"}
```

`reason` 取值为 `"manual"`、`"threshold"` 或 `"overflow"`。

压缩成功时，`compaction_end` 会包含结果：

```json
{
  "type": "compaction_end",
  "reason": "threshold",
  "result": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {"...": "..."},
    "details": {}
  },
  "aborted": false,
  "willRetry": false
}
```

若压缩被中止，则省略 `result`，并将 `aborted` 设为 `true`。若压缩失败，则省略 `result`，将 `aborted` 设为 `false`，并通过 `errorMessage` 描述失败原因。上下文溢出恢复成功后，Pi 重试提示前会将 `willRetry` 设为 `true`。

结果语义见[压缩与分支摘要](compaction.md)。

## 重试事件

assistant 轮次重试时会发出：

```json
{"type":"auto_retry_start","attempt":1,"maxAttempts":3,"delayMs":2000,"errorMessage":"529 overloaded"}
{"type":"auto_retry_end","success":true,"attempt":2}
```

最终失败时，`auto_retry_end` 的 `success` 为 `false`，并包含 `finalError` 字符串。

压缩和分支摘要重试时会发出：

```json
{"type":"summarization_retry_scheduled","attempt":1,"maxAttempts":3,"delayMs":2000,"errorMessage":"terminated"}
{"type":"summarization_retry_attempt_start","source":"compaction","reason":"threshold"}
{"type":"summarization_retry_finished"}
```

分支摘要的 `source` 为 `"branchSummary"`，且省略 `reason`。压缩重试的 `reason` 为 `"manual"`、`"threshold"` 或 `"overflow"`。

## 仅 RPC 事件

直接执行 RPC [`bash`](rpc-commands.md#bash) 命令时，每个输出块都会发出一条 `bash_execution_update`。可选的 `id` 与命令 ID 匹配。最终命令响应可能包含截断输出，但这些事件会流式传输全部输出：

```json
{"type":"bash_execution_update","id":"req-1","delta":"total 48\n"}
```

扩展处理器抛出异常时，RPC 还会发出 `extension_error`：

```json
{"type":"extension_error","extensionPath":"/path/to/extension.ts","event":"tool_call","error":"Error message"}
```

扩展 UI 记录属于独立的 RPC 子协议，不是 `AgentSessionEvent` 值。参见 [RPC 扩展 UI](rpc-extension-ui.md)。

## TypeScript 类型

SDK 的 `AgentSessionEvent` 会为进程内调用方提供累计流式快照。JSON 和 RPC 只会转换 `message_update`：

```typescript
type WithoutPartial<T> = T extends { partial: unknown } ? Omit<T, "partial"> : T;

type JsonAssistantMessageEvent<T> = T extends { type: "toolcall_start"; partial: unknown }
  ? WithoutPartial<T> & { id: string; toolName: string }
  : WithoutPartial<T>;

type JsonAgentSessionEvent =
  | Exclude<AgentSessionEvent, { type: "message_update" }>
  | {
      type: "message_update";
      usage: Usage;
      assistantMessageEvent: JsonAssistantMessageEvent<AssistantMessageEvent>;
    };
```

从 `@earendil-works/pi-coding-agent` 导入导出的 `JsonAgentSessionEvent` 类型。实现位于 [`json-event.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/modes/json-event.ts:1:1)。

## 示例

在单次运行中打印已完成的消息：

```bash
pi --mode json "List files" 2>/dev/null | jq -c 'select(.type == "message_end")'
```
