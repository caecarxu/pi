> 本文为简体中文译本；[查看英文原文](../prompt-templates.md)。

# 提示模板

提示模板会将 Markdown 文件转换为可复用的 `/` 命令。如果想重复使用同一提示，又不需要添加可执行行为或一整套配套指令，可以使用提示模板。

模板可以接收参数，并显示在命令补全中。Pi 可以从个人配置、项目配置、明确指定的路径或 Pi 包中加载模板。只有在授予项目目录信任后，才会加载项目配置。

## 创建模板

创建 `~/.pi/agent/prompts/review.md`：

```markdown
---
description: Review staged git changes
argument-hint: "[focus]"
---
Review the staged changes. Focus on ${1:-correctness, security, and error handling}.
```

文件名会成为命令名，因此可以通过 `/review` 使用此模板。`description` 会显示在命令补全中；省略时，Pi 会使用首个非空行。

`argument-hint` 是可选项。用 `<尖括号>` 表示必填参数，用 `[方括号]` 表示可选参数。

在活动会话中添加或修改模板后，运行 `/reload`。

<a id="invoke-a-template"></a>

## 使用模板

在编辑器中输入模板命令：

```text
/review
/review concurrency
```

Pi 会先展开模板，再将生成的文本送入 Agent。扩展会先通过 `input` 事件收到原始输入，除非有同名扩展命令处理该输入。

模板支持以下替换语法：

| 语法 | 结果 |
|---|---|
| `$1`、`$2`、…… | 一个位置参数 |
| `$@` 或 `$ARGUMENTS` | 以空格连接的所有参数 |
| `${1:-default}` | 第一个参数，或默认值 |
| `${@:-default}` | 所有参数，或默认值 |
| `${@:N}` | 从位置 `N` 开始的参数 |
| `${@:N:L}` | 从位置 `N` 开始的 `L` 个参数 |

参数采用类似 shell 的引号规则，因此 `/review "API compatibility"` 会提供一个包含空格的参数。只有位于参数开头的引号才会启动引号分组，所以 `doesn't` 这类单词中的撇号仍作为文本；没有配对结束引号时，该引号会保留为文本。在带引号的参数中，若反斜杠位于同类引号前，该引号会作为文本保留。例如 `/review "the \\\"fast\\\" path"` 会提供 `the "fast" path`；其他反斜杠会按原样保留。

<a id="choose-where-it-loads"></a>

## 将模板添加到 Pi

将模板放入个人或项目提示目录。约定的提示目录只会直接加载其中的 `.md` 子文件。

设置和包可以选择嵌套的 Markdown 文件；包清单也可以使用明确路径和 glob 缩小发现范围。有关这些选项，请参阅[设置](settings.md#resources)和[Pi 包](packages.md)。

授予信任后，项目模板会成为编辑器中的命令。信任陌生项目之前，请先检查模板内容。另请参阅[安全运行 Pi](security.md#understand-project-trust)。
