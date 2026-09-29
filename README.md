# openOTP

开源、跨平台、纯本地的二步验证器（TOTP）。

> 安装包：推送 tag 后由 CI 构建 universal DMG（arm64 + x86_64）并以草稿 Release 发布，
> 见 [Releases](https://github.com/yuefeiduzi/openOTP/releases)。产物**未签名**，下载后首次打开
> 需要手动放行 —— 具体步骤与校验方法见 [docs/UNSIGNED.md](docs/UNSIGNED.md)，
> 每个 Release 正文开头也带着这份说明。
> 若 Releases 里没有你要的版本，就从源码构建运行。

## 功能

- TOTP 验证码生成，账号列表支持搜索与拖拽排序
- 添加账号：二维码图片识别（jsqr）· otpauth 链接 · 手动输入
- 图标：Emoji / 首字母 / 23 个预设品牌图标 / 上传图片
- 同网站多账号自动合并为一条（issuer 归一，`Microsoft - Microsoft` 与 `Microsoft` 同组），
  卡片显示账号名以区分；导入 andOTP 备份
- 解锁：6 位 PIN，macOS 可用 Touch ID / Face ID
- 自动锁定（立即 / 1 / 5 分钟）与手动锁定
- 备份：标准 zip 容器，可选密码（WinZip AES-256）或不加密；图标作为图片文件存入
- 深浅色主题（跟随系统 / 浅色 / 深色）；中文（默认）/ English，菜单栏弹窗与托盘菜单同步切换
- 托盘常驻模式：点菜单栏 / 托盘图标开关弹窗查看验证码（App 模式下点它则回到主窗口），
  主窗口关闭即隐藏到托盘（macOS 菜单栏 / Windows 托盘）

## 平台支持

| 平台 | 状态 | 生物识别 |
|---|---|---|
| macOS | ✅ 完整支持（菜单栏模式、Touch ID） | Touch ID / Face ID |
| Windows | ✅ 主窗口与托盘常驻模式 | 无，使用 PIN |
| Linux | ⚠️ 托盘为桌面通用实现，未实机验证 | 无，使用 PIN |
| Android | ❌ 工程未初始化 | 计划支持指纹（待接入） |
| iOS | ❌ 工程未初始化 | 无，使用 PIN |

## 技术栈

- 前端：Vue 3 + TypeScript + Pinia + Vue Router + vue-i18n
- 桌面端：Tauri 2.0（Rust）
- 存储：本地 JSON 文件（`data.json` / `settings.json` / `password.dat`），非数据库
- 密码：PBKDF2-HMAC-SHA256（100k 次）哈希，常量时间比较
- 备份：zip + 可选 WinZip AES-256

## 安全说明

主密码为 6 位数字 PIN，用于**界面解锁**；本地数据为**明文 JSON**，安全性依赖磁盘加密
（FileVault / BitLocker）。备份可选择加密，但 zip 的 AES 按规范仅使用 PBKDF2-HMAC-SHA1 1000 次迭代，
因此备份密码要求至少 8 位。详见 [docs/STRUCTURE.md](docs/STRUCTURE.md)。

## 开发

```bash
pnpm install          # 安装依赖（要求 pnpm）
pnpm dev              # 仅前端（浏览器访问 5173）
pnpm tauri:dev        # 桌面开发模式
pnpm build            # 类型检查 + 前端构建
pnpm test             # 前端测试（vitest）
pnpm tauri:build      # 打包桌面应用

cd src-tauri
cargo test            # 后端测试
cargo clippy --all-targets -- -D warnings
cargo fmt --check
```

推送与 PR 会由 [CI](.github/workflows/ci.yml) 跑上述检查。开发结束后请清理 dev 进程与端口，
见 [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md)。

## 文档

| 文档 | 内容 |
|---|---|
| [docs/STRUCTURE.md](docs/STRUCTURE.md) | 功能、技术栈、模块结构、数据与安全、平台支持 |
| [docs/CODE_CONVENTIONS.md](docs/CODE_CONVENTIONS.md) | 代码风格、测试要求、提交与 i18n 规范 |
| [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md) | 本地开发环境：dev 端口清理、macOS 已知坑、解锁 / 弹窗的脚本化回归 |
| [docs/RELEASE.md](docs/RELEASE.md) | 发布流程、版本号同步、签名 / 公证 / 自动更新现状 |
| [docs/ICON_STATUS.md](docs/ICON_STATUS.md) | 图标现状与重新生成流程 |
| [CHANGELOG.md](CHANGELOG.md) | 版本变更记录 |
| [TODO.md](TODO.md) | 待办与待决事项 |

## License

MIT
