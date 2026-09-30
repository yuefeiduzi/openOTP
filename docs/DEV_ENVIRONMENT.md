# 本地开发环境

## dev 服务与端口清理

`pnpm dev` / `pnpm tauri:dev` 会**常驻后台**并占用端口，任务结束**必须清理**（曾发生 dev 服务遗留数天）：

| 服务 | 端口 |
|---|---|
| Vite dev server | 5173 |
| Tauri dev | 1420 |

清理步骤：

```bash
# 1. 列出 dev 进程树
ps -eo pid,ppid,pgid,command | grep -E "tauri|vite|target/debug/openotp"

# 2. 逐个 kill（pnpm / tauri.js / vite / cargo / openotp），或整组
kill -9 <pid>            # 或 kill -9 -<pgid>

# 3. 验证端口已释放（均应无输出）
lsof -iTCP:5173 -sTCP:LISTEN -P -n
lsof -iTCP:1420 -sTCP:LISTEN -P -n
```

**误杀警告**：`grep tauri` 会匹配到 macOS 系统驱动 `centaurid` / `AppleCentauri*`，**勿杀**；
也不要误杀与本项目无关的其它 node 服务。

## 冒烟验证（不动真实数据）

macOS 上用临时 identifier 起一个干净 profile，验证界面与启动流程，且不触碰真实数据：

```bash
pnpm tauri dev --config '{"identifier":"com.openotp.devcheck"}'
# 结束后删除 ~/Library/Application Support/com.openotp.devcheck
```

想直接看到主界面（跳过 PIN）时，可先往该 profile 写入 `data.json` + `settings.json`
（**不要**写 `password.dat`）：没有密码时守卫会自动解锁。

## macOS 已知坑

### 托盘 / 菜单栏

- 托盘 `Click` 事件一次物理点击触发两次（mouseDown + mouseUp）；处理时必须匹配
  `button_state: MouseButtonState::Up`，否则 toggle 逻辑会立即翻转（弹窗闪现）
- 本机装有菜单栏管理工具 **Thaw**：它会把第三方托盘图标移出菜单栏（状态项 position 变成
  屏幕外的 `(-1, 981)`）。**菜单栏看不到图标 ≠ 托盘没创建**；用 System Events 查该进程
  `menu bar 2` 的状态项及其 position 确认，或点开 Thaw 的 ˅ 浮层查看
- 受此影响，自动化脚本**无法点开托盘弹窗**（图标在屏幕外），涉及弹窗的改动需人工验证
- 多显示器时托盘点击坐标不能直接和 `Monitor::position()/size()` 比对：macOS 上点击坐标 =
  全局 points × 图标所在显示器的 scale，而 tao 的显示器矩形 = 全局 points × **各自**的
  scale；1x + 2x 混用时两套矩形会重叠（本机：内建 3024×1964@2x 主屏 + PHL 243i7Q
  1920×1080@1x 在左侧），旧逻辑会匹配到主屏、弹窗永远弹在主屏上。定位时先用
  `cursor_position()`（全局 points × 主屏 scale）还原成 points，再与
  `position/scale`、`size/scale` 的矩形匹配（`lib.rs::tray_anchor`）。单元测试覆盖两类
  布局（1x 在左 / 在右）；真实光标可用 `CGWarpMouseCursorPosition` 配合临时 hook 验证
- 弹窗是**一次性创建后复用**的窗口：切换显示器必须显式 `set_position`，否则一直停在
  首次创建的位置

### 窗口

- 运行时 `set_position` 传 `PhysicalPosition` 时会被窗口当前所在屏幕的 scale 换算，容易偏；
  传 **`LogicalPosition`** 则在本机 macOS（`sw_vers` 报 27.0.1 / 26A434）上实测精确（1x/2x
  显示器间往返移动，`outer_position` / CGWindowList 与目标一致，2026-09-30 验证；移动后
  ~7ms 内到位，不会看到闪烁）。靠近屏幕顶部约 30–40px 内 AppKit 的 `constrainFrameRect`
  会把窗口往下压几个 point（菜单栏高度，随显示器不同），属系统行为、不影响菜单栏弹窗观感
- 透明窗口需双层开关：`Cargo.toml` 的 `tauri` feature `macos-private-api` +
  `tauri.conf.json` 的 `app.macOSPrivateApi: true`
- 弹窗在失焦 200ms 后自动隐藏；打开系统对话框（文件选择、生物识别）时需先用
  `set_popover_pinned` 钉住，否则弹窗会在对话框下面被关掉
- **托盘模式下的程序坞图标**：进入托盘模式后应用会切到 Accessory 激活策略（不再算「运行中」），
  但**固定（pinned）在程序坞上的图标不会被 macOS 去掉**，它属于用户的程序坞。想验证到底哪
  一种：`lsappinfo list | grep -A 2 openotp` 看 `type="UIElement"`（托盘）/ `"Foreground"`
  （App），再看程序坞的 AX 属性 `AXIsApplicationRunning`——未固定时托盘模式下这个 tile 会
  整个消失，固定时只是 running=false。用 System Events 读 Dock 的 `list 1` 即可确认

### 调试

- 直接运行 `target/debug/openotp` 时 webview 加载 devUrl（http://localhost:5173），
  vite 未启动则页面空白；调试必须 `pnpm tauri:dev` 或先起 `pnpm dev`
- 本机 AppleScript 合成点击被系统权限拦截（错误 -25200），GUI 自动化只能查询窗口/按钮
  几何信息，不能代替人工点击
- 产物依赖 Swift 运行时：生物识别桥是 Swift，二进制里唯一的 Swift 动态库引用是
  `@rpath/libswift_Concurrency.dylib`（其余都是绝对路径）。`src-tauri/build.rs` 会给
  测试二进制与 App 补上 `/usr/lib/swift`；若看到 `dyld: Library not loaded` 就是这条 rpath
  丢了，`otool -l <二进制> | grep LC_RPATH` 可直接确认

### 解锁 / 弹窗回归（不点托盘也能做）

合成**键盘**事件没有被拦（被拦的只有合成点击），所以「锁屏 → 输入 PIN → 解锁」这类回归
可以脚本化。要点：

- **别动真数据**：用测试数据目录跑 `pnpm tauri dev --config '{"identifier":"com.openotp.devcheck"}'`，
  数据落在 `~/Library/Application Support/com.openotp.devcheck/`。三个文件都可预置：
  `password.dat` 写 `pbkdf2_sha256:100000:<salt_hex>:<key_hex>`（PBKDF2-HMAC-SHA256、100k 次、
  32B 输出，python `hashlib.pbkdf2_hmac` 直接能算），`settings.json` 存在才算已初始化，
  `data.json` 放几条假账号
- **让 app 当前台再输入**：`osascript -e 'tell application "System Events" to tell process "OpenOTP" to set frontmost to true'`，
  然后 `keystroke tab`（PIN 首格没有 autofocus）再逐位 `keystroke "1"`；不激活的话按键会进
  别的 app，弹窗也拿不到 key（此时弹窗会因失焦自行隐藏）
- **弹窗不点托盘打不开**（图标被 Thaw 移出菜单栏，AX 也 press 不动）：需要临时在 `setup()` 里
  加一段只读环境变量的 debug hook —— 起线程 sleep 十几秒后 `main.hide()` +
  `build_panel(..., "popover", ...)` + `focus_tray_panel`，即模仿托盘左键；验证完删掉，不要提交
- **看窗口是否还在**：
  `osascript -e 'tell application "System Events" to tell process "OpenOTP" to get count of windows'`；
  截图用 `screencapture -x`，弹窗在 (200,200)-(520,680) 点附近，可用
  `sips -c 960 640 --cropOffset 400 400` 裁出来看
