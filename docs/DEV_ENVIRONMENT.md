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

### 窗口

- 运行时 `set_position` 在 macOS 26 上不可靠（窗口偏移 ~50px）；弹窗位置必须用
  `WebviewWindowBuilder::position()` 在创建时定位
- 透明窗口需双层开关：`Cargo.toml` 的 `tauri` feature `macos-private-api` +
  `tauri.conf.json` 的 `app.macOSPrivateApi: true`
- 弹窗在失焦 200ms 后自动隐藏；打开系统对话框（文件选择、生物识别）时需先用
  `set_popover_pinned` 钉住，否则弹窗会在对话框下面被关掉

### 调试

- 直接运行 `target/debug/openotp` 时 webview 加载 devUrl（http://localhost:5173），
  vite 未启动则页面空白；调试必须 `pnpm tauri:dev` 或先起 `pnpm dev`
- 本机 AppleScript 合成点击被系统权限拦截（错误 -25200），GUI 自动化只能查询窗口/按钮
  几何信息，不能代替人工点击
