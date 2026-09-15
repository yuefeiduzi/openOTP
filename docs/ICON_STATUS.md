# 图标现状与更换流程

> 状态类文档，易过时；图标更换完成后请更新本文件。

## 现状
- 托盘/菜单栏图标：
  - macOS：✅ 单色 template 图标（`src-tauri/icons/tray-template@2x.rgba`，44x44 @2x，`icon_as_template(true)`）
  - Windows / Linux：✅ 彩色应用图标（`src-tauri/icons/tray-32@2x.rgba`，64x64 raw RGBA，防止模板图在浅色任务栏不可见）
  - 两者均为预转 raw RGBA 并经 `include_bytes!` 编译进二进制（免去 PNG 解码依赖）；重新生成：用任一图像工具导出为 32 位 RGBA 原始像素
- 主窗口图标 / App 主图标：✅ 已替换为新盾牌（2026-09-15）
  - 设计稿选用 `docs/app-icon-v3.png`（1024x1024，RGBA 透明底，盾牌 + 6 码点，与菜单栏托盘同一设计语言；v2 是不透明白底，未采用）
  - 用 `pnpm tauri icon docs/app-icon-v3.png` 生成全套：`icon.icns` / `icon.ico` / `icon.png`(512) / `32x32` / `64x64` / `128x128` / `128x128@2x` / Windows `Square*Logo.png`、`StoreLogo.png`
  - 同步 `public/icon.png`（弹窗头部与网页 favicon 使用）；`index.html` 的 favicon 由脚手架默认紫色图标改为 `/icon.png`，并删除了无引用的 `public/favicon.svg`、`public/icons.svg`
  - 未提交 `pnpm tauri icon` 额外生成的 `icons/android`、`icons/ios`（移动端工程未 init，约 628K；需要时重新生成）

## 更换 App 主图标流程
1. `pnpm tauri icon <src.png>` 重新生成全套（写入 `src-tauri/icons/*`，要求源图 1024x1024 且带透明通道）
2. 同步 `public/icon.png`
3. 重新生成 Windows/Linux 托盘用的彩色图标（64x64 原始 RGBA，从 `128x128@2x.png` 缩放）：
   `python3 -c "from PIL import Image; i=Image.open('src-tauri/icons/128x128@2x.png').convert('RGBA').resize((64,64), Image.LANCZOS); open('src-tauri/icons/tray-32@2x.rgba','wb').write(i.tobytes())"`
4. macOS 菜单栏的单色 template 图标（`tray-template@2x.png/.rgba`）是单独制作的，`tauri icon` 不会覆盖；如设计变更需手工重做
5. `pnpm tauri:build` 才会把新图写入 `.icns`

## 注意
- `menuBarOnly: true` 时运行期无 Dock 图标，属正常（activation policy 为 Accessory）
- 托盘图标是否生效的验证方法见 [MACOS_PITFALLS.md](MACOS_PITFALLS.md)（Thaw 会隐藏托盘图标）
