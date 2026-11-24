> 本文为简体中文译本；[查看英文原文](../codemode.md)。

# Codemode

`codemode` 工具允许模型编写 JavaScript 脚本，调用 Pi 的其他工具并运行非 LLM 模型，例如分类器和图像模型。只有脚本输出会传给模型，因此脚本可以并行执行调用，并在大型结果到达模型之前筛选内容。启用方法见[启用 codemode](cli.md#enable-codemode)。

```mermaid
flowchart LR
    model[模型] -->|JavaScript| sandbox[QuickJS 沙箱]
    sandbox -->|工具和模型调用| host[Pi 宿主桥接层]
    host --> tools[已选工具和非 LLM 模型]
    tools --> host --> sandbox
    sandbox -->|仅脚本输出| model
```

宿主工具和执行路径分别由 [`tool.ts`](vscode://file//Users/xuzh/git/pi/packages/coding-agent/src/extensions/codemode/tool.ts:1:1)、[`execute.ts`](vscode://file//Users/xuzh/git/pi/packages/coding-agent/src/extensions/codemode/execute.ts:1:1) 和 [`worker.ts`](vscode://file//Users/xuzh/git/pi/packages/coding-agent/src/extensions/codemode/worker.ts:1:1) 实现。沙箱本身没有文件系统或网络 API；脚本只能经由桥接层访问这些能力。

## 脚本

工具输入是原始 JavaScript 源码，不是 JSON，也不能放在 Markdown 代码围栏中。脚本会作为异步函数体在 QuickJS 沙箱中运行，因此可以在顶层使用 `await` 和 `return`。沙箱没有 Node API、文件系统、网络或计时器；脚本只能通过工具和 `models` 与外部交互。

脚本可以用一行选项开头。它必须是第一行；如果出现在其他位置，本次调用会在脚本运行前失败：

```js
// @options: {"max_output_tokens": 2000, "timeout_ms": 60000}
```

- `max_output_tokens`（默认 `10000`）限制输出长度。超长输出会保留开头和结尾，完整文本会写入临时文件，结果中会包含文件路径。如果脚本输出超过 16777216 个字符的文本和 base64 图像数据，或调用 `text()`、`image()` 和 `console` 超过 100000 次，脚本会失败；大数据应通过工具写入文件。
- `timeout_ms` 为整个脚本设定硬性截止时间，包括等待空闲 worker 的时间。默认不设限。图像生成可能需要数分钟，因此生成图像的脚本不要设置过短的截止时间。

结果以 `Script completed` 或 `Script failed`、耗时和输出开头。文本和图像按顺序逐项显示，每项单独一行。如果输出包含多个文本项（由 `text()` 或 `return` 产生），每项前会显示 `==> text N/M <==`。`console` 调用会在之后统一放入 `<console_output>` 块中，每次调用占一行。失败的脚本仍会保留部分输出，随后附上 `Script error:` 和错误内容。工具调用是真实执行的：失败前已完成的调用不会回滚。脚本结束时仍在运行的调用会被取消，未等待的 Promise 会被丢弃。

## 全局对象

| 全局对象 | 用途 |
|---|---|
| `tools.<name>(args)` | 调用工具。参见[调用工具](#调用工具)。 |
| `text(value)` | 向输出添加一项文本。字符串按原样添加，其他值会转为 JSON。 |
| `image(value)` | 向输出添加图像：base64 `data:` URL、`{ image_url }` 对象，或图像块 `{ type: "image", data, mimeType }`（例如 MCP 工具和 `models.generateImages()` 返回的内容）。不支持远程 URL。PNG、JPEG、GIF 和 WebP 均可用。每张图像也会保存到临时文件，结果会在图像前给出文件路径。 |
| `console.log(...)` | 在其他输出之后，将参数以空格连接，添加到 `<console_output>` 块的一行中。`info`、`warn`、`error` 和 `debug` 行为相同。 |
| `return value` | 顶层 `return` 会像 `text()` 一样添加值。 |
| `exit()` | 成功结束脚本。 |
| `store(key, value)` / `load(key)` | 在后续 `codemode` 调用之间保存小型 JSON 值。参见[保存值](#保存值)。 |
| `ALL_TOOLS` | 所有可调用工具，格式为 `{ name, description }`，包括描述中未列出的工具。 |
| `searchTools(query, { limit?, namespace? })` | 按相关性对可调用工具排序（BM25，默认上限为 8）。解析为 `{ name, description }[]`。 |
| `describeTool(name)` | 解析为工具描述和 TypeScript 声明；若不存在则为 `undefined`。 |
| `describeNamespace(name)` | 解析为 `{ name, description?, instructions?, tools }`，适用于 MCP 服务器等命名空间；不存在则为 `undefined`。 |
| `models` | 列出并运行非 LLM 模型。参见[模型](#模型)。 |

## 调用工具

会话可调用的每个工具都是 `tools` 上的一个方法，方法名与工具标识符相同；无效的 JavaScript 标识符字符会替换为 `_`，例如 MCP 工具 `mcp__dev-radius__search` 对应 `tools.mcp__dev_radius__search`。每个方法接收一个包含工具参数的对象。

调用结果取决于工具类型：

- 带输出 schema 的工具会解析为结构化值。`bash` 解析为 `{ output, truncated, full_output_path?, exit_code, wall_time_seconds }`，即使退出码非零也相同。`output` 并不受模型可见的 2000 行或 50 KB 限制：它最多包含 1 MiB；更长的输出会保留开头和结尾各 512 KiB，中间插入省略标记，并将 `truncated` 设为 `true`，完整输出则放在 `full_output_path`。
- MCP 工具会解析为 `CallToolResult`，包括 `isError` 和 `structuredContent`。
- `read` 会解析为文件文本；读取图像时则解析为图像块 `{ type: "image", data, mimeType, note }`，可通过 `image()` 显示。`data` 是模型可见的 base64 图像，`note` 是随附文本，例如缩放提示。
- 其他工具（例如 `edit` 和 `write`）会解析为文本输出。

调用失败、被阻止或参数无效时，Promise 会以携带工具错误文本的 `Error` 拒绝。使用 `Promise.allSettled()` 可以保留成功调用的结果。

`codemode` 描述会列出可用工具及其 TypeScript 声明，并按命名空间分组（例如某个 MCP 服务器）。带 `deferred` 暴露级别的工具（包括默认 `codemode` 暴露级别的 MCP 工具）不会列在其中，这样 MCP 服务器连接后描述也无需改变。可通过 `searchTools()`、`describeTool()`、`describeNamespace()` 或筛选 `ALL_TOOLS` 查找这些工具。

当 `codemode` 处于活动状态时，[设置](settings.md#tools)中的 `codemode.mode` 决定其他工具的呈现方式。设为 `on`（默认值）时，已声明工具继续保持声明状态，描述会说明如何从脚本调用它们。设为 `only` 时，工具对模型隐藏，改为列入 `codemode` 描述中，模型只能通过脚本调用。`codemode` 描述、`describeTool()` 和 `ALL_TOOLS` 中的工具声明均包含工具的提示指引，因为系统提示规则只覆盖已声明的工具。

## 保存值

`store(key, value)` 会以字符串键保存 JSON 值，供之后的 `codemode` 调用使用；保存 `undefined` 会删除对应键。只有脚本成功时写入才会保留：每次成功且保存了值的脚本都会向会话追加一个 `codemode-store` 自定义条目，因此恢复会话后这些值仍然存在，并且每个分支只能看到沿自身路径写入的值。

该存储适用于 ID、游标或摘要等小型状态。单个值的 JSON 字符数上限为 262144，所有值合计上限为 1048576。不要保存图像数据；请用 `image()` 显示图像，它也会把图像存入临时文件。

## 模型

`models` 可以访问模型目录，并使用会话凭据运行非 LLM 模型：分类器（针对 JSON 状态及部分模型支持的图像回答有类型的问题）和图像模型（生成图像）。聊天模型会列出，但不能通过脚本运行。可用分类器和图像模型见[使用分类器模型](models.md#use-classifier-models)和[使用图像模型](models.md#use-image-models)。

```ts
type ModelType = "chat" | "image" | "classifier";

/** 目录条目。`provider` 和 `id` 用于标识模型；其他字段取决于类型。 */
interface ModelInfo {
  type?: ModelType;
  provider: string;
  id: string;
  name: string;
  api: string;
  input: ("text" | "image")[];
  contextWindow?: number;
  [key: string]: unknown;
}

declare const models: {
  /** 某类型的所有已知模型；可选地限定 provider。 */
  getModelsOfType(type: ModelType, provider?: string): Promise<ModelInfo[]>;
  /** 某类型中凭据可用的模型。 */
  getAvailableOfType(type: ModelType, provider?: string): Promise<ModelInfo[]>;
  /** 一个目录条目；不存在时为 undefined。 */
  getModelOfType(type: ModelType, provider: string, id: string): Promise<ModelInfo | undefined>;
  /** 回答关于 `context.state` 的 `context.questions`；答案按问题 ID 存放在 `result.answers` 中。 */
  classify(model: ModelInfo, context: ClassifierContext): Promise<ClassifierResult>;
  /** 根据 `context.input` 中的文本和图像块生成图像；用 image() 显示 `result.output` 块。可能需要数分钟。 */
  generateImages(model: ModelInfo, context: ImagesContext): Promise<ImagesResult>;
};
```

`classify()` 和 `generateImages()` 只使用 `model` 的 `provider` 与 `id`，因此 `{ provider, id }` 也适用。它们遇到 provider 错误时不会抛出异常：请检查 `stopReason` 和 `errorMessage`。每个脚本最多同时运行四个此类调用；更多调用会等待空闲名额，所以可以对许多条目使用 `Promise.all()`。它们的用量会加入 `codemode` 工具结果，并计入会话费用。

不同 provider 的模型 ID 可能不同，例如 `typesafe/jev-latest` 和 `openrouter/typesafe/jev-1.13`。请用 `models.getAvailableOfType(type)` 查找当前凭据可用的 ID。

### 分类

```ts
interface ClassifierContext {
  /** 要分类的数据。 */
  state: Record<string, unknown>;
  /** 与 `state` 一起评估的图像。只有 `input` 包含 "image" 的模型接受此参数。 */
  images?: { type: "image"; data: string; mimeType: string }[];
  /** 按 ID 列出的问题。一次调用会回答所有问题。 */
  questions: Record<string, ClassifierQuestion>;
}

type ClassifierQuestion =
  /** 选择一个标签。`criteria` 将标签映射到其含义。 */
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  /** 按有序尺度打分。`criteria` 按从低到高描述各级别。 */
  | { type: "score"; instructions: string; criteria: string[] }
  /** 回答是或否。 */
  | { type: "bool"; instructions: string; criteria: { true: string; false: string } };

interface ClassifierResult {
  provider: string;
  model: string;
  /** 按问题 ID 索引的答案。 */
  answers: Record<string, ClassifierAnswer>;
  usage?: ModelUsage;
  stopReason: "stop" | "error" | "aborted";
  errorMessage?: string;
}

type ClassifierAnswer =
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  /** `score` 为期望级别索引，范围从 0 到 `criteria.length - 1`。 */
  | { type: "score"; score: number; confidence: number }
  /** `true` 的概率。 */
  | { type: "bool"; probability: number };

/** token 数量和 USD 费用（如果服务提供）。 */
type ModelUsage = { input: number; output: number; totalTokens: number; cost: { total: number } };
```

要分类多个条目，可为每个条目调用一次 `classify()`。以下脚本会对反馈消息排序，例如排序之前由工具返回的消息：

```js
const jev = await models.getModelOfType("classifier", "typesafe", "jev-latest");
const results = await Promise.all(
  messages.map((message) =>
    models.classify(jev, {
      state: { message },
      questions: {
        sentiment: {
          type: "choice",
          instructions: "How does the user feel about the product?",
          criteria: { positive: "Satisfied or happy", negative: "Unhappy or frustrated", neutral: "Neither" },
        },
        urgency: {
          type: "score",
          instructions: "How urgently does this need a reply?",
          criteria: ["no reply needed", "reply this week", "reply today"],
        },
      },
    }),
  ),
);
return results.map((result, i) =>
  result.stopReason === "stop"
    ? { message: messages[i], sentiment: result.answers.sentiment.choice, urgency: result.answers.urgency.score }
    : { message: messages[i], error: result.errorMessage },
);
```

`input` 包含 `"image"` 的分类器也可以评估图像。`tools.read()` 读取图像文件时会返回图像块，可供 `images` 使用。其他分类器在 `images` 非空时会返回错误结果。

```js
const luna = await models.getModelOfType("classifier", "openai", "gpt-6-luna");
const photo = await tools.read({ path: "screenshot.png" });
const result = await models.classify(luna, {
  state: { task: "Settings page redesign" },
  images: [photo],
  questions: {
    broken: {
      type: "bool",
      instructions: "Does the screenshot show a broken layout?",
      criteria: { true: "Overlapping, cut-off, or misaligned elements", false: "Clean layout" },
    },
  },
});
```

### 生成图像

```ts
interface ImagesContext {
  /** 作为文本块的提示词，以及用于编辑或参考的图像块。 */
  input: (TextBlock | ImageBlock)[];
}

interface ImagesResult {
  provider: string;
  model: string;
  /** 生成的图像；也包括会返回文本的模型所生成的文本块。 */
  output: (TextBlock | ImageBlock)[];
  usage?: ModelUsage;
  stopReason: "stop" | "error" | "aborted";
  errorMessage?: string;
}

type TextBlock = { type: "text"; text: string };
/** `data` 是 base64 编码。 */
type ImageBlock = { type: "image"; data: string; mimeType: string };
```

用 `image(block)` 显示生成的图像。不要通过 `text()`、`console` 或 `return` 输出 `data`：它体积很大，而且模型无法将其作为文本读取。`image()` 也会把每张图像保存到临时文件，并在结果中给出路径，因此后续轮次可以复制或移动该文件。

```js
// @options: {"timeout_ms": 300000}
const painter = await models.getModelOfType("image", "openrouter", "google/gemini-2.5-flash-image");
const result = await models.generateImages(painter, {
  input: [{ type: "text", text: "A red fox in the snow, watercolor" }],
});
if (result.stopReason !== "stop") return result.errorMessage;
for (const block of result.output) {
  if (block.type === "image") image(block);
  else text(block.text);
}
```

## 限制

- 脚本 VM 的内存上限为 256 MB。内存耗尽时会抛出 `InternalError: out of memory`；应筛选或汇总大型结果，而不是全部累积。
- 在 Bun 上，停止脚本或到达截止时间后，调用会及时结束；但如果内建函数不检查 QuickJS 中断处理器，它可能会继续在 worker 中计算，直到函数返回。
- 一个 Pi 进程的所有会话合计最多可有两个存活中的 codemode worker；`PI_CODEMODE_MAX_WORKERS` 可以更改此上限。达到上限时，新脚本会按到达顺序等待空闲 worker。脚本若 60 秒内（或在 `timeout_ms` 截止前）仍未获得 worker，就会在尚未执行的情况下失败。
- 脚本等待一个永远不会完成的 Promise（且没有待处理工具调用）时，会立即失败，因为没有计时器。
- 脚本不能启动其他 `codemode` 脚本。
