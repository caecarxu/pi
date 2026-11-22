# Pi Agent 开发学习计划

这份计划面向熟悉 TypeScript 和 Node.js、希望理解 Agent Harness 并能基于 Pi 做扩展的开发者。默认每周投入约 5–7 小时，六周完成；时间可以按自己的节奏拉长。Pi CLI 文档的完整简体中文译本见[中文文档索引](packages/coding-agent/docs/zh-CN/index.md)，各章节也可从下方阅读计划直接进入。

学习顺序从最小请求循环开始，再进入 CLI 的会话与扩展机制，最后学习持久化运行时。要区分三层职责：`pi-agent-core` 的 `Agent` 管理一次运行的状态、事件和工具循环；`pi-coding-agent` 的 `AgentSession` 把它编排成 Pi CLI，并由 `SessionManager` 管理 JSONL 会话树；`pi-durable` 则用 Chord 提供可提交、可恢复的服务器端 Agent 运行时。先学 CLI 路径，再学 Durable/Chord，避免把它们的状态和生命周期模型混为一谈。

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

- [Pi CLI 中文文档索引](packages/coding-agent/docs/zh-CN/index.md)：安装、使用和扩展文档入口。
- [Pi 如何工作](packages/coding-agent/docs/zh-CN/how-pi-works.md)：Agent loop、上下文、会话和接口概览。
- [包目录](packages/)：重点认识 `ai`、`agent`、`coding-agent`、`tui`、`durable`、`chord`。
- [应用目录](apps/)：重点了解 `p2` 原型与当前的 `p3` 服务器应用。

**练习：**

1. 画出两条路径：`pi-ai → pi-agent-core → pi-coding-agent`，以及 `pi-ai + Chord → pi-durable → 服务器应用`。
2. 用 Pi 完成一个简单任务，记录它调用了什么工具、工具结果如何回到模型上下文。
3. 找到 CLI 的入口、`AgentSession`、`SessionManager`、内置工具和一个交互模式入口。

**完成标准：** 能说清 `Agent`、`AgentSession`、`SessionManager` 和 Durable `Conversation` 的边界；知道 `pi-agent-core` 本身不负责把会话写入磁盘。

## 第 1 周：模型 API 与 Agent loop

**目标：** 看清模型适配层和工具调用循环的边界。

**源码入口：**

- [`packages/ai/src/index.ts`](packages/ai/src/index.ts)、[`packages/ai/src/models.ts`](packages/ai/src/models.ts)：统一模型 API 与模型注册。
- [`packages/agent/src/agent.ts`](packages/agent/src/agent.ts)：Agent 状态与公开操作。
- [`packages/agent/src/agent-loop.ts`](packages/agent/src/agent-loop.ts)：请求、流式响应和工具调用循环。
- [`packages/agent/src/types.ts`](packages/agent/src/types.ts)：消息、工具和事件类型。
- [Agent Core 中文文档](packages/agent/README.zh-CN.md)：事件顺序和工具执行说明。

**练习：**

1. 画出一次“用户消息 → 模型回复 → 工具调用 → 工具结果 → 下一轮模型回复”的事件时序，并区分 `turn_end` 和 `agent_end`。
2. 从 `AgentMessage[]` 跟到 `convertToLlm()`：说明 `transformContext()` 如何选做，以及哪些应用消息会在转换时被筛掉。
3. 跟踪并行工具调用：完成事件可以按工具结束顺序发出，但工具结果仍按助手原始调用顺序进入 transcript。
4. 找出 `prepareRequest` 与 `finishTurn` 的调用位置，说明它们分别处于一次 provider 请求和一轮结束流程的哪一侧。

**完成标准：** 能说明 provider 负责模型协议适配、Agent loop 负责运行与工具调度；也能解释运行时状态和磁盘会话不是同一层职责。

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

**完成标准：** 能区分“追加写入的 JSONL 会话树”和“当前分支投影出的模型上下文”。分支会改变活动叶节点而保留旧记录；压缩摘要会影响后续上下文，不会删掉原始会话历史。

## 第 3 周：工具、扩展与接口

**目标：** 学会从应用层增加能力，同时理解扩展执行边界。

**源码与文档：**

- [`packages/coding-agent/src/core/tools/`](packages/coding-agent/src/core/tools/)：内置文件和 shell 工具。
- [`packages/coding-agent/src/core/extensions/`](packages/coding-agent/src/core/extensions/)：扩展加载和运行。
- [`packages/coding-agent/src/core/skills.ts`](packages/coding-agent/src/core/skills.ts)：Skill 发现与加载。
- [`packages/coding-agent/src/modes/`](packages/coding-agent/src/modes/)：交互、打印、JSON 和 RPC 模式。
- [扩展指南](packages/coding-agent/docs/zh-CN/extensions.md)、[自定义供应商](packages/coding-agent/docs/zh-CN/custom-provider.md)、[MCP](packages/coding-agent/docs/zh-CN/mcp.md)、[Codemode](packages/coding-agent/docs/zh-CN/codemode.md)、[SDK](packages/coding-agent/docs/zh-CN/sdk.md)、[RPC](packages/coding-agent/docs/zh-CN/rpc.md)。

**练习：**

1. 写一个只读工具，例如统计当前项目中某类文件的数量；先定义参数和结果，再接入扩展。
2. 增加一个命令或事件处理器，记录它如何注册、何时调用以及如何向用户反馈。
3. 对比交互模式和 RPC：它们如何共享会话机制，又如何使用不同的输入输出协议？
4. 对比工具扩展与自定义供应商扩展：各自注册什么接口、运行在什么信任边界内？

**安全检查：** CLI 默认以启动 Pi 的操作系统用户权限运行。阅读[容器化说明](packages/coding-agent/docs/zh-CN/containerization.md)，弄清扩展和 shell 工具的信任边界。

**完成标准：** 扩展可加载、工具参数有 schema、错误能反馈给用户，并且你能说明它运行在什么进程和权限下。

## 第 4 周：Durable 持久化运行时

**目标：** 理解 Durable 与普通 Agent loop 的差别：输入先持久化为 submission，generation/tool 等任务通过提交检查点推进，并在进程重启后恢复。Durable 仍标为实验性项目，学习时以当前代码为准。

**源码入口：**

- [`packages/durable/src/harness/harness.ts`](packages/durable/src/harness/harness.ts)：Harness 的创建和运行入口。
- [`packages/durable/src/harness/generation.ts`](packages/durable/src/harness/generation.ts)：生成任务。
- [`packages/durable/src/harness/tool.ts`](packages/durable/src/harness/tool.ts)：工具任务。
- [`packages/durable/src/harness/scheduler.ts`](packages/durable/src/harness/scheduler.ts)：任务调度。
- [`packages/durable/src/session/`](packages/durable/src/session/)：会话事务和存储适配。
- 从下列入口追踪提交、任务、恢复和存储；本周概念以代码中的类型与状态转换为准。

**练习：**

1. 用自己的话解释 Harness、Conversation、Entry、Document、Task 和 Submission：Conversation 是对话句柄，Entry 是不可变 transcript 记录，Document 保存可变状态，Task 持有可恢复的工作与检查点，Submission 表示被持久接纳的输入。
2. 画出 `submit → generation → tool task → commit → settled submission` 的生命周期，并标出每一步何时持久化、崩溃后从哪个 checkpoint 恢复。
3. 用同一个 `requestId` 重试提交，验证不会重复创建输入；再比较 `replay: "safe"` 与 `"unsafe"` 工具在中断后的行为，并为外部副作用设计幂等键。
4. 用持久化存储关闭并重新打开 Harness，恢复正在等待的任务。另验证取消 `Submission.wait()` 只取消等待，不会取消 Durable 任务。

**完成标准：** 能说明提交与结果的持久化边界、`requestId` 与工具 replay policy 如何控制重放风险，以及任务调度器如何恢复任务；能区分“取消等待”和“取消工作”。

## 第 5 周：Chord 与应用组合

**目标：** 理解 Chord 如何组合跨进程对象、插件与存储，并认识当前 p3 的服务器/worker 架构。p3 目前是 headless（没有浏览器页面）；p2 是不受支持、计划被替换的原型，只作为历史架构对照，不作为新项目基础。

**阅读：**

- `packages/chord/src/`：从 contracts、host、link、documents、store 等模块查看契约、facet、对象引用、事务和存储。
- [`apps/p3/src/bin.ts`](apps/p3/src/bin.ts)、[`server.ts`](apps/p3/src/server.ts)、[`worker.ts`](apps/p3/src/worker.ts)：p3 命令/进程管理、服务器启动和每会话 worker 启动。
- [`apps/p3/src/server-core.ts`](apps/p3/src/server-core.ts)、[`worker-core.ts`](apps/p3/src/worker-core.ts)、[`api/v1/`](apps/p3/src/api/v1/)：核心 facet 和供插件导入的 API。
- [`apps/p3/plugins/`](apps/p3/plugins/)：服务器与 worker 加载的插件。
- 若准备实际修改 p3，请按 `apps/p3/docs/README.md` 的顺序完整阅读 `process.md`、`chord-practices.md`、`testing.md`、`performance.md` 和 `names.md`。
- `apps/p2/` 可用来对照浏览器/TUI 自托管原型；它不代表 p3 当前已有的 UI。

**练习：**

1. 解释 contract、facet、host、reference、document 和 link 各自负责什么。
2. 从 p3 的 `bin.ts` 跟到 `startServer()`，再追踪 server 如何启动每会话 worker；标出各进程间使用的 link 和控制消息。
3. 选一个 p3 插件，说明它面向 server 还是 worker host、如何通过 p3 API 注册 facet，以及运行时在哪里加载它。

**完成标准：** 能画出 p3 命令/监督进程、server、每会话 worker、Chord host/link、插件和 SQLite store 之间的数据流；并明确 p3 当前没有浏览器页面，p2 的 UI 属于原型路径。

## 结业项目

从下面选一条路线，做一个范围小、可以演示的成果：

**入门路线：Pi 扩展**

- 增加一个项目分析工具或工作流命令。
- 定义参数、输出、失败行为和必要的权限边界。
- 在交互模式中演示，并说明扩展如何与 AgentSession 集成。

**进阶路线：Durable 应用**

- 创建一个持久化对话，注册一个自定义工具。
- 在工具任务运行过程中关闭并重启进程，检查任务恢复行为。
- 让工具在提交外部副作用前后各中断一次，观察恢复、replay policy 和幂等键如何影响重复执行。
- 说明应用层、Durable Harness、Chord 对象和存储的职责边界。

## 建议的阅读原则

1. 先顺着一次真实调用读代码，不要从每个目录的第一个文件开始通读。
2. 每阶段画一张时序图，并记录每层的输入、输出和持久化责任。
3. 先看 CLI 的 `pi-agent-core` 路径，再看 Durable/Chord；它们共享 `pi-ai` 等基础库，但运行时目标不同。
4. 读到复杂抽象时，回到对应中文文档、类型定义和小型示例，验证自己对概念的理解。
5. 把文档当作入口而非实现证明；遇到生命周期、提交或恢复语义时，沿着代码和类型确认当前行为。

