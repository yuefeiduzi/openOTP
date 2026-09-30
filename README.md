# openOTP

**[English](README.en.md)** · 中文

开源、跨平台、纯本地的二步验证器（TOTP）。验证码在本机生成，账号与密钥不上传，代码全部开源。
桌面端 Tauri 2（Rust），前端 Vue 3 + TypeScript，数据存本地 JSON 文件。

[![CI](https://github.com/yuefeiduzi/openOTP/actions/workflows/ci.yml/badge.svg)](https://github.com/yuefeiduzi/openOTP/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yuefeiduzi/openOTP)](LICENSE)

## 功能

**验证码**

- TOTP（SHA-1 / SHA-256 / SHA-512，RFC 6238）；HOTP（计数器型）不在支持计划内，
  `otpauth://hotp` 明确拒绝，不做半吊子支持
- 账号列表：搜索（账号名 / 发行方）、拖拽排序、点卡片即复制、倒计时进度条
- 同网站多账号自动归一合并为一条，卡片显示账号名区分，发行方分组可折叠

**添加与导入**

- 二维码图片识别（jsqr）· `otpauth://` 链接 · 手动输入
- 导入 andOTP 备份
- 图标：Emoji / 首字母 / 23 个预设品牌图标 / 上传图片（PNG / SVG）

**解锁**

- 6 位 PIN；macOS 上可用 Touch ID / Face ID
- 自动锁定（立即 / 1 / 5 分钟）与手动锁定

**桌面集成**

- 菜单栏 / 托盘常驻模式：点图标开关验证码弹窗；App 模式下点图标则把主窗口带到前台
- 主窗口关闭即隐藏到托盘；退出入口在托盘菜单（Windows / Linux）与弹窗里
- 深浅色主题（跟随系统 / 浅色 / 深色）；中文（默认）与 English，所有窗口同步切换

**备份**

- 标准 zip 容器（`manifest.json` + `accounts.json` + `icons/<id>.<ext>`），可用 7-Zip / Keka
  直接打开
- 可选密码（WinZip AES-256）或不加密，导入时自动识别

## 平台支持

| 平台 | 状态 | 生物识别 |
|---|---|---|
| macOS | ✅ 完整支持（菜单栏模式、Touch ID） | Touch ID / Face ID |
| Windows | ✅ 主窗口与托盘常驻模式 | 无，使用 PIN |
| Linux | ⚠️ 托盘为桌面通用实现，未实机验证 | 无，使用 PIN |
| Android | ❌ 工程未初始化 | 计划支持指纹（待接入） |
| iOS | ❌ 工程未初始化 | 无，使用 PIN |

## 安装

### 下载安装包

见 [Releases](https://github.com/yuefeiduzi/openOTP/releases)：推送 `v*` tag 后由 CI 构建
universal DMG（arm64 + x86_64）并以草稿 Release 发布。产物**未签名**，首次打开需要手动放行，
步骤与校验方法见 [docs/UNSIGNED.md](docs/UNSIGNED.md)（每个 Release 正文开头也带着这份说明）。

### 从源码构建

需要 Node（pnpm）与 Rust：

```bash
pnpm install
pnpm tauri:build      # 产物在 src-tauri/target/release/bundle/
```

## 安全说明

主密码为 6 位数字 PIN，用于**界面解锁**；本地数据（`data.json`）中的 TOTP 密钥是**明文**，
安全性依赖系统磁盘加密（FileVault / BitLocker）。备份可加密，但 zip 的 AES 按规范只使用
PBKDF2-HMAC-SHA1 1000 次迭代，因此备份密码要求至少 8 位。应用没有任何对外网络请求，
详见 [docs/STRUCTURE.md](docs/STRUCTURE.md)。

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

仓库内文档当前均为中文。

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