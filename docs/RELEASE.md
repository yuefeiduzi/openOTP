# 发布流程

> 状态：**tag 触发的自动发布已建立**（`.github/workflows/release.yml`），产出的是未签名的
> universal DMG 草稿 Release。签名、公证与自动更新仍未配置，缺口见下文。

## 发布一个版本

```bash
# 1. 三处版本号同步 + 把 CHANGELOG.md 的 [Unreleased] 改为 `## [0.2.6]`（见下节）
# 2. 本地跑一遍 gate（也可以只看 CI）
pnpm build && pnpm test
(cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test)
# 3. 提交后打 tag 并推送（推送由你操作）
git commit -m "chore(release): v0.2.6"
git tag v0.2.6 && git push origin main v0.2.6
# 4. Actions → Release 跑完后，到 Releases 检查草稿，确认无误再点 Publish
```

`release.yml` 收到 tag 后做这些事：

| 步骤 | 说明 |
|---|---|
| `tests` | 直接调用 `ci.yml`（前端 + 后端全量检查），保证 tag 指向的提交与 main 一样绿 |
| `version` | tag 去掉 `v` 后必须等于三处版本号，三者之间也必须一致；不一致直接失败，不构建、不发布 |
| `dmg` | `pnpm tauri:build --target universal-apple-darwin --bundles dmg`，产出 arm64 + x86_64 的 `OpenOTP_<version>_universal.dmg` 与 `SHA256SUMS.txt`，同时存一份 workflow artifact |
| Draft Release | 正文 = 放行说明 + `CHANGELOG.md` 中 `## [<version>]` 段落；没有该段落时打 warning，正文只剩放行说明。只建**草稿**，你确认后才对外可见 |

- **演练**：Actions → Release → Run workflow（`workflow_dispatch`）只跑检查与构建，把 DMG 存成
  workflow artifact，不创建任何 Release。首次打 tag 前可以先用它验证整条构建链路
- **未签名**：DMG 里的 App 是 ad-hoc 签名，`spctl --assess` 判定 `rejected: no usable signature`，
  下载后会被 Gatekeeper 拦下。Release 正文开头写明「右键 → 打开」或
  `xattr -dr com.apple.quarantine /Applications/OpenOTP.app`
- **签名/公证**：拿到凭据后加成 repo secrets，并在 `release.yml` 的 Build 步骤加 `env:`
  （变量名见缺口一）。**现在没有传这些变量，所以产物必定未签名**

## 当前构建方式（本地）

```bash
pnpm build            # 仅前端：类型检查 + 打包（CI 使用）
pnpm test             # 前端测试
pnpm tauri:build      # 完整桌面打包（签名缺失时产出未签名产物）
```

产物在 `src-tauri/target/release/bundle/`（macOS 为 `.app` / `.dmg`，Windows 为 `.msi` / `.exe`）。
要复现 CI 的产物（两种架构合一，Intel Mac 也能用）：

```bash
rustup target add x86_64-apple-darwin   # 本机已装 aarch64
pnpm tauri:build --target universal-apple-darwin --bundles dmg
# → src-tauri/target/universal-apple-darwin/release/bundle/dmg/OpenOTP_<version>_universal.dmg
```

## 版本号需要同步的 3 处

改版本时**三处都要改**，否则产物版本与界面显示不一致：

| 文件 | 字段 |
|---|---|
| `package.json` | `version` |
| `src-tauri/tauri.conf.json` | `version` |
| `src-tauri/Cargo.toml` | `[package] version` |

另外把 `CHANGELOG.md` 的 `[Unreleased]` 段落改为对应版本号，并更新 `Settings.vue` 关于页里的版本展示键（`settings.version`）。

`release.yml` 会校验三处版本号与 tag 是否一致，不一致时直接失败——这是为了不让「产物自称的版本」
与「tag / 界面显示」分裂。

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

Tauri 会在打包时自动签名并提交公证（`notarytool`）。凭据就绪后还要把它们接到
`release.yml` 的 Build 步骤（见上文「发布一个版本」），否则 CI 产物依旧是未签名的。

## ❌ 缺口二：Windows 签名

`release.yml` 目前只构建 macOS：Windows 侧的主窗口与托盘是支持的（见
[STRUCTURE.md](STRUCTURE.md)），但未签名时 SmartScreen 会警告，先把 macOS 打通再扩平台。
加一个 `windows-latest` job 复用同一套 pipeline 即可（`pnpm tauri:build --bundles msi`）。
签名需要代码签名证书（EV 或 OV），配置：

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
- **自动发布**（`.github/workflows/release.yml`）：tag 或手动触发；校验版本号与 tag 一致、
  过一遍 `ci.yml`、构建 universal DMG、算 SHA256、建草稿 Release
- **平台校验**：`pnpm tauri:build` 前请确认 `tauri.conf.json` 的 `bundle.icon` 全套已按 [ICON_STATUS.md](ICON_STATUS.md) 更新

## 发布前检查清单

- [ ] 三处版本号已同步，`CHANGELOG.md` 的 `[Unreleased]` 已改为 `## [x.y.z] - <日期>`
- [ ] `pnpm test` 与 `cargo test` 通过（CI 绿）
- [ ] 首次发布或改了构建配置时，先跑一次 Release 的 `workflow_dispatch` 演练，
      下载 artifact 里的 DMG 实装一遍
- [ ] 图标为最新设计（[ICON_STATUS.md](ICON_STATUS.md)）
- [ ] 文档与实现一致：本次改动是否让 [STRUCTURE.md](STRUCTURE.md)、[TODO.md](../TODO.md)、
      [CHANGELOG.md](../CHANGELOG.md) 过期
- [ ] 手动跑一遍关键路径（用干净 profile，见 [DEV_ENVIRONMENT.md](DEV_ENVIRONMENT.md)）：
      首次设置 → 添加账号（扫码 / 手输）→ 复制验证码 → 搜索 → 拖拽排序 → 导出备份 →
      导入备份 → 锁定 → 解锁 → 托盘 / 菜单栏模式 → 删除账号后重启确认未复现
- [ ] 打 tag（`git tag vX.Y.Z && git push origin vX.Y.Z`——推送由你操作）后，
      到 Releases 检查草稿的正文与资产，确认后再 Publish
- [ ] 若已有签名/公证凭据，确认本次 release 的签名/公证环境变量已接入 `release.yml`
