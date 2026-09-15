# 发布流程

> 状态：**尚未建立自动发布**。签名、公证、更新机制都还没有配置，本文件记录当前缺口与落地步骤。

## 当前构建方式

```bash
pnpm build            # 仅前端：类型检查 + 打包（CI 使用）
pnpm test             # 前端测试
pnpm tauri:build      # 完整桌面打包（签名缺失时产出未签名产物）
```

产物在 `src-tauri/target/release/bundle/`（macOS 为 `.app` / `.dmg`，Windows 为 `.msi` / `.exe`）。

## 版本号需要同步的 3 处

改版本时**三处都要改**，否则产物版本与界面显示不一致：

| 文件 | 字段 |
|---|---|
| `package.json` | `version` |
| `src-tauri/tauri.conf.json` | `version` |
| `src-tauri/Cargo.toml` | `[package] version` |

另外把 `CHANGELOG.md` 的 `[Unreleased]` 段落改为对应版本号，并更新 `Settings.vue` 关于页里的版本展示键（`settings.version`）。

## ❌ 缺口一：代码签名与公证（macOS）

未配置时用户首次打开会看到「无法验证开发者」，且无法通过 Gatekeeper 分发。

需要（用户侧操作，需要 Apple Developer 账号）：

```jsonc
// src-tauri/tauri.conf.json
"bundle": {
  "macOS": {
    "signingIdentity": "Developer ID Application: <姓名> (<TEAMID>)",
    "entitlements": null
  }
}
```

以及环境变量（勿提交）：

```bash
export APPLE_CERTIFICATE="<base64 的 .p12>"
export APPLE_CERTIFICATE_PASSWORD="..."
export APPLE_SIGNING_IDENTITY="Developer ID Application: ..."
export APPLE_ID="..."
export APPLE_PASSWORD="<app 专用密码>"
export APPLE_TEAM_ID="..."
```

Tauri 会在打包时自动签名并提交公证（`notarytool`）。

## ❌ 缺口二：Windows 签名

未签名时 SmartScreen 会警告。需要代码签名证书（EV 或 OV），配置：

```jsonc
"bundle": { "windows": { "certificateThumbprint": "<指纹>", "digestAlgorithm": "sha256", "timestampUrl": "" } }
```

## ❌ 缺口三：自动更新

未配置，用户需手动下载新版本。落地步骤：

1. 前端加依赖：`pnpm add @tauri-apps/plugin-updater @tauri-apps/plugin-process`
2. Rust 加依赖并注册插件：`tauri-plugin-updater`、`tauri-plugin-process`
3. 生成密钥对：`pnpm tauri signer generate -w ~/.tauri/openotp.key`（私钥与口令**不要**入库；公钥写入配置）
4. 配置：

```jsonc
// tauri.conf.json
"plugins": {
  "updater": {
    "pubkey": "<公钥内容>",
    "endpoints": ["https://<你的域名>/openotp/{{target}}/{{arch}}/{{current_version}}"]
  }
},
"bundle": { "createUpdaterArtifacts": true }
```

5. 发布静态 JSON（`latest.json`）到 endpoints 指向的位置，包含版本号、下载地址与签名
6. 构建时提供 `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
7. 前端加一个「检查更新」入口（设置 → 关于）

## ✅ 已有的保障

- **CI**（`.github/workflows/ci.yml`）：前端构建 + 测试；后端 `cargo fmt --check`、`cargo clippy --all-targets -D warnings`、`cargo test`
- **平台校验**：`pnpm tauri:build` 前请确认 `tauri.conf.json` 的 `bundle.icon` 全套已按 [ICON_STATUS.md](ICON_STATUS.md) 更新

## 发布前检查清单

- [ ] 三处版本号已同步，`CHANGELOG.md` 已更新
- [ ] `pnpm test` 与 `cargo test` 通过（CI 绿）
- [ ] 图标为最新设计（[ICON_STATUS.md](ICON_STATUS.md)）
- [ ] 手动跑一遍关键路径：首次设置 → 添加账号（扫码/手输）→ 复制验证码 → 导出备份 → 导入备份 → 锁定 → 解锁 → 托盘/菜单栏模式 → 删除账号后重启确认未复现
- [ ] 确认本次release 的签名/公证环境变量已设置
