# openOTP

开源、跨平台、纯本地的二步验证器（TOTP）：Tauri 2.0 + Vue 3 + TypeScript，
本地 JSON 存储，备份为可选加密的 zip。

## 基础约定

- 包管理器：**pnpm**（勿用 npm / yarn）
- 前端：`pnpm build`（类型检查 + 构建）· `pnpm test` · `pnpm tauri:dev` · `pnpm tauri:build`
- 后端（`cd src-tauri`）：`cargo test` · `cargo clippy --all-targets -- -D warnings` · `cargo fmt --check`
  - 本机网络受限时 cargo 命令加 `--offline`（依赖已在本机缓存）
  - 以上命令即 CI 的检查项，提交前应全绿
- 起了 dev 服务（端口 5173 / 1420）后**必须清理后台进程与端口** →
  [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md)
- Git：**默认由 agent 提交**；**推送(push) 一律由用户操作，agent 不 push**；提交规范见
  [docs/CODE_CONVENTIONS.md](docs/CODE_CONVENTIONS.md)
- 涉及平台能力的改动：**不要声称未验证的行为**。macOS 上无法验证的路径（Windows 托盘、
  Android、摄像头等）要么实测，要么在文档与汇报中明确标注未验证。
- 多窗口（主窗口 / 菜单栏弹窗 / 托盘菜单）是各自独立的 webview、长期复用：改设置、主题、
  语言、账号列表时两个方向都要想到（改动如何到达另一窗口）。验证方法见
  [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md) 的「解锁 / 弹窗回归」。

## 验证与截图（省时优先）

- **默认用测试验证，不用截图**：能被 `pnpm test` / `cargo test` 覆盖的行为（逻辑、组件、
  命令契约）先写测试再跑。起 dev 服务 + 手动点界面 + 截图很慢，只用于测试覆盖不到的真实
  UI（窗口 / 托盘 / 系统权限）。
- **截图只截目标窗口，不截全屏**，并尽量压小文件（命令见
  [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md) 的「截图」小节）。
- **一次只截一张**：看完这张再决定要不要下一张，不要批量截图塞进上下文。

## 按需查阅

- 功能 / 技术栈 / 模块结构 / 数据与安全 / 平台支持 → [docs/STRUCTURE.md](docs/STRUCTURE.md)
- 代码风格、测试要求、提交与 i18n 规范 → [docs/CODE_CONVENTIONS.md](docs/CODE_CONVENTIONS.md)
- 本地环境：dev 端口清理、macOS 托盘 / 窗口已知坑、解锁与弹窗的脚本化回归方法 →
  [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md)
- Android 构建（SDK / NDK / Gradle 版本对齐）、已实测能力、已知缺口与 WebView 调试方法 →
  [docs/ANDROID.md](docs/ANDROID.md)
- 发布流程（打 tag 即构建 universal DMG 并建草稿 Release）与签名 / 更新机制现状 →
  [docs/RELEASE.md](docs/RELEASE.md)
- 图标现状与重新生成 → [docs/ICON_STATUS.md](docs/ICON_STATUS.md)
- 待办与待决事项 → [TODO.md](TODO.md)（已完成的历史见 [CHANGELOG.md](CHANGELOG.md)）
- 设计文档（仅本地，未入 git）→ `docs/superpowers/`
