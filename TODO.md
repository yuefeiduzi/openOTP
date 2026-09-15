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

## P2 — 接线：代码写完了但没有入口 ✅ 2026-09-15

- [x] **剪贴板链路**：`copyToClipboard` / `scheduleClearClipboard` 接入列表；`autoCopy` 语义定为「点击卡片即复制」（关闭时只留复制按钮），`clipboardClearTime`（30s / 60s / 不自动清除，0=不清除）
- [x] **设置页缺整块 UI**：`autoCopy`、`clipboardClearTime`、`lockTimeout`（立即 / 1 分钟 / 5 分钟）、`lockApp`（立即锁定）全部补齐；顺带把后端默认锁定时间 60 与前端 1 对齐
- [x] **IconPicker 接线**：AddAccount 与 EditAccount 都通过 BottomSheet 打开选择器；预设图标与图片上传首次可用
- [x] **收敛图标实现**：`renderIcon()` 成为唯一入口，新的 `IconDisplay` 组件供卡片/选择器/编辑器共用；未知预设名降级为首字母而非坏图；首字母改为渲染时推导
- [x] **拖拽排序恢复**：卡片可拖拽，按上下半区决定插入位置，落点按完整 order 序列计算（折叠分组下同样正确）
- [x] **长按态复位**：`isLongPress` 在抬起/移出时复位；长按后的那次点击不再触发复制或编辑
- [x] **i18n 收口**：7 处「取消」+ BottomSheet 默认值 + 图标选择器标签 + 剪贴板提示 + 密码提示弹窗全部走 `t()`；删除 12 个死键；修正仓库地址；新增 i18n 测试（键漂移 / 缺失 / 未使用 / 硬编码中文）
- [x] **死 UI**：两个永不显示的成功提示与相关 ref 已删除
- [x] **HOTP**：由「接受但当成 TOTP 生成错误验证码」改为**明确拒绝**并给出可翻译原因；andOTP 导入报告跳过数量。真正的 HOTP 支持（计数器手动递增 UI）仍是未决功能，见下
- [x] **死代码清理**：`emojis.ts`、`EmojiPicker.vue`、`components/index.ts`、`getLogs`、`getCurrentLocale`、`totpAccounts` 删除；`base32ToBuffer`/`generateHOTP` 收回为内部函数；卡片不再自带复制一份的格式化实现
- [x] **andOTP thumbnail 映射**：按名称匹配预设图标，未知品牌回退首字母

### 新增待决

- [ ] **HOTP 真支持**（可选）：目前明确拒绝。若要做，需要 UI 决策：计数器如何在卡片上递增（复制后自动 +1 还是手动「下一个」）
- [x] ~~锁定语义：`#/popover` 绕过解锁守卫~~ ✅ 2026-09-15：守卫覆盖弹窗，解锁后返回原目标；生物识别期间 pin 住弹窗

## P3 — 工程与发布

- [x] **storage.rs 可测性重构**：改为「AppHandle → 目录」+ 纯 `*_from(&Path)` 内部函数，测试用临时目录（未抽出独立 `Store` 结构体，但已可完整单测）
- [x] **补测试**：后端 0 → 36 个（crypto / storage / backup / 命令层 / 弹窗定位）；前端 48 → 146 个（新增 otp 算法含 RFC 6238 向量、clipboard、i18n、accounts store、Settings / EditAccount / AddAccount / AccountCard / AccountCodeList / App 组件测试）
- [x] **CI**：`.github/workflows/ci.yml`（前端 frozen install + build + test；后端 fmt --check / clippy --all-targets -D warnings / test）。开启严格 clippy 后立刻发现 2 处测试 lint
- [x] **App 主图标替换**：改用 `docs/app-icon-v3.png` 生成全套（icns/ico/png/Windows Store logos），同步 `public/icon.png` 与 favicon，重建 Windows 托盘位图；流程见 `docs/ICON_STATUS.md`
- [x] **更新日志与发布文档**：`CHANGELOG.md`（Keep a Changelog）+ `docs/RELEASE.md`（三处版本号、macOS 签名/公证、Windows 签名、updater 落地步骤、发布前检查清单）
- [ ] **发布链路（需要你的凭据/决策）**：macOS 签名 + 公证（Apple Developer 证书）、Windows 代码签名、自动更新（updater 密钥对 + 静态 `latest.json` 端点）。步骤已写在 `docs/RELEASE.md`
- [x] **元数据不一致**：`Cargo.toml` 与关于页链接已改为实际仓库地址
- [x] **账号列表搜索**：按账号名 / 发行方过滤，搜索时显示平铺结果与账号名（分组视图不变）
- [ ] **摄像头实时扫码**：需要 macOS Info.plist 摄像头用途声明 + `getUserMedia`，且本机无法脚本化验证（系统授权弹窗需人工点击）→ 建议先不做：桌面端「截图 → 选择图片」已是主路径
- [ ] **自定义分组 / 标签**：需要产品决策（标签模型 + 视图），当前靠 issuer 折叠 + 搜索已覆盖多数场景

---

## 历史已解决条目

1. ~~语言下拉框 Bug~~ ✅ 2026-06-03（`handleLanguageChange` 遗漏 language 字段 + `.lang-option` CSS 未定义）
2. ~~macOS 菜单栏弹出框设计~~ ✅ 2026-06-03（320×480 无标题栏窗口，popover/main 互斥，`show_main_window`）
3. ~~深色模式~~ ✅ 2026-06-03（17 个 CSS 变量 + useTheme + 三选一）
4. ~~应用名称与图标设计~~ ✅ 2026-08-03 托盘 / 2026-09-15 App 主图标（见 P3）
5. ~~网站图标 — 自定义图片 + 预设图标库~~ ✅ 2026-09-15（IconPicker 接入添加与编辑；图标渲染收敛为 `renderIcon` 单一实现）
6. ~~设置模块样式与交互优化~~ ✅ 2026-08-03
7. ~~解锁页样式优化~~ ✅ 2026-08-03（错误抖动动画）
8. ~~梳理全局通用组件~~ ✅ 2026-08-03（`components/index.ts` 统一导出；实际无人使用 → 见 P2 死代码）
9. ~~生物认证丢失~~ ✅（链路完整，`biometricEnabled` 不丢失）
10. ~~新账号添加置顶~~ ✅ 2026-08-03
11. ~~相同网站不同账号折叠~~ ✅ 2026-08-03
12. ~~macOS 悬浮窗修复 + 纯菜单栏模式~~ ✅ 2026-08-03（⚠️ 弹窗内交互见 P0-3；Windows 支持见 P0-6）