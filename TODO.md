# TODO

> 只记录**尚未完成**的事项。已完成的工作见 [CHANGELOG.md](CHANGELOG.md) 与 git 记录。
> 上次全量审计：2026-09-15（P0–P3 清单已全部处理，结论见提交历史）。

## 进行中（2026-09-28，图标一轮）

反馈自 0.2.0 首次安装试用，剩下的两项都是「图标」：

- [ ] **菜单栏图标仍不够干净**（用户：中间的点比较小而且多，白色盾牌边缘线有点糊）
     现状：`docs/tray-icon.svg` 是从 app 图标描出来的实心盾牌 + **六个** 1.25pt 圆点镂空，
     36×36 @2x 渲染（46.1% 完全不透明、5 级 alpha）。方向：点改为 **3 个更大的**
     （或单个锁孔），盾牌轮廓对齐 2x 像素网格；改完照 `docs/ICON_STATUS.md`
     「更换 macOS 菜单栏图标」一节重新光栅化，并在真实菜单栏上截图核对
     （可用 `screencapture -x -R x,y,w,h` + 3~4 倍放大看边缘）
- [ ] **Dock 图标不正常**（用户反馈，尚未定位）：待查 ① `icon.icns` 里各尺寸是否齐全、
     形状是否清晰（`iconutil -c iconset src-tauri/icons/icon.icns -o /tmp/x.iconset`）；
     ② `Info.plist` 的 `CFBundleIconFile`；③ Dock 瓦片到底是什么样（AX 里 Dock 瓦片坐标不可信，
     `CGWindowList` 按 owner=Dock 也没列到窗口，需换法定位后截图）；
     ④ 可能原因：ad-hoc 签名 + 缓存导致 macOS 显示通用图标 / 图标源图本身就是缩图

## 待决策

- [ ] **HOTP 支持**：目前明确拒绝 `otpauth://hotp` 链接（此前会被当作 TOTP 生成永远不匹配的验证码）。
      若要做，需要先定 UI：计数器在卡片上如何递增（复制后自动 +1，还是手动「下一个」）
- [ ] **自定义分组 / 标签**：需要先定模型（标签 vs 分组）与视图；当前靠 issuer 折叠 + 搜索已覆盖多数场景
- [ ] **摄像头实时扫码**：需要 macOS 摄像头用途声明 + `getUserMedia`，且需要人工在真机上授权验证。
      桌面端「截图 → 选择图片」已是主路径，价值有限

## 发布链路（需要你的凭据）

- [ ] macOS 签名 + 公证（Apple Developer 证书与 app 专用密码）
- [ ] Windows 代码签名（代码签名证书）
- [ ] 自动更新（updater 密钥对 + 静态 `latest.json` 端点）

具体步骤与需要写入的配置见 [docs/RELEASE.md](docs/RELEASE.md)。

## 已知缺口

- [ ] **本地数据未加密**：`data.json` 中的 TOTP 密钥为明文，安全性依赖系统磁盘加密；
      主密码为 6 位 PIN，仅作界面解锁。若要真做本地加密，需重构解锁流程并处理
      「忘记密码即丢数据」与现有数据迁移
- [ ] **弹窗与主窗口的锁定状态各自独立**：两个窗口是独立 webview，各自计时解锁；
      在弹窗解锁后切回 App 模式可能要求再次解锁。统一需要把锁定状态移到 Rust 侧，
      并重新定义「应用级」自动锁定（当前按窗口隐藏时长计算）
- [ ] **Android 指纹**：`biometric.rs` 已如实报告不可用；接入需 `tauri android init` +
      注册 `tauri-plugin-biometric` + 权限声明（本机无 Android SDK/NDK，未验证）
- [ ] **Windows 实机验证**：托盘模式与非 macOS 分支只做过 cfg 翻转的编译冒烟测试，
      未在 Windows 上实际运行
- [ ] **平台支持口径**：Linux 未实机验证；iOS 无任何实现（`docs/STRUCTURE.md` 已如实标注）
