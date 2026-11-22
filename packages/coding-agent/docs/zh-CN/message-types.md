> 本文为简体中文译本；[查看英文原文](../message-types.md)。

# 消息类型

Pi 在 SDK 状态、生命周期事件、RPC 响应和持久化会话消息条目中使用 `AgentMessage` 值。本文定义这些共享消息及其内容块。

消息时间戳为 Unix 毫秒时间戳，与[会话条目](session-format.md#entry-base)上的 ISO 8601 时间戳不同。

源定义：

- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts) 定义面向 provider 的消息和内容块。
- [`packages/agent/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts) 定义可扩展的 `AgentMessage` 联合类型。
- [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/messages.ts) 添加 coding-agent 消息角色。

## 内容块

### TextContent

```typescript
interface TextContent {
  type: "text";
  text: string;
  textSignature?: string;
}
```

`textSignature` 包含 provider 专属消息元数据，应将其视为不透明值。

### ImageContent

```typescript
interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}
```

`data` 是 base64 编码的图像数据。`mimeType` 标识媒体类型，例如 `image/png` 或 `image/jpeg`。

### ThinkingContent

```typescript
interface ThinkingContent {
  type: "thinking";
  thinking: string;
  thinkingSignature?: string;
  redacted?: boolean;
}
```

思考签名包含 provider 专属的重放数据，应视为不透明值。经过删隐的块可以没有可见思考文本，但仍在 `thinkingSignature` 中保留加密载荷。

### ToolCall

```typescript
interface ToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, any>;
  thoughtSignature?: string;
  namespace?: string;
}
```

`thoughtSignature` 是 provider 专属字段。`namespace` 标识动态加载或带命名空间工具所用的 OpenAI Responses 命名空间。

## 用量

assistant 消息始终包含用量信息。如果工具执行了嵌套模型工作，其结果也可以包含用量信息。

```typescript
interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cacheWrite1h?: number;
  reasoning?: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}
```

如果存在 `reasoning`，它已经计入 `output`，不要重复相加。`cacheWrite1h` 是以一小时保留期写入的 `cacheWrite` 子集。

## 基础消息

### SystemMessage

```typescript
interface SystemMessage {
  role: "system";
  content: string | TextContent[];
  sections?: Record<string, string | null>;
  toolsAdded?: Tool[];
  toolsRemoved?: ToolReference[];
  timestamp: number;
}
```

开头的系统消息声明初始提示和工具。后续系统消息可以追加指令、替换或删除命名提示片段，以及添加或删除工具。按顺序重放这些消息即可得到当前状态。

### UserMessage

```typescript
interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;
}
```

### AssistantMessage

```typescript
interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  responseModel?: string;
  responseId?: string;
  providerThinkingLevel?: string;
  thinkingLevel?: ModelThinkingLevel;
  diagnostics?: AssistantMessageDiagnostic[];
  usage: Usage;
  stopReason: "pending" | "stop" | "length" | "toolUse" | "error" | "aborted" | "deferred";
  deferred?: DeferredHandle;
  errorMessage?: string;
  rawStopReason?: string;
  endTurn?: boolean;
  timestamp: number;
}
```

当 provider 报告具体模型时，`responseModel` 会记录该模型，且它可能与请求的模型相同。`responseId`、`providerThinkingLevel`、`thinkingLevel`、`diagnostics` 和 `rawStopReason` 会保留 provider 或运行时的详细信息。

流式传输部分 assistant 消息时使用 `"pending"`。`message_end` 中的完成消息具有终止停止原因；Pi 不会在会话 JSONL 中持久化停止原因仍为 `"pending"` 的 assistant 消息。

`"deferred"` 响应带有一个 `DeferredHandle`，其中包含获取响应所需的 provider 数据：

```typescript
interface DeferredHandle {
  provider: string;
  modelId: string;
  api: string;
  id: string;
  expiresAt?: number;
  pollAfterMs?: number;
  data?: JsonValue;
}
```

### ToolResultMessage

```typescript
interface ToolResultMessage<TDetails = any> {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  details?: TDetails;
  usage?: Usage;
  nestedCalls?: NestedToolCalls;
  isError: boolean;
  timestamp: number;
}
```

`details` 是工具专属数据。可选字段 `usage` 报告工具执行的嵌套模型工作，并计入整个会话的统计数据，但不属于主要模型调用的用量。`nestedCalls` 会记录此工具对其他工具进行调用的有限元数据：

```typescript
interface NestedToolCalls {
  calls: NestedToolCallRecord[];
  complete: boolean;
}

interface NestedToolCallRecord {
  id: string;
  name: string;
  arguments?: JsonObject;
  argumentsBytes?: number;
  status: "ok" | "error" | "unfinished";
  durationMs?: number;
  error?: string;
}
```

## Coding-agent 消息

coding-agent 包为 `AgentMessage` 扩展了四种角色。

### BashExecutionMessage

由直接 shell 命令创建，包括 RPC [`bash`](rpc-commands.md#bash) 命令。它不是 LLM 工具结果。

```typescript
interface BashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean;
  timestamp: number;
}
```

除非 `excludeFromContext` 为 `true`，否则 Pi 会在下一次模型请求前将此消息转换为 user 角色文本。

### CustomMessage

扩展发送上下文消息时创建。

```typescript
interface CustomMessage<T = unknown> {
  role: "custom";
  customType: string;
  content: string | (TextContent | ImageContent)[];
  display: boolean;
  details?: T;
  timestamp: number;
}
```

Pi 会在模型请求中将其内容转换为 user 消息。`display` 控制终端渲染；`details` 不会发送给模型。

### BranchSummaryMessage

```typescript
interface BranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string | null;
  timestamp: number;
}
```

Pi 会根据持久化的 `branch_summary` 条目创建此上下文消息。

### CompactionSummaryMessage

```typescript
interface CompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp: number;
}
```

Pi 会根据持久化的 `compaction` 条目创建此上下文消息。

## AgentMessage 联合类型

在 coding agent 中，该联合类型等价于：

```typescript
type AgentMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | BashExecutionMessage
  | CustomMessage
  | BranchSummaryMessage
  | CompactionSummaryMessage;
```

在更底层的 agent 包中，`AgentMessage` 定义为 `Message | CustomAgentMessages[keyof CustomAgentMessages]`。应用可以通过 TypeScript 声明合并增加角色，因此处理来自扩展宿主的消息时，消费者应能容忍未知的自定义角色。
