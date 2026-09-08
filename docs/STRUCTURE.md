# 项目结构与技术栈

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
│   ├── lib.rs               # Tauri 命令入口 + 托盘图标/右键菜单 + 悬浮窗窗口 + 纯菜单模式
│   ├── storage.rs           # JSON 文件读写 (data.json / settings.json / password.dat)
│   ├── crypto.rs            # AES-256-GCM 加解密 + PBKDF2 密钥派生
│   ├── biometric.rs         # 生物识别可用性检测与认证
│   └── biometric_status.rs  # 生物识别失败计数与锁定状态
├── capabilities/  # Tauri 权限配置 (default.json)
└── tauri.conf.json # Tauri 配置（app.macOSPrivateApi: true 启用透明窗口私有 API）
```

## 数据与安全
- 账户数据存于 app data 目录下的 `data.json`，设置存于 `settings.json`，密码哈希存于 `password.dat`
- 密码哈希使用 PBKDF2-HMAC-SHA256，账户敏感字段使用 AES-256-GCM 加密
- 备份导出格式为 `.openotp`（见 `src/utils/backup.ts`）

## 支持平台
- macOS (桌面端) · Windows (桌面端) · iOS (移动端) · Android (移动端)
