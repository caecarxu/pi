> 本文为简体中文译本；[查看英文原文](../models.md)。

# 选择模型

使用内置供应商时，先运行 `/login`，然后通过 `/model` 选择模型。只有当 Pi 尚未包含所需供应商或端点时，才需要自定义模型配置。

## 选择连接方式

| 你拥有的资源 | 建议设置 |
|---|---|
| 受支持的订阅 | 通过 `/login` 登录 |
| 供应商 API 密钥 | 通过 `/login` 保存，或设置相应环境变量 |
| 本地 GGUF 模型 | 将 Pi 连接到 llama.cpp 路由器 |
| 兼容 OpenAI、Anthropic 或 Google API 的端点 | 将其添加到 `models.json` |
| 使用自定义协议或认证流程的供应商 | 构建或安装供应商扩展 |

查看[模型目录](https://pi.dev/models)了解当前供应商、模型 ID、能力、上下文限制和价格。Pi 启动时使用内置目录，也可以从 pi.dev 加载更新的目录数据。缓存的目录数据可离线使用；运行 `pi update --models` 可强制刷新。

## 认证

运行 `/login` 并选择供应商。Pi 会将凭据保存在 [`auth.json`](configuration.md#agent-directory) 中。运行 `/logout` 可删除某个供应商的已保存凭据。

你也可以通过供应商的环境变量提供 API 密钥。这适用于 CI 等不希望 Pi 写入凭据的环境。[供应商](providers.md)列出了变量和各供应商的设置说明。

配置了多个凭据来源时，Pi 的使用顺序是：运行时 `--api-key`、已保存的 `auth.json` 凭据、`models.json` 中的 `apiKey`，最后是供应商环境变量或环境中可用的云端凭据。供应商扩展可以定义自己的认证行为。

请妥善保护 `auth.json` 和凭据命令。信任某个项目后，项目设置和扩展可以在 Pi 进程中执行。加载不可信目录中的配置前，请阅读[安全运行 Pi](security.md)。

## 选择模型

运行 `/model` 搜索可用模型。选择器会显示认证信息可用的供应商所提供的模型。在模型上按 `Ctrl+S` 可将其保存为新会话的默认模型。

运行 `/thinking` 选择当前模型的思考等级。在该界面按 `Ctrl+S` 可保存启动时使用的等级。Pi 会根据所选模型支持的等级限制可选项。

按 `Ctrl+P` 循环切换可用模型。使用 `/scoped-models` 控制此循环并保存选择，也可以通过[设置](settings.md#model-cycling)配置模型匹配模式。

会话会记录模型和思考等级的更改。恢复会话时会还原这些选择，但不会改变新会话的默认值。

## 连接本地模型

Pi 直接集成了 llama.cpp 路由器。路由器会发现 GGUF 文件，并按需加载模型。Pi 的 `/llama` 命令管理路由器，`/model` 则选择其中已加载的模型。

有关服务器启动、模型布局、下载和连接故障排除，请参阅[使用 llama.cpp 运行本地模型](llama-cpp.md)。

对于 Ollama、LM Studio、vLLM、SGLang 和其他兼容服务器，可在 `models.json` 中[配置兼容端点](#configure-a-compatible-endpoint)。

## 配置兼容端点

当某端点使用 Pi 已支持的 API 时，可通过 [`models.json`](configuration.md#agent-directory) 配置它。大多数 Ollama、LM Studio、vLLM、SGLang 和代理部署都符合这一条件。

```json
{
  "$schema": "https://pi.dev/schemas/models.schema.json",
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

虚设密钥会让 Pi 显示该模型；Ollama 会忽略此密钥。对于需要认证的端点，`apiKey` 和请求头的值可以使用 `$NAME` 或 `${NAME}` 环境变量插值、字面值，或以 `!command` 开头的命令。`$$` 和 `$!` 分别表示字面字符 `$` 和 `!`。`models.json` 中的命令会在每次请求时运行，Pi 不会缓存结果。

打开 `/model` 时 Pi 会重新加载此文件。`models` 条目会在其所在供应商下添加模型，或替换 ID 相同的模型。使用 `modelOverrides` 可更改现有内置模型或扩展模型的元数据，而不替换供应商的模型列表。未知的覆盖 ID 会被忽略。

要让内置供应商通过代理访问，只需设置它的 `baseUrl`。模型和认证保持不变：

```json
{
  "providers": {
    "anthropic": { "baseUrl": "https://proxy.example.com/v1" }
  }
}
```

所有字段请参阅[模型配置参考](models-configuration.md)。

### 描述模型输入和缓存

使用 `inputLimits.images.resize` 控制 Pi 在将新图像附件、`read` 结果和工具结果中的图像保存到对话历史前如何编码：

```json
{
  "id": "vision-model",
  "input": ["text", "image"],
  "inputLimits": {
    "images": {
      "resize": {
        "maxWidth": 1568,
        "maxHeight": 1568,
        "maxBytes": 524288,
        "jpegQuality": 75
      }
    }
  }
}
```

`maxBytes` 限制 base64 编码后的内容大小。未指定的缩放字段会采用保守默认值：2000 × 2000 像素、4.5 MiB 编码大小和 JPEG 质量 80。图像只编码一次；切换模型不会重写历史图像。目录也可以通过 `inputLimits.maxRequestBytes`、`images.maxPerMessage` 和 `images.maxPerRequest` 描述硬性请求限制，但 Pi 目前不会基于这些限制重写或拒绝历史记录。

<a id="prompt-cache-lifetimes"></a>

使用 `promptCache` 声明供应商对 `short` 或 `long` 保留等级尽力提供的缓存时长（秒）：

```json
{ "id": "claude-sonnet-5", "promptCache": { "short": 300, "long": 3600 } }
```

如果已公布的是一个范围，请使用其中较保守的时长。若模型没有当前保留等级对应的缓存时长，则不会参与缓存预热。`modelOverrides` 条目可为内置或扩展模型设置 `inputLimits` 或 `promptCache`，包括通过已验证代理访问的模型。请参阅[模型与思考](settings.md#model-and-thinking)中的 `cacheWarming`。

### 按思考等级配置采样参数

兼容 OpenAI 的 API 支持自由形式的 `samplingParams` 模型默认值，以及 `samplingParamsByThinkingLevel` 覆盖项。后者使用 Pi 的思考等级键（`off`、`minimal`、`low`、`medium`、`high`、`xhigh` 和 `max`），而不是 `thinkingLevelMap` 中的供应商值：

```json
{
  "id": "qwen-thinking-model",
  "reasoning": true,
  "samplingParams": {
    "temperature": 1.0,
    "top_p": 0.95
  },
  "samplingParamsByThinkingLevel": {
    "off": {
      "temperature": 0.7,
      "top_p": 0.8
    },
    "high": {
      "top_k": 20
    }
  }
}
```

Pi 会先将不受支持的思考等级限制到有效范围，再依次合并模型 `samplingParams`、当前等级的覆盖值和请求级 `samplingParams`。同一键出现多个值时，以后面的值为准。缺少的等级会继承模型默认值。`modelOverrides` 会按键合并每个等级的条目与基础模型。这些字段只适用于 `openai-completions`、`openai-responses` 和 `azure-openai-responses`；其他 API 会忽略它们。

兼容性设置应描述已经验证过的端点请求或响应差异。不要仅凭端点宣称兼容 OpenAI 或 Anthropic 就启用这些设置。

## 使用分类模型

分类模型不进行对话。它们针对 JSON 状态回答类型化问题：从多个选项中选择、回答是或否，或给出评分；每种回答都会附带概率。Pi 内置以下模型：TypeSafe 的 Jev（由这些供应商提供）、Cloudflare Workers AI 和 OpenRouter 上的 Clef、Clef Flash 和 Clef Omni，OpenAI 通过[决策 API](https://developers.openai.com/api/docs/guides/decisions)提供的 GPT-6 Luna，以及 GitHub Copilot 提供的 Microsoft-Decision-1：

| 供应商 | 模型 ID | 认证方式 |
|---|---|---|
| `typesafe` | `jev-latest` | `TYPESAFE_API_KEY` |
| `openrouter` | `typesafe/jev-1.13`、`typesafe/jev-1.14`、`~typesafe/jev-latest`、`cloudflare/clef`、`cloudflare/clef-flash`、`cloudflare/clef-omni` | `OPENROUTER_API_KEY` 或 `/login` |
| `cloudflare-workers-ai` | `typesafe/jev`、`typesafe/jev-1.14.0`、`@cf/cloudflare/clef`、`@cf/cloudflare/clef-flash`、`@cf/cloudflare/clef-omni` | `CLOUDFLARE_API_KEY` 和 `CLOUDFLARE_ACCOUNT_ID` |
| `vercel-ai-gateway` | `typesafe-ai/jev` | `AI_GATEWAY_API_KEY` |
| `opencode` | `jev-1.13`、`jev-1.13-free` | `OPENCODE_API_KEY` |
| `openai` | `gpt-6-luna` | `OPENAI_API_KEY` |
| `github-copilot` | `microsoft-decision-1` | `COPILOT_GITHUB_TOKEN` 或 `/login` |

llama.cpp 路由器上的聊天模型也会作为分类模型列出，参见[分类](llama-cpp.md#classification)。

OpenAI 决策 API 需要 API 密钥。ChatGPT 登录凭据不能用于该 API，因此即使设置了 `OPENAI_API_KEY`，通过 `/login` 登录了 `openai` 后，`gpt-6-luna` 也不会显示为可用；请退出 `openai` 登录，再使用该密钥。该 API 会拒绝超过 922K 个 token 的输入；不过，耗时超过约 5 秒的请求（目前约为超过 600K 个输入 token）会因网关超时而失败。

分类模型不会显示在 `/model` 中。模型通过 [`codemode`](cli.md#enable-codemode) 工具调用；若 MCP 服务器未启用它，默认情况下此工具处于关闭状态。在[设置](settings.md#tools)中指定 `"defaultTools": ["+codemode"]` 即可启用。之后，脚本可通过 `models.getAvailableOfType("classifier")` 列出分类模型，并调用 `models.classify(model, { state, questions })`：

```js
const jev = await models.getModelOfType("classifier", "typesafe", "jev-latest");
const result = await models.classify(jev, {
  state: { message: "The change works, thanks." },
  questions: {
    approved: {
      type: "bool",
      instructions: "Does the user approve of the result?",
      criteria: { true: "Approval", false: "No approval" },
    },
  },
});
return result.answers;
```

[Codemode](codemode.md#classify)介绍问题和答案类型。

`input` 包含 `"image"` 的分类模型也可以判断通过 `images` 传入的图像；其他分类模型收到图像时会返回错误。GPT-6 Luna、来自 `typesafe` 和 `cloudflare-workers-ai` 的 Jev、来自 `cloudflare-workers-ai` 的 Clef，以及目录中标明支持图像输入的 OpenRouter 模型都支持图像输入。Jev 支持 PNG 和 JPEG；TypeSafe 自有 API 上的图像输入功能仍属实验性质。Clef 支持 PNG、JPEG 和 WebP，每个请求最多四张。来自 `vercel-ai-gateway` 和 `opencode` 的 Jev 只支持文本。

每种 System One 服务都使用自己的请求格式接收图像，该格式由模型的 `compat.imageInput` 指定。内置模型已设置此字段，因此覆盖供应商的 `baseUrl` 后该设置仍然有效。通过自定义供应商代理其他服务的分类模型时，应在 `models.json` 的供应商级 `compat` 中设置此项，参见 [System One 兼容性](models-configuration.md#typesafe-system-one)。尤其要注意，OpenRouter 会以 TypeSafe 格式响应请求而不报错，却会丢弃图像。

服务报告 token 数量时（所有 System One 服务均如此），`result.usage` 会包含 token 数和费用。Pi 会把脚本中分类调用的用量加入 `codemode` 工具结果，因此会计入页脚和 `/session` 显示的会话费用。费用按模型目录价格计算；没有目录价格的模型（例如 TypeSafe 直连的 `jev-latest`）只报告 token，不计费用。

扩展无需使用 codemode，可通过 `ctx.modelRegistry.classify()` 调用分类器。[虚拟模型](virtual-models.md#route-requests)也可以用分类器路由请求；示例见 `jev-router.ts`。

## 使用图像模型

图像模型会根据提示和可选的输入图像生成图像。Pi 会在 `openrouter` 供应商下列出 OpenRouter 的图像模型，例如 `google/gemini-2.5-flash-image` 和 `black-forest-labs/flux.2-pro`；它们使用与 OpenRouter 聊天模型相同的 `OPENROUTER_API_KEY` 或 `/login` 凭据。

与分类模型一样，图像模型不会显示在 `/model` 中；需要通过 [`codemode`](cli.md#enable-codemode) 工具调用。脚本使用 `models.getAvailableOfType("image")` 列出模型，并调用 `models.generateImages(model, { input })`。结果的 `output` 中包含 base64 图像块；使用 `image()` 将其附加到 `codemode` 结果，模型便能看到图像：

```js
const painter = await models.getModelOfType("image", "openrouter", "google/gemini-2.5-flash-image");
const result = await models.generateImages(painter, {
  input: [{ type: "text", text: "A red fox in the snow, watercolor" }],
});
if (result.stopReason !== "stop") return result.errorMessage;
for (const block of result.output) if (block.type === "image") image(block);
```

`input` 也可以包含 `{ type: "image", data, mimeType }` 图像块，用于编辑或作为参考。与分类调用类似，Pi 会将脚本中图像调用的用量加入 `codemode` 工具结果。生成的图像不会保存到磁盘。[Codemode](codemode.md#generate-images)介绍完整 API。

扩展无需使用 codemode，可通过 `ctx.modelRegistry.generateImages()` 生成图像。

## 添加自定义供应商

如果供应商需要自定义流式响应、模型发现或认证行为，请使用扩展。扩展工作流程请参阅[自定义供应商](custom-provider.md)。

## 故障排除

### 模型没有显示

确认该供应商拥有可用的认证信息。自定义模型可以从 `models.json` 加载，但在 Pi 能解析凭据之前不会显示在 `/model` 中。对于 llama.cpp，只有路由器当前已加载的模型才会显示。

### 认证只在一个 shell 中有效

检查密钥是否来自环境变量而非 `auth.json`。环境变量必须存在于启动 Pi 的进程中。

### 远程机器上的登录打开了浏览器

如果供应商提供无头认证流程，请完成该流程。有些供应商允许你将最终重定向 URL 或授权码粘贴回 Pi。请参阅[交互式认证](providers.md#authenticate-interactively)。

### 兼容端点拒绝请求

检查 `models.json` 中的 API 类型和兼容性设置。上游服务器必须支持相应的请求字段和行为。
