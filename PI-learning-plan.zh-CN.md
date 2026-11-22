# Pi Agent 开发学习计划

这份计划面向熟悉 TypeScript 和 Node.js、希望理解 Agent Harness 并能基于 Pi 做扩展的开发者。默认每周投入约 5–7 小时，六周完成；时间可以按自己的节奏拉长。Pi CLI 文档的完整简体中文译本见[中文文档索引](packages/coding-agent/docs/zh-CN/index.md)，各章节也可从下方阅读计划直接进入。

学习顺序从最小请求循环开始，再进入 CLI 的会话与扩展机制，最后学习持久化运行时。Pi 仓库包含两条不同的应用路径：`pi-coding-agent` 使用 `pi-agent-core`；服务器应用路径使用 Chord 和 `pi-durable`。先学前者，再学后者，避免把两套状态与生命周期模型混为一谈。

## 学习目标

完成后，你应该能：

- 追踪一次用户输入如何变成模型请求、工具调用和最终回复。
- 解释 provider、Agent loop、会话记录、上下文整理和终端界面的职责边界。
- 写一个 Pi 扩展，添加工具或命令，并理解扩展对运行时的影响。
- 说明 Durable 如何将对话和任务检查点写入存储，以及 Chord 如何支持跨进程对象和插件。
- 根据需求判断应该扩展 `pi-coding-agent`，还是使用 Chord/Durable 构建持久化应用。

## 第 0 周：建立地图

**目标：** 能在仓库中找到核心包，并成功运行 Pi。

**阅读：**

- [根 README](README.md)：包清单、开发命令和项目定位。
- [Pi 如何工作](packages/coding-agent/docs/zh-CN/how-pi-works.md)：Agent loop、上下文、会话和接口概览。
- [包目录](packages/)：重点认识 `ai`、`agent`、`coding-agent`、`tui`、`durable`、`chord`。

**练习：**

1. 画出两条路径：`pi-ai → pi-agent-core → pi-coding-agent`，以及 `pi-ai + Chord → pi-durable → 应用`。
2. 用 Pi 完成一个简单任务，记录它调用了什么工具、工具结果如何回到模型上下文。
3. 找到 CLI 的入口、AgentSession、内置工具和一个交互模式入口。

**完成标准：** 能用自己的话解释 CLI 和 Durable 的关系，并指出它们不是同一套会话运行时。

## 第 1 周：模型 API 与 Agent loop

**目标：** 看清模型适配层和工具调用循环的边界。

**源码入口：**

- [`packages/ai/src/index.ts`](packages/ai/src/index.ts)、[`packages/ai/src/models.ts`](packages/ai/src/models.ts)：统一模型 API 与模型注册。
- [`packages/agent/src/agent.ts`](packages/agent/src/agent.ts)：Agent 状态与公开操作。
- [`packages/agent/src/agent-loop.ts`](packages/agent/src/agent-loop.ts)：请求、流式响应和工具调用循环。
- [`packages/agent/src/types.ts`](packages/agent/src/types.ts)：消息、工具和事件类型。
- [Agent Core README](packages/agent/README.md)：事件顺序和工具执行说明。

**练习：**

1. 画出一次“用户消息 → 模型回复 → 工具调用 → 工具结果 → 下一轮模型回复”的事件时序。
2. 比较模型消息和 AgentMessage；标出哪些消息只供应用使用、哪些会转换成模型输入。
3. 跟踪一次流式文本事件和一次工具调用事件，说明它们分别由哪一层产生。

**完成标准：** 能说明 provider 负责模型协议适配，Agent loop 负责对话轮次与工具执行，二者如何通过流式接口连接。

## 第 2 周：CLI、会话与上下文

**目标：** 理解 `pi-coding-agent` 如何把通用 Agent 运行时变成编程代理。

**源码入口：**

- [`packages/coding-agent/src/main.ts`](packages/coding-agent/src/main.ts)：命令行主流程。
- [`packages/coding-agent/src/core/agent-session.ts`](packages/coding-agent/src/core/agent-session.ts)：会话编排和 Pi 特有逻辑。
- [`packages/coding-agent/src/core/session-manager.ts`](packages/coding-agent/src/core/session-manager.ts)：会话读写与管理。
- [`packages/coding-agent/src/core/system-prompt.ts`](packages/coding-agent/src/core/system-prompt.ts)：系统提示构建。
- [`packages/coding-agent/src/core/compaction/`](packages/coding-agent/src/core/compaction/)：上下文压缩。
- [会话格式](packages/coding-agent/docs/zh-CN/session-format.md)、[上下文压缩](packages/coding-agent/docs/zh-CN/compaction.md)。

**练习：**

1. 追踪用户输入如何进入活动分支，再如何转换为模型上下文。
2. 画出会话树的父子关系，说明从旧节点继续对话会发生什么。
3. 解释 compaction 为什么增加摘要记录而不是直接删除旧会话历史。

**完成标准：** 能区分“持久化会话历史”和“当前模型请求上下文”，并指出分支与摘要分别解决什么问题。

## 第 3 周：工具、扩展与接口

**目标：** 学会从应用层增加能力，同时理解扩展执行边界。

**源码与文档：**

- [`packages/coding-agent/src/core/tools/`](packages/coding-agent/src/core/tools/)：内置文件和 shell 工具。
- [`packages/coding-agent/src/core/extensions/`](packages/coding-agent/src/core/extensions/)：扩展加载和运行。
- [`packages/coding-agent/src/core/skills.ts`](packages/coding-agent/src/core/skills.ts)：Skill 发现与加载。
- [`packages/coding-agent/src/modes/`](packages/coding-agent/src/modes/)：交互、打印、JSON 和 RPC 模式。
- [扩展指南](packages/coding-agent/docs/zh-CN/extensions.md)、[SDK](packages/coding-agent/docs/zh-CN/sdk.md)、[RPC](packages/coding-agent/docs/zh-CN/rpc.md)。

**练习：**

1. 写一个只读工具，例如统计当前项目中某类文件的数量；先定义参数和结果，再接入扩展。
2. 增加一个命令或事件处理器，记录它如何注册、何时调用以及如何向用户反馈。
3. 对比交互模式和 RPC：它们如何共享会话机制，又如何使用不同的输入输出协议？

**安全检查：** CLI 默认以启动 Pi 的操作系统用户权限运行。阅读[容器化说明](packages/coding-agent/docs/zh-CN/containerization.md)，弄清扩展和 shell 工具的信任边界。

**完成标准：** 扩展可加载、工具参数有 schema、错误能反馈给用户，并且你能说明它运行在什么进程和权限下。

## 第 4 周：Durable 持久化运行时

**目标：** 理解 Durable 与普通 Agent loop 的差别：任务状态可提交、检查点可恢复。

**源码入口：**

- [`packages/durable/src/harness/harness.ts`](packages/durable/src/harness/harness.ts)：Harness 的创建和运行入口。
- [`packages/durable/src/harness/generation.ts`](packages/durable/src/harness/generation.ts)：生成任务。
- [`packages/durable/src/harness/tool.ts`](packages/durable/src/harness/tool.ts)：工具任务。
- [`packages/durable/src/harness/scheduler.ts`](packages/durable/src/harness/scheduler.ts)：任务调度。
- [`packages/durable/src/session/`](packages/durable/src/session/)：会话事务和存储适配。
- [Durable README](packages/durable/README.md)：提交、任务、恢复、存储和扩展。

**练习：**

1. 用自己的话解释 Harness、Conversation、Entry、Document、Task 和 Submission 的关系。
2. 画出输入提交、生成任务、工具任务、结果提交的生命周期，并标出崩溃后可恢复的检查点。
3. 写一个小型持久化 Agent 示例：提交输入、等待结果、关闭后重新打开存储并恢复。

**完成标准：** 能说明数据何时变成持久状态、一次重试如何避免重复提交，以及 Durable 为何需要任务调度器。

## 第 5 周：Chord 与应用组合

**目标：** 了解 Durable 所依赖的对象运行时，以及 p2/p3 如何组合服务端和插件。

**阅读：**

- [`packages/chord/README.md`](packages/chord/README.md)、[`packages/chord/docs/design.md`](packages/chord/docs/design.md)：契约、对象、插件、链接、存储和多进程模型。
- [`apps/p2/README.md`](apps/p2/README.md)：基于 Chord 与 Durable 插件构建的实验性自托管界面。
- [`apps/p3/README.md`](apps/p3/README.md)：基于 Chord v2 的服务器与插件组织方式。
- [`apps/p3/docs/README.md`](apps/p3/docs/README.md)：p3 的开发指南入口。

**练习：**

1. 解释 contract、facet、host、reference、document 和 link 各自负责什么。
2. 从 p3 的 `src/server.ts` 和 `src/worker.ts` 追踪一次服务端与 worker 的启动关系。
3. 选一个 p3 插件，说明它向哪个 host 注册能力，以及运行时如何加载它。

**完成标准：** 能画出浏览器/客户端、服务器、worker、Chord 对象和持久化存储之间的数据流。

## 结业项目

从下面选一条路线，做一个范围小、可以演示的成果：

**入门路线：Pi 扩展**

- 增加一个项目分析工具或工作流命令。
- 定义参数、输出、失败行为和必要的权限边界。
- 在交互模式中演示，并说明扩展如何与 AgentSession 集成。

**进阶路线：Durable 应用**

- 创建一个持久化对话，注册一个自定义工具。
- 在工具任务运行过程中关闭并重启进程，检查任务恢复行为。
- 说明应用层、Durable Harness、Chord 对象和存储的职责边界。

## 建议的阅读原则

1. 先顺着一次真实调用读代码，不要从每个目录的第一个文件开始通读。
2. 每阶段画一张时序图，并记录每层的输入、输出和持久化责任。
3. 先看 CLI 的 `pi-agent-core` 路径，再看 Durable/Chord；它们共享部分基础库，但运行时目标不同。
4. 读到复杂抽象时，回到 README、类型定义和小型示例，验证自己对概念的理解。

