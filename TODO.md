# openOTP 开发任务清单

> 基于 `docs/superpowers/specs/2026-05-18-openotp-design.md` 设计文档
> 更新于 2026-05-18

---

## 模块 1：验证码生成 ✅

### 1.1 TOTP 生成器
- [x] 实现 TOTP 算法（RFC 6238） → `src/utils/otp.ts`
- [x] 支持 SHA-1 / SHA-256 / SHA-512 算法
- [x] 支持 6-8 位数字
- [x] 30秒周期倒计时进度条
- [x] 倒计时结束自动刷新

### 1.2 HOTP 生成器
- [x] 实现 HOTP 算法（RFC 4226） → `src/utils/otp.ts`
- [x] 点击刷新生成下一个码
- [x] counter 自动递增并存储

### 1.3 otpauth 解析
- [x] 解析 otpauth:// 协议链接 → `parseOtpauthUrl()`
- [x] 提取 secret、issuer、name、algorithm、digits、period/counter
- [x] 支持二维码扫码和手动输入 → `AddAccount.vue` + `jsQR`

---

## 模块 2：账号管理 UI ✅

### 2.1 AccountCard 组件
- [x] 显示图标（emoji/initial/image/preset）
- [x] 显示验证码（空格分隔）
- [x] 复制按钮 → 点击复制 + toast
- [x] TOTP 卡片：底部倒计时进度条（绿→黄→红）
- [x] HOTP 卡片：点击刷新按钮
- [x] 长按（500ms）触发删除确认弹窗

### 2.2 添加账号
- [x] AddAccount 组件
- [x] 二维码扫描（jsQR + Tauri dialog 选择图片）
- [x] 手动输入 otpauth 链接 → 实时解析预览
- [x] 手动输入各字段（type、algorithm、digits、period）
- [x] 图标选择（默认 initial + 随机背景色）

### 2.3 编辑账号
- [x] EditAccount 组件/弹窗
- [x] 修改 name、issuer
- [x] 图标修改（IconPicker 集成）

### 2.4 删除账号
- [x] DeleteConfirm 确认弹窗
- [x] 长按卡片触发
- [x] 删除后更新 order 排序

### 2.5 排序
- [x] 拖拽调整顺序 → `Home.vue` drag-and-drop
- [x] 更新 order 字段 → `reorderAccounts()`

---

## 模块 3：图标系统 ✅

### 3.1 IconPicker 组件
- [x] 类型切换：emoji / initial / image / preset
- [x] Emoji 选择器（36 个常用 emoji）
- [x] 背景色调色板（12 色，initial 类型）
- [x] 图片上传（PNG/SVG）→ 文件选择入口
- [x] 预设图标池选择

### 3.2 预设图标池
- [x] 12 个常用服务 SVG：GitHub、Google、Microsoft、Apple、AWS、GitLab、Slack、Discord、Twitter/X、Facebook、Dropbox、DigitalOcean
- [x] 存储在 `src/assets/preset-icons/`

### 3.3 首字母图标生成
- [x] 自动提取 name 首字母大写 → `getInitialStyle()`
- [x] 随机背景色 → `getRandomBgColor()`
- [x] 样式：居中白色文字，圆形

---

## 模块 4：安全与加密（Rust 后端）⚠️

### 4.1 数据加密 ✅
- [x] AES-256-GCM 加密/解密 → `src-tauri/src/crypto.rs`
- [x] PBKDF2 密钥派生（100,000 迭代 + 随机盐）
- [x] 每个账号 secret 单独加密 → `invoke('encrypt_data')`

### 4.2 数据库 ❌
- [ ] SQLite + SQLCipher 整体加密（当前使用 JSON 文件存储）
- [ ] accounts 表结构
- [ ] settings 表结构
- [ ] CRUD 操作

### 4.3 生物识别 ❌
- [ ] macOS：Keychain Touch ID（Rust 端为 stub）
- [ ] Windows：Windows Hello
- [ ] 失败 3 次回退主密码
- [ ] 检测设备支持与权限状态

### 4.4 密码管理 ✅
- [x] 设置主密码（6位数字，两次确认）
- [x] 验证主密码 → `verify_password_cmd`
- [x] 修改主密码（重新加密）→ Settings 弹窗
- [x] 密码提示（最多50字符）

---

## 模块 5：锁定与解锁流程 ✅

### 5.1 路由守卫
- [x] 未设置 → `/setup` → `router.beforeEach`
- [x] 已锁定 → `/unlock`
- [x] 已解锁 → `/`

### 5.2 锁定触发
- [x] 应用启动时锁定
- [x] 后台超时自动锁定 → `visibilitychange` 监听
- [x] 设置页手动锁定按钮
- [x] 监听应用可见性变化

### 5.3 Unlock 页面
- [x] 6位密码输入
- [x] 生物识别按钮（stub）
- [x] 显示密码提示

### 5.4 Setup 页面
- [x] 设置密码（两次确认）
- [x] 设置密码提示
- [x] 生物识别开关

---

## 模块 6：剪贴板操作 ✅

### 6.1 复制功能
- [x] 点击验证码复制到剪贴板 → `clipboard.ts`
- [x] 自动复制开关设置
- [x] 复制成功 "已复制" toast

### 6.2 自动清除
- [x] 30秒/60秒/永不 选项 → Settings 下拉
- [x] 定时清除剪贴板内容 → `scheduleClearClipboard()`
- [x] 应用后台时清除

---

## 模块 7：备份导入导出 ✅

### 7.1 导出备份
- [x] 生成 .openotp 文件 → `createBackup()`
- [x] AES-256-GCM 加密账号数据 JSON
- [x] manifest.json 元数据
- [x] Tauri 原生保存对话框

### 7.2 导入备份
- [x] 解密账号数据 JSON → `restoreBackup()`
- [x] Tauri 原生打开对话框
- [x] 导入到本地 store

### 7.3 错误处理
- [x] 密码错误提示
- [x] 文件损坏提示
- [x] 版本不兼容提示 → `validateBackup()`

---

## 模块 8：设置页面完善 ✅

### 8.1 设置项
- [x] 修改主密码弹窗（验证旧密码 + 输入新密码）
- [x] 密码提示编辑（点击编辑，最多50字符）
- [x] 生物识别开关
- [x] 自动复制开关
- [x] 剪贴板清除时间选择
- [x] 应用锁定时间选择（立即/1分钟/5分钟）
- [x] 导出备份按钮（Tauri 对话框）
- [x] 导入备份按钮（Tauri 对话框）
- [x] 锁定应用按钮
- [x] 关于信息（版本号、开源地址）

---

## 模块 9：工具函数 ✅

### 9.1 otp.ts ✅
- [x] `generateTOTP(secret, algorithm, digits, period)`
- [x] `generateHOTP(secret, counter, algorithm, digits)`
- [x] `getTOTPRemainingSeconds(period)`
- [x] `parseOtpauthUrl(url)`
- [x] `base32ToBuffer(base32)`
- [x] `formatCode(code)`

### 9.2 crypto.ts ✅
- [x] `encryptData(plaintext, password)` → Tauri invoke
- [x] `decryptData(encrypted, password)` → Tauri invoke
- [x] `generateId()` → `crypto.randomUUID()`
- [x] `randomHex(length)` → `crypto.getRandomValues`

### 9.3 backup.ts ✅
- [x] `createBackup(accounts, password)`
- [x] `restoreBackup(json, password)`
- [x] `validateBackup(manifest)`

### 9.4 clipboard.ts ✅
- [x] `copyToClipboard(text)`
- [x] `clearClipboard()`
- [x] `scheduleClearClipboard(delay)`
- [x] `cancelScheduledClear(timer)`

---

## 模块 10：Tauri 命令 ✅

### 10.1 数据存储命令 ✅
- [x] `save_account` / `get_accounts` / `delete_account`
- [x] `save_settings` / `get_settings`
- [x] `save_password_hash` / `load_password_hash` / `has_setup`

### 10.2 加密命令 ✅
- [x] `encrypt_data` / `decrypt_data`
- [x] `hash_password_cmd` / `verify_password_cmd`

### 10.3 生物识别命令 ⚠️
- [x] `check_biometric` (stub)
- [x] `biometric_auth` (stub)

### 10.4 前端实现 ✅
- [x] 剪贴板 → `navigator.clipboard` API
- [x] 二维码解析 → `jsQR` 前端库

---

## 模块 11：移动端适配 ❌

### 11.1 iOS
- [ ] Tauri iOS 配置
- [ ] Touch ID / Face ID
- [ ] 相机权限

### 11.2 Android
- [ ] Tauri Android 配置
- [ ] 指纹识别
- [ ] 相机权限

---

## 当前状态汇总

| 模块 | 状态 | 说明 |
|------|------|------|
| 1. 验证码生成 | ✅ 完成 | `otp.ts` |
| 2. 账号管理 UI | ✅ 完成 | 5 个组件 |
| 3. 图标系统 | ✅ 完成 | IconPicker + 12 预设图标 |
| 4. 安全加密 | ⚠️ 部分 | 加密完成，SQLCipher/生物识别待实现 |
| 5. 锁定解锁 | ✅ 完成 | 路由守卫 + 自动锁定 |
| 6. 剪贴板 | ✅ 完成 | `clipboard.ts` |
| 7. 备份 | ✅ 完成 | `backup.ts` + Tauri 对话框 |
| 8. 设置页 | ✅ 完成 | 全部设置项 |
| 9. 工具函数 | ✅ 完成 | otp/crypto/backup/clipboard |
| 10. Tauri 命令 | ✅ 完成 | 14 个命令 |
| 11. 移动端 | ❌ 未开始 | iOS/Android |

### 剩余待办
- **SQLCipher 数据库加密**：当前使用 JSON 文件，需迁移到加密 SQLite
- **生物识别 Real 实现**：当前 Rust 端为 stub，需对接 Security.framework / Windows Hello
- **移动端适配**：iOS/Android 配置、原生生物识别、相机权限
- **摄像头实时扫码**：当前使用图片文件 QR 解析，需对接实时摄像头流

---

## 模块 12：功能增强 ❌

### 12.1 搜索与筛选
- [ ] 账号搜索（按 name/issuer 过滤）
- [ ] 快捷键支持（Cmd/Ctrl+F 聚焦搜索）

### 12.2 分组管理
- [ ] 账号分组功能
- [ ] 分组标签显示
- [ ] 按分组筛选

### 12.3 批量操作
- [ ] 多选模式
- [ ] 批量删除
- [ ] 批量导出

---

## 模块 13：用户体验优化 ❌

### 13.1 深色模式
- [ ] 自动跟随系统
- [ ] 手动切换
- [ ] 主题色配置

### 13.2 国际化
- [ ] 英文语言支持
- [ ] 中文语言支持
- [ ] 语言切换设置

### 13.3 UI 细节
- [ ] 账号卡片动画优化
- [ ] 骨架屏加载状态
- [ ] 空状态插图
- [ ] 引导提示（首次使用）

### 13.4 无障碍
- [ ] 键盘导航
- [ ] 屏幕阅读器支持
- [ ] 高对比度模式

---

## 模块 14：安全增强 ❌

### 14.1 安全审计
- [ ] 登录尝试记录
- [ ] 失败次数限制（5次锁定）
- [ ] 安全日志

### 14.2 数据保护
- [ ] secret 内存安全（避免明文存储）
- [ ] 敏感数据及时清理
- [ ] 防截屏保护（可选）

### 14.3 备份增强
- [ ] 自动备份（定期）
- [ ] 云备份支持（iCloud/Google Drive）
- [ ] 备份版本管理

---

## 模块 15：性能优化 ❌

### 15.1 启动优化
- [ ] 延迟加载非关键数据
- [ ] 首屏渲染优化
- [ ] 冷启动时间 < 1s

### 15.2 运行时优化
- [ ] TOTP 刷新节流
- [ ] 虚拟滚动（账号列表 > 100）
- [ ] 内存占用优化

### 15.3 存储优化
- [ ] 数据压缩
- [ ] 缓存策略
- [ ] 数据迁移工具

---

## 模块 16：开发与测试 ❌

### 16.1 测试覆盖
- [ ] 单元测试（utils）
- [ ] 组件测试（Vitest）
- [ ] E2E 测试（Playwright）
- [ ] Rust 后端测试

### 16.2 CI/CD
- [ ] GitHub Actions 配置
- [ ] 自动化构建
- [ ] 自动化测试
- [ ] 版本发布自动化

### 16.3 文档
- [ ] API 文档
- [ ] 用户手册
- [ ] 贡献指南
- [ ] 更新日志（CHANGELOG）

---

## 模块 17：平台特性 ❌

### 17.1 macOS 特性
- [ ] 菜单栏图标（快速查看验证码）
- [ ] Touch Bar 支持
- [ ] Handoff（跨设备）

### 17.2 Windows 特性
- [ ] 任务栏图标
- [ ] 动态磁贴
- [ ] Windows Hello 集成

### 17.3 移动端特性
- [ ] 小组件（Widget）
- [ ] 快捷操作（3D Touch/长按）
- [ ] Wear OS / watchOS 配套应用

---

## 缺陷与改进

### 已知问题
- [ ] 生物识别库 Swift 链接问题（已通过 feature flag 禁用）
- [ ] HOTP counter 更新时序问题
- [ ] 长按触发与滚动手势冲突

### 待改进
- [ ] 图标上传支持裁剪
- [ ] 二维码识别准确率提升
- [ ] 错误提示文案优化
- [ ] 加密性能优化（大文件备份）

---

## 优先级建议

**P0（必须）：**
1. 生物识别真实实现
2. 摄像头实时扫码
3. 深色模式

**P1（重要）：**
1. 搜索筛选功能
2. 国际化
3. 测试覆盖

**P2（增强）：**
1. 分组管理
2. 批量操作
3. 性能优化
4. 平台特性

**P3（未来）：**
1. 移动端适配
2. 云备份
3. 穿戴设备支持