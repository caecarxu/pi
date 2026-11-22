> 本文为简体中文译本；[查看英文原文](../models-configuration.md)。

<a id="models-configuration"></a>

# 模型配置

<!-- 此文件由 TypeScript 源码生成。请勿手动编辑；请运行 npm run generate:references。 -->

本文档列出 `models.json` 的字段。示例请参阅[配置兼容端点](models.md#configure-a-compatible-endpoint)，文件位置请参阅[配置](configuration.md#agent-directory)。

在 `models.json` 中添加 `"$schema": "https://pi.dev/schemas/models.schema.json"`，即可启用编辑器校验和自动补全。

<a id="providers"></a>

## 供应商

`providers` 下的每个键都是一个供应商 ID。内置供应商 ID 会修改对应供应商。其他任何 ID 都会添加一个供应商，该供应商必须在供应商或模型级别设置 `baseUrl` 和 `api`。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `name` | string |  | 显示名称。 |
| `baseUrl` | string |  | API 基础 URL。也适用于该供应商的内置模型。 |
| `apiKey` | string |  | 字面密钥、`"$NAME"` 环境变量插值，或 `"!command"` 命令输出。 |
| `api` | string |  | 该供应商模型使用的 API，例如 `"openai-completions"`、`"openai-responses"`、`"anthropic-messages"` 或 `"google-generative-ai"`。 |
| `oauth` | `"radius"` |  | OAuth 登录流程。需要设置 `baseUrl`。 |
| `headers` | object |  | 请求头。值的解析方式与 `apiKey` 相同。 |
| `compat` | [object](#compatibility) |  | 供应商和模型的兼容性覆盖项。 |
| `authHeader` | boolean | `false` | 是否将解析出的 API 密钥作为 `Authorization: Bearer` 发送。 |
| `models` | [`object[]`](#models) |  |  |
| `modelOverrides` | [object](#model-overrides) |  |  |

<a id="models"></a>

## 模型

每个 `models` 条目都会向该供应商添加一个模型。若条目的 `id` 与现有模型匹配，则会替换该模型。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `id` | string |  | 必填。发送给 API 的模型 ID。 |
| `name` | string |  | 显示名称，也用于匹配 `--model` 模式。 |
| `api` | string |  | 覆盖供应商的 `api`。 |
| `baseUrl` | string |  | 覆盖供应商的 `baseUrl`。 |
| `reasoning` | boolean | `false` | 模型是否支持思考。 |
| `thinkingLevelMap` | object |  | 每个思考等级对应的供应商值。`null` 表示不支持该等级。模型未映射的等级会使用供应商默认值，最高到 `high`；`xhigh` 和 `max` 不受支持。 |
| `input` | `("text" \| "image")[]` | `["text"]` |  |
| `inputLimits` | [object](#input-limits) |  |  |
| `cost` | object |  |  |
| `cost.input` | number |  | 必填。每百万 token 的输入费用，单位为美元。 |
| `cost.output` | number |  | 必填。每百万 token 的输出费用，单位为美元。 |
| `cost.cacheRead` | number |  | 必填。每百万 token 的缓存读取费用，单位为美元。 |
| `cost.cacheWrite` | number |  | 必填。每百万 token 的缓存写入费用，单位为美元。 |
| `cost.tiers` | `object[]` |  | 整个请求适用的定价层级。对整个请求采用符合条件的最高输入阈值。 |
| `cost.tiers[].inputTokensAbove` | number |  | 必填。当请求输入总 token 数超过此数量时，使用此层级。 |
| `cost.tiers[].input` | number |  | 必填。每百万 token 的输入费用，单位为美元。 |
| `cost.tiers[].output` | number |  | 必填。每百万 token 的输出费用，单位为美元。 |
| `cost.tiers[].cacheRead` | number |  | 必填。每百万 token 的缓存读取费用，单位为美元。 |
| `cost.tiers[].cacheWrite` | number |  | 必填。每百万 token 的缓存写入费用，单位为美元。 |
| `promptCache` | object |  | 以秒为单位，尽力描述短期和长期保留层级的提示缓存时长。Pi 只会预热时长已知的层级。 |
| `contextWindow` | number | `128000` | 上下文窗口大小，单位为 token。 |
| `maxTokens` | number | `16384` | 最大输出 token 数。 |
| `samplingParams` | object |  | 合并到每个请求正文中的字段。仅适用于兼容 OpenAI 的 API。 |
| `samplingParamsByThinkingLevel` | object |  | 各思考等级对应的 `samplingParams`，合并时优先于 `samplingParams`。 |
| `headers` | object |  | 请求头。值的解析方式与 `apiKey` 相同。 |
| `compat` | [object](#compatibility) |  | 供应商和模型的兼容性覆盖项。 |

<a id="model-overrides"></a>

## 模型覆盖项

每个 `modelOverrides` 键都是一个内置模型或扩展模型的 ID。未知 ID 会被忽略。`cost` 等对象字段会逐字段与模型现有值合并；其他字段则会替换原值。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `name` | string |  | 显示名称，也用于匹配 `--model` 模式。 |
| `reasoning` | boolean |  | 模型是否支持思考。 |
| `thinkingLevelMap` | object |  | 每个思考等级对应的供应商值。`null` 表示不支持该等级。模型未映射的等级会使用供应商默认值，最高到 `high`；`xhigh` 和 `max` 不受支持。 |
| `input` | `("text" \| "image")[]` |  |  |
| `inputLimits` | [object](#input-limits) |  |  |
| `cost` | object |  |  |
| `cost.input` | number |  | 每百万 token 的输入费用，单位为美元。 |
| `cost.output` | number |  | 每百万 token 的输出费用，单位为美元。 |
| `cost.cacheRead` | number |  | 每百万 token 的缓存读取费用，单位为美元。 |
| `cost.cacheWrite` | number |  | 每百万 token 的缓存写入费用，单位为美元。 |
| `cost.tiers` | `object[]` |  | 整个请求适用的定价层级。对整个请求采用符合条件的最高输入阈值。 |
| `cost.tiers[].inputTokensAbove` | number |  | 必填。当请求输入总 token 数超过此数量时，使用此层级。 |
| `cost.tiers[].input` | number |  | 必填。每百万 token 的输入费用，单位为美元。 |
| `cost.tiers[].output` | number |  | 必填。每百万 token 的输出费用，单位为美元。 |
| `cost.tiers[].cacheRead` | number |  | 必填。每百万 token 的缓存读取费用，单位为美元。 |
| `cost.tiers[].cacheWrite` | number |  | 必填。每百万 token 的缓存写入费用，单位为美元。 |
| `promptCache` | object |  | 以秒为单位，尽力描述短期和长期保留层级的提示缓存时长。Pi 只会预热时长已知的层级。 |
| `contextWindow` | number |  | 上下文窗口大小，单位为 token。 |
| `maxTokens` | number |  | 最大输出 token 数。 |
| `samplingParams` | object |  | 合并到每个请求正文中的字段。仅适用于兼容 OpenAI 的 API。 |
| `samplingParamsByThinkingLevel` | object |  | 各思考等级对应的 `samplingParams`，合并时优先于 `samplingParams`。 |
| `headers` | object |  | 请求头。值的解析方式与 `apiKey` 相同。 |
| `compat` | [object](#compatibility) |  | 供应商和模型的兼容性覆盖项。 |

<a id="input-limits"></a>

## 输入限制

请参阅[描述模型输入和缓存](models.md#describe-model-input-and-caching)。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `maxRequestBytes` | integer |  | 序列化后的供应商请求最大字节数。 |
| `images` | object |  |  |
| `images.resize` | object |  | 在新图像加入对话历史前应用的、不会破坏缓存的缩放配置。 |
| `images.resize.maxWidth` | integer |  |  |
| `images.resize.maxHeight` | integer |  |  |
| `images.resize.maxBytes` | integer |  | Base64 编码后的最大负载字节数。 |
| `images.resize.jpegQuality` | integer |  |  |
| `images.maxPerMessage` | integer |  | 单条供应商消息最多接受的图像数。 |
| `images.maxPerRequest` | integer |  | 单个供应商请求最多接受的图像总数。 |

<a id="compatibility"></a>

## 兼容性

`compat` 用于描述经验证的、与 API 标准请求和响应行为不同之处。模型字段会按字段覆盖供应商字段。具体适用字段取决于模型的 `api`。

<a id="openai-completions"></a>

### `openai-completions`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsStore` | boolean |  | 供应商是否支持 `store` 字段。默认值：根据 URL 自动检测。 |
| `supportsDeveloperRole` | boolean |  | 对于推理模型，是否使用 `developer` 而非 `system` 角色发送系统消息（系统提示和对话中途的系统消息）。默认值：仅 `api.openai.com` 为 `true`。 |
| `supportsReasoningEffort` | boolean |  | 供应商是否支持 `reasoning_effort`。默认值：根据 URL 自动检测。 |
| `supportsUsageInStreaming` | boolean | `true` | 供应商是否支持通过 `stream_options.include_usage` 在流式响应中返回 token 用量。 |
| `supportsFinishReason` | boolean | `true` | 流式响应是否包含 `finish_reason`。设为 `false` 时，流结束后 Pi 会推断为 `stop` 或 `toolUse`。 |
| `maxTokensField` | `"max_completion_tokens" \| "max_tokens"` |  | 使用哪个字段设置最大 token 数。默认值：根据 URL 自动检测。 |
| `requiresToolResultName` | boolean |  | 工具结果是否必须包含 `name` 字段。默认值：根据 URL 自动检测。 |
| `requiresAssistantAfterToolResult` | boolean |  | 工具结果之后的用户消息之前是否必须插入一条 assistant 消息。默认值：根据 URL 自动检测。 |
| `requiresNonNullAssistantContent` | boolean |  | 重放没有文本的 assistant 消息（例如仅含工具调用的消息）时，是否必须发送 `""` 而非 `null` 内容。默认值：`false`。 |
| `requiresToolsWithToolHistory` | boolean |  | 当对话包含工具调用或工具结果时，不含工具的请求是否必须发送 `"tools": []`。某些 Anthropic 前置代理（例如较旧版本的 LiteLLM）需要此设置。默认值：`false`，不发送该字段。 |
| `requiresThinkingAsText` | boolean |  | 是否必须将思考块转换为带有 `&lt;thinking>` 分隔符的文本块。默认值：根据 URL 自动检测。 |
| `requiresReasoningContentOnAssistantMessages` | boolean |  | 启用推理时，是否必须为所有重放的 assistant 消息附加空的 `reasoning_content` 字段。默认值：根据 URL 自动检测。 |
| `thinkingFormat` | `"openai" \| "openrouter" \| "deepseek" \| "together" \| "baseten" \| "zai" \| "qwen" \| "chat-template" \| "qwen-chat-template" \| "string-thinking" \| "ant-ling"` |  | 推理或思考参数的格式。省略时，Pi 根据供应商 URL 自动检测。`"openai"` 使用 `reasoning_effort`；`"openrouter"` 使用 `reasoning.effort`；`"deepseek"` 使用 `thinking.type`，并在支持时使用 `reasoning_effort`；`"together"` 使用 `reasoning.enabled`，并在支持时使用 `reasoning_effort`；`"baseten"` 使用可配置的 `chat_template_args`，并在支持时使用 `reasoning_effort`；`"zai"` 使用 `thinking.type`；`"qwen"` 使用顶层的 `enable_thinking`；`"qwen-chat-template"` 使用 `chat_template_kwargs.enable_thinking` 和 `preserve_thinking`；`"chat-template"` 使用可配置的 `chat_template_kwargs`；`"string-thinking"` 使用顶层的 `thinking`；`"ant-ling"` 仅在映射后的 effort 非 `null` 时使用 `reasoning.effort`。 |
| `chatTemplateKwargs` | object |  | 当 `thinkingFormat` 为 `"chat-template"` 时，作为 `chat_template_kwargs` 发送的参数。对于由 Pi 控制的值，可使用 `$var` 搭配 `"thinking.enabled"`、`"thinking.effort"` 或 `"thinking.budget"`。 |
| `chatTemplateArgs` | object |  | 当 `thinkingFormat` 为 `"baseten"` 时，作为 `chat_template_args` 发送的参数。对于由 Pi 控制的值，可使用 `$var` 搭配 `"thinking.enabled"`、`"thinking.effort"` 或 `"thinking.budget"`。 |
| `openRouterRouting` | object |  | OpenRouter 供应商路由偏好，用于控制 OpenRouter 将请求路由到哪些上游供应商。作为请求正文中的 `provider` 字段发送。请参阅 https://openrouter.ai/docs/guides/routing/provider-selection。 |
| `vercelGatewayRouting` | object |  | Vercel AI Gateway 路由偏好，用于控制网关将请求路由到哪些上游供应商。请参阅 https://vercel.com/docs/ai-gateway/models-and-providers/provider-options。 |
| `zaiToolStream` | boolean | `false` | z.ai 是否支持用于流式工具调用增量内容的顶层 `tool_stream`。 |
| `thinkingTokenBudgetField` | `"thinking_token_budget" \| "thinking_budget" \| "thinking_budget_tokens"` |  | 用于通过 `thinkingBudgets` 限制推理 token 的顶层请求字段。这些端点的推理和回答共用 `max_tokens`。`"thinking_token_budget"` 用于 vLLM，`"thinking_budget"` 用于 Qwen、DashScope 或 SGLang，`"thinking_budget_tokens"` 用于 llama.cpp。默认关闭，生成的目录中不会设置此项。 |
| `supportsThinkingTokenBudget` | boolean | `false` | `thinkingTokenBudgetField: "thinking_token_budget"`（vLLM）的别名。优先使用 `thinkingTokenBudgetField`。 |
| `supportsOpenAIGrammarTools` | boolean | `false` | 供应商是否支持采用 Lark 或正则语法格式的 OpenAI 自定义工具。设为 `false` 时，受语法约束的工具会退回普通函数工具。生成的目录会为支持此功能的模型启用该项。 |
| `supportsMidConvoSystemMessages` | boolean | `false` | 确切的模型是否接受对话开始后的 system 或 developer 消息。设为 `false` 时，后续系统消息会合并到开头的系统消息中。生成的目录会为已验证的模型启用该项。 |
| `supportsMidConvoToolAdditions` | boolean | `false` | 系统消息是否可以在对话中途添加工具。需要启用 `supportsMidConvoSystemMessages`。生成的目录会为支持此功能的模型启用该项。 |
| `supportsStrictMode` | boolean | `false` | 供应商是否支持工具定义中的 `strict` 字段。生成的目录会为支持此功能的模型显式启用该项。 |
| `cacheControlFormat` | `"anthropic"` |  | 提示缓存使用的缓存控制约定。Anthropic 会将 `cache_control` 标记应用于系统提示、最后一个工具定义，以及最后一段用户、assistant 或工具结果文本内容。 |
| `sendSessionAffinityHeaders` | boolean |  | 是否发送来自 `options.sessionId` 的会话亲和性数据。默认值：OpenRouter 端点为 `true`，其他情况为 `false`。 |
| `sessionAffinityFormat` | `"openai" \| "openai-nosession" \| "openrouter"` |  | 会话亲和性请求头格式。`openai` 发送 `session_id`、`x-client-request-id` 和 `x-session-affinity`；`openai-nosession` 发送 `x-client-request-id` 和 `x-session-affinity`；`openrouter` 发送 `x-session-id`。不影响 `prompt_cache_key`。默认值：自动检测。 |
| `promptCacheKeyMode` | `"auto" \| "enabled" \| "disabled"` |  | 控制请求字段 `prompt_cache_key`。`auto` 会将其发送到 `api.openai.com`，或在 `supportsLongCacheRetention` 为 `true` 时与长期缓存保留一起发送；`enabled` 会在缓存启用时始终发送，适用于兼容代理；`disabled` 则从不发送。默认值：`auto`。 |
| `supportsLongCacheRetention` | boolean |  | 供应商是否支持较长的提示缓存保留时间（根据格式使用 `prompt_cache_retention: "24h"` 或 Anthropic 风格的 `cache_control.ttl: "1h"`）。默认值：根据供应商和 URL 自动检测。 |
| `vllmPriority` | number |  | 作为顶层请求字段 `priority` 发送给 vLLM 调度器的优先级。数值越低，处理越早；服务器默认值为 `0`。仅在使用 `--scheduling-policy priority` 时有意义。默认关闭，生成的目录中不会设置此项。 |

<a id="openai-responses"></a>

### `openai-responses`

也适用于 `azure-openai-responses` 和 `openai-codex-responses`。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsDeveloperRole` | boolean | `true` | 供应商是否支持使用 `developer` 角色代替 `system`。 |
| `supportsMidConvoSystemMessages` | boolean | `false` | 确切的模型是否接受对话开始后的 developer 或 system 消息。设为 `false` 时，后续系统消息会合并到开头的系统消息中。生成的目录会为已验证的模型启用该项。 |
| `sessionAffinityFormat` | `"openai" \| "openai-nosession" \| "openrouter"` |  | 会话亲和性请求头格式。`openai` 发送 `session-id` 和 `x-client-request-id`；`openai-nosession` 发送 `x-client-request-id`；`openrouter` 发送 `x-session-id`。不影响 `prompt_cache_key`。默认值：自动检测。 |
| `promptCacheKeyMode` | `"auto" \| "enabled" \| "disabled"` |  | 控制请求字段 `prompt_cache_key`。只要缓存启用，`auto` 和 `enabled` 都会发送该字段；`disabled` 从不发送，适用于会拒绝该字段的兼容代理。默认值：`auto`。 |
| `supportsLongCacheRetention` | boolean | `true` | 供应商是否支持较长的提示缓存保留时间。GPT-5.6 及更新模型使用 `prompt_cache_options.ttl: "30m"`；较早的模型使用 `prompt_cache_retention: "24h"`。 |
| `supportsStrictMode` | boolean |  | 供应商是否支持严格模式的 JSON Schema 函数工具。默认值因 API 而异；生成的 OpenAI 模型会显式启用该项。 |
| `supportsOpenAIGrammarTools` | boolean | `false` | 是否以 Lark 或正则语法格式发送 OpenAI 自定义工具。设为 `false` 时，受语法约束的工具会退回普通函数工具。生成的目录会为支持此功能的模型启用该项。 |
| `supportsAdditionalTools` | boolean | `false` | 模型是否支持以消息为锚点的 `additional_tools` 输入项。 |
| `supportsToolSearch` | boolean | `false` | 模型是否支持由客户端执行、用于对话记录锚定式附加项的工具搜索。 |
| `supportsExplicitPromptCacheMode` | boolean | `false` | 模型是否接受 `prompt_cache_options`。较旧的 OpenAI 模型会拒绝此参数。 |
| `supportsMidConvoEffort` | boolean | `false` | 是否将思考等级变更作为 `configuration_update` 输入项发送，而不是更改 `reasoning.effort`，这样变更后提示缓存仍可保留。适用于 `openai-responses` 和 `openai-codex-responses` API；在 `openai` 供应商使用 Sign in with ChatGPT 时会忽略此项。 |
| `supportsMaxOutputTokens` | boolean | `true` | 供应商是否接受 `max_output_tokens`。某些 Codex 协议网关会拒绝此字段。 |

<a id="anthropic-messages"></a>

### `anthropic-messages`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsEagerToolInputStreaming` | boolean | `true` | 供应商是否接受每个工具单独设置的 `eager_input_streaming`。设为 `false` 时，Anthropic 供应商会从 `tools[]` 中省略 `eager_input_streaming`，并为启用工具的请求发送旧版 `fine-grained-tool-streaming-2025-05-14` beta 请求头。 |
| `supportsLongCacheRetention` | boolean | `true` | 供应商是否通过 `cache_control.ttl` 支持 Anthropic 长期缓存保留。 |
| `sendSessionAffinityHeaders` | boolean |  | 启用缓存时，是否在 `options.sessionId` 存在的情况下发送 `x-session-affinity`。Fireworks 等通过会话亲和性路由提示缓存的供应商需要此项；向同一副本发送请求可最大限度提高缓存命中率。默认值：OpenRouter 端点为 `true`，其他情况为 `false`。 |
| `sessionAffinityFormat` | `"openrouter"` |  | 会话亲和性格式。`openrouter` 发送 `x-session-id`；未设置时发送 `x-session-affinity`。 |
| `supportsCacheControlOnTools` | boolean | `true` | 供应商是否支持在工具定义中使用 Anthropic 风格的 `cache_control` 标记。设为 `false` 时，会从工具参数中省略 `cache_control`。某些兼容 Anthropic 的供应商（如 Fireworks）不支持在工具上使用此字段，可能会拒绝或忽略它。 |
| `supportsTemperature` | boolean | `true` | 模型是否接受 Anthropic 的 `temperature` 请求字段。Claude Opus 4.7 及更新模型会拒绝非默认值。 |
| `forceAdaptiveThinking` | boolean | `false` | 是否无论模型 ID 为何都强制使用自适应思考（`thinking.type: adaptive` 加 `output_config.effort`）。需要自适应思考的内置模型会在生成的元数据中启用此项。对于上游要求自适应格式的任何模型，自定义 Anthropic 兼容供应商都可以将此项设为 `true`。对于被覆盖的内置模型，可设为 `false` 以选择退出。 |
| `allowEmptySignature` | boolean | `false` | 是否重放空的思考签名，而不是将思考转换为文本。 |
| `supportsStrictTools` | boolean | `false` | 供应商是否支持 Anthropic 严格工具架构。生成的 Anthropic 模型会显式启用该项。 |
| `supportsMidConvoEffort` | boolean | `false` | 确切的模型传输协议是否支持仅包含 effort 的系统消息和思考绑定控制。 |
| `supportsMidConvoSystemMessages` | boolean | `false` | 确切的模型是否接受对话中的 system 角色消息。设为 `false` 时，后续系统消息会合并到顶层系统提示中。 |
| `supportsMidConvoToolChanges` | boolean | `false` | 确切的模型是否接受对话中途的 `tool_addition` 和 `tool_removal` 块。需要启用 `supportsMidConvoSystemMessages`。 |
| `supportsMessageThreads` | boolean |  | 端点是否支持 Anthropic 消息线程；使用会话 ID 的请求可只发送新消息，并从之前的回复继续。默认值：`baseUrl` 位于 `api.anthropic.com` 时为 `true`，否则为 `false`。对于会转发线程请求字段的网关，可设为 `true`。 |
| `allowedFallbackModels` | `object[]` |  | Anthropic 在服务器端拒绝请求回退时接受的模型，并附带返回的回退响应所需的本地定价元数据。若未设置或为空，调用方必须省略回退模型；对于没有获准回退目标的模型，Anthropic 会拒绝此字段。 |

<a id="bedrock-converse-stream"></a>

### `bedrock-converse-stream`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsStrictMode` | boolean | `false` | 模型是否支持 Bedrock 严格工具架构。 |

<a id="mistral-conversations"></a>

### `mistral-conversations`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsMidConvoSystemMessages` | boolean | `false` | 确切的模型是否接受对话开始后的系统消息。设为 `false` 时，后续系统消息会合并到开头的系统消息中。 |
| `supportsStrictMode` | boolean | `false` | 模型是否支持严格（受架构约束的）函数工具。 |

<a id="google-generative-ai"></a>

### `google-generative-ai`

也适用于 `google-vertex`。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsStrictMode` | boolean |  | 模型是否通过 Gemini 的 `VALIDATED` 函数调用模式强制使用严格工具。默认值：模型 ID 包含 `gemini-3` 或更高版本时为 `true`，例如 `gemini-3-pro` 或 `vendor-gemini-4-argon`；其他情况为 `false`。若以不含版本号的 ID 提供 Gemini 3 及更新模型，可设为 `true`。 |

<a id="typesafe-system-one"></a>

### `typesafe-system-one`

也适用于 `cloudflare-workers-ai-system-one`。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `imageInput` | `"assets" \| "images" \| "state-image-urls"` |  | 服务接收分类器图像的方式。`"assets"` 发送 TypeSafe 的 assets 映射（PNG 和 JPEG），并从 state 引用图像，这是 TypeSafe 和 Workers AI 上的 Jev 所需的格式。`"images"` 发送 Clef 的图像列表（数据 URL，支持 PNG、JPEG 和 WebP，最多四张），这是 Workers AI 上的 Clef 所需的格式。`"state-image-urls"` 会在 state 前放置 `image_url` 部分，这是 OpenRouter 所需的格式；OpenRouter 会丢弃 assets 且不报错。根据供应商、`baseUrl` 和模型 ID 自动检测。分类模型从供应商级 `compat` 读取此项；模型和 `modelOverrides` 条目只适用于聊天模型。 |
| `sendImageOptInHeader` | boolean |  | 请求中包含图像时，是否发送 `TypeSafe-Danger-Zone-Images: true` 请求头；TypeSafe 自有 API 的实验性图像输入要求此请求头。对于 `typesafe-system-one` API，默认值为 `true`，除非检测到模型属于 OpenRouter。 |
