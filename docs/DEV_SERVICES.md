# 开发服务与端口清理

`pnpm dev` / `pnpm tauri:dev` 会**常驻后台**并占用端口：

| 服务 | 端口 |
|---|---|
| Vite dev server | 5173 |
| Tauri dev | 1420 |

任务结束**必须清理后台进程并释放端口**，禁止遗留（曾发生 dev 服务在后台跑数天）。

## 清理步骤
1. 列 dev 进程树：
   `ps -eo pid,ppid,pgid,command | grep -E "tauri|vite|target/debug/openotp"`
2. 对树内 PID 逐个 `kill -9 <pid>`（pnpm / tauri.js / vite / cargo / openotp），或整组 `kill -9 -<pgid>`
3. 验证释放：`lsof -iTCP:5173 -sTCP:LISTEN -P -n` 与 `:1420` 均应无输出

## 误杀警告
- `grep tauri` 会误匹配 macOS 系统驱动 `centaurid` / `AppleCentauri*`，**勿杀**
- 不要误杀与本项目无关的其它 node 服务（如 next-server）

## 相关
- 直接运行 `target/debug/openotp` 的 devUrl 空白问题见 [MACOS_PITFALLS.md](MACOS_PITFALLS.md)
