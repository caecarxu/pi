> 本文为简体中文译本；[查看英文原文](../containerization.md)。

# 在隔离环境中运行 Pi

使用隔离环境可以限制模型生成的命令能够访问或影响的文件、凭据、进程和网络服务。

你可以将整个 Pi 进程放入隔离环境，也可以让 Pi 留在主机上，只把选定工具路由到隔离环境。

## 选择隔离方式

| 方式 | Pi 的运行位置 | 隔离范围 | 凭据处理 | 适用场景 |
|---|---|---|---|---|
| 普通 Docker | 容器 | Pi、内置工具、`!` 命令和扩展 | 凭据传入容器 | 简单的本地容器边界 |
| Docker Sandboxes | 托管沙箱 | Pi、内置工具、`!` 命令和扩展 | provider 凭据留在主机，由代理在请求发出时替换 | 由系统管理的本地隔离，不向 Pi 暴露真实 provider 密钥 |
| OpenShell | 本地或远程沙箱 | Pi、内置工具、`!` 命令和扩展 | 由策略控制凭据和推理路由 | 文件系统、进程、网络和凭据策略 |
| Gondolin 扩展 | 主机 | 内置工具和 `!` 命令 | Pi 存储的凭据留在主机，但命令会继承主机环境变量 | 使用本地 micro-VM 执行工具，同时保留主机上的界面 |

不同方法会改变扩展的运行位置。整个 Pi 进程在隔离环境中运行时，扩展也会在那里运行。主机 Pi 通过 Gondolin 委派内置工具时，其他扩展工具仍在主机上运行，除非它们也委派自己的工作。

## 决定 Pi 可以访问什么

隔离进程仍然可以影响你向它开放的资源：

- 可读写的主机挂载会让 Pi 修改对应主机文件。
- 挂载 `~/.pi/agent` 会暴露 Pi 凭据、设置、扩展和会话。
- 传入容器的环境变量可供其中的进程使用。
- 网络访问可能让代码或工具输出离开隔离环境。
- 仅隔离工具不会限制主机上的 Pi 进程，也不会限制未使用隔离后端的扩展工具。

只开放任务所需的工作目录、凭据和网络目标。如果不希望写入影响主机，可使用只读挂载，或在隔离环境中复制文件进出。

## 在普通 Docker 中运行 Pi

普通 Docker 提供最简单的全进程容器边界。

### 构建镜像

创建 `Dockerfile.pi`：

```dockerfile
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

WORKDIR /workspace
ENTRYPOINT ["pi"]
```

在该文件所在目录构建镜像：

```bash
docker build -t pi-sandbox -f Dockerfile.pi .
```

### 启动 Pi

在希望 Pi 访问的工作目录中运行：

```bash
docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox
```

将 `ANTHROPIC_API_KEY` 替换为 provider 所需的凭据。命名卷 `pi-agent-home` 会在多次运行之间保留容器内设置、凭据和会话。

除非你希望容器访问主机上的 Pi 配置和凭据，否则不要挂载主机的 `~/.pi/agent`。

### 验证工作目录

在 Pi 中运行：

```text
!pwd
```

命令应显示 `/workspace`。对 `/workspace` 下文件的更改会写入已挂载的主机目录。如果不能接受这种行为，请移除绑定挂载或改用只读挂载。

## 使用 Docker Sandboxes 运行 Pi

[Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) 会在托管沙箱中运行整个 Pi 进程。它的代理可以将真实 provider 凭据留在主机上，并在请求离开沙箱时替换凭据。

创建沙箱前先配置凭据。不要在沙箱内运行 `/login`，否则会把真实凭据写入沙箱。

### 使用 Claude Pro 或 Max 令牌

在安装了 Claude Code 的机器上运行 `claude setup-token` 生成令牌。如果已经配置了 `anthropic` 密钥，请先删除它，避免代理在 Bearer 令牌旁边再添加 API 密钥标头：

```bash
sbx secret rm anthropic

sbx secret set-custom \
  --host api.anthropic.com \
  --env ANTHROPIC_OAUTH_TOKEN \
  --placeholder 'sk-ant-oat01-{rand}'
```

`sbx secret set-custom` 会从标准输入读取真实令牌。沙箱会收到一个 OAuth 格式的占位符；代理只会针对配置的主机替换它。

若使用 Anthropic API key，请改用 `sbx secret set anthropic`。

### 启动 Pi

在希望挂载的工作目录中运行：

```bash
sbx run --kit "docker.io/sbx/pi-kit:latest" pi
```

对于已经存在的沙箱，可用非交互模式运行 Pi：

```bash
sbx exec <sandbox-name> -- pi -p "list the failing tests"
```

其他 provider、故障排查和镜像固定方式见 [Pi kit 文档](https://github.com/docker/sbx-kits-contrib/tree/main/pi)。

## 使用 OpenShell 运行 Pi

[NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview) 提供本地或远程沙箱，并支持文件系统、进程、网络、凭据和推理策略。

### 选择 gateway

每个沙箱都需要一个处于活动状态的 gateway：

```bash
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
```

### 创建沙箱

```bash
openshell sandbox create --name pi-sandbox --from pi -- pi
```

Pi、内置工具、`!` 命令和扩展工具都会在 OpenShell 边界内运行。

### 向远程沙箱传输文件

远程 gateway 不会绑定挂载主机工作目录。请在沙箱内克隆仓库，或显式传输文件：

```bash
openshell sandbox upload pi-sandbox ./working-folder /workspace
openshell sandbox download pi-sandbox /workspace/working-folder ./working-folder-out
```

配置 OpenShell 推理路由后，可以让原始模型凭据留在沙箱之外。此时将 Pi 指向 gateway 提供的相应 OpenAI 兼容或 Anthropic 兼容端点。

## 通过 Gondolin 路由工具

[Gondolin](https://github.com/earendil-works/gondolin) 是本地 Linux micro-VM。它的示例扩展会将 Pi 进程和文件形式的 provider 凭据保留在主机上，同时把内置工具和用户的 `!` 命令路由到 VM 中执行。

VM 中的命令会继承主机进程环境。因此，通过环境变量提供的 provider 密钥可能在 VM 中可见。除非删除敏感变量或更改扩展的环境处理方式，否则不要把这种模式用作凭据边界。

Gondolin 需要 Node.js 23.6 或更高版本，以及通过操作系统包管理器安装的 QEMU。

### 安装扩展

在 Pi 源码仓库中运行：

```bash
mkdir -p ~/.pi/agent/extensions
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts
```

### 启动 Pi

在希望挂载的工作目录中运行 Pi：

```bash
cd /path/to/working-folder
pi -e ~/.pi/agent/extensions/gondolin
```

扩展会将主机工作目录挂载到 VM 的 `/workspace`，并覆盖 `read`、`write`、`edit`、`bash`、`grep`、`find` 和 `ls`。对 `/workspace` 中文件的更改会写入主机。

除非扩展工具明确委派操作，否则其他扩展工具仍会在主机上运行。在添加可能绕过 VM 边界的工具之前，请先检查 [Gondolin 示例](../../examples/extensions/gondolin/)。
