# 项目结构与技术栈

## 技术栈

- 前端：Vue 3 + TypeScript + Pinia + Vue Router + vue-i18n
- 桌面端：Tauri 2.0（Rust），支持 macOS 与 Windows
- 存储：本地 JSON 文件（非数据库）——`data.json`（账号）、`settings.json`（设置）、
  `password.dat`（密码哈希），位于系统 app data 目录
- 密码：PBKDF2-HMAC-SHA256（100k 次迭代，格式 `pbkdf2_sha256:<iterations>:<salt>:<hash>`，
  兼容旧 `salt:hash` 格式），常量时间比较
- 备份：zip 容器（`manifest.json` + `accounts.json` + `icons/*`），可选 WinZip AES-256
- 二维码：jsqr 解析图片（无摄像头扫描）
- 验证码范围：只做 TOTP；HOTP（计数器型）不在支持计划内，`otpauth://hotp` 与 andOTP 中的
  HOTP 账号会被明确拒绝 / 跳过（TOTP 内部复用 HOTP 原语，计数器由时间派生）

## 模块结构

```
src/
├── views/         Home · Settings · Setup · Unlock · PopoverView(托盘弹窗)
├── components/    AccountCard · AccountCodeList · IconDisplay · IconPicker
│                  AddAccount · EditAccount · DeleteConfirm · BottomSheet
│                  PinInput · GlobalToast
├── composables/   useAccountEditor(增删改的共用接线) · useTheme · useToast
├── stores/        accounts · settings
├── locales/       zh-CN · en-US · index
├── router/        路由与锁定守卫（弹窗与主窗口同一守卫）
├── types/         Account / AccountIcon / AppSettings 等
├── utils/         otp(生成与 otpauth 解析) · icons(图标渲染) · presetIcons
│                  clipboard · backup(IPC 封装) · andotp(迁移导入) · debug
└── assets/        preset-icons/ 23 个品牌 SVG（来源与规范见该目录 README）

src-tauri/src/
├── lib.rs               Tauri 命令入口 + 托盘图标/菜单 + 托盘弹窗 + 常驻模式
├── storage.rs           JSON 读写、原子写/0600、损坏文件隔离
├── crypto.rs            密码哈希与验证
├── backup.rs            zip 备份容器（含图标文件与可选 AES-256）
├── biometric.rs         生物识别可用性与认证
└── biometric_status.rs  失败计数与锁定
```

## 关键设计

- **图标渲染单一入口**：`utils/icons.ts` 的 `renderIcon()` 注册表决定任何图标如何显示，
  `IconDisplay.vue` 负责渲染；新增图标类型只需注册 provider
- **托盘 = 桌面通用**：托盘与弹窗代码在 `#[cfg(desktop)]` 下，仅激活策略（Dock 图标）与
  单色模板图标为 macOS 专属；弹窗按托盘位置决定向上/向下弹出并按显示器钳制。
  点托盘 / 菜单栏图标的行为由当前模式决定（`tray_left_click_action`）：App 模式只把主窗口
  带到前台，常驻模式开关弹窗——App 模式不弹弹窗，因为激活策略没跟着切，Dock 图标会留着不匹配
- **锁定**：`router` 守卫对主窗口与弹窗一视同仁；解锁后回到被中断的页面

## 数据与安全

- 账户字段（含 TOTP 密钥）以**明文**写入 `data.json`；安全性依赖系统磁盘加密
  （FileVault / BitLocker）。主密码为 6 位 PIN，用于界面解锁，不是加密密钥
- 备份可选择加密；zip 的 AES 按规范使用 PBKDF2-HMAC-SHA1 1000 次迭代，
  强度有限，故备份密码要求至少 8 位，且可通过 7-Zip / Keka 等工具直接打开
- 文件写入为原子写（临时文件 + rename）且权限为 `0600`；无法解析的数据文件会改名为
  `*.corrupt.<时间戳>` 隔离，不会被后续保存覆盖
- 生产环境启用 CSP（`tauri.conf.json` 的 `csp`，开发用 `devCsp`）

## 平台支持

| 平台 | 状态 | 生物识别 |
|---|---|---|
| macOS | ✅ 完整支持（菜单栏模式、Touch ID） | Touch ID / Face ID |
| Windows | ✅ 主窗口与托盘常驻模式（同一套代码路径） | 无，使用 PIN |
| Linux | ⚠️ 托盘为桌面通用实现，未实机验证 | 无，使用 PIN |
| Android | ❌ 工程未初始化；指纹待接入 | 计划支持 |
| iOS | ❌ 工程未初始化 | 无，使用 PIN |
