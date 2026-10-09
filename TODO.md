# TODO

> 只记录**尚未完成**的事项；已完成的工作见 [CHANGELOG.md](CHANGELOG.md) 与 git 记录。
> 目前只保留待决策的内容、分发（Homebrew）与平台（Android / Windows）事项，新发现的 bug 出现时
> 再记入。

## 待决策

- [ ] **自定义分组 / 标签**：需要先定模型（标签 vs 分组）与视图；当前靠 issuer 折叠 + 搜索已覆盖多数场景
- [ ] **分组折叠的形态（「+」展开）**（2026-09-28 提出；合并与账号名 2026-09-29 已完成）：
      同一网站已归一合并为一条、卡片标题用归一后的网站名、每张卡片显示账号名
      （`src/utils/site.ts`）。剩下是纯展示决策：
      - 是否把当前那行文字按钮（`home.sameIssuerMore` / `home.collapseGroup`）换成右侧的
        「+」/「−」或数字角标，以及是否默认折叠所有分组
      - 展开后的子账号用完整卡片还是紧凑行（当前是完整卡片）
      - 归一是否还要更激进（大小写与空格已归一；要不要按域名归并，如 `GitHub Enterprise` → GitHub）
- [ ] **设置页还可再收**（2026-09-28 提出，2026-09-29 已做第一轮）：已去掉语言「跟随系统」、
      托盘模式开关、复制后清除剪贴板、关于里的退出按钮，并把两个开关移到安全设置末尾。
      若还想更简：把数据导入导出与调试收进二级页，或按平台隐藏不适用项
- [ ] **摄像头实时扫码**：需要 macOS 摄像头用途声明 + `getUserMedia`，且需要人工在真机上授权验证。
      桌面端「截图 → 选择图片」已是主路径，价值有限

## 分发（Homebrew）

- [ ] **建 tap 仓库并配 token**：`yuefeiduzi/homebrew-openotp`（空仓库）+ fine-grained PAT
      （`Contents: Read and write`）存成 secret `HOMEBREW_TAP_TOKEN`；在此之前
      [docs/INSTALL.md](docs/INSTALL.md) 与 README 里的 `brew install` 命令指向的 tap 还不存在，
      步骤见 [docs/HOMEBREW.md](docs/HOMEBREW.md) 的「一次性设置」
- [ ] **真实远端 tap 的首次验证**：建好后用 Actions → Homebrew tap 手动跑一个已发布的 tag，
      确认 tap 里出现 cask，并在干净机器上 `brew install --cask yuefeiduzi/openotp/openotp`
      （本机只用临时 tap 实测过 cask 与 postflight，未跑过真实远端同步）
- [ ] **（长期）官方 `homebrew/cask`**：两道门槛 —— Apple Developer 签名 + 公证（[docs/RELEASE.md](docs/RELEASE.md)
      缺口一），以及自荐需要的 225 stars / 90 forks；现状与解法见 [docs/HOMEBREW.md](docs/HOMEBREW.md)

## Android

- [ ] **备份导出 / 导入 / andOTP 导入全部不可用**：文件对话框返回 `content://` URI，
      Rust 侧 `std::fs` 打不开——导出报
      `failed to create content://...: Read-only file system (os error 30)` 并留下 0 字节文件，
      导入同理。修法（改走 `tauri-plugin-fs` 的 content URI 支持，或在 Kotlin 侧用
      MediaStore / SAF）见 [docs/ANDROID.md](docs/ANDROID.md)
- [ ] **指纹解锁**：`biometric.rs` 已如实报告不可用；接入需注册 `tauri-plugin-biometric` +
      权限声明（Cargo 依赖已在 `[target.'cfg(target_os = "android")'.dependencies]`）
- [ ] **自适应图标**：`pnpm tauri icon` 生成的 `ic_launcher_foreground` 是整块圆角方砖，
      系统圆形遮罩下会露出方角；需要单独出一版「白盾牌 + 安全区留白」的前景，背景取方砖的蓝
- [ ] **CI 与发布**：CI 只跑前端与桌面端 Rust 检查，Android 产物（APK / AAB）目前只能本地
      构建；**真机未验证**（只在模拟器 API 37 / arm64 上跑过），各厂商 ROM 差异没有结论

## Windows

- [ ] **实机验证**：托盘模式与非 macOS 分支只做过 cfg 翻转的编译冒烟测试，未在 Windows 上实际运行。
      已知一处具体缺口：**原生托盘菜单在启动时按当时的语言构建**，之后切换语言不会更新
      （`tray_return_app` / 退出项的文案），需要重启才生效；macOS 不挂托盘菜单所以看不到。
      修法是保存设置时重建菜单（保持 `tray_by_id` 句柄），并用 cfg 翻转做编译冒烟 ——
      未实现也未经实机验证
- [ ] **代码签名与打包**：代码签名证书，并把 Windows 打包接进 `release.yml`；
      具体配置见 [docs/RELEASE.md](docs/RELEASE.md)