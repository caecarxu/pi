> 本文为简体中文译本；[查看英文原文](../nvidia-rtx-llama-cpp.md)。

# 使用 NVIDIA RTX 和 llama.cpp 运行 Pi

[NVIDIA Local AI Inference Recipes](https://nvidia.github.io/local-ai-inference-recipes/index.html) 提供针对特定 NVIDIA 硬件和模型调优的 llama.cpp 设置。每份配方给出一个单模型 `llama-server` 命令。Pi 使用可提供和管理多个模型的 llama.cpp 路由器，因此本指南会把配方命令转换为路由器预设，并用 `llama serve` 启动。`llama serve` 接受与 `llama-server` 相同的选项。

以下示例使用 Windows PowerShell。有关 Pi 的完整路由器和模型管理参考，请参阅[使用 llama.cpp 运行本地模型](llama-cpp.md)。

## 开始之前

1. 打开[配方目录](https://nvidia.github.io/local-ai-inference-recipes/index.html)，选择硬件、操作系统和模型，然后选择 **llama.cpp**。查看前置条件和内存要求，并保留配方中的启动命令，供后续转换使用。
2. 按照配方中的说明安装 llama.cpp。配方设置依赖于所用构建，例如 CUDA 支持或推测解码选项。
3. 运行 `llama serve --help` 并确认其中列有 `--models-preset`。如果构建没有 `llama` 程序或缺少该选项，就无法将配方用作路由器预设。请改用仍满足配方要求的较新构建。
4. 按照[快速入门](quickstart.md)安装 Pi。在原生 Windows 上还请参阅[在 Windows 上运行 Pi](windows.md)。

## 将配方转换为预设

预设列出一个或多个模型的设置。每个段名会成为 Pi 中显示的模型 ID。将预设保存在 llama.cpp 目录中，或在启动路由器时传入它的完整路径。

把配方命令中的每个选项转换为一行预设内容：

- 去掉开头的短横线：`--ctx-size 65536` 转换为 `ctx-size = 65536`。
- 没有值的选项写成 `true`：`--jinja` 转换为 `jinja = true`。
- 去掉值两侧的引号和 PowerShell 行续接反引号。
- 不要写入 `--host` 和 `--port`，它们应放在路由器命令行中。
- 添加 `load-on-startup = true`，让路由器启动时加载模型。
- 将模型文件选项的短写改为预设中的长键：

| 配方选项 | 预设键 |
|---|---|
| `-hf` | `hf-repo` |
| `-hff` | `hf-file` |
| `-hfrd` | `hf-repo-draft` |
| `--spec-draft-model` | `spec-draft-model` |

例如，配方命令：

```powershell
llama-server.exe -hf "unsloth/Qwen3.8-27B-GGUF" `
  -hff "Qwen3.8-27B-UD-Q4_K_M.gguf" `
  -hfrd "z-lab/Qwen3.8-27B-DFlash2-GGUF" `
  --spec-draft-model "Qwen3.8-27B-DFlash2-Q4_K_M.gguf" `
  --no-mmproj `
  --host 127.0.0.1 `
  --port 9931 `
  --batch-size 4096 `
  --ubatch-size 1024 `
  --ctx-size 65536 `
  --parallel 1 `
  -ngl 999 `
  --jinja `
  --chat-template-kwargs '{"preserve_thinking":true}' `
  --spec-type draft-dflash `
  --spec-draft-n-max 7 `
  --spec-draft-backend-sampling
```

转换后得到 `qwen3.8-27b.ini`：

```ini
version = 1

[qwen3.8-27b]
load-on-startup = true
hf-repo = unsloth/Qwen3.8-27B-GGUF
hf-file = Qwen3.8-27B-UD-Q4_K_M.gguf
hf-repo-draft = z-lab/Qwen3.8-27B-DFlash2-GGUF
spec-draft-model = Qwen3.8-27B-DFlash2-Q4_K_M.gguf
no-mmproj = true
batch-size = 4096
ubatch-size = 1024
ctx-size = 65536
parallel = 1
ngl = 999
jinja = true
chat-template-kwargs = {"preserve_thinking":true}
spec-type = draft-dflash
spec-draft-n-max = 7
spec-draft-backend-sampling = true
```

## 启动路由器

在 llama.cpp 目录中打开 PowerShell 并运行：

```powershell
.\llama.exe serve --models-preset qwen3.8-27b.ini --host 127.0.0.1
```

如果配方需要 Hugging Face 令牌，请在同一个 PowerShell 窗口中设置 `$env:HF_TOKEN`，然后启动路由器。首次启动时，路由器会下载模型文件。

使用[路由器健康检查](llama-cpp.md#troubleshooting)确认服务已就绪。在 Windows PowerShell 中，请使用 `curl.exe`，而不是会被 PowerShell 映射为其他命令的 `curl`。当 `/models` 列出状态为 `loaded` 的 `qwen3.8-27b` 时，模型即可使用。

## 在 Pi 中使用模型

按照[配置 Pi](llama-cpp.md#configure-pi)连接到 `http://127.0.0.1:9931`。预设段名就是模型 ID，因此本例中请在 `/model` 里选择 `qwen3.8-27b`。

NVIDIA 配方中的内存设置假定 GPU 只运行所选模型。如果 `/llama` 显示还有其他已加载模型，请在使用配方模型前卸载它们。
