# 图标现状与更换流程

## 现状（2026-09-15）

- **App 主图标**：✅ 新盾牌（源自 `docs/app-icon-v3.png`，1024×1024、RGBA 透明底）
  - 全套由 `pnpm tauri icon` 生成：`icon.icns` · `icon.ico` · `icon.png`(512) ·
    `32x32` · `64x64` · `128x128` · `128x128@2x` · Windows `Square*Logo.png` / `StoreLogo.png`
  - `public/icon.png` 同步（页面 favicon 与弹窗头部使用）
- **macOS 菜单栏图标**：单色 template（`icons/tray-template@2x.rgba`，44×44 @2x，
  `icon_as_template(true)`）——`tauri icon` **不会**覆盖，需单独制作
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
- macOS 菜单栏的单色图标需另行制作（template 图标应为纯色 + alpha，形状要能在 16pt 下辨认）
- 设计稿只保留实际采用的那份（v2 为不透明白底，未采用，已从仓库移除）
