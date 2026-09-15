# 图标现状与更换流程

> 状态类文档，易过时；图标更换完成后请更新本文件。

## 现状
- 托盘/菜单栏图标：
  - macOS：✅ 单色 template 图标（`src-tauri/icons/tray-template@2x.rgba`，44x44 @2x，`icon_as_template(true)`）
  - Windows / Linux：✅ 彩色应用图标（`src-tauri/icons/tray-32@2x.rgba`，64x64 raw RGBA，防止模板图在浅色任务栏不可见）
  - 两者均为预转 raw RGBA 并经 `include_bytes!` 编译进二进制（免去 PNG 解码依赖）；重新生成：用任一图像工具导出为 32 位 RGBA 原始像素
- 主窗口图标：`icons/32x32.png`…`icon.ico`
- App 主图标（Dock / `.icns` / `public/icon.png` / `src-tauri/icons/*`）：❌ **仍是旧的青黄双环 logo，未替换**；新盾牌设计稿仅在 `docs/app-icon-v2.png`、`docs/app-icon-v3.png`（1024x1024，尚未应用到构建）

## 更换 App 主图标流程
1. 从选定设计稿（v2 或 v3）重新生成全套：`pnpm tauri icon <src.png>`（写入 `src-tauri/icons/*`）
2. 同步 `public/icon.png`
3. `pnpm tauri:build` 才会把新图写入 `.icns`

## 注意
- `menuBarOnly: true` 时运行期无 Dock 图标，属正常（activation policy 为 Accessory）
- 托盘图标是否生效的验证方法见 [MACOS_PITFALLS.md](MACOS_PITFALLS.md)（Thaw 会隐藏托盘图标）
