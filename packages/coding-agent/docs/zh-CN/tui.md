> 本文为简体中文译本；[查看英文原文](../tui.md)。

# 终端 UI

`@earendil-works/pi-tui` 提供 Pi 使用的终端组件系统。当内置对话框、通知、状态文本和小组件无法满足交互需求时，扩展可以使用它。

请先从[扩展](extensions.md#interact-with-the-user)中的 `ctx.ui` 方法开始。只有当 UI 需要自定义渲染、键盘或鼠标输入、焦点、布局或生命周期时，才构建自定义组件。

## 选择集成方式

| 需求 | 使用 |
|---|---|
| 选择、确认、输入或多行编辑器 | `ctx.ui.select()`、`confirm()`、`input()` 或 `editor()` |
| 非阻塞反馈 | `ctx.ui.notify()` 或 `setStatus()` |
| 编辑器附近的持久内容 | `ctx.ui.setWidget()` |
| 替换标题、页脚或编辑器 | 对应的 `ctx.ui` 组件工厂 |
| 临时交互界面或覆盖层 | `ctx.ui.custom()` |
| 自定义工具或会话条目的渲染 | 扩展渲染器 |

这些 API 会在需要时接收 Pi 当前使用的主题和键位绑定。不要在扩展中另行创建终端渲染器。

## 了解组件模型

组件会根据可用宽度渲染一个终端行数组。组件可以选择处理键盘和鼠标输入；当状态或依赖主题的内容改变时，必须使缓存输出失效。

将 `render()` 返回的行视为只读，包括子类中的 `super.render()`。未发生变化时，`Container`、`Box`、`Text` 和 `Markdown` 等内置组件会返回同一个缓存数组，因此原地修改它会破坏后续帧。修改前请先复制，例如 `const lines = [...super.render(width)]`，并在计算开销较大时缓存结果。输出变化时返回新数组：父组件会复用未变化的数组，不会再次读取它。

每一行渲染结果都必须符合传入的宽度。应测量终端中可见的列数，而不是字符串长度，因为 ANSI 转义码、宽字符、emoji 和组合字符都会改变显示宽度。

请使用 `visibleWidth()`、`truncateToWidth()`、`sliceByColumn()` 和 `wrapTextWithAnsi()`，不要自己实现终端宽度处理。Pi 会在每行之后重置样式和超链接，因此每一行都要重新应用样式。

组件状态改变后，使受影响组件的缓存失效，并调用注入的 `tui.requestRender()`。TUI 会合并渲染请求并更新终端。

## 组合内置组件

此软件包为常见布局和控件提供了组件：

- `Text`、`Markdown`、`Image` 和 `TruncatedText` 用于渲染内容。
- `Container`、`VStack`、`HStack`、`Box` 和 `Spacer` 用于组合布局。
- `Input` 和 `Editor` 用于接收文本。
- `SelectList` 和 `SettingsList` 用于实现可搜索的选择器和设置流程。
- `ScrollView` 提供有界的可滚动视口。
- `Loader` 和 `CancellableLoader` 用于显示进行中的工作。
- `MouseRegion` 为其他组件添加指针交互。

优先使用这些组件，不要重复构建选择、滚动、文本编辑或宽度处理功能。扩展示例展示了如何组合它们以及 Pi 的边框和主题。

## 处理键盘输入与焦点

使用 `matchesKey()` 和 `Key` 处理终端键盘输入。解析器会考虑受支持的终端协议和按键修饰符。扩展组件应使用注入的 `KeybindingsManager` 处理可配置的应用操作。

显示文本光标的组件必须实现 `Focusable`，并将 `CURSOR_MARKER` 放在视觉光标之前。用 `renderFakeCursor()` 包住光标单元格，使 TUI 以反显方式绘制它；若显示硬件光标，则在 `CURSOR_MARKER` 后隐藏该单元格。TUI 会根据此标记为输入法编辑器定位硬件光标。

包裹 `Input` 或 `Editor` 的容器必须将自身的 `focused` 状态传给子组件。若不传递，中文、日文、韩文和其他输入法的候选窗口可能出现在错误的屏幕位置。

替换主编辑器时应扩展 Pi 的 `CustomEditor`，以保留应用快捷键和 Agent 控制。

将编辑器不处理的按键转发给基类实现；清除自定义编辑器工厂即可恢复默认编辑器。

## 处理鼠标输入

全屏模式会将标准化鼠标事件路由到组件。处理器可以标记事件已处理、捕获拖动序列、请求焦点或请求重新渲染。

未处理的滚轮事件会滚动最近的 `ScrollView`。未处理的主键拖动仍可用于选择对话记录文本。OSC 8 链接的优先级高于其外层的点击区域。

常规模式会将鼠标输入留给终端，因为滚屏历史由终端负责管理。即使全屏模式支持鼠标，也应为每种交互提供键盘操作方式。

## 使用自定义界面和覆盖层

`ctx.ui.custom()` 会临时将交互区域的控制权交给一个组件，并在该组件调用提供的完成回调时返回结果。

### 构建最小自定义界面

以下完整扩展示范了自定义组件的生命周期：在给定宽度内渲染、使用注入的键位绑定、状态变化后使缓存输出失效、请求重新渲染，并通过 `done()` 完成交互。

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("pick-target", {
    description: "Pick a deployment target",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("pick-target requires interactive mode", "error");
        return;
      }

      const choices = ["development", "staging", "production"];
      const selected = await ctx.ui.custom<string | undefined>((tui, theme, keybindings, done) => {
        let selectedIndex = 0;
        let cachedWidth: number | undefined;
        let cachedLines: string[] | undefined;

        const invalidate = () => {
          cachedWidth = undefined;
          cachedLines = undefined;
        };

        return {
          render(width: number): string[] {
            if (cachedLines && cachedWidth === width) return cachedLines;

            cachedWidth = width;
            cachedLines = [
              theme.fg("accent", "Choose a deployment target"),
              ...choices.map((choice, index) => `${index === selectedIndex ? "> " : "  "}${choice}`),
              theme.fg("dim", "up/down move, enter selects, escape cancels"),
            ].map((line) => truncateToWidth(line, width));
            return cachedLines;
          },
          handleInput(data: string): void {
            if (keybindings.matches(data, "tui.select.up")) {
              selectedIndex = (selectedIndex - 1 + choices.length) % choices.length;
            } else if (keybindings.matches(data, "tui.select.down")) {
              selectedIndex = (selectedIndex + 1) % choices.length;
            } else if (keybindings.matches(data, "tui.select.confirm")) {
              done(choices[selectedIndex]);
              return;
            } else if (keybindings.matches(data, "tui.select.cancel")) {
              done(undefined);
              return;
            } else {
              return;
            }

            invalidate();
            tui.requestRender();
          },
          invalidate,
        };
      });

      if (selected) ctx.ui.notify(`Selected ${selected}`, "info");
    },
  });
}
```

此组件不会显示文本光标，因此不需要实现 `Focusable`。包含 `Input` 或 `Editor` 的组件必须实现 `Focusable`，并将 `focused` 值传给该子组件。

自定义组件不会让 Pi 报告“正在等待用户”，因为 `ctx.ui.custom()` 也承载加载指示器等非阻塞 UI。当组件等待用户回答时，请传入 `blocked: { kind: "question", message: "Pick a color" }`，这样支持[程序状态](terminal-setup.md#program-status)的终端会将 Pi 显示为受阻状态。`kind` 可设为 `"question"`、`"permission"` 或 `"auth"`。内嵌组件只在可见时报告受阻；如果有较新的对话框或组件替代它，报告的则是新组件状态。覆盖层从显示到调用 `done()` 期间都会报告受阻；即使通过 `setHidden()` 隐藏，或被另一个覆盖层遮住，也一样。如果同时打开多个阻塞提示，最近显示的提示会提供 `kind` 和 `message`。

传入 `overlay: true`，即可在现有内容上方绘制。覆盖层选项可以控制大小、锚点、偏移、边距和响应式可见性。交互尚未结束时，覆盖层句柄可更改焦点，或通过 `setHidden()` 暂时隐藏和显示覆盖层。

处于焦点状态的覆盖层会在一般渲染期间保留输入控制权。如果覆盖层仍可见，但你希望其他组件接收输入，请通过句柄显式释放焦点或将焦点转移过去。

每个自定义组件实例都应只用于一次交互。重新开始交互时请创建新实例。

通过组件工厂提供的完成回调结束交互。该回调会完成 `ctx.ui.custom()` 返回的 Promise 并释放组件。不要对由 `ctx.ui.custom()` 创建的覆盖层调用 `OverlayHandle.hide()`。

关于定位、堆叠、焦点、响应式可见性和动画行为，请参阅[`overlay-qa-tests.ts`](../../examples/extensions/overlay-qa-tests.ts)。

## 正确应用主题

使用传递给扩展或组件回调的主题。主题辅助函数会生成 ANSI 样式字符串，用于强调色、弱化文本、成功、警告、错误、工具输出和 Markdown 等语义颜色。

用 `theme.style()` 将前景色、背景色和文本属性组合起来：

```typescript
return new Text(
  theme.style("Done!", {
    fg: "success",
    bg: "toolSuccessBg",
    bold: true,
  }),
  0,
  0,
);
```

样式颜色可以是语义主题 token，也可以是具体的 `Color`。前景 token 可用于 `fg`，背景 token 可用于 `bg`；如果要在相反位置使用 token 的颜色，请传入具体颜色，例如 `{ fg: theme.colors.userMessageBg }`。通过 `theme.colors` 访问具体颜色；需要进行颜色运算时，可使用 `@earendil-works/pi-tui` 中的 `mixColors()` 等工具。主题将 token 设为终端默认色时，会使用终端自身颜色；`theme.colors` 会返回终端报告的颜色，若终端未报告，则返回猜测值。可通过 `theme.appearance`（`"dark"` 或 `"light"`）判断是否需要调亮或调暗颜色。Pi 会根据终端能力将结果转换为真彩色或 256 色输出。每种主题的 token 只转换一次；尽可能在渲染路径之外计算具体颜色。

现有的 `theme.fg()` 和 `theme.bg()` 辅助函数仍可用于应用单个语义颜色。

除非 `invalidate()` 会重建字符串，否则不要永久保存带主题颜色的字符串。主题变化会清空渲染缓存，但无法移除嵌入应用状态中的旧 ANSI 颜色。

在渲染时求值的主题回调不需要特殊重建。无状态组件也可以在每次渲染时计算主题输出。

使用[主题](themes.md)创建终端调色板。渲染的 Markdown 应与当前应用主题一致时，请使用 Pi 的 `getMarkdownTheme()`。

## 保持渲染响应迅速

渲染发生在交互路径上。按宽度和内容缓存开销较大的布局和高亮工作，并在 `invalidate()` 中清除缓存。

默认视图应保持紧凑；详细内容通过展开或专属界面显示。自定义工具渲染应处理部分结果，并在可安全更新时复用先前组件。

排查渲染问题时，可使用 `PI_TUI_WRITE_LOG` 捕获原始 ANSI 流。测试窄宽度、宽字符、窗口大小调整、主题变化、焦点切换以及常规和全屏两种模式。

## 示例与源码

已检查的扩展示例涵盖了主要模式：

- [`preset.ts`](../../examples/extensions/preset.ts) 和 [`tools.ts`](../../examples/extensions/tools.ts) 使用选择列表和设置列表。
- [`qna.ts`](../../examples/extensions/qna.ts) 使用可取消的异步 UI。
- [`modal-editor.ts`](../../examples/extensions/modal-editor.ts) 替换编辑器。
- [`custom-footer.ts`](../../examples/extensions/custom-footer.ts) 替换页脚。
- [`widget-placement.ts`](../../examples/extensions/widget-placement.ts) 在编辑器周围放置持久内容。
- [`doom-overlay/`](../../examples/extensions/doom-overlay/) 展示持续渲染的覆盖层。

公开导出定义在 [`packages/tui/src/index.ts`](https://github.com/earendil-works/pi/blob/main/packages/tui/src/index.ts)。关于扩展生命周期、状态、工具、事件和模式行为，请参阅[扩展](extensions.md)。
