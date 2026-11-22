> 本文为简体中文译本；[查看英文原文](../termux.md)。

# 使用 Termux 在 Android 上运行 Pi

Pi 可通过 [Termux](https://termux.dev/) 在 Android 上运行。Termux 提供终端模拟器和 Linux 环境，支持文本输入、文件工具和 shell 命令。借助 Termux:API，Pi 可以复制和粘贴 Android 剪贴板中的文本。不支持粘贴剪贴板图像。

## 开始之前

请从 [GitHub 或 F-Droid](https://github.com/termux/termux-app#installation) 安装 Termux。不要使用已弃用的 Google Play 版本。

[Termux:API](https://github.com/termux/termux-api#installation) 为可选组件。只有在希望 Pi 复制或粘贴 Android 剪贴板文本，或者 shell 命令需要使用 Android 设备 API 时，才需要安装。

## 安装 Pi

1. 更新 Termux 软件包：

   ```bash
   pkg update && pkg upgrade
   ```

2. 安装 Node.js 和 Git：

   ```bash
   pkg install nodejs git
   ```

3. 安装 Pi：

   ```bash
   npm install -g --ignore-scripts @earendil-works/pi-coding-agent
   ```

4. 验证安装：

   ```bash
   pi --version
   ```

5. 进入要处理的文件夹并启动 Pi：

   ```bash
   cd /path/to/working-folder
   pi
   ```

接下来请按照[快速入门](quickstart.md#3-choose-a-model)连接模型并运行第一个任务。

## 访问 Android 共享存储

授予权限之前，Termux 无法访问 Android 共享存储。运行一次以下命令：

```bash
termux-setup-storage
```

批准权限后，Android 共享存储可通过 `/storage/emulated/0` 以及 Termux 在 `~/storage/` 下创建的链接访问。

只有在确实需要 Pi 访问这些文件时才授予此权限。Termux 中运行的命令和工具使用与 Termux 进程相同的存储权限。

## 使用剪贴板命令

Pi 使用 `termux-clipboard-set` 复制文本，并使用 `termux-clipboard-get` 实现剪贴板粘贴快捷键。Shell 命令也可以直接调用这两个命令。请安装 Termux:API 应用及其命令行软件包：

```bash
pkg install termux-api
```

验证集成：

```bash
printf 'Pi clipboard test' | termux-clipboard-set
termux-clipboard-get
```

第二条命令应输出 `Pi clipboard test`。

Termux 剪贴板 API 仅支持文本。Pi 的剪贴板粘贴快捷键会将文本插入编辑器，但无法附加剪贴板图像。

## 添加 Termux 专属指令

Pi 能检测到自己在 Termux 中运行，但无法推断你希望它如何与 Android 交互。请只把与你的工作相关的环境细节写入 `~/.pi/agent/AGENTS.md`：

````markdown
# Termux 环境

- Pi 在 Android 的 Termux 中运行。
- Android 共享存储位于 `/storage/emulated/0`。
- 使用 `termux-open-url "https://example.com"` 打开网址。
- 使用 `termux-open <path>` 打开文件。
- 除非任务需要，否则不要访问共享存储。
````

在活动会话中修改此文件后，运行 `/reload`。

## 故障排查

### 剪贴板集成失败

确认已安装以下两个组件：

1. 与 Termux 来自同一来源的 Termux:API Android 应用
2. `termux-api` 命令行软件包

然后在 Pi 外运行上面的剪贴板验证命令。如果命令在 Pi 外也失败，请先修复 Termux:API 安装，再重试 Pi 的复制命令。

### 共享存储提示权限被拒绝

运行 `termux-setup-storage`，批准 Android 权限请求，然后重试 `~/storage/` 或 `/storage/emulated/0` 下的路径。

### 安装后找不到 Pi

打开新的 Termux shell 并运行：

```bash
npm prefix -g
command -v pi
```

确认全局 npm 可执行文件目录已加入 `PATH`；如果找不到包，请重新安装。
