# TODO

> **2026-09-15 全量审计**：`pnpm build` 通过，`pnpm test` 48/48 通过，工作区干净。
> 下列为审计出的未完成项，按优先级排列，均带 `文件:行号` 证据。
> 已解决的历史条目压缩保留在文末。

---

## P0 — 阻塞性：功能实际不可用 / 文档与现实不符

### P0-1 备份导入导出实质失效 【前端+安全】
- `src/utils/backup.ts:14-19` `stripSecrets()` 导出前删掉 `secret`；导入后 `Settings.vue:395-399` 直接 `addAccount()` → **导回的账号生成不出验证码**
- `src/utils/backup.test.ts:105-112` 还专门断言了"必须剥离 secret"，测试固化了错误行为
- `validateBackup()`（`backup.ts:66`）从未被应用调用，`Settings.vue:376` 只检查了 `payload.data.iv`
- 导出面板三种方式（不加密 / 自定义密码 / 应用密码）语义矛盾，需重新定义
- **验收**：导出→删除全部账号→导入，验证码可正常生成；旧版本备份不崩溃

### P0-2 编辑账号会静默破坏图标（数据不可逆）【前端】
- `src/components/EditAccount.vue:30-47`：`image` 类型被强转 `emoji`，`emojiValue` 初始化为 `'🔑'` → **改一次名字，已上传的 dataURL 永久丢失**
- `preset` 类型：`type` 不变但 `value` 被覆写成首字母 → `getPresetIconUrl()` 返回 `''` → `AccountCard.vue:126` 渲染 `<img src="">`
- **验收**：编辑任意 preset / image 图标的账号（含只改名字），图标保真不变

### P0-3 macOS 弹窗交互残废 【前端】
- `src/views/PopoverView.vue:54` `<AccountCodeList />` 未绑定 `add/delete/edit`，而组件会 emit 这三个事件（`AccountCodeList.vue:54-58`）→ 弹窗内长按删除、"添加第一个账号"均无反应
- ️ **必须与 P0-4 同改**，否则接上 AddAccount 后 `plugin:dialog` / `plugin:fs` 会被 ACL 拒
- **验收**：弹窗内可添加、编辑、删除账号

### P0-4 capabilities 未覆盖 popover 窗口 【后端】
- `src-tauri/capabilities/default.json:4-6` 仅 `"windows": ["main"]`
- 自定义命令目前放行（无 `permissions/` → `has_app_acl_manifest=false`，见 tauri 2.11.2 `webview/mod.rs:1813-1818`）；但 `plugin_command.is_some()` 是独立条件 → **popover 调 plugin 命令必被拒**
- **验收**：`windows: ["main", "popover"]`，弹窗内选图/导出可用

### P0-5 "AES-256-GCM 加密存储" 与实现不符 【文档/安全】
- `README.md:9`、`docs/STRUCTURE.md` 声称加密存储；实际 AES-GCM 只用于备份导出
- `src-tauri/src/storage.rs:24,88-97` `secret` 明文写入 `data.json`；解锁仅是前端 UI 门闩（`stores/settings.ts` 的 `isLocked`）
- 主密码为 6 位数字 PIN（`Unlock.vue:53`）
- **需产品决策**：① 改文档（"备份加密，本地数据依赖磁盘加密"）或 ② 真做 `data.json` 加密

### P0-6 平台支持是"纸面跨平台" 【文档/后端】
- 托盘 + 弹窗创建全在 `#[cfg(target_os = "macos")]` 内（`src-tauri/src/lib.rs:170-299`），关闭隐藏同理（`:304-311`）→ **Windows 无托盘、点关闭即退出**，而 README 宣称跨平台
- `set_menu_bar_only` 非 macOS 静默返回 `Ok`（`lib.rs:122-135`）
- `src-tauri/gen/` 仅 schemas → **移动端工程从未 init，无法构建**
- Android 生物识别三处不一致：`Cargo.toml:37` 声明依赖 → `lib.rs:159-161` 从未 `.plugin()` 注册 → `biometric.rs:35-37` 硬编码返回"可用" → `:89-93` 认证必抛 `"Android biometric not yet integrated"`
- iOS 无任何分支，`apple-localauthentication` 未在 ios target 声明
- **需产品决策**：Windows 托盘做/不做；Android 生物识别接/砍（砍 = 可用性返回 false + 删依赖）

---

## P1 — 安全与健壮性（只动 Rust，与平台决策无关）

- [ ] `crypto.rs:103` `key == expected_key.as_slice()` 非常量时间比较 → 用 `subtle::ConstantTimeEq`
- [ ] `crypto.rs:81-87` hash 格式无版本/迭代数 → 升级为 `pbkdf2_sha256$iter$salt$hash`，verify 兼容旧格式
- [ ] `crypto.rs:11,16-20` 迭代数硬编码、`EncryptedData` 无 version/KDF 参数 → 无迁移能力
- [ ] `storage.rs:82,103` `unwrap_or_default()` → JSON 损坏时静默变空，下次保存覆盖原文件（**静默数据丢失**）→ 先改名 `*.corrupt.<ts>` 再报错
- [ ] `storage.rs:95,116,126` 直接 `fs::write` → tmp+rename 原子写 + `#[cfg(unix)] 0o600`
- [ ] `storage.rs:75` `expect("failed to resolve app data directory")` 可 panic → 返回 `Result`
- [ ] `storage.rs:133` `read_to_string().ok()` 吞错 → 区分"无密码"与"IO 失败"
- [ ] `biometric_status.rs:88-90` `let _ = fs::write` 吞错 → **3 次失败后的 30 分钟锁定可被重启绕过**（计数不落盘）
- [ ] `biometric_status.rs` `get_status` 的 `last_failure_time` 恒为 `None`（`biometric.rs:105`）→ API 契约说谎
- [ ] `lib.rs:211` 托盘菜单保存设置 `let _ =` 吞错
- [ ] `tauri.conf.json:28` `"csp": null` → 换严格 CSP
- [ ] data.json / settings.json / password.dat 均无 schema version，无迁移逻辑

---

## P2 — 接线：代码写完了但没有入口

- [ ] **剪贴板链路**：`utils/clipboard.ts` 4 个导出零调用（`AccountCodeList.vue:58` 与 `Settings.vue:431` 直调 `navigator.clipboard`）→ `autoCopy` / `clipboardClearTime` 永不生效
- [ ] **设置页缺整块 UI**：`autoCopy`、`clipboardClearTime`(30s/60s/永不)、`lockTimeout`、`lockApp` —— locale 文案已就绪（`zh-CN.ts:71-84`），store 默认值已就绪，仅缺 UI
- [ ] **IconPicker 接线**：`src/components/IconPicker.vue` 全项目零引用（仅 `components/index.ts:9` 导出），预设 tab + 图片上传不可达，`assets/preset-icons/` 12 个 SVG 无入口
- [ ] **收敛图标实现**：`AccountCard.vue:115-130` 自带 if/else switch vs `icons.ts:56-101` 的 provider 注册表（`getIconProvider` 零调用）→ 两套并行实现，必须先合一
- [ ] **拖拽排序恢复**：24f05b3 实现过，9f86e0f 重构 AccountCodeList 时丢失；`stores/accounts.ts:60-68` `reorderAccounts` 成死代码
- [ ] **长按态复位**：`AccountCard.vue:76-84` `isLongPress` 置 true 后 `cancelLongPress()` 只清 timer → 卡片永久停在 `pressing` 缩放态（`:107`）
- [ ] **i18n 收口**：7 处硬编码「取消」（`Settings.vue:667,700,715,732,749,786,814`）+ `BottomSheet.vue:32` 默认值 + `Settings.vue:432` `showToast('已复制')` + `EmojiPicker.vue:36-85` 分类/占位符/空态；反向：`common.edit`、`home.totp`、`settings.sourceCode`、`setup.completeSetup`、`addAccount.type` 等定义了无功能
- [ ] **死 UI**：`Settings.vue:38,47` `passwordSuccess`/`setPasswordSuccess` 从未写入非空，但 `:747`/`:784` 仍渲染 `v-if` 成功提示；`importFilePath`（`:66`）只写不读
- [ ] **HOTP 未实现**：`otp.ts:109` 允许解析 `hotp` 但结果固定 `type:'totp'`；`Account.counter` 只写 0 从不递增（`types/index.ts:19`）
- [ ] **andOTP thumbnail 未映射**：`utils/andotp.ts:45`
- [ ] **死代码清理**：前端 `formatCode`、`getIconDisplay`、`isEmojiIcon`、`generateId`、`randomHex`、`getLogs`、`totpAccounts`、`components/index.ts` barrel；后端 `delete_account`（`lib.rs:36`，与 `removeAccount` 路径重复）

---

## P3 — 工程与发布

- [ ] **storage.rs 可测性重构**：当前每个函数都吃 `AppHandle`，无法单测 → 抽出 `struct Store { dir: PathBuf }`，app 层只做 `app.path() → Store`，测试用 tempdir
- [ ] **补测试**：前端 `utils/otp.ts`（TOTP 核心）、`utils/crypto.ts`、`stores/accounts.ts` 零覆盖；`icons.test.ts` 只测了应用代码不用的函数。**后端 `src-tauri/` 0 个测试**（crypto / storage / biometric_status 全裸）
- [ ] **CI**：无 `.github/`，构建完全手动 → build + vitest + `cargo test` + clippy + fmt check
- [ ] **App 主图标替换**：仍是旧青黄双环 logo，`docs/app-icon-v2/v3.png` 设计稿未应用（见 `docs/ICON_STATUS.md`）
- [ ] **发布链路**：无签名/公证（macOS signingIdentity、Windows certificate）、无 updater（`createUpdaterArtifacts` 未开）、无 CHANGELOG
- [ ] **元数据不一致**：`Cargo.toml:8` repository 与 `Settings.vue:431` 链接均指向 `github.com/openotp/openotp`，实际 remote 为 `github.com:yuefeiduzi/openOTP`
- [ ] **产品功能缺口**：账号列表无搜索/筛选；无摄像头实时扫码（仅本地图片 → jsQR）；无分组管理（仅按 issuer 折叠）

---

## 历史已解决条目

1. ~~语言下拉框 Bug~~ ✅ 2026-06-03（`handleLanguageChange` 遗漏 language 字段 + `.lang-option` CSS 未定义）
2. ~~macOS 菜单栏弹出框设计~~ ✅ 2026-06-03（320×480 无标题栏窗口，popover/main 互斥，`show_main_window`）
3. ~~深色模式~~ ✅ 2026-06-03（17 个 CSS 变量 + useTheme + 三选一）
4. ~~应用名称与图标设计~~ ✅ 2026-08-03（托盘 template 图标；⚠️ App 主图标见 P3）
5. ~~网站图标 — 自定义图片 + 预设图标库~~ ⚠️ **2026-09-15 复核为未完成**（后端 provider 就绪，但 IconPicker 无入口 + EditAccount 会破坏图标 → 见 P0-2 / P2）
6. ~~设置模块样式与交互优化~~ ✅ 2026-08-03
7. ~~解锁页样式优化~~ ✅ 2026-08-03（错误抖动动画）
8. ~~梳理全局通用组件~~ ✅ 2026-08-03（`components/index.ts` 统一导出；实际无人使用 → 见 P2 死代码）
9. ~~生物认证丢失~~ ✅（链路完整，`biometricEnabled` 不丢失）
10. ~~新账号添加置顶~~ ✅ 2026-08-03
11. ~~相同网站不同账号折叠~~ ✅ 2026-08-03
12. ~~macOS 悬浮窗修复 + 纯菜单栏模式~~ ✅ 2026-08-03（⚠️ 弹窗内交互见 P0-3；Windows 支持见 P0-6）