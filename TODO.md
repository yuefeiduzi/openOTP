# TODO

## 1. ~~修复 Bug — 语言下拉框~~ ✅ 已解决 (2026-06-03)
- ~~语言选择 BottomSheet 点击选项后不生效 / 样式错位~~
- ~~需排查 `handleLanguageChange` 绑定和 `showLangSheet` 关闭时序~~
- 根因：`handleLanguageChange` 调用本地 `saveSettings()`（遗漏 `language` 字段）；`.lang-option` CSS 未定义
- 修复：统一使用 `settingsStore.saveSettings()`；新增语言选项完整样式

## 2. ~~设计 macOS 菜单栏图标弹出框~~ ✅ 已解决 (2026-06-03)
- ~~点击菜单栏图标时弹出简化版主页面（仅显示 TOTP 码，无设置入口）~~
- ~~弹出框样式参考 1Password / Bartender 的 Panel 风格~~
- ~~要求：小巧、圆角、跟随菜单栏定位~~
- 实现：320×480 无标题栏窗口，AccountCodeList 共享组件，popover/main 窗口互斥，Rust 端 show_main_window 命令

## 3. ~~深色模式~~ ✅ 已解决 (2026-06-03)
- ~~全局 CSS 变量支持 light / dark 主题切换~~
- ~~跟随系统外观设置（`prefers-color-scheme`）~~
- ~~所有组件（Setup、Unlock、Home、Settings、弹窗）适配暗色~~
- 实现：17 个 CSS 变量（light/dark），useTheme composable，设置页浅色/深色/跟随系统三选一，所有组件 CSS 变量化

## 4. 应用名称与图标设计 — 🟡 部分完成
- ✅ 应用图标已设计（盾牌+锁孔，icns / ico / png / Windows 多尺寸齐全）
- ✅ 名称统一为 OpenOTP（productName / 窗口标题 / 托盘 tooltip）
- ✅ 菜单栏托盘改用单色 template 图标（tray-template.png，`icon_as_template(true)`），适配明暗菜单栏

## 5. 网站图标 — 自定义图片 + 预设图标库 — 🟡 部分完成（此前仅预留扩展口）
- 此前状态：`IconProvider` 扩展口与 preset/image provider 已注册，`preset-icons/` 有 12 个品牌 SVG，但无选择入口、上传只存文件名、列表只渲染占位图
- ✅ 本次补全：IconPicker 新增「预设」tab；图片上传读取 dataURL 持久化；AccountCard 真实渲染 preset/image 图标

## 6. 设置模块样式与交互优化 — 🟡 基础具备
- ✅ CSS 变量统一、section/divider 结构一致、BottomSheet 过渡动画已有
- ✅ 本次补全：安全区新增生物识别开关（此前仅初始设置流程可设）；setting-btn 增加 hover/transition 一致性

## 7. 解锁页样式优化 — 🟡 部分完成
- ✅ PinInput 焦点态过渡、密码提示展示、生物认证按钮样式已有
- ✅ 本次补全：错误提示抖动动画（shake keyframes）

## 8. 梳理全局通用组件，抽象成单独模块 — ❌ 此前未做
- ✅ 本次补全：新增 `src/components/index.ts` 统一导出入口（组件 + 相关类型）
- 暂不拆分 ui/account 子目录（TODO 原为"可考虑"，避免大面积改导入路径）

## 9. ~~修复 Bug — 生物认证丢失~~ ✅ 已解决（此前未标记）
- 链路已完整：Settings 开关 → saveSettings → Rust save_settings → settings.json → get_settings 读回
- 磁盘 settings.json 实际含 `biometricEnabled`，重启不丢失

## 10. 新账号添加置顶 — ❌ 此前未做
- ✅ 本次补全：`addAccount` 未显式指定 order 时，新账号 order = 最小 order - 1（置顶）

## 11. 相同网站不同账号折叠 — ❌ 此前未做
- ✅ 本次补全：AccountCodeList 按 issuer 分组，默认显示主账号，可展开/收起同 issuer 其余账号

## 12. macOS 悬浮窗修复 + 最小化按钮 — 🟡 部分完成
- ✅ popover 创建/定位/互斥/失焦隐藏逻辑完整（呈现失败已修复）
- ✅ 本次补全：主页面新增「最小化到菜单栏」按钮（仅 macOS，Rust 端 hide_main_window 命令）
