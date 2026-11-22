#!/usr/bin/env node
import { setupCli } from "./cli/setup.ts";
import { main } from "./main.ts";

// PI-READ：这是 CLI 的薄入口；运行模式选择与会话初始化在 main.ts。
setupCli();
main(process.argv.slice(2));
