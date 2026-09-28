# 图标现状与更换流程

## 现状（2026-09-28）

- **App 主图标**：✅ 新盾牌（源自 `docs/app-icon-v3.png`，1024×1024、RGBA 透明底）
  - 全套由 `pnpm tauri icon` 生成：`icon.icns` · `icon.ico` · `icon.png`(512) ·
    `32x32` · `64x64` · `128x128` · `128x128@2x` · Windows `Square*Logo.png` / `StoreLogo.png`
  - `public/icon.png` 同步（页面 favicon 与弹窗头部使用）
- **macOS 菜单栏图标**：单色 template（`icons/tray-template@2x.rgba`，36×36 @2x = 18pt，
  `icon_as_template(true)`）——`tauri icon` **不会**覆盖，需单独制作
  - 设计源 `docs/tray-icon.svg`（18×18 pt 网格）；配套位图 18×18 / 36×36 PNG 与
    对应 raw RGBA（1296 / 5184 字节），均为纯黑 RGB + alpha
  - 由矢量源按目标尺寸 1:1 光栅化（不从 1024 缩图），形状落在像素网格上，
    边缘只有 1px 抗锯齿，避免菜单栏发虚
- **Windows / Linux 托盘图标**：彩色应用图标（`icons/tray-32@2x.rgba`，64×64 原始 RGBA）
  ——模板图在浅色任务栏上不可见，故用彩色
- 两个托盘图标都以预转 raw RGBA 提交并由 `include_bytes!` 编进二进制（免 PNG 解码依赖）

## 更换 App 主图标

```bash
# 1. 生成全套（源图要求 1024×1024 且带透明通道）
pnpm tauri icon docs/app-icon-v3.png

# 2. 同步页面用图
cp src-tauri/icons/icon.png public/icon.png

# 3. 重新生成 Windows/Linux 托盘用的彩色位图
python3 - <<'PY'
from PIL import Image
icon = Image.open('src-tauri/icons/128x128@2x.png').convert('RGBA').resize((64, 64), Image.LANCZOS)
open('src-tauri/icons/tray-32@2x.rgba', 'wb').write(icon.tobytes())
PY

# 4. 打包时才会写入 .icns
pnpm tauri:build
```

注意：

- `pnpm tauri icon` 也会生成 `icons/android`、`icons/ios`（约 628K）；移动端工程尚未初始化，
  这些文件未提交，需要时再生成
- macOS 菜单栏的单色图标需另行制作（template 图标应为纯色 + alpha；见文末「更换 macOS 菜单栏图标」）
- 设计稿只保留实际采用的那份（v2 为不透明白底，未采用，已从仓库移除）

## 更换 macOS 菜单栏图标

设计源是 `docs/tray-icon.svg`（18×18 pt 网格；实心盾牌 + 六个「OTP 圆点」镂空）。

1. 修改 `docs/tray-icon.svg`
2. 用 SVG 光栅化器按目标像素 1:1 渲染（透明底，不要从大图缩小），再导出纯黑 RGB +
   alpha：
   - 36×36 → `icons/tray-template@2x.png`，并转 raw RGBA
     `icons/tray-template@2x.rgba`（36²×4 = 5184 字节）
   - 18×18 → `icons/tray-template.png` 与 `icons/tray-template.rgba`
     （18²×4 = 1296 字节）
3. macOS 运行时只读取 `tray-template@2x.rgba`（`icon_as_template(true)`，只用 alpha
   通道），`lib.rs` 里的尺寸参数需与之一致
