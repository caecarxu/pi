> 本文是简体中文译本，英文原文见[这里](../rpc-extension-ui.md)。

# RPC 扩展 UI

扩展可通过 `ctx.ui` 请求用户交互。在 RPC 模式下，受支持的调用会形成请求/响应子协议，与常规 [RPC 命令](rpc-commands.md)和[会话事件](json.md)并行。

扩展 UI 方法分为两类：

- **对话框方法**（`select`、`confirm`、`input`、`editor`）：在 stdout 上发出 `extension_ui_request`，并阻塞等待客户端在 stdin 上发送带匹配 `id` 的 `extension_ui_response`。
- **发送后即忘方法**（`notify`、`setStatus`、`setWidget`、`setTitle`、`set_editor_text`）：在 stdout 上发出 `extension_ui_request`，但不要求响应。客户端可以显示信息，也可以忽略。

如果对话框方法包含 `timeout` 字段，agent 端会在超时后用默认值自动完成。客户端无需跟踪超时。

## 限制

由于某些 `ExtensionUIContext` 方法需要直接访问终端 UI，因此它们在 RPC 模式下不受支持或功能降级：

- `custom()` 返回 `undefined`。
- `onTerminalInput()` 返回空操作取消订阅函数。
- `setWorkingMessage()`、`setWorkingVisible()`、`setWorkingIndicator()`、`setHiddenThinkingLabel()`、`setFooter()`、`setHeader()`、`addAutocompleteProvider()`、`setEditorComponent()` 和 `setToolsExpanded()` 均为空操作。
- `getEditorText()` 返回 `""`，`getEditorComponent()` 返回 `undefined`。
- `getToolsExpanded()` 返回 `false`。
- `pasteToEditor()` 会委托给 `setEditorText()`，不执行终端粘贴处理。
- `getAllThemes()` 返回 `[]`，`getTheme()` 返回 `undefined`。
- `setTheme()` 返回 `{ success: false, error: "Theme switching not supported in RPC mode" }`。

注意：在 RPC 模式下，`ctx.mode` 为 `"rpc"`，`ctx.hasUI` 为 `true`，因为对话框和发送后即忘方法可通过扩展 UI 子协议使用。对于需要真实终端的 TUI 专属功能（如 `custom()`），请使用 `ctx.mode === "tui"` 进行判断。

## Pi 发出的请求

所有请求的 `type` 都是 `"extension_ui_request"`，并带有唯一 `id` 和 `method` 字段。

### select

提示用户从列表中选择。带有 `timeout` 字段的对话框方法会以毫秒为单位指定超时；如果客户端未及时响应，agent 会自动返回 `undefined`。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-1",
  "method": "select",
  "title": "Allow dangerous command?",
  "options": ["Allow", "Block"],
  "timeout": 10000
}
```

预期响应：带 `value`（所选选项字符串）或 `cancelled: true` 的 `extension_ui_response`。

### confirm

请求用户确认是或否。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-2",
  "method": "confirm",
  "title": "Clear session?",
  "message": "All messages will be lost.",
  "timeout": 5000
}
```

预期响应：带 `confirmed: true/false` 或 `cancelled: true` 的 `extension_ui_response`。

### input

请求用户输入自由文本。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-3",
  "method": "input",
  "title": "Enter a value",
  "placeholder": "type something..."
}
```

预期响应：带 `value`（输入文本）或 `cancelled: true` 的 `extension_ui_response`。

### editor

打开多行文本编辑器，可选预填内容。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-4",
  "method": "editor",
  "title": "Edit some text",
  "prefill": "Line 1\nLine 2\nLine 3"
}
```

预期响应：带 `value`（编辑后的文本）或 `cancelled: true` 的 `extension_ui_response`。

### notify

显示通知。发送后即忘，无需响应。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-5",
  "method": "notify",
  "message": "Command blocked by user",
  "notifyType": "warning"
}
```

`notifyType` 字段为 `"info"`、`"warning"` 或 `"error"`。省略时默认为 `"info"`。

### setStatus

在页脚/状态栏中设置或清除状态条目。发送后即忘。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-6",
  "method": "setStatus",
  "statusKey": "my-ext",
  "statusText": "Turn 3 running..."
}
```

发送 `statusText: undefined`（或省略此字段）可清除该键的状态条目。

### setWidget

设置或清除显示在编辑器上方或下方的小组件（文本行块）。发送后即忘。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-7",
  "method": "setWidget",
  "widgetKey": "my-ext",
  "widgetLines": ["--- My Widget ---", "Line 1", "Line 2"],
  "widgetPlacement": "aboveEditor"
}
```

发送 `widgetLines: undefined`（或省略此字段）可清除小组件。`widgetPlacement` 字段为 `"aboveEditor"`（默认值）或 `"belowEditor"`。RPC 模式仅支持字符串数组；组件工厂会被忽略。

### setTitle

设置终端窗口/标签页标题。发送后即忘。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-8",
  "method": "setTitle",
  "title": "pi - my project"
}
```

### set_editor_text

设置输入编辑器中的文本。发送后即忘。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-9",
  "method": "set_editor_text",
  "text": "prefilled text for the user"
}
```

## 发给 Pi 的响应

仅对话框方法（`select`、`confirm`、`input`、`editor`）需要响应。`id` 必须与请求匹配。

### 值响应（select、input、editor）

```json
{"type": "extension_ui_response", "id": "uuid-1", "value": "Allow"}
```

### 确认响应（confirm）

```json
{"type": "extension_ui_response", "id": "uuid-2", "confirmed": true}
```

### 取消响应（任意对话框）

关闭任意对话框方法。扩展收到 `undefined`（select/input/editor）或 `false`（confirm）。

```json
{"type": "extension_ui_response", "id": "uuid-3", "cancelled": true}
```

## 示例

参见经过检查的 [RPC 扩展 UI 客户端](vscode://file/Users/Shared/pi-code/packages/coding-agent/examples/rpc-extension-ui.ts:1:1)和[演示扩展](vscode://file/Users/Shared/pi-code/packages/coding-agent/examples/extensions/rpc-demo.ts:1:1)。

导出的请求和响应联合类型定义在 [`rpc-types.ts`](vscode://file/Users/Shared/pi-code/packages/coding-agent/src/modes/rpc/rpc-types.ts:1:1) 中。与模式无关的扩展指南见[扩展](extensions.md#ui-and-modes)。
