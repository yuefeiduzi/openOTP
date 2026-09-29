# 代码与测试规范

## 前端（Vue 3 + TypeScript）

- 组件使用 `<script setup lang="ts">` 与 Composition API；状态用 Pinia
- 路径别名 `@/` 指向 `src/`
- 配置启用了 `noUnusedLocals` / `noUnusedParameters` / `erasableSyntaxOnly`
  - 后者会拒绝构造函数参数属性（`constructor(readonly x: T)`）等需要生成运行时代码的语法
- `pnpm build` 会连同 `*.test.ts` 一起类型检查，测试文件也必须通过类型检查

## Rust

- 遵循 `cargo fmt`；`cargo clippy --all-targets -- -D warnings` 必须零告警（含测试代码）
- 错误不要吞：`let _ = ...` 只用于确实无关紧要的清理；其余至少 `log::error!`
- 文件写入统一走 `storage::write_private`（原子写 + `0600` + 失败清理临时文件）
- 数据解析失败不要静默降级为默认值：先隔离（改名 `*.corrupt.<ts>`）再报错，避免下一次保存覆盖原数据

## 前后端通信

- 前端通过 Tauri `invoke` 调用命令，命令以 `#[tauri::command]` 注册
- **参数名必须与 Rust 形参一致**：Tauri 按参数名取键，把结构体拍平成顶层字段会报
  `missing required key <参数名>`。结构体参数整体传递，并为其写一个契约测试
- 新增命令后要同时在 `generate_handler!` 注册，否则前端调用报「命令未找到」

## 测试

- 前端：vitest + @vue/test-utils + happy-dom；后端：`#[cfg(test)]` 模块
- 测试关注**行为与契约**，不要断言自己刚写下的实现细节；涉及算法时使用公开测试向量
  （例如 TOTP 用 RFC 6238 的向量）
- 组件测试中 `<Teleport>` 的内容（如 BottomSheet）在 `document.body` 里，需用 `DOMWrapper` 查询
- mock 第三方模块时优先 `importOriginal` 保留真实导出，只覆盖需要打桩的函数，
  避免模块新增导出后测试静默走空实现
- 修 bug 时补一个能复现该 bug 的测试
- 已知需人工验证的部分（系统授权弹窗、真机平台行为）不要写成自动化断言，改为在文档中标注

## i18n

- 所有用户可见文案走 `t()`；`src/locales/i18n.test.ts` 会检查：
  - 各语言 key 一致、无缺失 key、无未被引用的 key、字符串与模板中无硬编码中文
- 因此 **key 必须以字面量出现**：不能用 `t('a.' + x)` 拼接，改为映射表（见
  `AddAccount.vue` 的 `PARSE_ERROR_KEYS`）
- 中文注释不受限制
- 语言只有 `zh-CN`（默认）与 `en-US`，没有「跟随系统」。语言存在设置里，由 `App.vue`
  的 watcher 应用到每个窗口（弹窗 / 托盘菜单是长期复用的独立 webview，必须跟着设置切）；
  `localStorage` 只作为首屏缓存，旧值（如 `auto`）一律归一到默认

## Git 提交与推送

- 提交信息遵循 Conventional Commits：`type(scope): subject`，type 用
  `feat` / `fix` / `docs` / `chore` / `test` / `refactor` 等，subject 用英文；
  正文说明**为什么**改，必要时列出行为取舍
- **默认提交**：任务完成后由 agent 直接 `git commit`，无需每次询问
- **推送归用户**：agent **绝不执行 `git push`**
- 提交前本地应全绿：`pnpm build` · `pnpm test` · `cargo fmt --check` ·
  `cargo clippy --all-targets -- -D warnings` · `cargo test`
