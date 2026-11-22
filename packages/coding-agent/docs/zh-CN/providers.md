> 本文为简体中文译本；[查看英文原文](../providers.md)。

<a id="providers"></a>

# 模型供应商

多数托管供应商支持以下一种或两种认证方式。

- 通过基于 OAuth 的浏览器登录或设备授权流程登录。
- 提供 API 密钥。

使用 `/login [provider]` 查看某个供应商支持的方式。Amazon Bedrock 和 Google Vertex AI 也可以使用云环境已有的凭据。

<a id="authenticate-interactively"></a>

## 交互式认证

运行 `/login` 并选择供应商。Pi 会引导你完成 OAuth 或 API 密钥认证，并将凭据保存到 [`auth.json`](configuration.md#agent-目录)。

在远程或无图形界面的机器上，OAuth 回调可能无法到达本地进程。出现提示时，将最终重定向 URL 或授权码粘贴回 Pi。

运行 `/logout` 并选择供应商可删除已保存的凭据。环境变量和 `models.json` 中的认证配置仍然有效，供应商端的凭据也不会被撤销。

`auth.json` 可能包含 API 密钥和 OAuth 令牌。请妥善保管，切勿提交到版本库。

<a id="use-an-api-key-from-the-environment"></a>

## 从环境变量读取 API 密钥

CI 等环境通常不需要 Pi 存储密钥。这时可以在启动 Pi 前设置环境变量。

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

下表列出以单个环境变量作为主要 API 密钥来源的供应商。需要额外配置或支持云环境凭据的供应商见[供应商专用配置](#provider-specific-config)。

| 供应商 | 环境变量 |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` |
| Ant Ling | `ANT_LING_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| NVIDIA NIM | `NVIDIA_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| xAI | `XAI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` |
| ZAI Coding Plan（全球） | `ZAI_API_KEY` |
| ZAI Coding Plan（中国） | `ZAI_CODING_CN_API_KEY` |
| OpenCode Zen 和 Go | `OPENCODE_API_KEY` |
| Radius | `RADIUS_API_KEY` |
| TypeSafe（[分类模型](models.md#使用分类模型)） | `TYPESAFE_API_KEY` |
| Hugging Face | `HF_TOKEN` |
| Fireworks | `FIREWORKS_API_KEY` |
| Together AI | `TOGETHER_API_KEY` |
| Baseten | `BASETEN_API_KEY` |
| Kimi For Coding | `KIMI_API_KEY` |
| Meta | `META_API_KEY` |
| MiniMax | `MINIMAX_API_KEY` |
| MiniMax（中国） | `MINIMAX_CN_API_KEY` |
| Moonshot AI（全球及中国） | `MOONSHOT_API_KEY` |
| Qwen Token Plan Team | `QWEN_TOKEN_PLAN_TEAM_API_KEY` |
| Qwen Token Plan Team（中国） | `QWEN_TOKEN_PLAN_TEAM_CN_API_KEY` |
| Qwen Token Plan Individual | `QWEN_TOKEN_PLAN_INDIVIDUAL_API_KEY` |
| Qwen Token Plan Individual（中国） | `QWEN_TOKEN_PLAN_INDIVIDUAL_CN_API_KEY` |
| Xiaomi MiMo | `XIAOMI_API_KEY` |
| Xiaomi MiMo Token Plan（中国） | `XIAOMI_TOKEN_PLAN_CN_API_KEY` |
| Xiaomi MiMo Token Plan（阿姆斯特丹） | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` |
| Xiaomi MiMo Token Plan（新加坡） | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` |

Anthropic 还接受 `ANTHROPIC_OAUTH_TOKEN` 作为 API 凭据，并支持使用 `ANTHROPIC_AUTH_TOKEN` 进行 Bearer 认证。

没有设置密钥或令牌时，如果同时设置了 `ANTHROPIC_FEDERATION_RULE_ID`、`ANTHROPIC_ORGANIZATION_ID` 和 `ANTHROPIC_IDENTITY_TOKEN_FILE`，Anthropic 会使用工作负载身份联合。Anthropic SDK 使用身份令牌换取短期访问令牌，并在刷新时重新读取身份令牌文件。长时间运行会话时，应确保该文件保持有效。若设置了 `ANTHROPIC_SERVICE_ACCOUNT_ID` 和 `ANTHROPIC_WORKSPACE_ID`，它们也会原样传递。

<a id="load-an-api-key-from-a-command"></a>

## 从命令读取 API 密钥

要使用密钥管理器并避免将取出的密钥写入磁盘，请把 `auth.json` 中该供应商的 `key` 设为以 `!` 开头的命令。

```json
{
  "anthropic": {
    "type": "api_key",
    "key": "!security find-generic-password -ws 'anthropic'"
  }
}
```

Pi 在首次需要密钥时运行该命令，并在本次进程内缓存标准输出。如果输出为空、运行超时或以非零状态退出，Pi 将无法取得密钥，直到重启后才会重新尝试。

<a id="provider-specific-config"></a>

## 供应商专用配置

以下供应商需要额外的设置步骤或配置，也有些可以使用所在平台提供的凭据。

存储的 API 密钥凭据可以包含 `env` 对象。对该供应商而言，对象中的值优先于进程环境变量。

```json
{
  "cloudflare-workers-ai": {
    "type": "api_key",
    "key": "...",
    "env": {
      "CLOUDFLARE_ACCOUNT_ID": "account-id"
    }
  }
}
```

### Radius

Radius 是 Pi 的开发团队 Earendil Works 专为 Pi 构建的服务。它提供可定制的 AI 网关，内置组织级管理和分析功能，还支持用制品（artifacts）分享你用 Pi 创建的内容。

在 Pi 中运行 `/login radius` 即可开始使用。Radius 会被添加为供应商，其模型会与其他供应商的模型一起出现在 `/model` 中。

Radius 还提供 MCP 服务器，Pi 可以通过它帮你管理 Radius。

Radius 目前处于早期 alpha 阶段，变化较快。详情见 [Radius 官网](https://radius.earendil.com)。

Radius 在认证时使用网关的模型目录，并缓存刷新后的模型元数据，供之后离线启动时使用。在 `models.json` 中配置的自定义 Radius 网关使用自己的目录，不继承公共 `radius.pi.dev` 目录。

### OpenRouter

使用 `/login openrouter` 或 `OPENROUTER_API_KEY` 进行认证。

有密钥时，Pi 只列出该密钥有权使用的 OpenRouter 聊天模型，并显示对应的上下文大小、最大输出量和价格。这些数据来自 OpenRouter 的 `/models/user` 端点，会反映你在 OpenRouter 设置的防护规则和供应商限制。图像模型和分类模型不会参与这项筛选。

Pi 会在交互模式启动、打开 `/model`、完成 `/login` 和执行 `pi update --models` 时在后台刷新列表。Pi 会保存最近一次列表，供离线、`pi -p` 和 RPC 模式使用。若在 `/login` 之外更换了密钥，下次刷新前仍会显示原密钥的列表。

区域端点会将列表限定为该区域的模型。要使用区域端点，请在 [`models.json`](models.md#配置兼容端点) 中设置基础 URL。

```json
{
  "providers": {
    "openrouter": { "baseUrl": "https://us.openrouter.ai/api/v1" }
  }
}
```

如果配置的基础 URL 在 `/models/user` 处拒绝密钥或没有这个端点（例如作为 OpenRouter 基础 URL 的代理），Pi 会列出所有 OpenRouter 模型。

### Azure OpenAI

此供应商的 ID 为 `azure`（原名 `azure-openai-responses`）。在 `auth.json`、`models.json` 和 `settings.json` 中以此为键，在模型引用中也使用该 ID，例如 `--model azure/gpt-5.4`。

`azure` 供应商通过 Responses API 提供 OpenAI 模型，通过 Chat Completions 提供 Microsoft Foundry 模型（如 `azure/deepseek-v4-pro`）。

设置 API 密钥，并提供基础 URL 或资源名称。

```bash
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_BASE_URL=https://your-resource.ai.azure.com
# Or:
export AZURE_OPENAI_RESOURCE_NAME=your-resource
```

对于 `ai.azure.com`、`cognitiveservices.azure.com` 和 `openai.azure.com` 下的资源根 URL，Pi 会将其规范化为 OpenAI API 路径。

Pi 将模型 ID 作为部署名称发送。如果部署使用了其他名称，请通过 `AZURE_OPENAI_DEPLOYMENT_NAME_MAP` 设置映射。

```bash
export AZURE_OPENAI_DEPLOYMENT_NAME_MAP=gpt-5.4=my-gpt-deployment,deepseek-v4-pro=my-deepseek
```

`AZURE_OPENAI_API_VERSION` 可覆盖 OpenAI 模型的 API 版本，默认值为 `v1`。

要使用 Pi 未内置的 Foundry 模型，请在 [`models.json`](models.md#配置兼容端点) 的 `azure` 下添加模型，并指定 `api: "openai-completions"`。自定义模型必须提供 `baseUrl`。如果设置了 `AZURE_OPENAI_BASE_URL` 或 `AZURE_OPENAI_RESOURCE_NAME`，它们的优先级高于 `baseUrl`。

```json
{
  "providers": {
    "azure": {
      "baseUrl": "https://your-resource.services.ai.azure.com",
      "models": [
        { "id": "your-deployment", "api": "openai-completions" }
      ]
    }
  }
}
```

### Amazon Bedrock

Bedrock 可以使用 Bearer 令牌或 AWS 环境已有的凭据来源。

```bash
# Named profile
export AWS_PROFILE=your-profile

# IAM keys
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
# Required for temporary credentials
export AWS_SESSION_TOKEN=...

# Bedrock bearer token
export AWS_BEARER_TOKEN_BEDROCK=...

# Region, when not supplied by the profile or AWS SDK configuration
export AWS_REGION=us-west-2
# AWS_DEFAULT_REGION is also supported
```

Pi 也支持通过标准 `AWS_CONTAINER_CREDENTIALS_*` 和 `AWS_WEB_IDENTITY_TOKEN_FILE` 环境变量使用 ECS 任务凭据和 IRSA（服务账户的 IAM 角色）。

### Cloudflare AI Gateway

网关需要令牌、账户 ID 和网关 ID。

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...
```

账户 ID 和网关 ID 可通过进程环境变量或 `auth.json` 中凭据的 `env` 对象提供。

Pi 使用 `CLOUDFLARE_API_KEY` 向网关认证。访问上游时，可以使用 Cloudflare 统一计费、网关保存的凭据，或在 `models.json` 中为供应商配置的 `Authorization` 请求头。

### Cloudflare Workers AI

Workers AI 需要令牌和账户 ID。

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
```

账户 ID 也可以保存在凭据的 `env` 对象中。

### Google Vertex AI

可以使用 Google Cloud API 密钥。

```bash
export GOOGLE_CLOUD_API_KEY=...
```

要使用应用默认凭据（Application Default Credentials），请先配置项目和位置。

```bash
export GOOGLE_CLOUD_PROJECT=your-project
# GCLOUD_PROJECT is also supported
export GOOGLE_CLOUD_LOCATION=us-central1
```

然后运行以下命令进行认证。

```bash
gcloud auth application-default login
```

要改用服务账户密钥文件，请在配置项目和位置的同时设置 `GOOGLE_APPLICATION_CREDENTIALS`。
