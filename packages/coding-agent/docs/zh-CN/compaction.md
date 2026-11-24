> 本文是简体中文译文，英文原文见[Compaction Reference](../compaction.md)。

# 压缩参考

本文介绍自动压缩、分支摘要、持久化条目和扩展钩子。有关用户操作流程，请参阅[会话与上下文](./sessions.md#manage-conversation-context)。

**源文件**（[pi](https://github.com/earendil-works/pi)）：
- [`packages/coding-agent/src/core/compaction/compaction.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/compaction/compaction.ts:1:1) - 自动压缩逻辑
- [`packages/coding-agent/src/core/compaction/branch-summarization.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/compaction/branch-summarization.ts:1:1) - 分支摘要
- [`packages/coding-agent/src/core/compaction/utils.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/compaction/utils.ts:1:1) - 共享工具（文件跟踪、序列化）
- [`packages/coding-agent/src/core/session-manager.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/session-manager.ts:1:1) - 条目类型（`CompactionEntry`、`BranchSummaryEntry`）
- [`packages/coding-agent/src/core/extensions/types.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/extensions/types.ts:1:1) - 扩展事件类型

如需在项目中查看 TypeScript 定义，请检查 `node_modules/@earendil-works/pi-coding-agent/dist/`。

## 概览

Pi 有两种摘要机制：

| 机制 | 触发条件 | 用途 |
|-----------|---------|---------|
| 压缩 | 上下文超过阈值，或执行 `/compact` | 汇总较早的消息以释放上下文空间 |
| 分支摘要 | 使用 `/tree` 导航 | 切换分支时保留上下文 |

两者使用密切相关的结构化格式，并以累积方式跟踪文件操作。摘要请求会禁用提示缓存写入，因为这类一次性提示很少会被重复使用。

## 压缩

### 触发时机

自动压缩会在以下条件成立时触发：

```
contextTokens > contextWindow - reserveTokens
```

默认情况下，`reserveTokens` 为 16384 个 token（可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置）。它只决定何时开始压缩。摘要请求使用模型的输出上限；必要时会降低该上限，以便输入和输出都能放进上下文窗口。

在多轮 agent 运行期间，Pi 会在工具完成且结果追加之后、开始下一次 assistant 响应之前，检查规范化的预测上下文。如果超过阈值，Pi 会在 `prepareNextTurn` 期间压缩，然后执行现有的追赶式 steering 轮询，再触发 `turn_start`。如果已完成的工具批次会终止本次运行，且没有排队消息需要触发另一条响应，则会跳过这次轮间检查。Pi 也会在新的 user 提示之前检查，并在底层运行结束后执行最终尝试的溢出恢复。

遇到 provider 上下文溢出错误，或较早返回的最终响应带有 `stopReason: "length"` 时，Pi 可以选择一次“压缩并重试”的恢复尝试。带有工具调用的长度响应会保留其合成的失败工具结果，并按常规工具/队列调度器继续处理，而不会强制结束运行。

也可以通过 `/compact [instructions]` 手动触发；可选的 instructions 用于指定摘要重点。

### 工作原理

1. **查找截断点**：从最终确定的会话投影末尾向前遍历，累积 token 估算值，直到达到 `keepRecentTokens`（默认 20k，可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置）
2. **提取消息**：收集从上一个保留边界（若没有则从会话开头）到截断点之间的投影消息
3. **生成摘要**：调用 LLM，使用结构化格式进行摘要；如果已有先前摘要，则将其作为迭代上下文传入
4. **追加条目**：保存包含摘要和 `firstKeptEntryId` 的 `CompactionEntry`
5. **重建上下文**：会话使用摘要以及从 `firstKeptEntryId` 开始的消息，为下一次请求重建上下文

```
压缩前：

  entry:  0     1     2     3      4     5     6      7      8     9
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┘
                └────────┬───────┘ └──────────────┬──────────────┘
                   待摘要消息                   保留的消息
                                   ↑
                          firstKeptEntryId（条目 4）

压缩后（追加新条目）：

  entry:  0     1     2     3      4     5     6      7      8     9     10
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│ cmp │
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┴─────┘
               └──────────┬──────┘ └──────────────────────┬───────────────────┘
                    不发送给 LLM                      发送给 LLM
                                                         ↑
                                              从 firstKeptEntryId 开始

LLM 看到的内容：

  ┌────────┬─────────┬─────┬─────┬──────┬──────┬─────┬──────┐
  │ system │ summary │ usr │ ass │ tool │ tool │ ass │ tool │
  └────────┴─────────┴─────┴─────┴──────┴──────┴─────┴──────┘
       ↑         ↑      └─────────────────┬────────────────┘
    提示词    来自压缩条目        来自 firstKeptEntryId 的消息
```

多次压缩时，待摘要范围会从上一次压缩的保留边界（`firstKeptEntryId`）开始，而不是从压缩条目本身开始；如果在路径中找不到该保留条目，则回退到上一个压缩条目之后。保留零条消息的压缩会把自身 ID 记录为 `firstKeptEntryId`；再次压缩时则从该条目之后开始。这样一来，先前压缩后保留下来的消息也会纳入下一轮摘要。Pi 还会在写入新的 `CompactionEntry` 前，根据重建并经过上下文编辑的会话投影重新计算 `tokensBefore`，使 token 数量反映实际被替换的压缩前上下文。被省略的原始条目仍会存储，但不会影响截断点选择、摘要、检查点或 token 估算。

### 溢出与长度恢复的顺序

恢复过程会保留现有生命周期和队列顺序。已完成的尝试仍会对 `turn_end` 和 `agent_end` 可见；随后运行结束后的恢复会修复持久化的模型上下文，再开始新的重试：

```text
持久化最终 assistant 响应
→ 扩展/公开的 turn_end
→ 扩展/公开的 agent_end
→ 为所选尝试追加 context_edit 忽略项
→ 对溢出/长度情况：运行 session_before_compact，成功后追加压缩条目
→ 将重试作为一次全新的运行启动
```

如果恢复压缩失败或被取消，Pi 会保留忽略编辑，不追加压缩条目，也不安排内部重试。已有排队工作仍按常规 steering 和后续处理规则执行。恢复处理之后，`agent_before_settle` 会看到修复后的投影。原始对话记录、导出内容、计费总额和历史搜索扩展仍可检查被忽略的尝试。

### 用户消息范围的拆分

一个用户消息范围从一条 user 消息开始，包含后续所有轮次，直到下一条 user 消息。通常，压缩会在用户消息边界截断。

如果某个用户消息范围超过 `keepRecentTokens`，截断点会落在该范围内部的一条 assistant 消息处。这称为拆分的用户消息范围：

```
拆分的用户消息范围（一个范围超出预算）：

  entry:  0     1     2      3     4      5      6     7      8
        ┌─────┬─────┬─────┬──────┬─────┬──────┬──────┬─────┬──────┐
        │ hdr │ usr │ ass │ tool │ ass │ tool │ tool │ ass │ tool │
        └─────┴─────┴─────┴──────┴─────┴──────┴──────┴─────┴──────┘
                ↑                                     ↑
         turnStartIndex = 1                  firstKeptEntryId = 7
                │                                     │
                └──── turnPrefixMessages (1-6) ───────┘
                                                      └── 保留（7-8）

  isSplitTurn = true
  messagesToSummarize = []  （没有更早的用户消息范围）
  turnPrefixMessages = [usr, ass, tool, ass, tool, tool]
```

对于拆分的用户消息范围，Pi 会生成两个摘要并将它们合并：
1. **历史摘要**：此前的上下文（如果存在）
2. **用户消息范围前缀摘要**：被拆分的用户消息范围中较早的部分

### 截断点规则

有效的截断点包括：
- user 消息
- assistant 消息
- BashExecution 消息
- 自定义消息（custom_message、branch_summary）

绝不会在工具结果处截断（工具结果必须与对应的工具调用保留在一起）。

只有当某个上下文不可见的后缀中含有被省略的 assistant 尝试，且没有未省略的上下文生成条目时，准备阶段才会将保留边界推进到该后缀中。恢复产生的 `context_edit` 忽略项满足此规则；固有的上下文不可见元数据可以与它们共存。仅有元数据或新追加的自定义消息不会移动截断点。如果替换编辑影响候选输入或待摘要前缀，也会阻止推进，因为被省略的 assistant 是针对编辑前的输入作答；最终也会被省略的后缀条目替换则仍然安全。这样一来，即使恢复后的输入超出预算，Pi 也可以在保留那些用于忽略已放弃尝试的编辑的同时进行摘要，而且记账操作不会改变新模型输入是否原样保留。

### CompactionEntry 结构

定义于 [`session-manager.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/session-manager.ts:1:1)：

```typescript
interface CompactionEntry<T = unknown> {
  type: "compaction";
  id: string;
  parentId: string | null;
  timestamp: string;
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  usage?: Usage;       // 生成摘要的 LLM 用量
  fromHook?: boolean;  // 若由扩展提供则为 true（历史字段名）
  details?: T;         // 与具体实现有关的数据
}

// 默认压缩将以下内容用作 details（来自 compaction.ts）：
interface CompactionDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

扩展可以在 `details` 中存储任何可序列化为 JSON 的数据。默认压缩会跟踪文件操作，但自定义扩展实现可以使用自己的结构。只要可用，Pi 生成的摘要和扩展提供的摘要都会保存其 LLM `usage`，使会话总用量包含摘要工作。

有关实现，请参阅 [`prepareCompaction()`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/compaction/compaction.ts:1:1) 和 [`compact()`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/compaction/compaction.ts:1:1)。对于直接以代码方式生成摘要的场景，`generateSummary()` 返回摘要文本，`generateSummaryWithUsage()` 返回 `{ text, usage }`。

## 分支摘要

### 触发时机

使用 `/tree` 导航到另一个分支时，Pi 会询问是否要总结即将离开的工作。这会将左侧分支的上下文注入新分支。

### 工作原理

1. **查找共同祖先**：旧位置和新位置共有的最深节点
2. **收集条目**：从旧叶节点向共同祖先回溯
3. **按预算准备**：按从新到旧的顺序纳入不超过 token 预算的消息
4. **生成摘要**：调用 LLM，使用结构化格式
5. **追加条目**：在导航位置保存 `BranchSummaryEntry`

```
导航前的树：

         ┌─ B ─ C ─ D（旧叶节点，即将离开）
    A ───┤
         └─ E ─ F（目标位置）

共同祖先：A
待摘要条目：B、C、D

带摘要导航后的树：

         ┌─ B ─ C ─ D
    A ───┤
         └─ E ─ F ─ [B、C、D 的摘要]（新叶节点）
```

### 累积文件跟踪

默认压缩和分支摘要都会以累积方式跟踪文件。两者都会从待摘要消息中的工具调用提取文件操作。压缩还会带上此前由 Pi 生成的压缩条目中的文件列表。分支摘要则会带上其所摘要条目中由 Pi 生成的分支摘要文件列表。

因此，文件跟踪会在默认压缩和嵌套的默认分支摘要之间累积。对于 `fromHook` 字段为 `true` 的扩展生成摘要，Pi 不会自动沿用其中的文件列表；扩展需自行管理其 `details` 格式。

### BranchSummaryEntry 结构

定义于 [`session-manager.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/session-manager.ts:1:1)：

```typescript
interface BranchSummaryEntry<T = unknown> {
  type: "branch_summary";
  id: string;
  parentId: string | null;
  timestamp: string;
  summary: string;
  fromId: string;      // 导航的起点条目
  usage?: Usage;       // 生成摘要的 LLM 用量
  fromHook?: boolean;  // 若由扩展提供则为 true（历史字段名）
  details?: T;         // 与具体实现有关的数据
}

// 默认分支摘要将以下内容用作 details（来自 branch-summarization.ts）：
interface BranchSummaryDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

与压缩相同，扩展可以在 `details` 中存储自定义数据。

有关实现，请参阅 [`collectEntriesForBranchSummary()`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/compaction/branch-summarization.ts:1:1)、[`prepareBranchEntries()`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/compaction/branch-summarization.ts:1:1) 和 [`generateBranchSummary()`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/compaction/branch-summarization.ts:1:1)。

## 摘要格式

两种格式都包含目标、约束与偏好、进展、关键决策和后续步骤。压缩摘要还包含关键上下文；分支摘要则在后续步骤后结束。相关时，Pi 会在任一格式后附加文件列表。

压缩摘要使用以下格式：

```markdown
## Goal
[用户想要完成什么]

## Constraints & Preferences
- [用户提出的要求]

## Progress
### Done
- [x] [已完成的任务]

### In Progress
- [ ] [当前工作]

### Blocked
- [遇到的问题（如有）]

## Key Decisions
- **[决策]**：[原因]

## Next Steps
1. [接下来应该做什么]

## Critical Context
- [继续工作所需的数据]

<read-files>
path/to/file1.ts
path/to/file2.ts
</read-files>

<modified-files>
path/to/changed.ts
</modified-files>
```

### 消息序列化

摘要前，消息会通过 [`serializeConversation()`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/compaction/utils.ts:1:1) 序列化为文本：

```
[User]: 用户说的话
[Assistant]: 响应文本
[Assistant tool calls]: read(path="foo.ts"); edit(path="bar.ts", ...)
[Tool result]: 输出
```

这样可避免模型将其当作需要继续的对话。

Thinking 块会被省略。Provider 会返回对真实推理的摘要，而重放的 thinking 通常并不属于模型的实时上下文；纳入这些内容可能会使摘要请求大于它所摘要的上下文。

序列化时，工具结果会截断到 2000 个字符。超出此限制的内容会替换为一个标记，指出截断的字符数。由于工具结果（尤其是 `read` 和 `bash` 的结果）通常是上下文大小的最大组成部分，这样可以让摘要请求保持在合理的 token 预算内。

## 通过扩展自定义摘要

扩展可以拦截并自定义压缩和分支摘要。事件类型定义请参阅 [`extensions/types.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/core/extensions/types.ts:1:1)。

### session_before_compact

在自动压缩或执行 `/compact` 前触发。可取消压缩或提供自定义摘要。请参阅类型文件中的 `SessionBeforeCompactEvent` 和 `CompactionPreparation`。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // preparation.messagesToSummarize - 待摘要消息
  // preparation.turnPrefixMessages - 用户消息范围前缀（如果 isSplitTurn）
  // preparation.previousSummary - 上一次压缩摘要
  // preparation.fileOps - 提取出的文件操作
  // preparation.tokensBefore - 压缩前的上下文 token 数
  // preparation.firstKeptEntryId - 保留消息的起始位置
  // preparation.settings - 应用模型覆盖设置后的有效设置

  // branchEntries - 当前分支的所有条目（用于自定义状态）
  // reason - "manual"（/compact）、"threshold" 或 "overflow"
  // willRetry - 压缩后是否会重试已中止的轮次（溢出恢复）
  // signal - AbortSignal（传给 LLM 调用）

  // 取消：
  return { cancel: true };

  // 自定义摘要：
  return {
    compaction: {
      summary: "你的摘要...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      // usage: summaryResponse.usage, // 可选；会计入会话总用量
      details: { /* 自定义数据 */ },
    }
  };
});
```

#### 将消息转换为文本

要使用自己的模型生成摘要，请用 `serializeConversation` 将消息转换为文本：

```typescript
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";

pi.on("session_before_compact", async (event, ctx) => {
  const { preparation } = event;
  
  // 将 AgentMessage[] 转换为 Message[]，然后序列化为文本
  const conversationText = serializeConversation(
    convertToLlm(preparation.messagesToSummarize)
  );
  // 返回内容：
  // [User]: 消息文本
  // [Assistant]: 响应文本
  // [Assistant tool calls]: read(path="..."); bash(command="...")
  // [Tool result]: 输出文本

  // 现在将其发送给你的模型进行摘要
  const { summary, usage } = await myModel.summarize(conversationText);
  
  return {
    compaction: {
      summary,
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      usage,
    }
  };
});
```

完整示例请参阅 [custom-compaction.ts](vscode://file/Users/Shared/pi-code/packages/coding-agent/examples/extensions/custom-compaction.ts:1:1)，其中演示了如何使用不同的模型。

### session_compact_failed

手动或自动压缩失败或中止时触发。需要将 `session_before_compact` 尝试与最终结果配对的遥测扩展可以使用此事件。

```typescript
pi.on("session_compact_failed", async (event, ctx) => {
  const { reason, errorMessage, aborted, willRetry, fromExtension } = event;
  // reason - "manual"（/compact）、"threshold" 或 "overflow"
  // errorMessage - 非中止失败时存在
  // aborted - 若压缩被取消/中止则为 true
  // willRetry - 中止的轮次是否本来会在压缩后重试
  // fromExtension - 是否使用了扩展提供的压缩内容
});
```

### session_before_tree

在 `/tree` 导航前触发。无论用户是否选择生成摘要，都会触发。可取消导航或提供自定义摘要。

```typescript
pi.on("session_before_tree", async (event, ctx) => {
  const { preparation, signal } = event;

  // preparation.targetId - 导航目标
  // preparation.oldLeafId - 当前所在位置（即将离开）
  // preparation.commonAncestorId - 共同祖先
  // preparation.entriesToSummarize - 将被摘要的条目
  // preparation.userWantsSummary - 用户是否选择生成摘要

  // 完全取消导航：
  return { cancel: true };

  // 提供自定义摘要（仅当 userWantsSummary 为 true 时使用）：
  if (preparation.userWantsSummary) {
    return {
      summary: {
        summary: "你的摘要...",
        // usage: summaryResponse.usage, // 可选；会计入会话总用量
        details: { /* 自定义数据 */ },
      }
    };
  }
});
```

请参阅类型文件中的 `SessionBeforeTreeEvent` 和 `TreePreparation`。

## 设置

在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置压缩：

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

| 设置 | 默认值 | 说明 |
|---------|---------|-------------|
| `enabled` | `true` | 启用自动压缩 |
| `reserveTokens` | `16384` | 自动压缩开始时剩余的上下文 token 数 |
| `keepRecentTokens` | `20000` | 保留的近期 token 数（不纳入摘要） |

设置为 `"enabled": false` 可禁用自动压缩。仍然可以通过 `/compact` 手动压缩。

### 按模型覆盖

使用 `compaction.modelOverrides` 为不同模型调整 token 预算：

```json
{
  "compaction": {
    "reserveTokens": 16384,
    "keepRecentTokens": 20000,
    "modelOverrides": {
      "some-provider/big-model": {
        "reserveTokens": 400000
      }
    }
  }
}
```

对于上下文窗口为 1M 的模型，此覆盖设置会在 token 数超过 600K 时触发压缩，并保留常规的 20000 个近期 token。其他模型仍使用常规的 16384 token 预留量。

键必须是精确、区分大小写的 `provider/modelId` 值，且 model ID 中的斜杠也必须包含在内。每个 `reserveTokens` 和 `keepRecentTokens` 值都会分别从模型覆盖设置回退到常规设置，再回退到内置默认值。值必须是非负安全整数。读取匹配的模型覆盖设置时，如果值无效就会报错；只有省略的字段才会回退到常规设置。模型覆盖条目必须是对象。读取常规 token 设置时，即使当前模型有有效覆盖值，无效的常规设置也会报错。只有省略的常规值才会采用内置默认值。`enabled` 是全局设置，不按模型区分。

这些解析后的值用于手动压缩、所有自动阈值检查、溢出恢复，以及扩展可见的 `preparation.settings`。切换模型会影响后续检查和压缩，但不会更改常规设置。已开始的压缩操作会使用该操作启动时捕获的模型和设置。分支摘要设置不受影响。

全局设置和项目设置都支持覆盖。文件会先递归合并，再进行查找，因此全局的模型专属值优先于项目级回退值；若项目要更改该模型条目，必须覆盖对应的模型条目。详情请参阅[设置](./settings.md#per-model-compaction-overrides)。
