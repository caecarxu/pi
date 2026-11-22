> 本文为简体中文译本；[查看英文原文](../cli.md)。

<a id="cli-and-modes-reference"></a>

# 命令行

本文介绍 Pi 内置的命令行命令和选项。运行 `pi --help`，或在命令后追加 `--help`，即可查看已安装版本的准确接口。顶层帮助还会列出已加载扩展注册的选项。

```sh
pi [options] [--] [@files...] [messages...]
pi install <source> [options]
pi remove <source> [options]
pi uninstall <source> [options]
pi update [target] [options]
pi list
pi config [options]
pi auth login <provider> [--api-key] [--no-browser]
pi auth logout <provider>
pi auth <check|print-api-key|print-bearer-token> [options]
pi mcp <add|remove|list|login|logout> [options]
```

<a id="modes"></a>

## 调用与输出

```sh
pi
pi --print "Summarize this repository"
git diff | pi --print "Review this change"
pi --mode json "Inspect this repository" > events.jsonl
```

当终端同时连接 stdin 和 stdout 时，Pi 会打开终端界面，除非使用 `--print`、`--mode json` 或 `--mode rpc` 选择其他接口。如果任一数据流被重定向，且没有选择 JSON 或 RPC 模式，Pi 就会使用打印模式。请参阅[命令行集成](../cli-integration.md)，了解如何选择交互、打印、JSON、RPC 和 SDK 集成方式。

| 输入 | 行为 |
|---|---|
| `message` | 提供初始提示 |
| `@path` | 在首条提示中包含文本文件或图片 |
| 管道 stdin | 将其内容添加到首条提示的开头 |
| `--` | 停止解析选项，使提示可以以 `-` 开头 |

Pi 会从当前工作目录解析 `@path`。工作目录也决定项目配置、资源发现和会话分组。

`--print` 控制 Pi 是否运行一次后退出。`--mode` 选择输出接口。当 stdin 和 stdout 都连接到终端时，`--mode text` 不会强制单次执行；要实现这种行为，请使用 `--print`。

| 选项 | 行为 |
|---|---|
| `-p`、`--print` | 运行提供的提示，将助手最终文本写入 stdout，然后退出 |
| `--mode text` | 选择文本输出；当 stdin 和 stdout 都连接到终端时，仍会打开终端界面 |
| `--mode json` | 运行提供的提示，将 JSONL 事件写入 stdout，然后退出 |
| `--mode rpc` | 从 stdin 读取 JSONL 命令，并将响应和事件写入 stdout，直到关闭 |
| `--export <input> [output]` | 将会话文件导出为 HTML 后退出；若省略 `output`，则推导目标路径 |

RPC 模式不接受 `@file` 参数。JSON 和 RPC 模式会将 stdout 专用于协议记录。请参阅 [JSON 事件流](../json.md)和 [RPC 协议](../rpc.md)。

<a id="model-options"></a>

## 模型

```sh
pi --model sonnet:high
```

请参阅[选择模型](../models.md)了解模型选择，并参阅[供应商](../providers.md)了解凭据。

- `--provider <name>`<br>
  将 `--model` 的查找范围限制为一个供应商。此选项需要同时提供 `--model`。
- `--model <pattern>`<br>
  按精确 ID 或模糊 ID/名称匹配来选择模型。可接受 `provider/id` 和可选的 `:<thinking>` 后缀。如果有多个供应商匹配，Pi 会优先选择已有凭据的供应商，否则会要求指定 `--provider`。
- `--api-key <key>`<br>
  使用不持久保存的 API 密钥覆盖值。需要通过 `--model` 或 `--models` 选择模型。若多个供应商提供相同模型，此选项不会替你选择供应商。
- `--thinking <level>`<br>
  设置为 `off`、`minimal`、`low`、`medium`、`high`、`xhigh` 或 `max`。此值会覆盖 `--model` 后缀，并限制在模型支持的能力范围内。
- `--models <patterns>`<br>
  设置用于启动和轮换模型的逗号分隔范围。可接受精确 ID、模糊匹配、不区分大小写的 glob，以及可选的 `:<thinking>` 后缀。如果多个供应商提供同一模型，则会分别为每个供应商添加该模型，并显示警告。
- `--list-models [search]`<br>
  列出可用模型，可选用模糊搜索筛选，然后退出。

<a id="session-options"></a>

## 会话

```sh
pi --continue
```

请参阅[会话与上下文](../sessions.md)，了解如何恢复、分支、命名和存储会话。

- `-c`、`--continue`<br>
  继续当前目录最近的会话。
- `-r`、`--resume`<br>
  打开会话选择器，并在所选会话的工作目录中恢复它。按 Tab 可纳入其他目录中的会话。
- `--session <path|id>`<br>
  通过文件路径或完整/部分 ID 打开会话，并在其工作目录中恢复。如果该 ID 仅匹配存储在其他目录中的会话，Pi 会改为提供将其分支到当前目录的选项。
- `--session-id <id>`<br>
  打开当前目录中具有此 ID 的现有会话；若不存在则创建会话。ID 可包含字母、数字、`.`、`_` 和 `-`。
- `--fork <path|id>`<br>
  通过文件路径或完整/部分 ID 选择会话，并将其分支为当前目录中的新会话。
- `--session-dir <dir>`<br>
  覆盖会话存储和查找目录。它的优先级高于 `PI_CODING_AGENT_SESSION_DIR` 和 `sessionDir` 设置。
- `--no-session`<br>
  使用不会持久保存的内存会话。
- `-n`、`--name <name>`<br>
  设置会话显示名称。

限制：

- 会话 ID 必须以字母或数字开头和结尾。
- `--fork` 不能与 `--session`、`--continue`、`--resume` 或 `--no-session` 同时使用。
- `--session-id` 不能与 `--session`、`--continue` 或 `--resume` 同时使用。可将它与 `--fork` 一起使用来指定新 ID。

<a id="tool-options"></a>

## 工具

```sh
pi --tools read,grep,find,ls --print "Review this project"
```

请参阅[设置](../settings.md#tools)，了解如何配置默认工具选择。

- `-t`、`--tools <list>`<br>
  用逗号分隔的允许列表替换默认选择，列表可包含内置工具、扩展工具或自定义工具。条目可以是工具名称或模式，其中 `*` 匹配任意字符。除非某个条目以 `mcp__` 开头，否则 MCP 工具仍会保留（参见 [MCP 工具](#mcp-tools)）。如果列表只有 `+name` 和 `-name` 条目，它就不是允许列表，而是会修改默认选择。
- `-xt`、`--exclude-tools <list>`<br>
  在应用所有其他选择选项后，禁用以逗号分隔的工具名称或模式，包括 MCP 工具。
- `-nbt`、`--no-builtin-tools`<br>
  禁用默认内置工具，同时保留扩展工具和自定义工具。
- `-nt`、`--no-tools`<br>
  启动时禁用所有内置工具、扩展工具、自定义工具和 MCP 工具。

除非 `defaultTools` 修改默认值，否则默认启用 `read`、`bash`、`edit` 和 `write`。使用普通名称设置 `--tools` 会替换整个选择集，因此请列出你需要的所有工具。与 `defaultTools` 一样，它也接受仅由 `+name` 和 `-name` 条目组成的列表，用于从默认选择中添加或移除工具：`pi --tools +codemode,-write` 会保留其他默认工具、启用 `codemode` 并禁用 `write`。这些条目必须是精确工具名称，不支持 `*` 模式；按模式禁用工具请使用 `--exclude-tools`。普通名称不能与 `+name`/`-name` 条目混用。`/reload` 会启用新加入 `defaultTools` 的工具，但通过 `-name` 移除的工具仍会保持禁用。

<a id="mcp-tools"></a>

`--tools` 用于选择向模型声明的工具。它不会移除 MCP 工具；MCP 工具的可达范围由其[暴露方式](../mcp.md#control-tool-exposure)决定：`pi --tools read,codemode` 仍会让 codemode 脚本能够调用所有 MCP 工具。无论暴露方式如何，如果没有任何条目命名或匹配某个 MCP 工具，它都不会被直接声明；只有在列表中时，`tool_search` 才能加载该工具。一旦某个条目以 `mcp__` 开头，`--tools` 也会筛选 MCP 工具，因此下面的命令只保留 `radius` 服务器的工具：

```sh
pi --tools read,bash,codemode,'mcp__radius__*'
```

MCP 资源工具（`list_mcp_resources`、`list_mcp_resource_templates`、`read_mcp_resource`）也算作 MCP 工具。要移除 MCP 工具，请使用 `--exclude-tools 'mcp__*'` 或 [`--no-mcp`](#resource-options)。

| 内置工具 | 用途 |
|---|---|
| `read` | 读取文本文件和受支持的图片 |
| `bash` | 运行 shell 命令 |
| `powershell` | 在 Windows 上运行 PowerShell 命令 |
| `edit` | 对现有文件执行精确文本替换 |
| `write` | 创建或覆盖文件 |
| `grep` | 搜索文件内容 |
| `find` | 使用 glob 模式查找路径 |
| `ls` | 列出目录内容 |

内置扩展会额外添加两个工具。它们默认关闭；当 MCP 扩展需要它们时会启用（参见 [MCP](../mcp.md#control-tool-exposure)）。你也可以在 `--tools` 或 `defaultTools` 中列出它们来启用。

| 内置扩展 | 用途 |
|---|---|
| `codemode` | 运行可调用其他工具的 JavaScript，例如使用 `Promise.allSettled` 并行调用；只有脚本输出会传给模型 |
| `tool_search` | 搜索尚未向模型声明的工具（例如暴露方式为 `codemode` 和 `deferred` 的工具，包括 MCP 工具），并为下一次调用声明匹配项 |

### 启用 codemode

若要在每个会话中启用 `codemode`，请将其添加到 `~/.pi/agent/settings.json` 或项目 `.pi/settings.json` 的默认工具中：

```json
{
  "defaultTools": ["+codemode"]
}
```

这样会保留 `read`、`bash`、`edit` 和 `write`，并添加 `codemode`。若只想在一次调用中启用，请通过 `--tools` 添加：

```sh
pi --tools +codemode
```

即使不使用 MCP，codemode 也很有用：脚本可以并行运行多个工具调用、在大型输出传给模型前进行筛选、通过 `models.classify()` 调用 TypeSafe 的 Jev 等分类模型（参见[分类模型](../models.md#use-classifier-models)），还可以通过 `models.generateImages()` 生成图片（参见[图像模型](../models.md#use-image-models)）。

### codemode 的工作方式

脚本在 QuickJS 沙箱中运行，并通过 `tools.<name>(args)` 调用其他工具。[Codemode](../codemode.md) 介绍了脚本 API、工具的列出与查找方式、`store()` 和 `models` 全局对象，以及相关限制。

### 工具搜索

`tool_search` 默认关闭；可通过 `"defaultTools": ["+tool_search"]` 或 `--tools` 启用。它会按照 `searchTools()` 使用的相同排序方式搜索尚未声明的工具，并为下一次模型调用声明匹配项。加载的工具会像其他工具变更一样记录在会话中，因此会在该分支上继续保持已声明状态。

<a id="resource-options"></a>

## 资源

```sh
pi --extension ./review.ts
```

请参阅[配置](../configuration.md)，了解约定目录和项目信任；参阅[设置](../settings.md#resources)，了解配置的路径；参阅 [Pi 包](../packages.md)，了解包来源。

- `-e`、`--extension <path>`<br>
  加载扩展文件或目录，也可加载 `builtin:mcp` 等内置扩展；可重复指定。
- `-ne`、`--no-extensions`<br>
  禁用发现到的、已配置的和内置扩展。显式指定的 `-e` 路径仍会加载，因此 `pi -ne -e builtin:mcp` 会只保留内置 MCP 支持。
- `--no-mcp`<br>
  本次运行禁用内置 MCP 支持：不会连接服务器，也不会提供 MCP 工具或 `/mcp`。如果有扩展替代了内置 MCP 支持，则不受影响。
- `--skill <path>`<br>
  加载技能文件或目录；可重复指定。
- `-ns`、`--no-skills`<br>
  禁用发现到的和已配置的技能。显式指定的 `--skill` 路径仍会加载。
- `--prompt-template <path>`<br>
  加载提示模板文件或目录；可重复指定。
- `-np`、`--no-prompt-templates`<br>
  禁用发现到的和已配置的模板。显式指定的 `--prompt-template` 路径仍会加载。
- `--theme <path>`<br>
  加载主题文件或目录；可重复指定。
- `--use-theme <name[/name]>`<br>
  为本次运行选择初始交互主题。
- `--no-themes`<br>
  禁用发现到的和已配置的主题。显式指定的 `--theme` 路径仍会加载。
- `-nc`、`--no-context-files`<br>
  禁用对 `AGENTS.md` 和 `CLAUDE.md` 的发现。

资源路径仅适用于当前进程。相对路径以当前工作目录为基准解析。

<a id="prompt-and-display-options"></a>

## 提示与进程

```sh
pi --append-system-prompt ./instructions.md
```

请参阅[配置](../configuration.md)，了解已保存的配置；参阅[安全](../security.md#understand-project-trust)，了解项目信任；参阅[环境变量](../environment-variables.md)，了解进程控制。

- `--system-prompt <text|path>`<br>
  将默认系统提示替换为指定文本或现有文件的内容。
- `--append-system-prompt <text|path>`<br>
  在系统提示后追加指定文本或现有文件内容；可重复指定。
- `--tui-mode <mode>`<br>
  使用 `fullscreen`（默认）或 `regular` 终端模式。
- `--verbose`<br>
  显示详细的交互式启动信息，并覆盖 `quietStartup`。
- `-a`、`--approve`<br>
  信任本进程的项目本地配置和资源。
- `-na`、`--no-approve`<br>
  忽略本进程中受信任门控限制的项目本地配置和资源。
- `--offline`<br>
  禁用自动网络活动，包括模型目录刷新。等同于 `PI_OFFLINE=1`。
- `-h`、`--help`<br>
  显示帮助信息（包括已加载扩展注册的标志），然后退出。
- `-v`、`--version`<br>
  显示 Pi 版本，然后退出。

扩展可以注册其他长选项。未知的短选项会被拒绝。

## 包命令

```sh
pi install npm:@scope/package
```

请参阅 [Pi 包](../packages.md)，了解来源格式、筛选、安装和项目作用范围。

### 常见任务

| 任务 | 命令 |
|---|---|
| 安装包 | `pi install <source>` |
| 列出已配置的包 | `pi list` |
| 移除包及其设置条目 | `pi remove <source>` |
| 配置要加载的包资源 | `pi config` |

在 `install`、`remove`、`uninstall` 或 `config` 命令后添加 `--local` 或 `-l`，即可使用项目设置而非全局设置。

### 更新 Pi 或包

不带目标运行 `pi update` 会更新 Pi 本身。

| 任务 | 命令 |
|---|---|
| 更新 Pi | `pi update` |
| 更新所有已安装的包 | `pi update --extensions` |
| 更新某个已安装的包 | `pi update <source>` |
| 刷新模型目录 | `pi update --models` |
| 更新 Pi 和所有已安装的包 | `pi update --all` |

当所选更新包含 Pi 时，添加 `--force` 可重新安装 Pi。

如果 Pi 由其他包管理器（例如 Nix）提供，`pi update` 就无法更新 Pi。请使用相应的包管理器更新，例如 `nix profile upgrade pi`。包和模型目录仍可更新。

#### 自定义更新命令

如果 Pi 由包装器或其他包管理器提供，可设置 `PI_SELF_UPDATE_COMMAND`，让 `pi update` 执行对应的更新命令：

```sh
export PI_SELF_UPDATE_COMMAND="mise use -g npm:{packageName}@{version}"
```

仅当 pi.dev 上有较新版本时，`pi update` 才会运行此命令，并将 `{packageName}`、`{version}` 和 `{installSpec}`（即 `{packageName}@{version}`）替换为该版本的信息。此值会按空格拆分。若参数中包含空格，请改用 `~/.pi/agent/settings.json` 中的 `selfUpdateCommand` 设置，它接受 argv 数组，例如 `["nix", "profile", "upgrade", "pi"]`。

### 别名与命令选项

- `pi uninstall <source>` 是 `pi remove <source>` 的别名。
- `pi update --self`、`pi update self` 和 `pi update pi` 都是 `pi update` 的别名。
- `pi update --extension <source>` 是 `pi update <source>` 的别名。
- `-a`、`--approve` 会为单次命令信任项目本地文件。`-na`、`--no-approve` 会忽略受信任门控限制的项目本地文件。
- 在命令后追加 `-h` 或 `--help`，可查看该命令的准确用法和选项限制。

## 凭据命令

`pi auth login <provider>` 会在终端中登录供应商，然后退出，不会启动会话。它会登录账号并打开浏览器，类似于 `/login <provider>`。不支持账号登录的供应商会要求提供 API 密钥。如果 Radius 的登录尚未被任何全局服务器使用，登录 Radius 还会将 Radius MCP 服务器添加到 `~/.pi/agent/mcp.json`。此命令需要交互式终端。

| 选项 | 说明 |
|---|---|
| `--api-key` | 保存 API 密钥，而不是使用账号登录；读取密钥时不会回显 |
| `--no-browser` | 不打开浏览器，改用供应商的其他登录方式，例如通过 SSH 使用设备码。如果有多种方式，会询问选择。不能与 `--api-key` 同时使用 |

`pi auth logout <provider>` 会移除由 `pi auth login` 或 `/login` 保存的凭据，类似于 `/logout`。环境变量和 `models.json` 配置不会改变。如果没有存储凭据，它会以状态码 `0` 退出，因此可以安全地重复运行。

```sh
pi auth login radius
pi auth logout radius
pi auth check --provider openai --json
```

其他身份验证命令需要 `--provider <provider>` 或 `--model <model>`。请参阅[供应商](../providers.md)，了解支持的方法。

| 命令 | 说明 |
|---|---|
| `pi auth check` | 输出 `ready`、`not_ready` 或 `invalid`；对应退出状态码分别为 `0`、`1` 或 `2` |
| `pi auth print-api-key` | 输出解析得到的 API 密钥 |
| `pi auth print-bearer-token` | 输出解析得到的 OAuth bearer token |

| 选项 | 适用命令 | 说明 |
|---|---|---|
| `--provider <provider>` | 全部 | 解析某个供应商的凭据 |
| `--model <model>` | 全部 | 根据模型解析凭据；可与 `--provider` 一起使用 |
| `--json` | `auth check` | 将结构化结果写为 JSON |
| `--credentials` | `auth check` | 凭据就绪时输出解析得到的凭据 |
| `--no-refresh` | `auth check` | 不刷新过期的 OAuth 凭据；默认会刷新 |
| `--min-expiry <duration>` | `print-bearer-token` | 要求令牌至少剩余指定有效期；单位可用 `ms`、`s`、`m` 或 `h`，例如 `30m` |

输出凭据的命令会将机密写入 stdout。

## MCP 命令

这些命令可在会话之外运行，因此代理可以通过 `bash` 执行。请参阅 [MCP 服务器](../mcp.md)。

| 命令 | 说明 |
|---|---|
| `pi mcp add <server> [options] -- <command> [args...]` | 在 `mcp.json` 中添加或替换 stdio 服务器；可重复指定 `--env KEY=VALUE`，并用 `--cwd <dir>` 设置其环境和工作目录。命令后的参数会传递给该命令 |
| `pi mcp add <server> [options] --url <url>` | 添加或替换 streamable HTTP 服务器；可重复指定 `--header KEY=VALUE`；`--bearer-token-env-var <NAME>` 会发送 `Authorization: Bearer ${NAME}`；`--oauth-client-id`、`--oauth-client-secret`、`--oauth-callback-port`、`--oauth-client-name` 和 `--oauth-client-registration`（`auto`、`cimd` 或 `dcr`）用于配置身份验证 |
| `pi mcp remove <server>` | 从 `mcp.json` 移除服务器；保留已存储的 OAuth 凭据 |
| `pi mcp list [--json]` | 连接每个启用的服务器并输出其状态、工具和错误；如果配置条目无效或启用的服务器未连接，则以 `1` 退出 |
| `pi mcp login <server> [-l] [--timeout <seconds>]` | 登录 OAuth 服务器：打开授权页面并等待浏览器响应；终端也接受粘贴的重定向 URL。`--timeout` 限制整个登录流程的时间，包括向授权服务器发出的请求（默认 300 秒）。`-l` 要求服务器定义在项目的 `.pi/mcp.json` 中 |
| `pi mcp logout <server> [-l]` | 删除服务器已存储的 OAuth 凭据 |

`add` 和 `remove` 会修改 `~/.pi/agent/mcp.json`；指定 `--local`（`-l`）时则修改当前目录中的 `.pi/mcp.json`。`add` 还接受 `--exposure <mode>`（参见[暴露方式](../mcp.md#control-tool-exposure)）和 `--description <text>`，且不会连接服务器；运行 `pi mcp list` 可检查服务器。

只有对项目已经信任时，才会读取项目的 `.pi/mcp.json` 文件。
