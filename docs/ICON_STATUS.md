# 图标现状与更换流程

## 现状（2026-09-28）

- **App 主图标**：✅ 矢量盾牌（源 `docs/app-icon-v4.svg`，光栅化为 `docs/app-icon-v4.png`）
  - 蓝色圆角方砖 + 白色盾牌 + 三个圆点孔，整块铺满图标形状（macOS 方砖：824px 内容、
    100px 边距、185px 圆角），与菜单栏图标同一套几何
  - 全套由 `pnpm tauri icon docs/app-icon-v4.png` 生成：`icon.icns` · `icon.ico` ·
    `icon.png`(512) · `32x32` · `64x64` · `128x128` · `128x128@2x` · Windows
    `Square*Logo.png` / `StoreLogo.png`
  - `public/icon.png` 同步（页面 favicon 与弹窗头部使用）
  - 旧版（v3）是带 6 个点、抠掉品红背景后残留描边毛刺的 3D 渲染图：透明底图标在
    macOS 26+ 会被系统自动加一层灰色方砖，看起来像一块灰板，故换成自绘矢量
- **macOS 菜单栏图标**：单色 template（`icons/tray-template@2x.rgba`，36×36 @2x = 18pt，
  `icon_as_template(true)`）——`tauri icon` **不会**覆盖，需单独制作
  - 设计源 `docs/tray-icon.svg`（18×18 pt 网格；盾牌 14×15.5pt + 三个 3.5pt 圆点镂空，
    点间距 2px、最外点到盾牌边缘 2/1px @2x）
  - 配套位图 18×18 / 36×36 PNG 与对应 raw RGBA（1296 / 5184 字节），均为纯黑 RGB + alpha
  - 由矢量源按目标尺寸 1:1 光栅化（不从 1024 缩图），形状落在 0.5pt 网格上，
    只剩 1px 抗锯齿（5 级 alpha），避免菜单栏发虚
- **Windows / Linux 托盘图标**：彩色应用图标（`icons/tray-32@2x.rgba`，64×64 原始 RGBA）
  ——模板图在浅色任务栏上不可见，故用彩色
- 两个托盘图标都以预转 raw RGBA 提交并由 `include_bytes!` 编进二进制（免 PNG 解码依赖）

## 更换 App 主图标

```bash
# 1. 改 docs/app-icon-v4.svg，再按 1024×1024 光栅化成 docs/app-icon-v4.png（要带 alpha，
#    见下方「光栅化」——qlmanage 会把透明底合成为白底，不能用）
# 2. 生成全套（源图要求 1024×1024 且带透明通道）
pnpm tauri icon docs/app-icon-v4.png
rm -rf src-tauri/icons/android src-tauri/icons/ios   # 移动端工程未初始化，这些不入库

# 3. 同步页面用图
cp src-tauri/icons/icon.png public/icon.png

# 4. 重新生成 Windows/Linux 托盘用的彩色位图
python3 - <<'PY'
from PIL import Image
icon = Image.open('src-tauri/icons/128x128@2x.png').convert('RGBA').resize((64, 64), Image.LANCZOS)
open('src-tauri/icons/tray-32@2x.rgba', 'wb').write(icon.tobytes())
PY

# 5. 打包时才会写入 .icns
pnpm tauri:build
```

### 光栅化（SVG → 带 alpha 的 PNG）

用浏览器 canvas 画 `drawImage` 再 `toDataURL`（alpha 保留）；**不要**用 `qlmanage -t`
或整页截图，它们是合成在底色上的，透明区域会变成白底。

## 更换 macOS 菜单栏图标

设计源是 `docs/tray-icon.svg`（18×18 pt 网格；实心盾牌 + 三个「OTP 圆点」镂空）。

1. 修改 `docs/tray-icon.svg`
2. 用上面的光栅化方法按目标像素 1:1 渲染（透明底，不要从大图缩小），再导出纯黑 RGB +
   alpha：
   - 36×36 → `icons/tray-template@2x.png`，并转 raw RGBA
     `icons/tray-template@2x.rgba`（36²×4 = 5184 字节）
   - 18×18 → `icons/tray-template.png` 与 `icons/tray-template.rgba`
     （18²×4 = 1296 字节）
3. macOS 运行时只读取 `tray-template@2x.rgba`（`icon_as_template(true)`，只用 alpha
   通道），`lib.rs` 里的尺寸参数需与之一致
4. 在真实菜单栏上核对：`screencapture -x -R <x>,0,140,30` 后用 4 倍放大看边缘
   （图标坐标见 TODO.md 里的 osascript 一行）

## 图标不刷新（macOS 缓存）

换掉图标后，同一个路径的 Dock / Finder 图标可能仍是旧的，`touch`、`lsregister -f`、
`killall Dock`、清 `com.apple.iconservices` 缓存都试过，**都没用**；换一个路径启动
（如从 `src-tauri/target/release/bundle/macos/` 启动）会立刻显示新图标，可见缓存是按
bundle 路径 + 版本记的。因此实际做法是**提升版本号**后重新构建安装：0.2.1 的构建即正常
显示新图标。
