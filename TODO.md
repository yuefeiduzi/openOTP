# TODO

> 只记录**尚未完成**的事项。已完成的工作见 [CHANGELOG.md](CHANGELOG.md) 与 git 记录。
> 上次全量审计：2026-09-15（P0–P3 清单已全部处理，结论见提交历史）。

## 待决策

- [ ] **HOTP 支持**：目前明确拒绝 `otpauth://hotp` 链接（此前会被当作 TOTP 生成永远不匹配的验证码）。
      若要做，需要先定 UI：计数器在卡片上如何递增（复制后自动 +1，还是手动「下一个」）
- [ ] **自定义分组 / 标签**：需要先定模型（标签 vs 分组）与视图；当前靠 issuer 折叠 + 搜索已覆盖多数场景
- [ ] **同网站账号合并 + 「+」展开**（2026-09-28 提出）：同一网站只占一条，右侧用「+」展开该站点
      下的其他账号。现状：`AccountCodeList` 已按 issuer 字符串折叠（`key = (issuer || name).trim().toLowerCase()`），
      展开按钮是一行文字（`home.sameIssuerMore` / `home.collapseGroup`）+ `›` 箭头。
      待定：
      - 「同一网站」怎么算——现在按 issuer 原样匹配，`Microsoft - Microsoft` 与 `Microsoft` 会分成两组，
        需要在比较时归一化（大小写已处理；还要不要去空格 / 去 `-` 后缀 / 按域名归并）
      - 折叠形态：是否把文字按钮换成「+」（展开）/「−」或数字角标（收起），以及是否默认折叠所有分组
      - 展开后的子账号用完整卡片还是紧凑行（当前是完整卡片）
- [ ] **摄像头实时扫码**：需要 macOS 摄像头用途声明 + `getUserMedia`，且需要人工在真机上授权验证。
      桌面端「截图 → 选择图片」已是主路径，价值有限

## 发布链路（需要你的凭据）

- [ ] macOS 签名 + 公证（Apple Developer 证书与 app 专用密码）
- [ ] Windows 代码签名（代码签名证书）
- [ ] 自动更新（updater 密钥对 + 静态 `latest.json` 端点）

具体步骤与需要写入的配置见 [docs/RELEASE.md](docs/RELEASE.md)。

## 已知缺口

- [ ] **两个账号仍用首字母图标**（`163邮箱`、`火箭+TNT-wugiro-两步验证码`）：这两个服务没有
      干净来源的品牌 SVG。可选：换成 emoji（📧 / 🚀）、用户自传图片，或导入器在
      `thumbnail` 落空时再按 issuer 匹配（V2EX / Notion 的 thumbnail 就是 `Default`，
      目前是手工指定图标；改匹配规则会动到 `andotp.test.ts` 的一条既有断言）
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
