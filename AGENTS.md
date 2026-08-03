# openOTP 项目配置

## 项目概述
开源、跨平台、纯本地的二步验证器，基于 Tauri 2.0 + Vue 3 + TypeScript

## 功能
- TOTP 验证码生成、二维码扫描 / 手动输入添加账号
- 密码 + 生物识别解锁，AES-256-GCM 加密存储
- **macOS 菜单栏模式**：托盘图标弹窗快速查看验证码；纯菜单模式隐藏主窗口，仅通过托盘访问

## 技术栈
- 前端：Vue 3 + TypeScript + Pinia + Vue Router + vue-i18n
- 桌面端：Tauri 2.0 (Rust)
- 存储：JSON 文件存储（`data.json` 账户 / `settings.json` 设置 / `password.dat` 密码哈希），非数据库
- 加密：AES-256-GCM + PBKDF2-HMAC-SHA256（100k 迭代）
- 二维码：jsqr（扫描）+ 手动输入两种添加方式
- 生物识别：macOS LocalAuthentication（`apple-localauthentication`）、Android `tauri-plugin-biometric`

## 开发命令
- `pnpm dev` - 启动 Vite 开发服务器
- `pnpm build` - 类型检查 + 构建前端生产版本
- `pnpm tauri:dev` - 启动 Tauri 开发模式（桌面应用）
- `pnpm tauri:build` - 构建 Tauri 应用
- `pnpm test` - 运行 vitest 测试（`pnpm test:watch` 监听模式）
- `pnpm preview` - 预览构建产物

## 代码规范
- Vue 组件使用 `<script setup lang="ts">` 语法
- 使用 Composition API
- 状态管理使用 Pinia
- 路径别名：`@/` 指向 `src/`
- 前端与 Rust 通过 Tauri `invoke` 通信；Rust 命令以 `#[tauri::command]` 注册（命名无统一后缀，个别历史命令带 `_cmd`）
- Rust 后端遵循标准 Rust 格式规范（`cargo fmt`）
- 测试使用 vitest + @vue/test-utils + happy-dom

## 项目结构
```
src/
├── views/         # 页面 (Home, Setup, Unlock, Settings, PopoverView 菜单栏悬浮窗)
├── components/    # 可复用组件 (AccountCard, AddAccount, EditAccount, BottomSheet,
│                  #   PinInput, EmojiPicker, IconPicker, DeleteConfirm, GlobalToast,
│                  #   AccountCodeList)
├── stores/        # Pinia 状态 (accounts, settings)
├── composables/   # 组合式函数 (useTheme, useToast)
├── locales/       # 国际化 (zh-CN, en-US, index)
├── router/        # Vue Router 路由配置
├── types/         # TypeScript 类型定义
├── utils/         # 工具函数 (otp, crypto, icons, andotp 导入, backup, clipboard, emojis, debug)
└── assets/        # 静态资源 (preset-icons/ 预设品牌图标, hero.png)

src-tauri/
├── src/
│   ├── lib.rs               # Tauri 命令入口 + 托盘图标/右键菜单 + 悬浮窗窗口 + 纯菜单模式
│   ├── storage.rs           # JSON 文件读写 (data.json / settings.json / password.dat)
│   ├── crypto.rs            # AES-256-GCM 加解密 + PBKDF2 密钥派生
│   ├── biometric.rs         # 生物识别可用性检测与认证
│   └── biometric_status.rs  # 生物识别失败计数与锁定状态
├── capabilities/  # Tauri 权限配置 (default.json)
└── tauri.conf.json # Tauri 配置（app.macOSPrivateApi: true 启用透明窗口私有 API）
```

## 平台已知坑（macOS）
- 托盘 `Click` 事件一次物理点击触发两次（mouseDown + mouseUp 各一次）；处理时须匹配 `button_state: MouseButtonState::Up`，否则 toggle 逻辑会立即翻转（弹窗闪现）
- 运行时 `set_position` 在 macOS 26 上不可靠（窗口偏移 ~50px）；弹窗位置必须用 `WebviewWindowBuilder::position()` 创建时定位
- 透明窗口需双层开关：Cargo.toml 的 `tauri` feature `macos-private-api` + tauri.conf.json 的 `app.macOSPrivateApi: true`
- 直接运行 `target/debug/openotp` 时 webview 加载 devUrl（http://localhost:5173），vite 未启动则页面空白；调试必须 `pnpm tauri:dev` 或先起 `pnpm dev`

## 数据与安全
- 账户数据存于 app data 目录下的 `data.json`，设置存于 `settings.json`，密码哈希存于 `password.dat`
- 密码哈希使用 PBKDF2-HMAC-SHA256，账户敏感字段使用 AES-256-GCM 加密
- 备份导出格式为 `.openotp`（见 `src/utils/backup.ts`）

## 文档
设计文档位于项目 `docs/` 目录（仅本地，未纳入 git 管理）

## 支持平台
- macOS (桌面端)
- Windows (桌面端)
- iOS (移动端)
- Android (移动端)
