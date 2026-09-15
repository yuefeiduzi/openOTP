# TODO

> **2026-09-15 全量审计**：`pnpm build` 通过，`pnpm test` 48/48 通过，工作区干净。
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
- [ ] **i18n 收口**：7 处硬编码「取消」（`Settings.vue:667,700,715,732,749,786,814`）+ `BottomSheet.vue:32` 默认值 + `Settings.vue:432` `showToast('已复制')` + `EmojiPicker.vue:36-85` 分类/占位符/空态；反向：`common.edit`、`home.totp`、`settings.sourceCode`、`setup.completeSetup`、`addAccount.type` 等定义了无功能
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