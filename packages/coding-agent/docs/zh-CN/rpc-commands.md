> 本文为简体中文译本；[查看英文原文](../rpc-commands.md)。

# RPC 命令

本文列出通过 stdin 在 [RPC 模式](rpc.md)下接受的命令。每条命令和响应都是一个 JSON 对象。共享消息值见[消息类型](message-types.md)。

<a id="prompting"></a>
## 提示

### prompt

向 agent 发送用户提示。提示被接受、排队或处理后，会发出命令响应。提示被接受后，事件仍会异步持续流式传输。

```json
{"id": "req-1", "type": "prompt", "message": "Hello, world!"}
```

附带图像：
```json
{"type": "prompt", "message": "What's in this image?", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

**流式传输期间**：如果 agent 已在流式传输，必须指定 `streamingBehavior` 才能将消息排队：

```json
{"type": "prompt", "message": "New instruction", "streamingBehavior": "steer"}
```

- `"steer"`：agent 运行期间将消息排队。当前 assistant 轮次完成工具调用后、下一次 LLM 调用前，会送达该消息。
- `"followUp"`：等待 agent 完成。只有 agent 停止后才会送达该消息。

如果 agent 正在流式传输，但未指定 `streamingBehavior`，命令会返回错误。

**扩展命令**：如果消息是扩展命令（例如 `/mycommand`），即使处于流式传输期间也会立即执行。扩展命令通过 `pi.sendMessage()` 管理自己的 LLM 交互。

**输入展开**：发送或排队之前会展开 Skill 命令（`/skill:name`）和提示模板（`/template`）。

响应：
```json
{"id": "req-1", "type": "response", "command": "prompt", "success": true, "data": {"disposition": "started"}}
```

如果扩展命令或输入处理器消费了该提示，`data.disposition` 为 `"handled"`；如果 Pi 在运行期间将其排队，则为 `"queued"`；如果 Pi 接受该提示并启动运行，则为 `"started"`。该值描述的是已提交的提示，不表示扩展启动了独立工作，也不保证工作已完成。

`success: true` 表示提示已被接受、排队或立即处理。`success: false` 表示提示在被接受前遭到拒绝。接受后发生的失败会通过常规事件和消息流报告，不会针对同一请求 id 再次发送 `response`。

`images` 字段可选。每张图像都使用 `ImageContent` 格式：`{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}`。

### steer

agent 运行期间将引导消息排队。当前 assistant 轮次完成工具调用后、下一次 LLM 调用前，会送达该消息。Skill 命令和提示模板会展开。不允许使用扩展命令（请改用 `prompt`）。

```json
{"type": "steer", "message": "Stop and do this instead"}
```

附带图像：
```json
{"type": "steer", "message": "Look at this instead", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images` 字段可选。每张图像都使用 `ImageContent` 格式（与 `prompt` 相同）。

响应：
```json
{"type": "response", "command": "steer", "success": true, "data": {"disposition": "queued"}}
```

如果输入处理器消费了此引导消息，`data.disposition` 为 `"handled"`；如果 Pi 将其排队（包括处理器转换后再排队的情况），则为 `"queued"`。该值不保证此消息仍处于排队状态。

如何控制引导消息的处理方式，请参阅 [set_steering_mode](#set_steering_mode)。

### follow_up

将后续消息排队，待 agent 完成后处理。只有 agent 没有更多工具调用或引导消息时，才会送达。Skill 命令和提示模板会展开。不允许使用扩展命令（请改用 `prompt`）。

```json
{"type": "follow_up", "message": "After you're done, also do this"}
```

附带图像：
```json
{"type": "follow_up", "message": "Also check this image", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images` 字段可选。每张图像都使用 `ImageContent` 格式（与 `prompt` 相同）。

响应：
```json
{"type": "response", "command": "follow_up", "success": true, "data": {"disposition": "queued"}}
```

`data.disposition` 对此后续消息的含义与 `steer` 相同，可以是 `"handled"` 或 `"queued"`。

如何控制后续消息的处理方式，请参阅 [set_follow_up_mode](#set_follow_up_mode)。

### abort

中止当前操作，并等待会话进入空闲状态后再响应。

```json
{"type": "abort"}
```

响应：
```json
{"type": "response", "command": "abort", "success": true}
```

### clear_queue

移除排队中的引导消息和后续消息，并返回其文本。

```json
{"type": "clear_queue"}
```

响应：
```json
{
  "type": "response",
  "command": "clear_queue",
  "success": true,
  "data": {
    "steering": ["Change direction"],
    "followUp": ["Summarize when finished"]
  }
}
```

若要实现交互式 Esc 行为，请先发送 `clear_queue`，再发送 `abort`，随后在客户端编辑器中恢复返回的文本。如果消息仍留在会话中，`abort` 会继续处理排队消息。

### new_session

启动一个新会话。扩展事件处理器 `session_before_switch` 可以取消此操作。

```json
{"type": "new_session"}
```

可选：指定父会话以进行跟踪：
```json
{"type": "new_session", "parentSession": "/path/to/parent-session.jsonl"}
```

响应：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": false}}
```

如果扩展取消了操作：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": true}}
```

<a id="state"></a>
## 状态

### get_state

获取当前会话状态。

```json
{"type": "get_state"}
```

响应：
```json
{
  "type": "response",
  "command": "get_state",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isStreaming": false,
    "isCompacting": false,
    "steeringMode": "all",
    "followUpMode": "one-at-a-time",
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "sessionName": "my-feature-work",
    "autoCompactionEnabled": true,
    "messageCount": 5,
    "pendingMessageCount": 0
  }
}
```

`model` 字段是完整的 [Model](#model-object) 对象；如果未选择模型，则省略该字段。`sessionName` 字段是通过 `set_session_name` 设置的显示名称；如果尚未设置，则省略该字段。

### get_messages

获取对话中的所有消息。

```json
{"type": "get_messages"}
```

响应：
```json
{
  "type": "response",
  "command": "get_messages",
  "success": true,
  "data": {"messages": [...]}
}
```

消息是 `AgentMessage` 对象（参见[消息类型](message-types.md)）。

<a id="model"></a>
## 模型

### set_model

切换到指定模型。

```json
{"type": "set_model", "provider": "anthropic", "modelId": "claude-sonnet-4-20250514"}
```

响应包含完整的 [Model](#model-object) 对象：
```json
{
  "type": "response",
  "command": "set_model",
  "success": true,
  "data": {...}
}
```

### cycle_model

切换到下一个可用模型。如果只有一个可用模型，则返回值 `data` 为 `null`。

```json
{"type": "cycle_model"}
```

响应：
```json
{
  "type": "response",
  "command": "cycle_model",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isScoped": false
  }
}
```

`model` 字段是完整的 [Model](#model-object) 对象。

### get_available_models

列出所有已配置的模型。

```json
{"type": "get_available_models"}
```

响应包含完整 [Model](#model-object) 对象组成的数组：
```json
{
  "type": "response",
  "command": "get_available_models",
  "success": true,
  "data": {
    "models": [...]
  }
}
```

<a id="thinking"></a>
## 思考等级

### set_thinking_level

为支持此功能的模型设置推理/思考等级。

```json
{"type": "set_thinking_level", "level": "high"}
```

等级：`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"`

只有所选模型支持时才会提供 `"xhigh"` 和 `"max"`。包括 GPT-5.6 在内的某些模型会同时提供这两个等级。

响应：
```json
{"type": "response", "command": "set_thinking_level", "success": true}
```

### cycle_thinking_level

循环切换可用的思考等级。如果模型不支持思考等级，则返回值 `data` 为 `null`。

```json
{"type": "cycle_thinking_level"}
```

响应：
```json
{
  "type": "response",
  "command": "cycle_thinking_level",
  "success": true,
  "data": {"level": "high"}
}
```

### get_available_thinking_levels

列出当前模型支持的思考等级。不支持推理的模型返回 `["off"]`。

```json
{"type": "get_available_thinking_levels"}
```

响应：
```json
{
  "type": "response",
  "command": "get_available_thinking_levels",
  "success": true,
  "data": {
    "levels": ["off", "minimal", "low", "medium", "high"]
  }
}
```

<a id="queue-modes"></a>
## 队列模式

### set_steering_mode

控制引导消息（来自 `steer`）的送达方式。

```json
{"type": "set_steering_mode", "mode": "one-at-a-time"}
```

模式：
- `"all"`：当前 assistant 轮次完成工具调用后，送达所有引导消息。
- `"one-at-a-time"`：每个 assistant 轮次完成后送达一条引导消息（默认值）。

响应：
```json
{"type": "response", "command": "set_steering_mode", "success": true}
```

### set_follow_up_mode

控制后续消息（来自 `follow_up`）的送达方式。

```json
{"type": "set_follow_up_mode", "mode": "one-at-a-time"}
```

模式：
- `"all"`：agent 完成时送达所有后续消息。
- `"one-at-a-time"`：agent 每次完成时送达一条后续消息（默认值）。

响应：
```json
{"type": "response", "command": "set_follow_up_mode", "success": true}
```

<a id="compaction"></a>
## 压缩

### compact

手动压缩对话上下文，以减少 token 用量。

```json
{"type": "compact"}
```

附带自定义指令：
```json
{"type": "compact", "customInstructions": "Focus on code changes"}
```

响应：
```json
{
  "type": "response",
  "command": "compact",
  "success": true,
  "data": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {
      "input": 32000,
      "output": 1200,
      "cacheRead": 0,
      "cacheWrite": 0,
      "totalTokens": 33200,
      "cost": {"input": 0.01, "output": 0.02, "cacheRead": 0, "cacheWrite": 0, "total": 0.03}
    },
    "details": {}
  }
}
```

`estimatedTokensAfter` 是基于压缩后立即重建的消息上下文得出的启发式估算值，并非由提供方精确计算的 token 数量。`usage` 报告生成摘要的一次或多次 LLM 调用的用量；自定义压缩处理器可能会省略此字段。

### set_auto_compaction

启用或停用上下文接近满载时的自动压缩。

```json
{"type": "set_auto_compaction", "enabled": true}
```

响应：
```json
{"type": "response", "command": "set_auto_compaction", "success": true}
```

<a id="retry"></a>
## 重试

### set_auto_retry

启用或停用发生暂时性错误（过载、速率限制、5xx）时的自动重试。

```json
{"type": "set_auto_retry", "enabled": true}
```

响应：
```json
{"type": "response", "command": "set_auto_retry", "success": true}
```

### abort_retry

中止正在进行的重试（取消等待并停止重试）。

```json
{"type": "abort_retry"}
```

响应：
```json
{"type": "response", "command": "abort_retry", "success": true}
```

<a id="bash"></a>
## Bash

### bash

执行 shell 命令，并将输出加入对话上下文。命令运行时，输出会以 `bash_execution_update` 事件流式传输；响应包含最终结果。

```json
{"id": "req-1", "type": "bash", "command": "ls -la"}
```

如果命令输出应保存在会话中，但在下次提示时不加入模型上下文，请将 `excludeFromContext` 设为 `true`。

提供 `id`，即可将流式传输的 `bash_execution_update` 事件与此命令关联。

响应：
```json
{
  "id": "req-1",
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "total 48\ndrwxr-xr-x ...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": false
  }
}
```

如果输出被截断，响应会包含 `fullOutputPath`：
```json
{
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "truncated output...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": true,
    "fullOutputPath": "/tmp/pi-bash-abc123.log"
  }
}
```

**bash 结果如何传递给 LLM：**

`bash` 命令会立即执行并返回 `BashResult`。内部会创建 `BashExecutionMessage`，并将其存入 agent 的消息状态。

发送下一条 `prompt` 命令时，Pi 会先转换上下文消息，再将其发送给模型。除非 `excludeFromContext` 为 `true`，否则 `BashExecutionMessage` 会转换为以下格式的 `UserMessage`：

````
Ran `ls -la`
```
total 48
drwxr-xr-x ...
```
````

这意味着：
1. 被纳入上下文的 bash 输出会在**下一条提示**时传给模型，而不是立即传递。
2. 可以在发送提示前运行多条 bash 命令；Pi 会纳入每条未设置 `excludeFromContext` 的命令输出。

### abort_bash

中止正在运行的 bash 命令。

```json
{"type": "abort_bash"}
```

响应：
```json
{"type": "response", "command": "abort_bash", "success": true}
```

<a id="session"></a>
## 会话

### get_session_stats

获取 token 用量、费用统计信息和当前上下文窗口用量。

```json
{"type": "get_session_stats"}
```

响应：
```json
{
  "type": "response",
  "command": "get_session_stats",
  "success": true,
  "data": {
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "userMessages": 5,
    "assistantMessages": 5,
    "toolCalls": 12,
    "toolResults": 12,
    "totalMessages": 22,
    "tokens": {
      "input": 50000,
      "output": 10000,
      "cacheRead": 40000,
      "cacheWrite": 5000,
      "total": 105000
    },
    "cost": 0.45,
    "contextUsage": {
      "tokens": 60000,
      "contextWindow": 200000,
      "percent": 30
    }
  }
}
```

`tokens` 和 `cost` 包含整个会话中的 assistant 消息、工具报告的用量，以及压缩/分支摘要生成的用量。`contextUsage` 包含用于压缩和页脚显示的当前上下文窗口实际估算值。

如果没有可用模型或上下文窗口，则省略 `contextUsage`。压缩完成后，`contextUsage.tokens` 和 `contextUsage.percent` 会立即变为 `null`，直到压缩后新的 assistant 响应提供有效用量数据为止。

### export_html

将会话导出为 HTML 文件。

```json
{"type": "export_html"}
```

指定自定义路径：
```json
{"type": "export_html", "outputPath": "/tmp/session.html"}
```

响应：
```json
{
  "type": "response",
  "command": "export_html",
  "success": true,
  "data": {"path": "/tmp/session.html"}
}
```

### switch_session

加载另一个会话文件。扩展事件处理器 `session_before_switch` 可以取消此操作。

```json
{"type": "switch_session", "sessionPath": "/path/to/session.jsonl"}
```

响应：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": false}}
```

如果扩展取消了切换：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": true}}
```

### fork

从当前分支上先前的一条用户消息创建新分支。扩展事件处理器 `session_before_fork` 可以取消此操作。返回作为分支起点的消息文本。

```json
{"type": "fork", "entryId": "abc123"}
```

响应：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"text": "The original prompt text...", "cancelled": false}
}
```

如果扩展取消了分支创建：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"cancelled": true}
}
```

### clone

在当前位置将当前活动分支复制到一个新会话中。扩展事件处理器 `session_before_fork` 可以取消此操作。

```json
{"type": "clone"}
```

响应：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": false}
}
```

如果扩展取消了克隆：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": true}
}
```

### get_fork_messages

获取可用于创建分支的用户消息。

```json
{"type": "get_fork_messages"}
```

响应：
```json
{
  "type": "response",
  "command": "get_fork_messages",
  "success": true,
  "data": {
    "messages": [
      {"entryId": "abc123", "text": "First prompt..."},
      {"entryId": "def456", "text": "Second prompt..."}
    ]
  }
}
```

### get_entries

按追加顺序获取会话中的所有条目（不含会话头）。会话是由具有稳定 id 的条目构成、只能追加的树，因此条目 id 可作为持久游标：将最近看到的条目 id 作为 `since` 传入，即可仅获取严格位于该条目之后的条目，即使客户端重启也适用。与 `get_messages` 不同，此命令还会包含压缩前的历史记录和已放弃的分支。

```json
{"type": "get_entries"}
```

附带游标：
```json
{"type": "get_entries", "since": "abc123"}
```

响应：
```json
{
  "type": "response",
  "command": "get_entries",
  "success": true,
  "data": {
    "entries": [
      {"type": "message", "id": "def456", "parentId": "abc123", "timestamp": "...", "message": {"role": "user", "...": "..."}}
    ],
    "leafId": "def456"
  }
}
```

`leafId` 是当前叶条目的 id（空会话时为 `null`），客户端因此可以通过一次往返判断活动分支是否发生了变化。如果 `since` 与任何条目 id 都不匹配，响应中的 `success` 为 `false`。

### get_tree

以条目树的形式获取会话。每个节点的结构为 `{entry, children, label?, labelTimestamp?}`。由于导航 API 可以创建多个根节点，因此结果是一个数组；父级链断裂的孤立条目也会作为根节点出现。

```json
{"type": "get_tree"}
```

响应：
```json
{
  "type": "response",
  "command": "get_tree",
  "success": true,
  "data": {
    "tree": [
      {
        "entry": {"type": "message", "id": "abc123", "parentId": null, "...": "..."},
        "children": [
          {"entry": {"type": "message", "id": "def456", "parentId": "abc123", "...": "..."}, "children": []}
        ]
      }
    ],
    "leafId": "def456"
  }
}
```

### get_last_assistant_text

获取最后一条 assistant 消息的文本内容。已中止或失败的轮次中没有文本的消息，以及仅调用工具的消息，都会跳过。

```json
{"type": "get_last_assistant_text"}
```

响应：
```json
{
  "type": "response",
  "command": "get_last_assistant_text",
  "success": true,
  "data": {"text": "The assistant's response..."}
}
```

如果不存在 assistant 文本，`text` 值为 `null`。

### set_session_name

为当前会话设置显示名称。该名称会显示在会话列表中，便于识别会话。

```json
{"type": "set_session_name", "name": "my-feature-work"}
```

响应：
```json
{
  "type": "response",
  "command": "set_session_name",
  "success": true
}
```

可以通过 `get_state` 的 `sessionName` 字段获取当前会话名称。启动 RPC 模式时，向 `pi --mode rpc` 进程传入 `--name <name>` 或 `-n <name>`，即可设置初始名称。

<a id="discoverable-commands"></a>
## 可发现的命令

### get_commands

获取可用命令（扩展命令、提示模板和 Skill）。在命令名前加 `/`，即可通过 `prompt` 命令运行。

```json
{"type": "get_commands"}
```

响应：
```json
{
  "type": "response",
  "command": "get_commands",
  "success": true,
  "data": {
    "commands": [
      {
        "name": "fix-tests",
        "description": "Fix failing tests",
        "source": "prompt",
        "sourceInfo": {
          "path": "/home/user/myproject/.pi/agent/prompts/fix-tests.md",
          "source": "local",
          "scope": "project",
          "origin": "top-level"
        }
      }
    ]
  }
}
```

每条命令都包含以下字段：
- `name`：命令名称（使用 `/name`）
- `description`：便于人阅读的说明（扩展命令可选）
- `source`：命令类型：
  - `"extension"`：通过扩展中的 `pi.registerCommand()` 注册
  - `"prompt"`：从提示模板 `.md` 文件加载
  - `"skill"`：从 Skill 目录加载（名称带有 `skill:` 前缀）
- `sourceInfo`：注册此命令的资源的元数据：
  - `path`：资源的绝对路径
  - `source`：Pi 发现该资源的方式，例如 `"local"`、`"auto"` 或 `"cli"`
  - `scope`：`"user"`、`"project"` 或 `"temporary"`
  - `origin`：直接加载的资源为 `"top-level"`，包资源为 `"package"`
  - `baseDir`：适用时为包的基础目录

**注意**：此处不包含内置 TUI 命令（`/settings`、`/hotkeys` 等）。这些命令仅在交互模式下处理，通过 `prompt` 发送时不会执行。

<a id="model-object"></a>
## Model 对象

模型命令会返回完整的已配置模型定义。费用以每百万 token 的美元金额计。

```json
{
  "id": "claude-sonnet-4-20250514",
  "name": "Claude Sonnet 4",
  "api": "anthropic-messages",
  "provider": "anthropic",
  "baseUrl": "https://api.anthropic.com",
  "reasoning": true,
  "input": ["text", "image"],
  "contextWindow": 200000,
  "maxTokens": 16384,
  "cost": {
    "input": 3.0,
    "output": 15.0,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  }
}
```

有关模型配置，请参阅[配置兼容端点](models.md#configure-a-compatible-endpoint)。在 TypeScript 中，请使用 `@earendil-works/pi-ai` 导出的 `Model` 类型。
