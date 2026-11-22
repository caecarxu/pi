> 本文为简体中文译本；[查看英文原文](../keybindings.md)。

# 快捷键参考

Pi 提供 `app.session.new` 等命名操作，可为它们分配快捷键。你可以在 Pi 的[用户配置](configuration.md#agent-directory)中修改默认按键或为尚未绑定的操作分配按键。

运行 `/hotkeys` 可查看主编辑器和应用当前启用的快捷键。

## 分配快捷键

创建 `<agent-dir>/keybindings.json`。Agent 目录默认为 `~/.pi/agent`，详见[Agent 目录](configuration.md#agent-directory)。

将每个操作 ID 映射为一个按键或一组按键：

```json
{
  "$schema": "https://pi.dev/schemas/keybindings.schema.json",
  "app.session.new": "ctrl+shift+n",
  "app.session.tree": ["ctrl+shift+t", "alt+shift+t"]
}
```

配置的值会替换该操作的默认绑定。使用空列表可禁用某项操作的快捷键：

```json
{
  "tui.altScreen.pageUp": []
}
```

编辑文件后，运行 `/reload` 将更改应用到当前会话。

## 按键语法

按 `修饰键+按键` 的形式书写按键。修饰键包括 `ctrl`、`shift`、`alt` 和 `super`，可以组合使用。有效按键如下：

- **字母：** `a-z`
- **数字：** `0-9`
- **特殊键：** `escape`、`esc`、`enter`、`return`、`tab`、`space`、`backspace`、`delete`、`insert`、`clear`、`home`、`end`、`pageUp`、`pageDown`、`up`、`down`、`left`、`right`
- **功能键：** `f1`-`f12`
- **符号：** `` ` ``、`-`、`=`、`[`、`]`、``、`;`、`'`、`,`、`.`、`/`、`!`、`@`、`#`、`$`、`%`、`^`、`&`、`*`、`(`、`)`、`_`、`+`、`|`、`~`、`{`、`}`、`:`、`<`、`>`、`?`

示例：`ctrl+shift+x`、`alt+ctrl+x`、`ctrl+shift+alt+x`、`super+k`、`ctrl+super+k` 和 `ctrl+1`。

`super` 绑定要求终端能单独报告该修饰键，通常需要 Kitty 键盘协议。不支持该协议的终端可能无法使用这些绑定。

## 操作

### 终端 UI

#### 光标移动

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `tui.editor.cursorUp` | `up` | 光标上移；到达顶部时浏览较旧的历史记录 |
| `tui.editor.cursorDown` | `down` | 光标下移；到底部时浏览较新的历史记录 |
| `tui.editor.historyPrevious` | 无 | 选择上一条提示历史 |
| `tui.editor.historyNext` | 无 | 选择下一条提示历史 |
| `tui.editor.cursorLeft` | `left`、`ctrl+b` | 光标左移 |
| `tui.editor.cursorRight` | `right`、`ctrl+f` | 光标右移 |
| `tui.editor.cursorWordLeft` | `alt+left`、`ctrl+left`、`alt+b` | 光标向左移动一个词 |
| `tui.editor.cursorWordRight` | `alt+right`、`ctrl+right`、`alt+f` | 光标向右移动一个词 |
| `tui.editor.cursorLineStart` | `home`、`ctrl+a` | 移到行首 |
| `tui.editor.cursorLineEnd` | `end`、`ctrl+e` | 移到行尾 |
| `tui.editor.jumpForward` | `ctrl+]` | 向前跳到指定字符 |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | 向后跳到指定字符 |
| `tui.editor.pageUp` | `pageUp`、`ctrl+pageUp` | 向上滚动一页 |
| `tui.editor.pageDown` | `pageDown`、`ctrl+pageDown` | 向下滚动一页 |

专用历史记录操作无论光标位置在哪里都会浏览提示历史，并且优先于使用相同按键的应用操作。

#### 文本编辑

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `tui.editor.deleteCharBackward` | `backspace` | 删除光标前一个字符 |
| `tui.editor.deleteCharForward` | `delete`、`ctrl+d` | 删除光标后的一个字符 |
| `tui.editor.deleteWordBackward` | `ctrl+w`、`alt+backspace` | 删除光标前一个词 |
| `tui.editor.deleteWordForward` | `alt+d`、`alt+delete` | 删除光标后的一个词 |
| `tui.editor.deleteToLineStart` | `ctrl+u` | 删除到行首 |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | 删除到行尾 |
| `tui.editor.yank` | `ctrl+y` | 粘贴最近删除的文本 |
| `tui.editor.yankPop` | `alt+y` | yank 后循环选择其他已删除文本 |
| `tui.editor.undo` | `ctrl+-`（Windows 上为 `ctrl+z`；WSL 上为 `alt+z`） | 撤销上一次编辑 |

#### 输入与选择

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `tui.input.newLine` | `shift+enter`、`ctrl+j` | 插入新行 |
| `tui.input.submit` | `enter` | 提交输入 |
| `tui.input.tab` | `tab` | Tab 或自动补全 |
| `tui.input.copy` | `ctrl+c` | 复制选中内容 |
| `tui.select.up` | `up` | 向上移动选择项 |
| `tui.select.down` | `down` | 向下移动选择项 |
| `tui.select.pageUp` | `pageUp` | 列表向上翻页 |
| `tui.select.pageDown` | `pageDown` | 列表向下翻页 |
| `tui.select.confirm` | `enter` | 确认选择 |
| `tui.select.cancel` | `escape`、`ctrl+c` | 取消选择 |

#### 全屏模式

在全屏模式下，这些操作控制对话记录，并优先于使用相同按键的编辑器操作。当焦点位于覆盖层或可滚动列表（例如自动补全、`/settings` 或模型选择器）时，滚动和提示跳转操作会作用于该控件，而非对话记录，因此 `tui.select.pageUp` 和 `tui.select.pageDown` 会移动列表选择项。对话记录搜索操作仍可使用。

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `tui.altScreen.pageUp` | `pageUp` | 对话记录向上滚动一页 |
| `tui.altScreen.pageDown` | `pageDown` | 对话记录向下滚动一页 |
| `tui.altScreen.halfPageUp` | 无 | 对话记录向上滚动半页 |
| `tui.altScreen.halfPageDown` | 无 | 对话记录向下滚动半页 |
| `tui.altScreen.lineUp` | 无 | 对话记录向上滚动一行 |
| `tui.altScreen.lineDown` | 无 | 对话记录向下滚动一行 |
| `tui.altScreen.previousPrompt` | `ctrl+shift+up`、`ctrl+up`（Windows 和 WSL 上仅为 `ctrl+up`） | 跳到上一条带标记的消息 |
| `tui.altScreen.nextPrompt` | `ctrl+shift+down`、`ctrl+down`（Windows 和 WSL 上仅为 `ctrl+down`） | 跳到下一条带标记的消息 |
| `tui.altScreen.search` | `ctrl+shift+f`（Windows 和 WSL 上为 `ctrl+f`） | 搜索已渲染的对话记录 |
| `tui.altScreen.searchNext` | `enter`、`ctrl+g` | 搜索时选择下一个匹配项 |
| `tui.altScreen.searchPrevious` | `shift+enter`、`ctrl+shift+g` | 搜索时选择上一个匹配项 |
| `tui.altScreen.searchClose` | `escape` | 关闭对话记录搜索 |
| `tui.altScreen.top` | `ctrl+home` | 滚动到对话记录开头 |
| `tui.altScreen.bottom` | `ctrl+end` | 滚动到对话记录末尾并跟随新输出 |

### 应用

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `app.interrupt` | `escape` | 取消 / 中止 |
| `app.clear` | `ctrl+c` | 清空编辑器（第一次）/ 退出（第二次） |
| `app.exit` | `ctrl+d` | 退出（编辑器为空时） |
| `app.suspend` | `ctrl+z`（Windows 上无默认值） | 挂起到后台 |
| `app.editor.external` | `ctrl+g` | 在外部编辑器中打开（`externalEditor`、`$VISUAL`、`$EDITOR`、Windows 上的 Notepad，或其他平台上的 `nano`） |
| `app.clipboard.pasteImage` | `ctrl+v`（Windows 和 WSL 上为 `alt+v`、`ctrl+v`） | 从剪贴板粘贴 macOS 上的文件、图像或文本 |

在原生 Windows 上，`app.suspend` 没有默认值，因为 Windows 终端不支持 Unix 作业控制。如果手动为它分配按键，Pi 会显示状态消息，而不会挂起。WSL 使用通常的 `ctrl+z` 和 `fg` 行为。

### 会话

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `app.session.new` | 无 | 开始新会话（`/new`） |
| `app.session.tree` | 无 | 打开会话树导航器（`/tree`） |
| `app.session.fork` | 无 | 分叉当前会话（`/fork`） |
| `app.session.resume` | 无 | 打开恢复会话选择器（`/resume`） |
| `app.session.togglePath` | `ctrl+p` | 切换路径显示 |
| `app.session.toggleSort` | `ctrl+s` | 切换排序模式 |
| `app.session.toggleNamedFilter` | `ctrl+n` | 切换仅显示已命名会话的筛选器 |
| `app.session.rename` | `ctrl+r` | 重命名会话 |
| `app.session.delete` | `ctrl+d` | 删除会话 |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | 查询为空时删除会话 |

### 模型与思考

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `app.model.select` | `ctrl+l` | 打开模型选择器 |
| `app.model.cycleForward` | `ctrl+p` | 切换到下一个模型 |
| `app.model.cycleBackward` | `shift+ctrl+p`（Windows 和 WSL 上为 `alt+p`） | 切换到上一个模型 |
| `app.models.save` | `ctrl+s` | 将选定的默认模型或范围模型配置保存到设置中 |
| `app.thinking.cycle` | `shift+tab` | 循环切换思考级别 |
| `app.thinking.save` | `ctrl+s` | 将当前思考级别保存到设置中 |
| `app.thinking.toggle` | `ctrl+t` | 折叠或展开思考内容块 |

### 显示与消息队列

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `app.tools.expand` | `ctrl+o` | 折叠或展开工具输出 |
| `app.message.copy` | `ctrl+x` | 在 `/tree` 中复制选中的消息；全屏模式下，如果 `fullscreenCopyOnSelect` 为 `false`，复制当前选中内容，否则复制最后一条 assistant 消息。在 OAuth 登录界面中复制登录 URL |
| `app.message.followUp` | `alt+enter`（Windows 和 WSL 上为 `ctrl+q`） | 将后续消息加入队列 |
| `app.message.dequeue` | `alt+up`（Windows 和 WSL 上为 `alt+q`） | 将队列中的消息还原到编辑器 |

### 树形导航

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `app.tree.foldOrUp` | `ctrl+left`、`alt+left` | 折叠当前分支片段，或跳到上一片段的开头 |
| `app.tree.unfoldOrDown` | `ctrl+right`、`alt+right` | 展开当前分支片段，或跳到下一片段的开头或分支末尾 |
| `app.tree.editLabel` | `shift+l` | 编辑所选树节点的标签 |
| `app.tree.toggleLabelTimestamp` | `shift+t` | 切换树中的标签时间戳显示 |
| `app.tree.filter.default` | `ctrl+d` | 将树筛选器设为默认视图 |
| `app.tree.filter.noTools` | `ctrl+t` | 切换隐藏工具结果的树筛选器 |
| `app.tree.filter.userOnly` | `ctrl+u` | 切换仅显示用户消息的树筛选器 |
| `app.tree.filter.labeledOnly` | `ctrl+l` | 切换仅显示带标签条目的树筛选器 |
| `app.tree.filter.all` | `ctrl+a` | 切换显示所有条目的树筛选器 |
| `app.tree.filter.cycleForward` | `ctrl+o` | 向前循环切换树筛选器 |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | 向后循环切换树筛选器 |

### 范围模型选择器

这些快捷键在范围模型选择器中使用（通过 `/scoped-models` 打开）。

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `app.models.enableAll` | `ctrl+a` | 启用所有模型（或当前搜索匹配的所有模型） |
| `app.models.clearAll` | `ctrl+x` | 清除所有模型（或当前搜索匹配的所有模型） |
| `app.models.toggleProvider` | `ctrl+p` | 切换当前 provider 的所有模型 |
| `app.models.reorderUp` | `alt+up` | 将选定模型在循环顺序中上移 |
| `app.models.reorderDown` | `alt+down` | 将选定模型在循环顺序中下移 |
