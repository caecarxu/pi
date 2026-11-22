> 本文为简体中文译本；[查看英文原文](../llama-cpp.md)。

# 使用 llama.cpp 运行本地模型

Pi 支持 [llama.cpp](https://llama.app) 路由服务器。路由器会发现多个 GGUF 模型，并按需加载或卸载它们。

## 安装 llama.cpp

使用[官方安装程序](https://llama.app/docs/installation)安装 llama.cpp：

```bash
curl -LsSf https://llama.app/install.sh | sh
```

验证安装：

```bash
llama --version
```

其他安装方式（包括包管理器和从源代码构建）请参阅 [llama.app](https://llama.app)。

## 启动路由器

启动 `llama serve` 时不要传入 `--model`、`-m` 或 `-hf`。传入模型会启动单模型模式，而不是路由器模式。路由器配置请参阅 [llama.cpp 服务器指南](https://llama.app/docs/serve#serving-multiple-models-router-mode)。

```bash
llama serve \
  --no-models-autoload \
  -ngl all \
  -c 32768
```

重要选项：

- `--no-models-autoload` 禁用自动加载，必须通过 `/llama` 显式加载模型。
- `-ngl all` 将所有层卸载到 GPU。省略此选项则自动决定 GPU 卸载方式。
- `-c 32768` 设置上下文大小（单位为 token）。使用 `-c 0` 可采用模型的完整上下文窗口，这可能需要多得多的内存。上下文由并行服务器槽位共享。

单文件模型可以直接放在模型目录中。多模态模型和多分片模型应分别放在独立子目录中：

```text
~/models/
├── llama-3.2-1b-Q4_K_M.gguf
├── gemma-3-4b-it-Q4_K_M/
│   ├── gemma-3-4b-it-Q4_K_M.gguf
│   └── mmproj-F16.gguf
└── large-model-Q4_K_M/
    ├── large-model-Q4_K_M-00001-of-00003.gguf
    ├── large-model-Q4_K_M-00002-of-00003.gguf
    └── large-model-Q4_K_M-00003-of-00003.gguf
```

手动添加文件后，请重启路由器。路由器还支持缓存模型和预设文件，可通过 `--models-preset` 配置，详情见[服务器指南](https://llama.app/docs/serve#serving-multiple-models-router-mode)。

## 配置 Pi

启动 Pi 并配置提供方：

```text
/login llama.cpp
```

输入路由器 URL 和可选的 API 密钥。默认 URL 为 `http://127.0.0.1:9931`。

如果路由器以 `--no-models-autoload` 启动，`/login llama.cpp` 只会保存连接信息。运行 `/llama` 加载模型，然后运行 `/model` 为当前会话选择已加载的模型。

也可以通过环境变量设置相同的值，无需使用 `/login`：

```bash
export LLAMA_BASE_URL=http://127.0.0.1:9931
export LLAMA_API_KEY=optional-secret
pi
```

如果服务器使用 API 密钥，请在启动 `llama serve` 时传入匹配的 `--api-key` 值。本地访问时请保留 `--host 127.0.0.1`。

## 管理模型

运行：

```text
/llama
```

- 选择未加载的模型即可加载。
- 选择已加载的模型即可卸载。
- 选择 **Download model…**，搜索 Hugging Face，然后选择仓库和量化版本。也可以直接输入准确的 `owner/repository[:quant]` 值。
- 加载或下载过程中按 Escape 可确认取消。

Hugging Face 搜索会在设置了 `HF_TOKEN` 时使用它，否则依次检查 `$HF_TOKEN_PATH`、`$HF_HOME/token`、`$XDG_CACHE_HOME/huggingface/token` 和 `~/.cache/huggingface/token`。未认证时也可以搜索，但速率限制更低。对于受限仓库，Pi 会在下载前发出提示并提供其访问页面链接。下载由 llama.cpp 服务器执行，因此若所选仓库需要访问权限，服务器进程也必须设置 `HF_TOKEN`。

如果还有其他模型已加载，Pi 会询问是先卸载它们还是保持加载。Pi 不会静默卸载模型，也不会删除模型文件。路由器可能由其他客户端共享，因此 `/llama` 始终显示路由器的当前状态。

已加载和休眠的模型会显示在 `/model` 中。选择休眠模型时，它会自动唤醒。启用路由器自动加载后，未加载的预设模型也会显示出来，并在选中时加载。使用 `--no-models-autoload` 时，必须先通过 `/llama` 加载模型才能选择它。

如果路由器断开连接，`/llama` 会显示 **Retry** 和 **Close**。Retry 会重新连接并刷新模型状态，但不会重放中断的操作。

## 分类

分类器模型会针对 JSON 状态回答类型化的 `choice`、`bool` 和 `score` 问题，例如 TypeSafe 的 Jev 模型。模型可由 [`codemode`](cli.md#enable-codemode) 脚本调用，扩展则可通过 `ctx.modelRegistry.classify()` 调用；参见[分类器模型](models.md#use-classifier-models)。Pi 会以两种方式将 llama.cpp 模型列为分类器：

- **决策模型**，例如 [Julia-1、Laya、Kev、lev 和 OpenJev](https://huggingface.co/collections/ggml-org/decision-models-6abf80cca3c83f127060a769)，通过 llama.cpp 的 `/v1/systemone` 端点原生作答。它们仅作为分类器显示，使用 `typesafe-system-one` API，不会显示在 `/model` 中。
- **聊天模型**也会作为分类器列出，使用相同 ID 和 `llama-cpp-classify` API；该 API 从下一个 token 的概率中读取答案，具体如下文所述。

llama.cpp 0.6.0 及更高版本会在路由器的模型列表中报告决策模型：其 `architecture.output_modalities` 包含 `decisions`。路由器无需加载模型即可从 GGUF 元数据中读取这一信息，因此 Pi 也能识别尚未加载和处于休眠状态的决策模型。较旧的 llama.cpp 构建版本不会报告此信息，Pi 会将其中的决策模型列为聊天模型。

### 将聊天模型用作分类器

模型不会生成答案。每个问题都会变成一个聊天提示：状态、请求中的所有问题、再次出现的状态，然后是带有答案选项的问题；答案选项使用单 token 标签。选择题标签为字母（最多 62 个选项），布尔题使用 `Yes`/`No`，评分题使用数字（最多 10 个级别）。第二份状态会在模型看到问题后读取；在小模型上的 JevBench 测试中，这提高了准确率。Pi 会读取各标签作为下一个 token 的概率并进行归一化。选择题会返回每个选项的概率，以及按 `(n * peak - 1) / (n - 1)` 计算的置信度；评分题则返回期望级别。

- 原始标签概率通常过度自信。每个请求的 `temperature` 选项会在归一化前对标签 logits 作除法；大于 1 的值会让分布更平缓。它不会改变答案。
- 问题会依次运行。请求中所有问题的最后一个问题之前的内容都相同，因此服务器的提示缓存只需对其求值一次。状态会出现两次，因此需要两倍于状态大小的上下文空间。
- 小模型可能会遵循状态中写入的指令。提示会告知模型应将状态视为数据来判断，但这并非保证。
- Qwen3.5 等混合模型在没有上下文检查点时，无法回退部分缓存的提示。如果每个问题都要重新处理整个状态，请使用 `--ctx-checkpoints 32 --checkpoint-min-step 0` 启动路由器。

## 故障排查

检查路由器是否可访问：

```bash
curl http://127.0.0.1:9931/health
curl http://127.0.0.1:9931/models
```

- **`/llama` 中没有模型：** 检查 `--models-dir`、目录布局，然后重启路由器。
- **使用 `--no-models-autoload` 时模型未显示在 `/model` 中：** 先通过 `/llama` 加载模型。
- **加载失败或占用内存过多：** 降低 `-c` 的值，或卸载另一个模型。
- **服务器不在路由器模式：** 启动时不要传入 `--model`、`-m` 或 `-hf`。

若要移除 `llama.cpp` 提供方和 `/llama`，请在 `pi config` 的 Built-in 中禁用 `llama.cpp`，或在[设置](settings.md#resources)中设置 `"extensions": ["-builtin:llama.cpp"]`。
