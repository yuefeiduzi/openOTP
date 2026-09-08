# openOTP

开源、跨平台、纯本地的二步验证器（TOTP）：Tauri 2.0 + Vue 3 + TypeScript，纯本地 JSON 存储 + AES-256-GCM 加密。

## 基础约定
- 包管理器：**pnpm**（勿用 npm / yarn）
- 命令：`pnpm build`（类型检查+构建）· `pnpm test` · `pnpm tauri:dev`（桌面开发）· `pnpm tauri:build`（打包）
- 起了 dev 服务（端口 5173 / 1420）后**必须清理后台进程与端口** → [docs/DEV_SERVICES.md](docs/DEV_SERVICES.md)
- Git：**默认由 agent 提交**；**推送(push) 一律由用户操作，agent 不 push**；提交规范见 [docs/CODE_CONVENTIONS.md](docs/CODE_CONVENTIONS.md)

## 按需查阅
- 功能 / 技术栈 / 模块结构 / 数据与安全 / 支持平台 → [docs/STRUCTURE.md](docs/STRUCTURE.md)
- 代码与测试规范 → [docs/CODE_CONVENTIONS.md](docs/CODE_CONVENTIONS.md)
- macOS 已知坑（托盘 / 窗口 / Thaw 隐藏图标） → [docs/MACOS_PITFALLS.md](docs/MACOS_PITFALLS.md)
- 图标现状与更换流程 → [docs/ICON_STATUS.md](docs/ICON_STATUS.md)
- 设计文档 → `docs/`（部分仅本地，未入 git）
