# TODO

> **2026-09-15 全量审计**：`pnpm build` 通过，`pnpm test` 48/48 通过，工作区干净。
> **进度**：P0 全部完成（P0-5/P0-6 按决策重新设计后完成）；P1 全部完成；P2/P3 待办。
> 当前：前端 64 测试 / 后端 36 测试 / `cargo clippy` 零告警。
> 下列为审计出的未完成项，按优先级排列，均带 `文件:行号` 证据。
> 已解决的历史条目压缩保留在文末。

---

## P0 — 阻塞性：功能实际不可用 / 文档与现实不符

### ~~P0-1 备份导入导出实质失效~~ ✅ 2026-09-15
- 备份格式升到 v2（`encrypted` 标记），导出带 `secret`；明文模式（无密码）端到端可用，导入不再要求密码
- 导入前调用 `validateBackup`；v1 旧备份直接拒绝并说明原因（不含密钥，恢复出来不可用）
- 新增 `importAccounts`：每次导入重新生成 id（重复导入不再撞 id）+ 保持顺序；OpenOTP / andOTP 导入统一走它
- 导出面板在「无密码」选项下加了明文警告

### ~~P0-2 编辑账号会静默破坏图标（数据不可逆）~~ ✅ 2026-09-15
- 未触碰图标编辑器时原样保留原图标（preset / image 不再被改写）；预览支持全部 4 种类型
- 只有点 tab / 选 emoji / 选颜色才标记 dirty；顺手修掉 `visible` watcher 缺 `immediate` 导致的初始化依赖
- 新增 `EditAccount.test.ts`（仓库首个组件测试）

### ~~P0-3 macOS 弹窗交互残废~~ ✅ 2026-09-15
- 弹窗绑定 add/edit/delete，头部加「+」入口；Home 与弹窗共用 `useAccountEditor` composable
- **附带修掉一个两份审计都漏掉的严重 bug**：`removeAccount` 只做本地 splice + upsert 落盘 → **删除不持久，重启后账号回来**；现在调用 Rust 的 `delete_account`（原先的死代码）
- **附带修复**：弹窗是独立 webview，主窗口重新可见时重载账号（`App.vue`）
- **附带修复**：模态框打开时 pin 住弹窗（`set_popover_pinned`），否则原生文件对话框抢焦点会导致弹窗被自动隐藏

### ~~P0-4 capabilities 未覆盖 popover 窗口~~ ✅ 2026-09-15
- `windows: ["main", "popover"]`，已验证写入 `target/debug/build/*/out/capabilities.json`

### ~~P0-5 备份格式与加密口径~~ ✅ 2026-09-15（决策：改设计 + 改口径）
- 决策：备份改为 **标准 zip 容器**（`manifest.json` + `accounts.json` + `icons/<id>.<ext>`），密码即 zip 密码，也支持不加密
- 已实现：AES-256（WinZip AE-2）；图标作为真实图片文件存入 zip；`inspect_backup` 先读 manifest 再决定要不要问密码；导出去掉「使用应用密码」选项；密码输入从 6 位 PIN 改为文本（最低 8 位）
- ❗ **密码强度取舍**：zip 的 AES 用 PBKDF2-HMAC-SHA1 1000 次迭代（规范固定），远弱于旧方案，所以强制长密码；已在导出面板与文档说明
- 已同步修正文档：本地 `data.json` 为**明文**（依赖系统磁盘加密），不再声称“加密存储”
- [ ] **未决**：是否需要真正的本地数据加密（涉及解锁流程重构 + 现有数据迁移 + 忘记密码即丢数据）

### ~~P0-6 平台支持~~ ✅ 2026-09-15（决策：桌面两端体验一致）
- 托盘/弹窗/关闭即隐藏从 `#[cfg(target_os = "macos")]` 改为 `#[cfg(desktop)]`；仅激活策略与单色模板图标保留为 macOS 专属
- Windows/Linux 用彩色应用图标（预转 raw RGBA，避免 PNG 解码依赖）
- 弹窗定位：托盘在屏幕下半区（Windows）向上弹，上半区（macOS 菜单栏）向下弹，并按显示器边界钳制（含多显示器、小于面板的屏幕）→ 纯函数 + 6 个单测
- 生物识别策略：macOS 支持；**Android 原本谎报可用（开关能开、认证必失败），现改为诚实不可用**；Windows/Linux/iOS 用 PIN
- UI 文案改为平台中立（托盘 / 菜单栏模式），入口在桌面端均可见；移除无用命令 `is_macos`
- README / STRUCTURE.md 改为真实平台支持表（不再声称移动端支持）
- [ ] **待办：Windows 实机验证**（本机无法交叉编译：需下载 macOS 无关的依赖图，网络受限；已用 cfg 翻转冒烟测试验证非 macOS 分支可通过类型检查）
- [ ] **待办：Android 工程 init + 指纹接入**（本机无 Android SDK/NDK；需 `tauri android init` + 注册 `tauri-plugin-biometric` + 权限声明，并在 `biometric.rs` 的 android 分支调用其 Rust API）

---

## P1 — 安全与健壮性（只动 Rust，与平台决策无关） ✅ 2026-09-15

- [x] `crypto.rs:103` 非常量时间比较 → `subtle::ConstantTimeEq`
- [x] `crypto.rs:81-87` hash 格式升级为 `pbkdf2_sha256:<iterations>:<salt>:<hash>`，verify 兼容旧 `salt:hash`
- [x] `crypto.rs:11,16-20` `EncryptedData` 新增 `iterations`（serde default 兼容旧载荷），KDF 参数随密文存储
- [x] `storage.rs` JSON 损坏 → 改名 `*.corrupt.<ts>` 隔离再报错（不再静默覆盖）
- [x] `storage.rs` 原子写（tmp + flush + rename）+ `0600` 权限（实测新 profile 写入为 `-rw-------`）
- [x] `storage.rs:75` `expect()` → `Result`，调用方降级 + 记日志
- [x] `storage.rs:133` 区分「无密码」与「IO 失败」
- [x] `biometric_status.rs` 吞错 → 记日志（失败计数丢失会导致重启绕过锁定），并入原子写
- [x] `biometric_status.rs` 时间戳 `unwrap()` → 降级处理
- [x] `lib.rs:211` 托盘菜单保存设置吞错 → 记日志
- [x] `tauri.conf.json` `csp: null` → 严格生产 CSP + 独立 `devCsp`（已实机验证渲染正常）
- [x] 后端测试从 0 到 17 个（crypto 8 + storage 9）；`cargo clippy` 零告警
- [ ] data.json / settings.json / password.dat 仍无 schema version 与迁移逻辑（待归档格式变更时再做）

---

## 实施中新发现（两份审计都漏掉的）

### ~~D-1 删除账号不落盘~~ ✅ 2026-09-15
- `stores/accounts.ts` `removeAccount` 只做本地 splice，`persistAccounts` 走的是 upsert → 被删条目仍在 `data.json`，**重启后账号会回来**；Rust 的 `delete_account` 正是为此写的却从未被调用。已改为调用该命令 + 单测。

### ~~D-2 备份解密永远失败~~ ✅ 2026-09-15
- `utils/crypto.ts` 的 `decryptData` 把载荷拍平成顶层字段，而 Tauri 按参数名取键（`v.get("encrypted")`）→ `decrypt_data` 恒报 `missing required key encrypted`，UI 把安装成「密码错误」。已改为整体传递 + 契约测试。

### D-3 平台集成缺口（归入 P0-6）
- Windows 无托盘且关闭即退出；Android 生物识别从未接线；iOS 无任何分支；移动端工程未 init。

---

## P2 — 接线：代码写完了但没有入口

- [ ] **剪贴板链路**：`utils/clipboard.ts` 4 个导出零调用（`AccountCodeList.vue:58` 与 `Settings.vue:431` 直调 `navigator.clipboard`）→ `autoCopy` / `clipboardClearTime` 永不生效
- [ ] **设置页缺整块 UI**：`autoCopy`、`clipboardClearTime`(30s/60s/永不)、`lockTimeout`、`lockApp` —— locale 文案已就绪（`zh-CN.ts:71-84`），store 默认值已就绪，仅缺 UI
- [ ] **IconPicker 接线**：`src/components/IconPicker.vue` 全项目零引用（仅 `components/index.ts:9` 导出），预设 tab + 图片上传不可达，`assets/preset-icons/` 12 个 SVG 无入口
- [ ] **收敛图标实现**：`AccountCard.vue:115-130` 自带 if/else switch vs `icons.ts:56-101` 的 provider 注册表（`getIconProvider` 零调用）→ 两套并行实现，必须先合一
- [ ] **拖拽排序恢复**：24f05b3 实现过，9f86e0f 重构 AccountCodeList 时丢失；`stores/accounts.ts:60-68` `reorderAccounts` 成死代码
- [ ] **长按态复位**：`AccountCard.vue:76-84` `isLongPress` 置 true 后 `cancelLongPress()` 只清 timer → 卡片永久停在 `pressing` 缩放态（`:107`）
- [ ] **i18n 收口**：死键 `settings.verifyPassword`（导出改用应用密码的分支已删除）；7 处硬编码「取消」（`Settings.vue:667,700,715,732,749,786,814`）+ `BottomSheet.vue:32` 默认值 + `Settings.vue:432` `showToast('已复制')` + `EmojiPicker.vue:36-85` 分类/占位符/空态；反向：`common.edit`、`home.totp`、`settings.sourceCode`、`setup.completeSetup`、`addAccount.type` 等定义了无功能
- [ ] **死 UI**：`Settings.vue:38,47` `passwordSuccess`/`setPasswordSuccess` 从未写入非空，但 `:747`/`:784` 仍渲染 `v-if` 成功提示；`importFilePath`（`:66`）只写不读
- [ ] **HOTP 未实现**：`otp.ts:109` 允许解析 `hotp` 但结果固定 `type:'totp'`；`Account.counter` 只写 0 从不递增（`types/index.ts:19`）
- [ ] **andOTP thumbnail 未映射**：`utils/andotp.ts:45`
- [ ] **死代码清理**：前端 `formatCode`、`getIconDisplay`、`isEmojiIcon`、`generateId`、`randomHex`、`getLogs`、`totpAccounts`、`components/index.ts` barrel（后端 `delete_account` 已接入，不再是死代码）

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