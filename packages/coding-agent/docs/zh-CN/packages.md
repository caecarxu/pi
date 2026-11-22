> 本文为简体中文译本；[查看英文原文](../packages.md)。

# Pi 包

Pi 包可将扩展、技能、提示模板和主题作为一个整体进行安装和分发。如果要通过 npm 或 git 分享自定义内容，或多个资源需要一起发布，可以使用包。

包就是普通目录或 npm 包。它可以提供约定俗成的资源目录、在 `package.json` 的 `pi` 字段下声明明确路径，也可以携带自己的运行时依赖。

## 安装和管理包

可从 npm、git 或本地路径安装：

```bash
pi install npm:@example/pi-tools@1.0.0
pi install git:github.com/example/pi-tools@v1
pi install ./local-package
```

`pi list` 会显示已配置的包。使用 `pi remove <source>` 移除包，使用 `pi update --extensions` 同步包安装状态。所有包命令和选项见[命令行](cli.md#package-commands)。

如果某个已配置的包在启动时安装失败（例如 npm 无法连接注册表），Pi 会发出警告、跳过该包的资源并继续运行。Pi 会在下次启动或执行 `/reload` 时重试。`pi install` 和 `pi update --extensions` 仍会报告失败并以非零状态退出。

个人安装记录写入 `~/.pi/agent/settings.json`。添加 `--local` 或 `-l` 可将包声明写入 `.pi/settings.json`。只有在授予项目目录信任后，Pi 才会读取该文件中的声明。

项目包只有在解决项目目录信任后才会安装和加载。包可以执行扩展代码，也可以包含会指示模型运行程序的技能。安装前请检查第三方包的源代码；授予项目目录信任前，请检查其中的包声明。

使用 `--extension` 或 `-e` 可在本次运行中试用包，而不将其加入设置：

```bash
pi -e npm:@example/pi-tools
```

Pi 会将 `-e` 包缓存在 `~/.pi/agent/tmp/extensions/`，并在每次启动和 `/reload` 时检查。若注册表上有符合版本规格的较新版本，npm 包会重新安装。固定到具体版本号的包（例如 `@1.2.3`）不会被检查。git 包会被获取并重置到远程分支或引用；如果当前检出的引用是提交哈希，则不会重新获取。检查失败或启用离线模式时，Pi 会加载缓存副本。

## 选择来源

| 来源 | 示例 | 行为 |
|---|---|---|
| npm | `npm:@example/pi-tools@1.0.0` | 安装到 Pi 的 npm 目录下 |
| git | `git:github.com/example/pi-tools@v1` | 克隆仓库并同步到所选引用 |
| URL | `https://github.com/example/pi-tools` | 按 git 来源处理 |
| 本地 | `./pi-tools` | 从解析后的路径加载，不复制文件 |

带版本号的 npm 规格会固定到该版本。git 标签和提交也会固定；包更新会同步检出内容，但不会改变已配置的引用。

相对本地路径以包含它的设置文件所在位置为基准解析。文件路径会加载一个扩展；目录则遵循常规包发现规则。

## 创建包

最简单的包使用约定俗成的目录：

```text
my-pi-package/
├── package.json
├── extensions/
├── skills/
├── prompts/
└── themes/
```

没有 `pi` 清单时，Pi 会从这些目录发现 TypeScript 和 JavaScript 扩展、技能目录、Markdown 提示模板以及 JSON 主题。

当资源位于其他位置或需要筛选时，可使用显式清单：

```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./src/extension.ts"],
    "skills": ["./resources/skills"],
    "prompts": ["./resources/prompts/*.md"],
    "themes": ["./resources/themes/*.json"]
  }
}
```

路径相对于包根目录。数组接受 glob 模式和排除项。如果 glob 遍历无法发现以点开头或为符号链接的资源根目录，请直接列出这些路径。

`pi-package` 关键字会使 npm 包符合[Pi 包库](https://pi.dev/packages)的收录条件。可选的 `pi.image` 和 `pi.video` 字段可添加包库预览内容。

## 显示变更日志

包更新后，Pi 可以显示变更内容。下次全新启动时，Pi 会读取包的变更日志，并在“Extension Updates”下显示比上次查看版本更新的条目，方式与显示 Pi 自身的变更日志相同。Pi 首次发现某个包时只记录版本，不显示内容。

这适用于至少加载一个扩展的包。只提供技能、提示模板或主题的包不会显示变更日志。

默认情况下，Pi 会读取包根目录中的 `CHANGELOG.md`。可将 `pi.changelogPath` 指向包内的其他文件，或设为 `""` 以禁用变更日志：

```json
{
  "name": "my-pi-package",
  "version": "1.2.0",
  "pi": {
    "changelogPath": "./docs/CHANGELOG.md"
  }
}
```

版本标题应使用与 Pi 变更日志相同的格式，例如 `## [1.2.0]` 或 `## 1.2.0 - 2026-01-01`。条目会与 `package.json` 中的 `version` 字段匹配，因此只有该字段增加时，git 包才会显示变更日志。`collapseChangelog` 设置会将一个包的部分折叠为一行，例如 `Updated my-pi-package to v1.2.0.`。与 Pi 自身的变更日志不同，`/changelog` 不会显示包变更日志；详情请阅读包的变更日志文件或仓库。

## 声明依赖

将扩展导入的运行时包放入 `dependencies`。安装 npm 或 git 来源时，Pi 会安装包依赖。

Pi 会向扩展和技能提供以下包：

- `@earendil-works/pi-ai`
- `@earendil-works/pi-agent-core`
- `@earendil-works/pi-coding-agent`
- `@earendil-works/pi-tui`
- `typebox`

将上述由宿主提供的包以 `"*"` 版本范围声明在 `peerDependencies` 中，不要将它们打包进去。Pi 会抑制通过 npm、pnpm 或 Bun 安装的托管 npm 包和 git 包的自动 peer 依赖安装。本地包不会被安装或修改，因此其依赖树仍由包作者负责。

不要把宿主提供的包列入 `dependencies`。物理副本可能绕过编译 ESM 中 Pi 的扩展模块映射，造成重复的类、注册表和初始化工作。若检测到这种清单配置，Pi 会发出扩展警告。其他作为依赖使用的 Pi 包必须包含在发布的 tarball 中，并通过其 `node_modules` 资源路径引用。

已安装的包使用独立模块根目录。不要依赖两个包共享同一份依赖实例，也不要依赖一个包解析另一个包未声明的依赖。

## 选择包资源

设置中的对象形式可以筛选从包中加载的资源：

```json
{
  "packages": [
    {
      "source": "npm:@example/pi-tools",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"]
    }
  ]
}
```

对于每类资源：

- 省略属性表示加载此包允许提供的全部该类资源。
- 使用 `[]` 表示不加载该类资源。
- 使用 `!pattern` 排除匹配 glob 的路径。
- 使用 `+path` 纳入一个明确允许的路径。
- 使用 `-path` 排除一个明确路径。

筛选器只会缩小包清单范围，不会公开包自身未声明的资源。

运行 `pi config` 可启用或禁用发现到的资源以及 Pi 内置扩展。启动时默认使用个人配置；按 Tab 切换范围，或运行 `pi config --local` 以项目覆盖项启动。

## 理解范围和身份

同一个包可以同时出现在个人设置和项目设置中。通常项目条目会替换个人条目。若设置了 `autoload: false`，项目条目则改为针对个人包应用筛选增量。

Pi 通过包名识别 npm 包，通过不带引用的仓库 URL 识别 git 包，通过解析后的绝对路径识别本地包。这可以避免等价声明导致同一包重复加载。

设计每类资源时，请参阅[扩展](extensions.md)、[技能](skills.md)、[提示模板](prompt-templates.md)和[主题](themes.md)。
