# Android 构建与现状

> 2026-10-09 首次打通：macOS（Apple Silicon）+ **模拟器**（API 37 / arm64-v8a）实测。
> **真机未验证**，各厂商 ROM 的差异（后台限制、WebView 版本、SAF 行为）都还没有结论。

## 现状（模拟器实测）

| 能力 | 状态 |
|---|---|
| 启动 / 设置主密码 / 解锁守卫 | ✅ |
| 添加账号（OTP URL、手动输入） | ✅ |
| 验证码生成与刷新 | ✅ 与独立实现（页面内 WebCrypto HMAC-SHA1）逐窗口比对一致 |
| 数据持久化 | ✅ `data.json` / `settings.json` 落在应用私有目录，权限 `0600` |
| 设置页 | ✅ 桌面专属项（托盘模式、生物识别开关）不显示 |
| 指纹解锁 | ❌ 未接入（`biometric.rs` 如实报告不可用，见 [TODO](../TODO.md)） |
| 备份导出 / 导入 / andOTP 导入 | ❌ 见下方「已知缺口」 |
| 应用图标 | ✅ `pnpm tauri icon` 生成到 `gen/android/app/src/main/res/mipmap-*` |
| Windows 侧同类问题 | 无关；Windows 仍是主窗口 + 托盘（桌面通用实现） |

包名：`com.openotp.desktop`（debug 构建加 `.debug` 后缀，见 `tauri.conf.json` 的
`bundle.android.debugApplicationIdSuffix`）。

## 本地构建

一次性准备（本机已就绪的部分无需重复）：

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME=/opt/homebrew/opt/openjdk@21        # AGP 8.11 / Gradle 8.14 需要 JDK 17+

# SDK 组件（cmdline-tools 装到 $ANDROID_HOME/cmdline-tools/latest 后）
sdkmanager --install "platforms;android-36" "ndk;29.0.13846066"

# Rust 目标：只跑 arm64（模拟器与多数真机）时装这一个就够
RUSTUP_DIST_SERVER=https://rsproxy.cn rustup target add aarch64-linux-android

# 工程脚手架（已入库，重建时才需要）
pnpm tauri android init --skip-targets-install
```

构建与安装：

```bash
pnpm tauri android build --debug --apk --target aarch64
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

产物在 `src-tauri/gen/android/app/build/outputs/apk/universal/debug/`。debug 包约 135 MB
（`.so` 未 strip、带调试符号），release 会小得多。

> 在已有产物上重复构建时，见过 APK 从 135 MB 变成 263 MB（`.so` 只有一份，但多出一块
> 与它等大的空洞，`unzip -l` 里看不到）。删掉 `app/build/outputs/apk` 重建就恢复。

### 版本对齐（踩过的坑）

- **NDK 由 CLI 挑**：`tauri android` 会扫 `$ANDROID_HOME/ndk/*`，取**字典序最大**的那个写成
  `NDK_HOME`，并不读你 export 的值。想固定版本就别装第二个 NDK
- CLI 2.11.2 期望的 NDK 是 `29.0.13846066`（sdkmanager 里的 r29-beta3），compileSdk/targetSdk
  是 36，Gradle 8.14.3、AGP 8.11.0、Kotlin 1.9.25 —— 都以 `src-tauri/gen/android/` 里的实际
  文件为准
- **Gradle 发行包要走镜像**：`services.gradle.org` 在本机实测 30 KB/s 且会断流，wrapper 会
  `Downloading ... failed: timeout`。手动预置（校验 sha256 与官方一致即可）：

  ```bash
  D=~/.gradle/wrapper/dists/gradle-8.14.3-bin/cv11ve7ro1n3o1j4so8xd9n66
  curl -L -o "$D/gradle-8.14.3-bin.zip" \
    https://mirrors.cloud.tencent.com/gradle/gradle-8.14.3-bin.zip
  ```

  （`cv11ve7ro1n3o1j4so8xd9n66` 是 wrapper 由 distributionUrl 算出的目录名，wrapper 首次运行时会
  自己建好这个目录）
- `dl.google.com`（SDK/NDK 与 Google Maven）、`repo1.maven.org`、`index.crates.io` 本机直连
  可用，无需代理或镜像

### 模拟器

```bash
$ANDROID_HOME/emulator/emulator -avd Medium_Phone_API_37.0
```

## 已知缺口

1. **备份全部不可用（导出/导入/andOTP）**：文件对话框在 Android 上返回 `content://` URI，
   Rust 侧用 `std::fs` 打不开，导出会失败并留下一个 0 字节文件：

   > 导出失败：failed to create content://com.android.providers.downloads.documents/document:
   > Read-only file system (os error 30)

   导入（`open()`）机制相同，同样读不到。两条修法：改走 `tauri-plugin-fs` 的 content URI
   支持在 JS 侧读写，或按 MediaStore / SAF 在 Kotlin 侧写。**未实现**
2. **指纹解锁**：需要注册 `tauri-plugin-biometric` + 权限声明，Cargo 依赖已就位但未接线
3. **CI 不构建 Android**：`.github/workflows/ci.yml` 只跑前端与桌面端 Rust 检查，
   `release.yml` 也只出 DMG。Android 产物目前只能本地构建
4. **图标生成会顺带改 `icon.icns`**：`pnpm tauri icon` 重写的 icns **内容相同但容器编码不同**
   （解包后逐张 PNG 一致），跑完记得 `git checkout src-tauri/icons/icon.icns`

## 调试

- 日志：`adb logcat | grep -i openotp`（debug 构建会注册 `tauri-plugin-log`）
- **WebView 调试**（debug 构建已开启）：

  ```bash
  adb forward tcp:9222 localabstract:webview_devtools_remote_$(adb shell pidof com.openotp.desktop.debug)
  curl -s http://127.0.0.1:9222/json    # 拿到 webSocketDebuggerUrl，可直连 CDP 执行 JS
  ```

  UI 自动化、看运行时异常都靠它；`adb shell input tap` 的坐标 = CSS 坐标 × `devicePixelRatio`
  （模拟器 1080×2400 上是 2.625），用 CDP 的 `Input.dispatchTouchEvent` 更可控
- 应用私有数据（仅 debug 包可读）：`adb shell run-as com.openotp.desktop.debug ls -la`
- 卸载干净再装：`adb uninstall com.openotp.desktop.debug`
