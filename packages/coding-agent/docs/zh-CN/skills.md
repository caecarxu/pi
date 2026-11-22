> 本文是简体中文译本，英文原文见[Skills](../skills.md)。

# Skills（技能）

Skill（技能）为特定类型的工作提供专门指令和配套文件。Pi 会按名称和说明告知模型有哪些可用技能，只有任务需要时才会加载完整指令。

当某个工作流需要比提示词模板更多的上下文，但不需要新的可执行集成点时，可以使用 Skill。Skill 可以把脚本、参考资料和资源文件与指令一起打包。

Pi 实现了 [Agent Skills 规范](https://agentskills.io/specification)。大多数无效字段只会产生警告，不会阻止 Pi 启动。

## 创建 Skill

Skill 是一个包含 `SKILL.md` 的目录：

```text
pdf-tools/
├── SKILL.md
├── scripts/
│   └── extract.sh
├── references/
│   └── formats.md
└── assets/
    └── template.json
```

在 `SKILL.md` 中先写 frontmatter，再写直接的操作指令：

```markdown
---
name: pdf-tools
description: Extract text and tables from PDF files. Use when reading, converting, or inspecting PDFs.
---

# PDF tools

Read `references/formats.md` before converting a document. Run scripts relative to this skill directory.
```

模型会根据 description 判断何时加载 Skill。说明中要写清 Skill 的功能和适用时机。避免使用 “Helps with PDFs” 这类无法提供足够路由信息的描述。

引用 Skill 附带的文件时，请使用相对于 Skill 目录的路径。Pi 会告知模型 Skill 所在位置，以便解析这些路径。

## 了解 Skill 的加载方式

启动时，Pi 会扫描已配置的 Skill 位置，并将每个 Skill 的名称、说明和路径加入系统提示；不会加入完整指令。

当任务匹配某项 Skill 时，模型会读取其 `SKILL.md` 并遵循其中的指令。这样可以让详细指令在任务需要前不占用上下文。如果模型没有加载相关 Skill，可使用 `/skill:name` 强制加载。

`/skill:name` 后面的参数会作为用户请求追加到已加载的指令中：

```text
/skill:pdf-tools extract report.pdf
```

如果某项 Skill 只能通过显式命令使用，可在 frontmatter 中设置 `disable-model-invocation: true`。[设置](settings.md)中的 `enableSkillCommands` 控制交互模式的命令发现列表是否显示 Skill 命令；手动输入的 `/skill:name` 仍然可用。

<a id="choose-where-it-loads"></a>

## 将 Skill 添加到 Pi

将 Skill 放入用户级或项目级 Skill 目录。Pi 会递归发现其中包含 `SKILL.md` 的目录。

Pi 也支持 Agent Skills 的标准位置 `~/.agents/skills/` 和 `.agents/skills/`。项目级 `.agents/skills/` 会从当前工作目录沿父目录向上发现；若存在 Git 仓库，则在仓库根目录停止。

Pi 接受部分独立 Markdown Skill，但更推荐使用包含 `SKILL.md` 的目录，因为这种形式更便于移植。其他位置请参阅[设置](settings.md#resources)和 [Pi 包](packages.md)。

项目 Skill 可以指示模型运行脚本或修改文件。在授予项目目录信任之前，请检查不熟悉的 Skill 及其配套文件。

## 编写可移植的 frontmatter

Agent Skills 规范定义了以下字段：

| 字段 | 用途 |
|---|---|
| `name` | 命令名称和显示名称 |
| `description` | 展示给模型的路由说明 |
| `license` | 许可证名称或随附的许可证文件 |
| `compatibility` | 环境要求 |
| `metadata` | 其他键值元数据 |
| `allowed-tools` | 实验性的预批准工具列表 |
| `disable-model-invocation` | 禁止模型自动选择该 Skill |

名称只能包含小写字母、数字和连字符，不能以连字符开头、结尾或连续出现；长度最多 64 个字符。说明最多 1024 个字符。

如果声明的名称与父目录名称不同，Pi 不会要求修改，也不会发出警告。其他 Agent Skills 实现可能会强制要求二者一致；若要保持可移植性，建议使用相同名称。

格式错误的 `SKILL.md` 以及没有 description 的已声明 Skill 不会被加载。名称冲突时会保留最先发现的 Skill，并发出警告。

## 验证和共享 Skill

在能够发现该 Skill 的位置启动 Pi，然后检查启动诊断信息和 `/skill:name` 命令。在活动会话中编辑 Skill 后，运行 `/reload`。

使用 [Pi 包](packages.md)通过 npm 或 git 分发一个或多个 Skill。将环境配置放在 Skill 内，并在包中声明所需的运行时依赖。

示例见 [Anthropic Skills 集合](https://github.com/anthropics/skills)和 [Pi Skills 集合](https://github.com/badlogic/pi-skills)。
