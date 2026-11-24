> 本文为简体中文译本；[查看英文原文](../session-format.md)。

# 会话文件格式

会话以 JSONL（JSON Lines）文件保存。每行是一个带有 `type` 字段的 JSON 对象。会话条目通过 `id`/`parentId` 组成一棵树，因此可以直接创建分支，而不必新建文件。

有关以编程方式创建和持久化会话、以及遍历会话树，请参阅 [`SessionManager` API](sdk.md#sessionmanager-api)。

## 文件位置

```
~/.pi/agent/sessions/--<path>--/<timestamp>_<session-id>.jsonl
```

默认情况下，`<session-id>` 是 UUID。调用方可通过 SDK 或 `--session-id` 提供自定义 ID。对于 `<path>`，Pi 会去掉开头的路径分隔符，并将 `/`、`\\` 和 `:` 替换为 `-`。

## 删除会话

删除 `~/.pi/agent/sessions/` 下的 `.jsonl` 文件即可移除会话。

Pi 也支持在 `/resume` 中交互式删除会话（选择会话，按 `Ctrl+D`，然后确认）。如果系统上有 `trash` CLI，Pi 会使用它来避免永久删除。

## 会话版本

会话的头部包含版本字段：

- **版本 1**：线性条目序列（旧格式，加载时会自动迁移）
- **版本 2**：通过 `id`/`parentId` 关联的树形结构
- **版本 3**：将 `hookMessage` 角色更名为 `custom`（扩展统一）

加载现有会话时，Pi 会自动迁移到当前版本（v3）。

## 源文件

GitHub 上的源代码（[pi](https://github.com/earendil-works/pi)）：

- [`packages/coding-agent/src/core/session-manager.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/session-manager.ts:1:1)：会话条目类型和 SessionManager
- [消息类型](message-types.md)：共享消息和内容块参考
- [`packages/coding-agent/src/core/messages.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/messages.ts:1:1)：扩展消息类型
- [`packages/ai/src/types.ts`](vscode://file/Users/Shared/pi-code/packages/ai/src/types.ts:1:1)：基础消息和内容块类型
- [`packages/agent/src/types.ts`](vscode://file/Users/Shared/pi-code/packages/agent/src/types.ts:1:1)：可扩展的 `AgentMessage` 联合类型

如需在项目中查看 TypeScript 定义，请检查 `node_modules/@earendil-works/pi-coding-agent/dist/` 和 `node_modules/@earendil-works/pi-ai/dist/`。

## 消息

`message` 条目保存一个 [`AgentMessage`](message-types.md)。消息内容块、角色、用量和消息时间戳的定义见[消息类型](message-types.md)。

会话条目时间戳是 ISO 8601 字符串。嵌套消息的时间戳是以毫秒为单位的 Unix 时间戳。

## 条目基类

除 `SessionHeader` 以外的所有条目都扩展 `SessionEntryBase`：

```typescript
interface SessionEntryBase {
  type: string;
  id: string;           // 通常是 8 位十六进制 ID；也可能退回使用完整 UUID
  parentId: string | null;  // 父条目 ID（根条目为 null）
  timestamp: string;    // ISO 时间戳
}
```

## 条目类型

### SessionHeader

文件的第一行。只包含元数据，不属于会话树（没有 `id`/`parentId`）。

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project"}
```

对于有父会话的会话（通过 `/fork`、`/clone` 或 `newSession({ parentSession })` 创建）：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project","parentSession":"/path/to/original/session.jsonl"}
```

### SessionMessageEntry

对话中的一条消息。`message` 字段包含一个 `AgentMessage`。系统消息携带提示和工具配置：会话的第一个请求会持久化一条包含所有提示段和工具声明的系统消息；后续变更会持久化为系统消息，按名称更新 `sections`（设为 `null` 表示移除），并列出 `toolsAdded`/`toolsRemoved`。按顺序重放这些消息即可得到当前提示和工具；不存在单独的提示状态条目。

```json
{"type":"message","id":"a0b1c2d3","parentId":null,"timestamp":"2024-12-03T14:00:00.000Z","message":{"role":"system","content":"","sections":{"preamble":"You are an expert coding assistant...","tools":"<tools>\n- read: ...\n</tools>","cwd":"/project"},"toolsAdded":[{"name":"read","description":"...","parameters":{}}],"timestamp":1733234400000}}
{"type":"message","id":"d4e5f6g7","parentId":"c3d4e5f6","timestamp":"2024-12-03T14:04:00.000Z","message":{"role":"system","content":"","sections":{"skills":"<skills>...</skills>"},"toolsRemoved":[{"name":"write"}],"timestamp":1733234640000}}
```

在系统消息出现之前创建的会话没有开头的系统消息；第一个请求会将当前提示声明为后续系统消息，重放时效果相同。

```json
{"type":"message","id":"a1b2c3d4","parentId":"prev1234","timestamp":"2024-12-03T14:00:01.000Z","message":{"role":"user","content":"Hello","timestamp":1733234401000}}
{"type":"message","id":"b2c3d4e5","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}],"api":"anthropic-messages","provider":"anthropic","model":"claude-sonnet-4-5","usage":{...},"stopReason":"stop","timestamp":1733234402000}}
{"type":"message","id":"c3d4e5f6","parentId":"b2c3d4e5","timestamp":"2024-12-03T14:00:03.000Z","message":{"role":"toolResult","toolCallId":"call_123","toolName":"bash","content":[{"type":"text","text":"output"}],"isError":false,"timestamp":1733234403000}}
```

Assistant 消息会记录生成它的模型。较新的消息还会记录 `thinkingLevel`，即 Pi 为该回复请求的思考等级。

### ModelChangeEntry

用户在会话中途切换模型时会产生此条目。最新条目表示当前选定模型，该模型可能是[虚拟模型](virtual-models.md)；之后的 Assistant 消息则会记录实际作答的物理模型。

```json
{"type":"model_change","id":"d4e5f6g7","parentId":"c3d4e5f6","timestamp":"2024-12-03T14:05:00.000Z","provider":"openai","modelId":"gpt-4o"}
```

### ThinkingLevelChangeEntry

用户更改思考/推理等级时会产生此条目。

```json
{"type":"thinking_level_change","id":"e5f6g7h8","parentId":"d4e5f6g7","timestamp":"2024-12-03T14:06:00.000Z","thinkingLevel":"high"}
```

### UsageEntry

记录归属于模型、但不是 Assistant 消息且不参与 LLM 上下文的用量。`kind` 是标识操作的任意字符串；例如，缓存预热使用 `"cache_warm"`。

```json
{"type":"usage","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:08:00.000Z","kind":"cache_warm","provider":"anthropic","model":"claude-sonnet-4-5","usage":{"input":0,"output":0,"cacheRead":50000,"cacheWrite":0,"totalTokens":50000,"cost":{"input":0,"output":0,"cacheRead":0.015,"cacheWrite":0,"total":0.015}}}
```

用量条目会计入会话 token 和费用总数。Pi 不会在对话树中显示它们。读取方应将未知的 `kind` 值视为普通用量，不要因此拒绝数据。

### CompactionEntry

压缩上下文时会创建此条目。它保存较早消息的摘要以及完整的系统提示/工具检查点。

```json
{"type":"compaction","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:10:00.000Z","summary":"User discussed X, Y, Z...","firstKeptEntryId":"c3d4e5f6","tokensBefore":50000,"systemMessage":{"role":"system","content":"You are a coding assistant.","toolsAdded":[],"timestamp":1733235000000}}
```

`firstKeptEntryId` 是必需字段。它标识压缩条目之前保留的第一条记录。重建上下文时，Pi 会用压缩摘要替换更早的摘要范围，并保留从该条目开始的范围。若压缩时不保留任何条目，此字段会保存压缩条目自身的 ID，表示不保留此前的记录。

可选字段：

- `systemMessage`：压缩边界处重放得到的提示段和工具声明；它会成为压缩上下文开头的系统消息，保留条目中的系统消息会被丢弃并由它取代。较旧的会话条目中没有此字段。
- `usage`：生成摘要所用的 LLM 用量；会计入会话 token 和费用总数。
- `details`：实现相关的数据，例如默认实现的 `{ readFiles: string[], modifiedFiles: string[] }`，也可以是扩展自定义数据。
- `fromHook`：若由扩展生成则为 `true`；若由 Pi 生成则为 `false` 或未定义（旧字段名）。

### ContextEditEntry

以只追加方式编辑一个较早的上下文条目。它只会改变之后的模型上下文；原始历史、界面、导出和会话统计中的目标条目及其元数据都保持不变。

```json
{"type":"context_edit","id":"g6h7i8j9","parentId":"f6g7h8i9","timestamp":"2024-12-03T14:11:00.000Z","targetId":"c3d4e5f6","replacement":null}
```

目标可以是用户、Assistant、工具结果或自定义消息条目。`replacement: null` 表示从模型上下文中省略目标。非 null 的 `replacement` 只替换目标消息内容。Assistant 和工具结果角色要求内容为数组，因此字符串替换会规范为一个文本块。同一个条目有多次编辑时，活动分支上最新的一次生效。编辑与分支相关：导航到编辑之前的位置时，目标原有内容会重新出现。

### BranchSummaryEntry

通过 `/tree` 切换分支时，会生成从被放弃分支到共同祖先为止的 LLM 摘要，并创建此条目。它会保留被放弃路径中的上下文。

```json
{"type":"branch_summary","id":"g7h8i9j0","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:15:00.000Z","fromId":"f6g7h8i9","summary":"Branch explored approach A..."}
```

`parentId` 是新分支继续的位置。`fromId` 是此前叶节点的 ID，其被放弃的路径已生成摘要。

可选字段：

- `usage`：生成摘要的 LLM 用量；会计入会话 token 和费用总数。
- `details`：文件跟踪数据（默认实现使用 `{ readFiles: string[], modifiedFiles: string[] }`），也可以是扩展自定义数据。
- `fromHook`：若由扩展生成则为 `true`；若由 Pi 生成则为 `false` 或未定义（旧字段名）。

### CustomEntry

用于持久化扩展状态。**不会**参与 LLM 上下文。

```json
{"type":"custom","id":"h8i9j0k1","parentId":"g7h8i9j0","timestamp":"2024-12-03T14:20:00.000Z","customType":"my-extension","data":{"count":42}}
```

重载时使用 `customType` 识别扩展自己的条目。交互模式可以通过 `pi.registerEntryRenderer(customType, renderer)` 渲染自定义条目，但它们仍不会参与 LLM 上下文。

Pi 会将[虚拟模型](virtual-models.md)路由器状态保存在自定义条目中，其 `customType` 为 `pi.virtual-model-state`，`data` 为 `{ provider, modelId, state }`。

### CustomMessageEntry

由扩展注入且**会**参与 LLM 上下文的消息。

```json
{"type":"custom_message","id":"i9j0k1l2","parentId":"h8i9j0k1","timestamp":"2024-12-03T14:25:00.000Z","customType":"my-extension","content":"Injected context...","display":true}
```

字段：

- `content`：字符串或 `(TextContent | ImageContent)[]`（与 `UserMessage` 相同）
- `display`：`true` 表示在 TUI 中以单独样式显示；`false` 表示隐藏
- `details`：可选的扩展专用元数据（不会发送给 LLM）

### LabelEntry

用户为条目添加的书签或标记。

```json
{"type":"label","id":"j0k1l2m3","parentId":"i9j0k1l2","timestamp":"2024-12-03T14:30:00.000Z","targetId":"a1b2c3d4","label":"checkpoint-1"}
```

将 `label` 设为 `undefined` 可清除标签。

### SessionInfoEntry

会话元数据（例如用户自定义显示名）。可通过 `/name`、`--name`/`-n`，或扩展中的 `pi.setSessionName()` 设置。

```json
{"type":"session_info","id":"k1l2m3n4","parentId":"j0k1l2m3","timestamp":"2024-12-03T14:35:00.000Z","name":"Refactor auth module"}
```

设置会话名后，会话选择器（`/resume`）会显示该名称，而不是第一条消息。

## 树结构

条目通常组成一棵树，但导航 API 也可以创建多个根：

- 根条目的 `parentId` 为 `null`；第一个条目起初就是根。
- 每个非根条目都通过 `parentId` 指向父条目。
- 创建分支会在较早条目下创建新的子条目。
- “叶节点”表示树中的当前位置。
- 调用 `resetLeaf()` 或 `branchWithSummary(null, ...)` 后，后续条目可以成为另一个根。

```
[user msg] ─── [assistant] ─── [user msg] ─── [assistant] ─┬─ [user msg] ← 当前叶节点
                                                            │
                                                            └─ [branch_summary] ─── [user msg] ← 另一分支
```

## 构建上下文

`buildContextEntries()` 从当前叶节点向根节点遍历，在遵循压缩信息的同时生成活动条目列表：

1. 收集路径上的全部条目。
2. 若路径上有一个或多个 `CompactionEntry`，则使用最新的一个：
   - 首先纳入压缩条目。
   - 纳入从 `firstKeptEntryId` 开始、到压缩条目之前的非系统条目。
   - 纳入压缩条目之后的条目。
3. 保留所选范围中的非消息条目，以便交互模式渲染它们。

随后，`buildSessionProjection()` 会为每个选中目标应用最新的 `context_edit`。它会返回模型可见的消息以及对应的来源条目。被省略的目标不会产生消息；替换项保留来源条目的角色和元数据，只更改内容。所选原始条目不会被修改。

`buildSessionContext()` 基于该投影生成发送给 LLM 的消息列表：

1. 从完整路径中提取当前模型和思考等级设置。
2. 将选中的条目转换为消息：
   - `message` → 已存储的 `AgentMessage`
   - `compaction` → 完整系统检查点，后接 `compactionSummary`
   - `branch_summary` → `branchSummary`
   - `custom_message` → `CustomMessage`
   - `context_edit` → 本身不生成上下文消息
   - `usage` 和 `custom` → 不生成上下文消息

压缩摘要会替换 `firstKeptEntryId` 之前的条目。压缩前的系统消息会折叠进完整检查点，而不会从保留范围中重放。保留的非系统条目和压缩之后的所有条目仍可供 LLM 使用。

## 解析示例

```typescript
import { readFileSync } from "fs";

const lines = readFileSync("session.jsonl", "utf8").trim().split("\n");

for (const line of lines) {
  const entry = JSON.parse(line);

  switch (entry.type) {
    case "session":
      console.log(`Session v${entry.version ?? 1}: ${entry.id}`);
      break;
    case "message":
      console.log(`[${entry.id}] ${entry.message.role}: ${JSON.stringify(entry.message.content)}`);
      break;
    case "compaction":
      console.log(`[${entry.id}] Compaction: ${entry.tokensBefore} tokens summarized`);
      break;
    case "branch_summary":
      console.log(`[${entry.id}] Branch from ${entry.fromId}`);
      break;
    case "usage":
      console.log(`[${entry.id}] Usage (${entry.kind}): ${entry.usage.totalTokens} tokens`);
      break;
    case "custom":
      console.log(`[${entry.id}] Custom (${entry.customType}): ${JSON.stringify(entry.data)}`);
      break;
    case "custom_message":
      console.log(`[${entry.id}] Extension message (${entry.customType}): ${entry.content}`);
      break;
    case "label":
      console.log(`[${entry.id}] Label "${entry.label}" on ${entry.targetId}`);
      break;
    case "model_change":
      console.log(`[${entry.id}] Model: ${entry.provider}/${entry.modelId}`);
      break;
    case "thinking_level_change":
      console.log(`[${entry.id}] Thinking: ${entry.thinkingLevel}`);
      break;
  }
}
```
