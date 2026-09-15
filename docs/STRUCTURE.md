# 项目结构与技术栈

## 功能
- TOTP 验证码生成、二维码扫描 / 手动输入添加账号
- 密码 + 生物识别解锁；本地数据以明文 JSON 存储（依赖系统磁盘加密），备份可选 AES-256 加密
- **托盘常驻模式**（macOS 菜单栏 / Windows 托盘）：托盘图标弹窗快速查看验证码；开启后隐藏主窗口，仅通过托盘访问

## 技术栈
- 前端：Vue 3 + TypeScript + Pinia + Vue Router + vue-i18n
- 桌面端：Tauri 2.0 (Rust)
- 存储：JSON 文件存储（`data.json` 账户 / `settings.json` 设置 / `password.dat` 密码哈希），非数据库
- 加密：密码哈希 PBKDF2-HMAC-SHA256（100k 迭代）；备份 zip 可选用 WinZip AES-256（PBKDF2-HMAC-SHA1，1000 次，受 zip 规范限制）
- 二维码：jsqr（扫描）+ 手动输入两种添加方式
- 生物识别：macOS LocalAuthentication（`apple-localauthentication`）、Android `tauri-plugin-biometric`

## 模块结构
> 路径会随重构变化，以下为当前形状，供定位参考；以实际代码为准。

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
│   ├── lib.rs               # Tauri 命令入口 + 托盘图标/右键菜单 + 悬浮窗窗口 + 托盘常驻模式
│   ├── storage.rs           # JSON 文件读写 + 原子写/0600 权限/损坏隔离 (data.json / settings.json / password.dat)
│   ├── crypto.rs            # 密码哈希与验证（PBKDF2-HMAC-SHA256，兼容旧格式）
│   ├── backup.rs            # zip 备份容器（manifest + accounts + icons，可选 AES-256）
│   ├── biometric.rs         # 生物识别可用性检测与认证
│   └── biometric_status.rs  # 生物识别失败计数与锁定状态
├── capabilities/  # Tauri 权限配置 (default.json)
└── tauri.conf.json # Tauri 配置（app.macOSPrivateApi: true 启用透明窗口私有 API）
```

## 数据与安全
- 账户数据存于 app data 目录下的 `data.json`，设置存于 `settings.json`，密码哈希存于 `password.dat`
- 密码哈希使用 PBKDF2-HMAC-SHA256（格式 `pbkdf2_sha256:<iterations>:<salt>:<hash>`）；账户字段落盘为明文，备份为可选加密的 zip
- 备份导出格式为 zip（`manifest.json` + `accounts.json` + `icons/*`），实现见 `src-tauri/src/backup.rs`

## 支持平台

| 平台 | 状态 | 生物识别 |
|---|---|---|
| macOS | ✅ 完整支持（菜单栏模式、Touch ID） | Touch ID / Face ID |
| Windows | ✅ 主窗口 + 托盘常驻模式（同代码路径） | 无，使用 PIN |
| Linux | ⚠️ 托盘实现为桌面通用代码，未实机验证 | 无，使用 PIN |
| Android | ❌ 工程未初始化；指纹识别待接入 | 计划支持 |
| iOS | ❌ 工程未初始化 | 无，使用 PIN |

托盘/弹窗代码位于 `#[cfg(desktop)]` 下；仅激活策略（Dock 图标、Accessory 模式）与模板图标为 macOS 专属。
