# @earendil-works/pi-agent-core

具备状态管理、工具执行和事件流的 agent。基于 `@earendil-works/pi-ai` 构建。

## 安装

```bash
npm install @earendil-works/pi-agent-core
```

## 快速开始

```typescript
import { Agent } from "@earendil-works/pi-agent-core";
import { createModels } from "@earendil-works/pi-ai";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";

const models = createModels();
models.setProvider(anthropicProvider());
const model = models.getModel("anthropic", "claude-sonnet-4-6");
if (!model) throw new Error("Model not found");

const agent = new Agent({
  initialState: {
    systemPrompt: "You are a helpful assistant.",
    model,
  },
  streamFn: models.streamSimple.bind(models),
});

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    // 仅输出新增的文本片段
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("Hello!");
```

## 核心概念

### AgentMessage 与 LLM Message

agent 使用 `AgentMessage`，这是一种灵活的类型，可以包含：
- 标准 LLM 消息（`user`、`assistant`、`toolResult`）
- 通过声明合并添加的自定义应用专用消息类型

LLM 只能理解 `user`、`assistant` 和 `toolResult`。`convertToLlm` 函数在每次调用 LLM 前对消息进行筛选和转换，以弥合这一差异。

### 消息流

```
AgentMessage[] → transformContext() → AgentMessage[] → convertToLlm() → Message[] → LLM
                    (可选)                              (必需)
```

1. **transformContext**：裁剪旧消息、注入外部上下文
2. **convertToLlm**：筛除仅供 UI 使用的消息，将自定义类型转换为 LLM 格式

## 事件流

agent 会发出事件以更新 UI。了解事件顺序有助于构建响应及时的界面。

### prompt() 事件顺序

调用 `prompt("Hello")` 时：

```
prompt("Hello")
├─ agent_start
├─ turn_start
├─ message_start   { message: userMessage }      // 用户的提示
├─ message_end     { message: userMessage }
├─ message_start   { message: assistantMessage } // LLM 开始响应
├─ message_update  { message: partial... }       // 流式传输的片段
├─ message_update  { message: partial... }
├─ message_end     { message: assistantMessage } // 完整响应
├─ turn_end        { message, toolResults: [] }
└─ agent_end       { messages: [...] }
```

### 包含工具调用时

如果 assistant 调用了工具，循环会继续：

```
prompt("Read config.json")
├─ agent_start
├─ turn_start
├─ message_start/end  { userMessage }
├─ message_start      { assistantMessage with toolCall }
├─ message_update...
├─ message_end        { assistantMessage }
├─ tool_execution_start  { toolCallId, toolName, args }
├─ tool_execution_update { partialResult }           // 如果工具以流式方式返回结果
├─ tool_execution_end    { toolCallId, result }
├─ message_start/end  { toolResultMessage }
├─ turn_end           { message, toolResults: [toolResult] }
│
├─ turn_start                                        // 下一轮
├─ message_start      { assistantMessage }           // LLM 对工具结果作出响应
├─ message_update...
├─ message_end
├─ turn_end
└─ agent_end
```

工具执行模式可配置：

- `parallel`（默认）：依次预检工具调用，并发执行获准的工具；每个工具完成最终处理后立即发出 `tool_execution_end`，随后按 assistant 消息中的原始顺序发出 toolResult 消息和 `turn_end.toolResults`
- `sequential`：逐个执行工具调用，与历史行为一致

在并行模式下，工具完成事件按工具完成顺序发出，但持久化的 toolResult 消息仍遵循 assistant 消息中的原始顺序。

可以通过 agent 配置中的 `toolExecution` 全局设置模式，也可以通过 `AgentTool` 上的 `executionMode` 为单个工具设置模式。如果一个批次中的任意工具调用目标工具设置了 `executionMode: "sequential"`，无论全局设置为何，整个批次都会按顺序执行。

`beforeToolCall` hook 会在 `tool_execution_start` 之后以及参数解析并通过验证之后运行。它可以阻止执行，并在被阻止的结果中附加 `terminate: true`。`afterToolCall` hook 会在工具执行结束后运行，并在发出 `tool_execution_end` 和最终工具结果消息事件之前运行。

工具、被阻止的 `beforeToolCall` 结果以及 `afterToolCall` 覆盖结果都可以返回 `terminate: true`，提示跳过自动的后续 LLM 调用。只有当该批次中所有已完成最终处理的工具结果都设置了 `terminate: true` 时，循环才会提前停止。混合批次会正常继续。

使用 `Agent` 类时，assistant `message_end` 处理会作为一道屏障，确保它完成后才开始工具预检。因此，`beforeToolCall` 看到的 agent 状态已包含发起该工具调用的 assistant 消息。

### 请求准备与轮次收尾

`prepareRequest` 会在每次对话式 provider 请求之前立即运行，包括第一次请求。可使用它在待处理输入发出后安装规范的持久化上下文：

```typescript
agent.prepareRequest = async ({ context }) => ({
  context: { ...context, messages: await session.loadModelContext() },
});
```

`prepareRequest` 不会轮询队列。它运行期间加入队列的 steering 消息会等到下一次常规 steering 轮询时再处理。

`finishTurn` 会在 assistant 和所有工具结果完成最终处理后、`turn_end` 发出前运行。对于正常、错误和中止的响应，它都会运行：

```typescript
agent.finishTurn = async ({ message }) => {
  if (message.stopReason === "error" || message.stopReason === "aborted") return;
  if (shouldEndRun(message)) return { action: "end" };
  return needsAnotherResponse(message) ? { action: "continue" } : undefined;
};
```

返回 `undefined` 会保留正常调度。`{ action: "end" }` 会在 `turn_end` 后立即停止；此时尚未轮询 steering 或 follow-up 队列，也不会准备下一次请求。对于正常响应，`{ action: "continue" }` 会确保发起下一次 provider 请求。如果工具结果、steering 或 follow-up 已经会触发该请求，它们就满足了这个决定，不会再额外发起请求；否则循环会发起一次仅使用上下文的请求。错误和中止响应仍会直接退出，因此忽略它们对应的决定。下一次请求之后会再次运行 `finishTurn`，所以无条件返回 `{ action: "continue" }` 会造成无限循环。

要从已移除的 `shouldStopAfterTurn` 迁移过来，请返回 `{ action: "end" }`。应对错误和中止响应作出保护，以保留旧 hook 仅在正常响应时调用的行为，特别是在谓词有副作用或假定响应成功时：

```typescript
finishTurn: async (turn, signal) => {
  if (turn.message.stopReason === "error" || turn.message.stopReason === "aborted") return;
  return (await shouldStop(turn, signal)) ? { action: "end" } : undefined;
},
```

每个 provider 轮次都遵循以下生命周期：

```text
已选输入事件
→ prepareRequest
→ provider 响应
→ 工具结果
→ finishTurn
→ turn_end
→ 现有的继续调度或 agent_end
```

### continue() 与排队输入

`continue()` 保留现有的队列行为。空记录和仅包含 system 消息的记录会被拒绝，且不会消耗队列。如果末尾消息不是 assistant 消息，则从现有上下文继续：启动时会轮询 steering，而 follow-up 输入会等到响应自然停止后再处理。

```typescript
agent.followUp({ role: "user", content: "After the retry", timestamp: Date.now() });
await agent.continue(); // 第一次请求会从现有的 user/toolResult 末尾消息继续。
```

不能直接发送末尾的 assistant 消息，因此 `continue()` 会依次回退到一批排队的 steering 消息，再回退到一批排队的 follow-up 消息。队列模式仍决定所选批次包含一条消息还是所有消息：

```typescript
agent.steer({ role: "user", content: "Continue from here", timestamp: Date.now() });
await agent.continue(); // 因末尾消息是 assistant，这里只使用排队的消息。
```

### 事件类型

| 事件 | 说明 |
|-------|-------------|
| `agent_start` | agent 开始处理 |
| `agent_end` | 本次运行的最后一个事件。此事件的订阅者完成执行后，运行才算结束 |
| `turn_start` | 新一轮开始（一次 LLM 调用及工具执行） |
| `turn_end` | 本轮结束，包含 assistant 消息和工具结果 |
| `message_start` | 任意消息开始（user、assistant、toolResult） |
| `message_update` | **仅限 Assistant。** 包含带有增量内容的 `assistantMessageEvent` |
| `message_end` | 消息完成 |
| `tool_execution_start` | 工具开始执行 |
| `tool_execution_update` | 工具流式报告进度 |
| `tool_execution_end` | 工具执行完成 |

`Agent.subscribe()` 监听器会按注册顺序等待执行。`agent_end` 表示不再发出循环事件，但只有在等待中的 `agent_end` 监听器完成后，`await agent.waitForIdle()` 和 `await agent.prompt(...)` 才会结束等待。

## Agent 选项

```typescript
const agent = new Agent({
  // 初始状态。除非 messages 已经以 system 消息开头，否则 systemPrompt 和 tools 会成为首条 system 消息
  initialState: {
    systemPrompt: string,
    model: Model<any>,
    thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max",
    tools: AgentTool<any>[],
    messages: AgentMessage[],
  },

  // 将 AgentMessage[] 转换为 LLM Message[]（自定义消息类型必需）
  convertToLlm: (messages) => messages.filter(...),

  // 在 convertToLlm 之前转换上下文（用于裁剪、压缩）
  transformContext: async (messages, signal) => pruneOldMessages(messages),

  // Steering 模式："one-at-a-time"（默认）或 "all"
  steeringMode: "one-at-a-time",

  // Follow-up 模式："one-at-a-time"（默认）或 "all"
  followUpMode: "one-at-a-time",

  // 必需的流函数。接收 TranscriptContext：提示词和工具位于 transcript 的 system 消息中，不在 context 上
  streamFn: models.streamSimple.bind(models),

  // Provider 缓存使用的 Session ID
  sessionId: "session-123",

  // 请求中用于向 provider 标识应用的信息（pi-ai ClientIdentity），合并到
  // DEFAULT_AGENT_IDENTITY（{ attribution: PI_ATTRIBUTION }：provider attribution 请求头会标明 pi）。
  // 传入应用自己的 attribution，或传入 null 表示不发送。
  identity: { attribution: { name: "my-app", url: "https://my-app.example" } },

  // 动态解析 API key（用于即将过期的 OAuth token）
  getApiKey: async (provider) => refreshToken(),

  // 工具执行模式："parallel"（默认）或 "sequential"
  toolExecution: "parallel",

  // 参数通过验证后，对每次工具调用进行预检。可以阻止执行。
  beforeToolCall: async ({ toolCall, args, context }) => {
    if (toolCall.name === "bash") {
      return { block: true, reason: "bash is disabled", terminate: true };
    }
  },

  // 在发出最终工具事件之前，对每个工具结果进行后处理。
  afterToolCall: async ({ toolCall, result, isError, context }) => {
    if (toolCall.name === "notify_done" && !isError) {
      return { terminate: true };
    }
    if (!isError) {
      return { details: { ...result.details, audited: true } };
    }
  },

  // 在每次 provider 请求之前，重建已完成最终处理的上下文。
  prepareRequest: async ({ context }, signal) => {
    return { context: { ...context, messages: await loadCanonicalMessages(signal) } };
  },

  // 在发出 turn_end 之前，完成本轮的收尾处理。
  // `continue` 会确保发起下一次请求；现有的工具或队列调度可以满足这一要求。
  // `end` 会在 turn_end 后结束本次运行，且不会轮询队列。
  finishTurn: async ({ message, toolResults }, signal) => {
    return shouldContinue(message, toolResults) ? { action: "continue" } : undefined;
  },

  // 为基于 token 的 provider 自定义 thinking token 限额
  thinkingBudgets: {
    minimal: 128,
    low: 512,
    medium: 1024,
    high: 2048,
  },
});
```

## Agent 状态

```typescript
interface AgentState {
  model: Model<any>;
  thinkingLevel: ThinkingLevel;
  tools: AgentTool<any>[];
  messages: AgentMessage[];
  readonly isStreaming: boolean;
  readonly streamingMessage?: AgentMessage;
  readonly pendingToolCalls: ReadonlySet<string>;
  readonly errorMessage?: string;
}
```

通过 `agent.state` 访问状态。

给 `agent.state.tools = [...]` 或 `agent.state.messages = [...]` 赋值时，会先复制顶层数组再存储。修改返回的数组会改变 agent 当前状态。

transcript 拥有 system prompt 和工具声明：首条 system 消息是提示词，后续 system 消息会对其进行补丁修改（参见 pi-ai 中的 `SystemMessage`）。`agent.state.systemPrompt` 是只读的，会根据 transcript 重放。`agent.state.tools` 是可执行的工具配置；每次请求之前，循环都会将它与 transcript 声明的工具进行差异比较，如果两者不一致，就会通过 system 消息告知这一变化（若已有待处理的 system 消息，则合并到其中）。pi-ai 的 `getCurrentSystemMessage(messages)` 会返回重放后的头部 system 消息（包括已声明的工具）；它适用于任意消息数组，包括带有自定义消息角色的 agent transcript。

要在对话中途更改提示词，请追加一条带有 `content`（添加指令）或 `sections`（按名称替换内容）的 system 消息：

```typescript
await agent.prompt([
  { role: "system", content: "", sections: { skills: "<skills>...</skills>" }, timestamp: Date.now() },
  { role: "user", content: "Continue", timestamp: Date.now() },
]);
```

流式传输期间，`agent.state.streamingMessage` 包含当前尚未完成的 assistant 消息。

在本次运行（包括等待中的 `agent_end` 订阅者）完全结束前，`agent.state.isStreaming` 始终为 `true`。

## 方法

### 提示

```typescript
// 文本提示
await agent.prompt("Hello");

// 包含图片
await agent.prompt("What's in this image?", [
  { type: "image", data: base64Data, mimeType: "image/jpeg" }
]);

// 直接传入 AgentMessage
await agent.prompt({ role: "user", content: "Hello", timestamp: Date.now() });

// 继续处理现有的非 assistant 输入；如果末尾是 assistant 消息，可以回退使用排队输入
await agent.continue();
```

### 状态管理

```typescript
agent.state.model = getModel("openai", "gpt-4o");
agent.state.thinkingLevel = "medium";
agent.state.tools = [myTool];
agent.toolExecution = "sequential";
agent.beforeToolCall = async ({ toolCall }) => undefined;
agent.afterToolCall = async ({ toolCall, result }) => undefined;
agent.prepareRequest = async ({ context }) => ({
  context: { ...context, messages: await loadCanonicalMessages() },
});
agent.finishTurn = async () => undefined;
agent.state.messages = newMessages; // 会复制顶层数组
agent.state.messages.push(message);
const nextQueuedMessages = agent.peekQueuedMessages(); // 遵循队列模式；不会消耗队列
agent.reset();
```

### Session 和 Thinking Budgets

```typescript
agent.sessionId = "session-123";

agent.thinkingBudgets = {
  minimal: 128,
  low: 512,
  medium: 1024,
  high: 2048,
};
```

### 控制

```typescript
agent.abort();           // 取消当前操作
await agent.waitForIdle(); // 等待操作完成
```

### 事件

```typescript
const unsubscribe = agent.subscribe(async (event, signal) => {
  if (event.type === "agent_end") {
    // 执行本次运行的最终屏障处理
    await flushSessionState(signal);
  }
});
unsubscribe();
```

## Steering 和 Follow-up

Steering 消息可以在工具运行期间中断 agent。Follow-up 消息可以在 agent 原本即将停止后排队等待执行。

```typescript
agent.steeringMode = "one-at-a-time";
agent.followUpMode = "one-at-a-time";

// agent 正在运行工具时
agent.steer({
  role: "user",
  content: "Stop! Do this instead.",
  timestamp: Date.now(),
});

// agent 完成当前工作后
agent.followUp({
  role: "user",
  content: "Also summarize the result.",
  timestamp: Date.now(),
});

const steeringMode = agent.steeringMode;
const followUpMode = agent.followUpMode;

agent.clearSteeringQueue();
agent.clearFollowUpQueue();
agent.clearAllQueues();
```

使用 clearSteeringQueue、clearFollowUpQueue 或 clearAllQueues 可丢弃排队的消息。

在一轮结束后检测到 steering 消息时：
1. 当前 assistant 消息中的所有工具调用都已完成
2. 注入 steering 消息
3. LLM 在下一轮作出响应

仅当没有更多工具调用且没有 steering 消息时，才会检查 follow-up 消息。如果队列中有消息，就会注入这些消息并运行下一轮。

## 自定义消息类型

通过声明合并扩展 `AgentMessage`：

```typescript
declare module "@earendil-works/pi-agent-core" {
  interface CustomAgentMessages {
    notification: { role: "notification"; text: string; timestamp: number };
  }
}

// 现在这是有效的
const msg: AgentMessage = { role: "notification", text: "Info", timestamp: Date.now() };
```

在 `convertToLlm` 中处理自定义类型：

```typescript
const agent = new Agent({
  streamFn: models.streamSimple.bind(models),
  convertToLlm: (messages) => messages.flatMap(m => {
    if (m.role === "notification") return []; // 筛除
    return [m];
  }),
});
```

## 工具

使用 `AgentTool` 定义工具。`parameters` 可以是任意 JSON Schema 对象；使用 `@earendil-works/pi-schema` 的构造器创建时，它也会为 `params` 提供类型（其他 schema 会得到 `unknown`，而 `AgentTool<any>` 会得到 `any`）：

```typescript
import { obj, str } from "@earendil-works/pi-schema";

const readFileParameters = obj({
  path: str({ description: "File path" }),
});

const readFileTool: AgentTool<typeof readFileParameters> = {
  name: "read_file",
  label: "Read File",  // 在 UI 中显示
  description: "Read a file's contents",
  parameters: readFileParameters,
  // 可选：覆盖此工具的执行模式。
  // "sequential" 会强制整个批次逐个执行。
  // "parallel" 允许与其他工具调用并发执行。
  // 如果省略，则采用全局 toolExecution 配置。
  executionMode: "sequential",
  execute: async (toolCallId, params, signal, onUpdate) => {
    const content = await fs.readFile(params.path, "utf-8");

    // 可选：流式报告进度
    onUpdate?.({ content: [{ type: "text", text: "Reading..." }], details: {} });

    // 可选：在此处添加 `terminate: true`，以跳过自动的后续 LLM 调用
    // 仅当该批次中每个已完成最终处理的工具结果都设置了同样的值时才会跳过。
    return {
      content: [{ type: "text", text: content }],
      details: { path: params.path, size: content.length },
    };
  },
};

agent.state.tools = [readFileTool];
```

### 错误处理

**工具失败时应抛出错误。不要将错误消息作为内容返回。**

```typescript
execute: async (toolCallId, params, signal, onUpdate) => {
  if (!fs.existsSync(params.path)) {
    throw new Error(`File not found: ${params.path}`);
  }
  // 仅在成功时返回内容
  return { content: [{ type: "text", text: "..." }] };
}
```

抛出的错误会被 agent 捕获，并作为 `isError: true` 的工具错误报告给 LLM。

从 `execute()`、被阻止的 `beforeToolCall` 或 `afterToolCall` 返回 `terminate: true`，可以提示 agent 在当前工具批次结束后停止。只有当该批次中所有已完成最终处理的工具结果都设置了终止标记时，这才会生效。此提示仅在运行时有效；发出的 `toolResult` transcript 消息仍是标准 LLM 工具结果。

### MCP 和 Codemode

`@earendil-works/pi-mcp` 可连接 MCP 服务器，`@earendil-works/pi-codemode` 可运行由模型编写、能够调用工具的 JavaScript。[examples/mcp-codemode](examples/mcp-codemode) 会将两者包装为 `AgentTool`：每个 MCP 工具对应一个工具，另有一个 `codemode` 工具，其脚本通过 `runToolCall()` 调用 agent 的工具，因此这些调用也会应用 `beforeToolCall` 和 `afterToolCall`。

## 代理用法

对于通过后端代理请求的浏览器应用：

```typescript
import { Agent, streamProxy } from "@earendil-works/pi-agent-core";

const agent = new Agent({
  streamFn: (model, context, options) =>
    streamProxy(model, context, {
      ...options,
      authToken: "...",
      proxyUrl: "https://your-server.com",
    }),
});
```

## 底层 API

如需在不使用 `Agent` 类的情况下直接控制：

```typescript
import { agentLoop, agentLoopContinue } from "@earendil-works/pi-agent-core";

const context: AgentContext = {
  messages: [{ role: "system", content: "You are helpful.", timestamp: Date.now() }],
  tools: [],
};

const config: AgentLoopConfig = {
  model: getModel("openai", "gpt-4o"),
  convertToLlm: (msgs) => msgs.filter(m => ["user", "assistant", "toolResult"].includes(m.role)),
  toolExecution: "parallel",  // 若设置了单个工具的 executionMode，则由其覆盖
  beforeToolCall: async ({ toolCall, args, context }) => undefined,
  afterToolCall: async ({ toolCall, result, isError, context }) => undefined,
};

const userMessage = { role: "user", content: "Hello", timestamp: Date.now() };

const streamFn = models.streamSimple.bind(models);
for await (const event of agentLoop([userMessage], context, config, undefined, streamFn)) {
  console.log(event.type);
}

// 从现有上下文继续
for await (const event of agentLoopContinue(context, config, undefined, streamFn)) {
  console.log(event.type);
}
```

这些底层流只用于观察。它们会保留事件顺序，但不会等到你的异步事件处理完成后才进入后续的生产阶段。如果需要在工具预检开始前将消息处理作为一道屏障，请使用 `Agent` 类，而不要直接使用 `agentLoop()` 或 `agentLoopContinue()`。

## 许可证

MIT
