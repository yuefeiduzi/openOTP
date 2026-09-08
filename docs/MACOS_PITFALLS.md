# macOS 平台已知坑

## 托盘 / 菜单栏
- 托盘 `Click` 事件一次物理点击触发两次（mouseDown + mouseUp 各一次）；处理时须匹配 `button_state: MouseButtonState::Up`，否则 toggle 逻辑会立即翻转（弹窗闪现）
- 本机装有菜单栏管理工具 **Thaw**：它会把第三方托盘图标移出菜单栏（状态项 position 被放到屏幕外，如 `(-1, 981)`）。**菜单栏肉眼看不到托盘图标 ≠ 托盘没创建**；用 System Events 查该进程 `menu bar 2` 状态项及其 position 确认，或点开 Thaw 的 ˅ 浮层查看

## 窗口
- 运行时 `set_position` 在 macOS 26 上不可靠（窗口偏移 ~50px）；弹窗位置必须用 `WebviewWindowBuilder::position()` 创建时定位
- 透明窗口需双层开关：Cargo.toml 的 `tauri` feature `macos-private-api` + tauri.conf.json 的 `app.macOSPrivateApi: true`

## 调试
- 直接运行 `target/debug/openotp` 时 webview 加载 devUrl（http://localhost:5173），vite 未启动则页面空白；调试必须 `pnpm tauri:dev` 或先起 `pnpm dev`
- dev 服务的端口清理见 [DEV_SERVICES.md](DEV_SERVICES.md)
