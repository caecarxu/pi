> 本文为简体中文译本；[查看英文原文](../virtual-models.md)。

# 虚拟模型

虚拟模型是一种可选模型，会为每个请求选择一个实际模型。你可以按任务、成本或对话状态进行路由。例如，路由器可以将简单问题发送给小模型，将难题发送给大模型，同时让用户只需选择一个模型。

通过[扩展](extensions.md)注册虚拟模型。它们与其他模型一样会出现在 `/model`、`--model`、作用域模型和设置中。虚拟模型可以列在任意供应商下，包括已有实际模型的供应商，例如 `openai-codex/auto`。

## 选择与派发

虚拟模型会选择一个模型和思考等级。路由器会针对每个请求，将这对值映射到一组实际模型及思考等级：

```
所选（虚拟模型，虚拟等级）              ->  派发（实际模型，实际等级）
jev/auto:low                             ->  anthropic/claude-sonnet-4-5:high
```

虚拟思考等级是路由器的输入。其含义由路由器决定；它不必对应某个推理预算。

Pi 会分别记录这两组值：

| | 选择 | 派发 |
|---|---|---|
| 记录于 | `model_change` 和 `thinking_level_change` 条目 | 每条 assistant 消息中的 `provider`、`api`、`model`、`thinkingLevel` |
| 可见于 | `ctx.model`、`ctx.thinkingLevel`、`PI_MODEL`、`PI_REASONING_LEVEL`、`/model` | 每次响应的 assistant 消息 |

供应商只会收到实际模型。assistant 消息会注明实际模型，因此即使在不同实际模型之间重放对话，效果也与手动切换模型后相同。恢复会话时，会从最新的 `model_change` 条目还原虚拟模型选择。如果虚拟模型已不再注册，Pi 会回退到上次回答所用的实际模型。

在交互模式中，页脚会在所选模型旁显示路由后的模型，例如 `auto • high → gpt-5.6-luna • medium`。`/session` 会列出每个实际模型的费用。

上下文用量使用生成最新响应的实际模型的限制，即使该响应是在切换到虚拟模型之前生成的。如果还没有此类响应，则使用虚拟模型声明的限制（如果有）。压缩也会检查相同限制，并再次检查每个请求路由到的模型的限制。如果该模型的上下文窗口对于当前对话过小，Pi 会在发送请求前压缩；路由仍按路由器的选择执行。

## 注册虚拟模型

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerVirtualModel({
    provider: "router",
    id: "auto",
    name: "Auto",
    thinkingLevels: ["low", "high"],
    route(request, ctx) {
      // Tool follow-ups and retries stay on the model that handled the turn.
      const sticky = request.failed ?? request.previous;
      if (request.reason !== "user" && sticky) {
        return { model: sticky.model, thinkingLevel: sticky.thinkingLevel ?? "medium" };
      }
      const id = request.thinkingLevel === "high" ? "claude-sonnet-4-5" : "claude-haiku-4-5";
      return { model: ctx.modelRegistry.find("anthropic", id)!, thinkingLevel: "medium" };
    },
  });
}
```

- `provider` 是该模型所属的供应商，可以是任意供应商 ID。一个供应商可以在自己的实际模型旁列出多个虚拟模型。如果实际供应商有凭据，就可以使用该供应商下的虚拟模型。若使用没有任何供应商采用的 ID，则该模型始终可用。
- `id` 不能与该供应商的实际模型 ID 相同。如果之后的目录刷新新增了同 ID 的实际模型，虚拟模型会将其隐藏。
- `thinkingLevels` 列出可供选择的等级。默认值为 `["off"]`。
- `contextWindow` 和 `maxTokens` 会在首次响应前显示。未设置的限制视为未知。
- `input` 列出可供选择的输入类型。默认支持文本和图像；不支持图像的实际模型会收到占位符。

注册遵循与 `pi.registerProvider()` 相同的排队和重载规则。再次注册相同供应商和 ID 会替换该虚拟模型。`pi.unregisterVirtualModel(provider, id)` 会移除它；`pi.unregisterProvider()` 不会移除它。SDK 代码也可以在没有扩展的情况下注册虚拟模型：`modelRuntime.registerVirtualModel(definition)`。

## 路由请求

每次使用虚拟模型发出请求前都会调用 `route(request, ctx)`，并返回 `{ model, thinkingLevel }`。模型可以是目录中任意有凭据的实际模型；使用 `ctx.modelRegistry` 查找。虚拟模型不能路由到另一个虚拟模型。Pi 会将思考等级限制到返回模型支持的范围。

| 字段 | 含义 |
|---|---|
| `model`、`thinkingLevel` | 所选虚拟模型及等级 |
| `reason` | 发起请求的原因，见下文 |
| `previous` | `messages` 中最新一次成功响应所用的实际模型和思考等级 |
| `failed` | 对于 `retry`：失败请求所用的实际模型、思考等级及 assistant `message`；该消息已不在 `messages` 中。消息包含 `stopReason` 和 `errorMessage`。若路由本身失败，则不存在此字段 |
| `state` | 此会话分支上上次返回的路由器状态，见下文 |
| `messages` | 本次请求的对话内容，包括系统消息 |
| `signal` | 请求的中止信号 |

| `reason` | 请求 |
|---|---|
| `user` | 用户写入一条消息后的首次请求，包括引导消息和后续消息 |
| `continuation` | agent 循环中的其他请求，例如工具结果或扩展消息之后的请求 |
| `retry` | 失败后的自动重试，包括上下文溢出后压缩完成的重试 |
| `direct` | 在 agent 循环之外发出的请求，例如压缩摘要，或扩展调用 `ctx.modelRegistry.streamSimple()` |

对于 `continuation` 返回 `previous`、对于 `retry` 返回 `failed`，可以保持提示缓存和思考签名有效。允许在轮次之间切换模型，但会丢失提示缓存。重试时也可以切换到其他模型，例如 `failed.message.errorMessage` 指示供应商过载或上下文溢出时。

如果 `route()` 抛出异常，或者返回虚拟模型或没有凭据的模型，请求会以错误响应结束。

## 保留路由状态

`route()` 可以在模型旁返回 `state`。Pi 会将它保存在会话分支中，并在之后的请求中通过 `request.state` 传回。可将其用于对话记录中没有记录的决策，例如分类器结果或路由阶段：

```typescript
pi.registerVirtualModel<{ phase: "plan" | "build" }>({
  provider: "router",
  id: "phased",
  name: "Phased",
  route(request, ctx) {
    const state = request.state ?? { phase: "plan" };
    const id = state.phase === "plan" ? "claude-opus-4-5" : "claude-haiku-4-5";
    return { model: ctx.modelRegistry.find("anthropic", id)!, thinkingLevel: "medium", state };
  },
});
```

- 状态必须可序列化为 JSON。返回 `undefined` 或 `request.state` 本身会保留当前状态。
- Pi 会在发送请求前，将任何其他返回对象作为新状态保存，即使它与当前状态相同。仅在状态发生变化时才返回新对象。即使请求之后失败，状态仍会保留。
- 状态会沿会话树保存，因此分叉和 `/tree` 导航都能看到各自分支的状态。压缩后状态也会保留。
- `direct` 请求没有状态，Pi 会忽略它们返回的状态。

对话记录已记录所选模型和每个派发模型；`ctx.sessionManager.getBranch()` 可以同时获取二者。

路由器可以通过 `ctx.modelRegistry` 调用其他模型，例如使用 `ctx.modelRegistry.findOfType("classifier", provider, id)` 查找分类模型，再调用 `ctx.modelRegistry.classify()`。这会增加首个 token 到达前的延迟。

完整路由器示例见 [`jev-router.ts`](../../examples/extensions/jev-router.ts)。它会根据 Jev 分类器的选择，先用能力较强的 OpenAI Codex 模型规划并完成第一次编辑，然后切换到更便宜的模型，同时接受一次提示缓存未命中。阶段信息保存在路由器状态中。
