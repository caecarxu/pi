> 本文为简体中文译本；[查看英文原文](../sdk.md)。

# SDK

`@earendil-works/pi-coding-agent` 可将 Pi 嵌入 Node.js 或 Bun 进程。它提供 TypeScript 接口，直接访问命令行应用所用的 Agent、会话、工具、模型和资源。

进程内 TypeScript 集成请使用 SDK。若需要与语言无关的子进程或隔离子进程，请参阅 [CLI 集成](cli-integration.md)。

```typescript
import { createAgentSession } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();

try {
  await session.prompt("What files are in the current directory?");
  console.log(session.getLastAssistantText());
} finally {
  session.dispose();
}
```

此示例使用当前工作目录、发现到的资源、已保存的设置和已配置的凭据。`prompt()` 会在运行结束后完成。

[完整的最小示例](../../examples/sdk/01-minimal.ts)也会流式接收文本事件。所有 [SDK 示例](../../examples/sdk/)都会通过仓库的类型检查。

<a id="session-management"></a>

## 会话生命周期

`createAgentSession()` 会创建一个 `AgentSession`。会话拥有一个对话、模型和工具、排队消息、压缩状态以及扩展运行时。

通过 `session.messages`、`session.model`、`session.thinkingLevel`、`session.systemPrompt` 和 `session.getActiveToolNames()` 读取当前状态。

`session.systemPrompt` 只读，返回当前生效的系统提示，包括尚未发送给模型的更改。工具更改会在下次请求前告知模型。

<a id="sessionmanager-api"></a>

### 会话存储

默认情况下，会话会持久化保存。`SessionManager` 管理持久化或内存中的条目树，并跟踪其活动叶节点。创建分支会改变该叶节点，但不会删除已放弃的分支。Pi 重建模型上下文时，管理器会选择活动分支并应用压缩。

已完成的模型上下文以 `SessionManager` 为准。要恢复外部历史记录，请使用包含这些条目的管理器来创建会话。给 `session.agent.state.messages` 赋值不会替换已持久化的上下文。

宿主若不希望产生会话文件，可使用内存管理器：

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});
```

可查看经过类型检查的[会话示例](../../examples/sdk/11-sessions.ts)，了解如何创建、打开、继续、列出和分叉会话。[会话文件格式](session-format.md)定义持久化 JSONL 协议，[消息类型](message-types.md)定义记录中的值。若要查看精确的方法和签名，请使用导出的 TypeScript 声明或 [`session-manager.ts`](../../src/core/session-manager.ts)。

`cwd` 决定用于发现项目资源、上下文文件、会话分组和内置工具路径的工作区。当目标目录不同于 `process.cwd()` 时，请明确传入此值。

`session.dispose()` 会中止活动任务、使扩展上下文失效、断开与 Agent 的连接并移除事件监听器。会话不再需要时请调用它。

`AgentSessionRuntime` 另外提供 `newSession()`、`switchSession()`、`fork()` 和 `importFromJsonl()`。每项操作都会替换活动的 `AgentSession`，并为目标工作目录重新创建服务。

运行时替换后，订阅仍属于旧的 `AgentSession`，必须重新绑定。请参阅[会话运行时示例](../../examples/sdk/13-session-runtime.ts)。

## 发送提示

`prompt()` 会处理扩展命令，并在普通用户消息进入 Agent 前展开基于文件的提示模板。对于已接受的 Agent 运行，调用会在运行结束（包括自动重试）后返回。

会话正在流式运行时发送提示，必须指定是引导当前运行还是跟随当前运行。若未做选择而调用 `prompt()`，调用会被拒绝，不会替你猜测。

引导消息会在当前 Assistant 轮次及其工具调用结束后进入会话。后续消息会在当前运行完成待处理工作后进入。`steer()` 和 `followUp()` 可直接使用这两种行为：如果扩展已处理输入，则返回 `"handled"`；如果输入已排队（包括经扩展转换后的情形），则返回 `"queued"`。

`abort()` 会停止活动操作，并等待会话变为空闲。`waitForIdle()` 则只等待，不会中止操作。

## 订阅事件

宿主需要流式输出时，应在发送提示前订阅：

```typescript
const unsubscribe = session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

try {
  await session.prompt("Explain this repository");
} finally {
  unsubscribe();
}
```

会话事件会报告消息更新、工具执行、排队消息、压缩、重试和运行生命周期变化。

`message_end` 包含最终确定的消息。`agent_end` 表示一次底层 Agent 运行结束，但之后仍可能发生自动恢复或处理排队工作。

宿主需要确认 Pi 不会自动继续运行时，请使用 `agent_settled`。

## 配置会话

未指定覆盖项时，工厂函数会创建 `ModelRuntime`、基于文件的 `SettingsManager`、持久化的 `SessionManager`、`DefaultResourceLoader` 和已配置的默认工具。

每个边界都可以明确指定：

- `modelRuntime`、`model`、`thinkingLevel` 和 `scopedModels` 控制模型访问与选择。
- `settingsManager` 提供合并后的设置或内存配置。
- `sessionManager` 提供持久化或内存中的对话历史。
- `resourceLoader` 提供扩展、技能、提示模板、主题和上下文文件。
- `tools`、`noTools`、`excludeTools` 和 `customTools` 控制活动工具集合。

希望保留标准发现功能并覆盖其中部分选项时，请使用 `DefaultResourceLoader`。若宿主完全负责资源存储和发现，则提供自定义 `ResourceLoader`。

<a id="inlineextension"></a>

可通过 `DefaultResourceLoader` 传入内联扩展工厂。只有当扩展需要在诊断信息和启动输出中拥有稳定名称时，才为它指定 `InlineExtension` 名称。如果某个具名内联扩展设置了 `replaceable: true`，当另一个扩展注册了它加载时会注册的同名工具、命令或标志时，Pi 会跳过该内联扩展，而不是让两者冲突加载。CLI 内置的 codemode、工具搜索和 MCP 扩展都可替换。设置 `builtin: true` 的具名条目不属于内联扩展：它提供 `builtin:<name>` 扩展的代码，其加载方式与已配置的扩展文件相同。它默认加载，会显示在 `pi config` 中；可通过 `extensions` 设置中的 `-builtin:<name>` 或 `noExtensions` 禁用，也可通过 `additionalExtensionPaths: ["builtin:<name>"]` 明确加载。它会在项目目录信任状态确定后加载，因此不能处理 `project_trust`。CLI 的内置扩展使用此方式。

<a id="codemode-mcp"></a>

CLI 将 `codemode`、`tool_search` 和 MCP 作为内置扩展加载；SDK 会话不会自动加载它们。请把 `createCodemodeExtension()`、`createToolSearchExtension()` 和 `createMcpExtension()` 添加到 `DefaultResourceLoader` 的 `extensionFactories` 中。`codemode` 和 `tool_search` 注册时处于未启用状态：可通过 `defaultTools` 设置启用（`["+codemode", "+tool_search"]` 会保留其他默认工具），也可由 MCP 扩展自动启用：对暴露方式为 `codemode` 的服务器启用 `codemode`，对暴露方式为 `deferred` 的服务器启用 `tool_search`。MCP 扩展会在 `session_start` 时连接服务器，因此请调用 `session.bindExtensions()`。请参阅 [Codemode 和 MCP](../../examples/sdk/14-codemode-mcp.ts)。

请查看关于[模型](../../examples/sdk/02-custom-model.ts)、[工具](../../examples/sdk/05-tools.ts)、[扩展](../../examples/sdk/06-extensions.ts)和[完全控制](../../examples/sdk/12-full-control.ts)的专项示例。

## 示例

| 示例 | 用途 |
|---|---|
| [最小示例](../../examples/sdk/01-minimal.ts) | 创建会话、发送提示、观察结果并释放会话 |
| [自定义模型](../../examples/sdk/02-custom-model.ts) | 选择模型和思考等级 |
| [系统提示](../../examples/sdk/03-custom-prompt.ts) | 替换系统提示或在其后追加内容 |
| [技能](../../examples/sdk/04-skills.ts) | 发现、筛选并添加技能 |
| [工具](../../examples/sdk/05-tools.ts) | 选择内置工具及其工作目录 |
| [扩展](../../examples/sdk/06-extensions.ts) | 加载基于文件的扩展和内联扩展 |
| [上下文文件](../../examples/sdk/07-context-files.ts) | 添加或替换项目指令 |
| [提示模板](../../examples/sdk/08-prompt-templates.ts) | 添加文件式提示模板 |
| [凭据](../../examples/sdk/09-api-keys-and-oauth.ts) | 配置凭据和模型存储 |
| [设置](../../examples/sdk/10-settings.ts) | 提供基于文件或内存的设置 |
| [会话](../../examples/sdk/11-sessions.ts) | 控制会话持久化与恢复 |
| [完全控制](../../examples/sdk/12-full-control.ts) | 替换默认发现功能和状态服务 |
| [会话运行时](../../examples/sdk/13-session-runtime.ts) | 安全替换活动会话 |
| [Codemode 和 MCP](../../examples/sdk/14-codemode-mcp.ts) | 添加 `codemode`、`tool_search` 和 MCP 扩展 |

<a id="exports"></a>

## 资源

- [选择模型](models.md)介绍模型选择和兼容端点；[供应商](providers.md)介绍凭据和各供应商的专属设置。
- [配置](configuration.md)说明常规发现机制和设置；[设置](settings.md)列出所有设置。
- [会话与上下文](sessions.md)说明会话行为；[会话格式](session-format.md)定义持久化条目；[消息类型](message-types.md)定义共享记录值。
- [扩展](extensions.md)、[技能](skills.md)和[提示模板](prompt-templates.md)介绍通过 `ResourceLoader` 提供的资源。
- [CLI 集成](cli-integration.md)介绍进程内 SDK 集成的替代方式：打印、JSON 和 RPC。
