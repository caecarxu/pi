> 本文为简体中文译本；[查看英文原文](../custom-provider.md)。

# 自定义供应商

供应商扩展可将 Pi 连接到需要自定义认证、模型发现、请求处理或流式传输的模型服务。如果该服务已经支持 Pi 兼容的 API，请改为在 `models.json` 中配置。

供应商扩展在 Pi 内运行，可以检查凭据、提示词、工具定义、模型响应和用量。请将其视为受信任代码，并避免记录密钥或供应商载荷。

## 选择最精简的集成方式

| 需求 | 使用方式 |
|---|---|
| 在受支持的 API 后添加模型 | [`models.json`](models.md#配置兼容端点) |
| 更改现有供应商的端点或请求头 | `models.json` 或小型供应商扩展 |
| 动态发现模型 | 带有 `refreshModels` 的供应商 |
| 添加 `/login` 流程 | 带有原生或旧版 OAuth 配置的供应商 |
| 实现不受支持的线协议 | 带有 `stream` 或 `streamSimple` 的供应商 |

供应商扩展属于[扩展](extensions.md)，因此遵循相同的加载、信任、重新加载和错误处理规则。

## 注册供应商

在扩展工厂中调用 `pi.registerProvider()`。Pi 会等待异步工厂完成后再继续启动，因此在那里注册的供应商可用于启动时的模型选择和 `pi --list-models`。

有两种注册形式：

- 从 `@earendil-works/pi-ai` 注册完整的 `Provider`，以使用原生认证、过滤、发现、刷新和流式处理行为。
- 使用 `ProviderConfig` 注册供应商名称，采用现有扩展使用的旧版配置形式。

对于除静态端点和模型元数据外还需要实现其他行为的新集成，优先使用完整的 provider。Pi 会将 `models.json` 中的覆盖配置叠加到已注册的原生 provider 之上。

对于现有供应商，如果只注册 `baseUrl` 或 `headers`，则会保留其内置模型。旧版形式中若提供 `models`，则会替换该供应商在聊天、图像和分类操作中的模型。省略 `type` 时默认为 `"chat"`；图像和分类模型必须显式指定判别字段，并通过 `images` 和 `classifiers` 字段，按其 `api` 值配置对应实现。

### 重定向现有供应商

只注册需要更改的字段。这样可以保留供应商内置的模型目录、认证、API 实现和兼容性设置：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerProvider("anthropic", {
    baseUrl: "https://gateway.example.com/anthropic",
    headers: {
      "X-Gateway-Key": "$GATEWAY_API_KEY",
    },
  });
}
```

当代理或网关保留上游协议时，使用这种形式。不要将内置模型列表复制到扩展中，否则小型端点覆盖就会变成可能逐渐过时的模型目录替换。

### 注册兼容端点

如果服务实现了受支持的协议，但使用自己的模型目录，请注册端点，并且只注册该服务实际提供的模型：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerProvider("acme", {
    name: "Acme AI",
    baseUrl: "https://api.acme.example/v1",
    apiKey: "$ACME_API_KEY",
    api: "openai-completions",
    models: [
      {
        type: "chat",
        id: "acme-chat",
        name: "Acme Chat",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      },
    ],
  });
}
```

如果不需要可执行的扩展行为，这种情况优先使用 `models.json`。当注册依赖运行时发现、自定义认证，或需要与其他扩展功能共享代码时，再使用扩展。

### 注册混合操作模型

混合操作供应商可以同时注册非聊天模型及其实现：

```typescript
pi.registerProvider("media-tools", {
  apiKey: "$MEDIA_TOOLS_API_KEY",
  models: [
    {
      type: "image",
      id: "image-v1",
      name: "Image V1",
      api: "media-images",
      baseUrl: "https://media.example.com/v1",
      input: ["text"],
      output: ["image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    },
    {
      type: "classifier",
      id: "classifier-v1",
      name: "Classifier V1",
      api: "media-classifier",
      baseUrl: "https://media.example.com/v1",
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 64000,
    },
  ],
  images: {
    "media-images": { generateImages: async (model, context, options) => result },
  },
  classifiers: {
    "media-classifier": { classify: async (model, context, options) => result },
  },
});
```

模型级别的 `baseUrl` 优先于供应商端点。如果没有提供 `models` 列表，则会保留所有操作类型的内置模型。不同操作中的相同模型 ID 仍然互相独立，模型专属请求头也分别保留。

扩展初次加载后发起的调用会立即生效。使用 `pi.unregisterProvider()` 移除动态供应商，并恢复其替代的内置行为。

完整注册示例请参阅经过验证的 [GitLab Duo 供应商](../../examples/extensions/custom-provider-gitlab-duo/)；它将流式处理委托给内置 API 实现。

## 提供认证

静态供应商可以从字面值、环境变量插值或命令中解析 API 密钥。这些值使用与 `models.json` 相同的语法：

- `$NAME` 和 `${NAME}` 读取环境变量。
- 以 `!command` 开头的值使用命令输出。
- `$$` 输出字面字符 `$`。
- `$!` 输出字面开头字符 `!`。

如果集成需要存储凭据、自定义解析、供应商专属环境变量或多种登录方式，请使用原生供应商认证。

OAuth 供应商提供显示名称、登录流程、令牌刷新和访问令牌解析。注册后，它会出现在 `/login` 中；Pi 会将返回的凭据保存在 `~/.pi/agent/auth.json`。

OAuth 回调不依赖特定 UI。它们可以打开授权 URL、显示设备代码、报告进度、请求输入，或让用户选择登录方式。请遵循取消操作，并在网络请求期间使用提供的中止信号。

按 Enter 键（`tui.select.confirm`）可打开设备登录 URL 并复制代码，也可以手动登录。供应商可在 `onDeviceCode` 或原生 `AuthEvent` 通知中将 `openBrowserOnConfirm: false` 或 `copyCodeOnConfirm: false` 设为 `false`，从而分别禁用其中一项操作。

切勿将访问令牌、刷新令牌、授权请求头或完整供应商响应写入普通日志。

## 提供和刷新模型

每个模型都需要 ID、显示名称、输入能力和成本元数据。聊天和分类模型还需要上下文窗口；聊天模型需要输出上限并声明是否支持推理；图像模型需要声明其输出模态。除非某个模型需要单独覆盖，否则应在供应商级别选择 API 实现。

当 Pi 应保持空闲提示词缓存处于预热状态时，将 `promptCache.short` 或 `promptCache.long` 设为供应商尽力保证的缓存保留时长（秒）。留空则禁用相应保留时长档位的缓存预热。

兼容性标志用于描述已验证的、发生在其他方面受支持 API 中的差异。不要仅凭端点声称兼容就启用这些标志。

请根据实际服务器确认请求字段和响应行为。

如果可用模型目录来自在线服务，请使用 `refreshModels`。将 `context.signal` 传给阻塞式 I/O，以便调用方取消刷新。

两种注册形式的刷新约定不同：

- 完整的 `Provider` 不返回任何内容。它调用 `context.publish({ update })` 安装 provider 自己管理的模型状态，之后同步的 `getModels()` 会提供最新列表。
- 旧版 `ProviderConfig.refreshModels` 返回混合操作模型定义。Pi 会用返回列表替换该注册项的实时模型，并应用请求的持久化设置。

只有在目录数据需要跨运行保留时，才发布持久化数据。像 llama.cpp 这样的在线服务可以只更新内存中的列表而不持久化；远程目录则可以保留一个快照，以便离线启动。

## 复用受支持的流式 API

只要供应商协议与 Pi AI 的某个 API 实现匹配，就应使用该实现。

受支持的实现包括 Anthropic Messages、OpenAI Chat Completions 和 Responses、Google Generative AI 和 Vertex、Azure OpenAI Responses、Mistral Conversations 以及 Bedrock Converse。

供应商仍可自定义认证、基础 URL、请求头、模型过滤和发现，同时将请求转换与流式处理委托给现有 API 实现。

相比复制流式实现，这种做法更安全，因为它能保留 Pi 的消息转换、工具处理、用量核算、取消处理和兼容性行为。

## 实现自定义流式处理

只有在现有 API 实现都无法表示该服务时，才实现 `streamSimple`。请先研究 [`packages/ai/src/api`](vscode://file//Users/xuzh/git/pi/packages/ai/src/api) 下的实现。

该流接收经过规范化的 `TranscriptContext`。系统提示词和工具声明位于 transcript 的系统消息中，因此应使用 `getCurrentSystemPrompt(context.messages)` 和 `getCurrentTools(context.messages)` 读取，而不要期待 `context.systemPrompt` 或 `context.tools`。如果模型支持在对话中途接收系统消息，可以将这些消息原样传入；否则，调用 `collapseSystemMessages(context)` 将后续系统消息折叠到首条系统消息中。

自定义流必须：

1. 创建一条 assistant 消息，包含供应商、模型、时间戳、待定的停止原因、内容和归零的用量。
2. 请求设置成功后、内容事件发出前，发出一个 `start` 事件。
3. 在更新消息的同时，发出成对的文本、思考和工具调用事件。
4. 完成用量、成本、内容和停止原因的最终设置。
5. 恰好发出一个终止事件（`done` 或 `error`），并关闭流。
6. 将取消转换为中止结果。

请求设置可能在 `start` 之前失败；此时流可以直接以 `error` 结束。如果缺少请求认证信息，也可能在流返回前同步抛出异常。

内容索引对应 assistant 消息中的内容块。必须先更新内容块，再发出其 `partial` 字段会暴露该状态的事件。到 `toolcall_end` 时，工具调用参数必须包含有效的解析后输入。

该流还必须遵循通过 `SimpleStreamOptions` 提供的请求埋点要求：

- 发送供应商请求前调用 `options.onPayload`，并使用其返回的替换载荷。
- 收到响应后、读取响应正文前调用 `options.onResponse`。
- 对每个已解析的供应商事件，在规范化之前等待 `options.onProviderStreamEvent?.(providerEvent, model)` 完成。
- 传递中止信号和供应商专属环境变量。

这些钩子为扩展提供请求检查、响应头事件和供应商流事件观察能力。省略这些钩子会导致该供应商的行为与 Pi 内置供应商不同。

## 报告失败和用量

设置明确的终止停止原因。错误和中止消息必须包含 `errorMessage`；成功消息必须准确填写输入、输出、缓存、令牌总数和成本。

遇到 Pi 已识别的上下文溢出错误时，Pi 可以压缩上下文并重试。如果服务使用未知的错误消息，请在受保护的 `message_end` 处理器中，仅将该供应商的上下文溢出响应规范化为 `context_length_exceeded`。

不要将速率限制或临时供应商故障改写为上下文溢出。这些故障应使用 Pi 的常规重试行为处理。

## 测试集成

至少测试以下情况：

- 普通文本响应和空文本响应
- 工具调用和工具结果
- 支持时的图像输入和图像工具结果
- 用量与成本核算
- 中止行为
- 上下文溢出
- 格式错误或不完整的流
- Unicode 边界
- 跨供应商的会话交接
- 认证刷新和取消

[`packages/ai/test` 下的供应商测试](vscode://file//Users/xuzh/git/pi/packages/ai/test)定义了内置供应商应遵循的行为。请改造相关测试套件，而不要只依赖手动提示进行验证。

开发期间可直接运行扩展；之后将其移到 Pi 可发现的扩展目录，或通过 [Pi 软件包](packages.md)分发。在活动会话中更改了已发现的供应商扩展后，使用 `/reload`。
