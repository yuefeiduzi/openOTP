# openOTP 开发任务清单

> 基于 `docs/superpowers/specs/2026-05-18-openotp-design.md` 设计文档

---

## 模块 1：验证码生成

### 1.1 TOTP 生成器
- [ ] 实现 TOTP 算法（RFC 6238）
- [ ] 支持 SHA-1 / SHA-256 / SHA-512 算法
- [ ] 支持 6-8 位数字
- [ ] 30秒周期倒计时进度条
- [ ] 倒计时结束自动刷新

### 1.2 HOTP 生成器
- [ ] 实现 HOTP 算法（RFC 4226）
- [ ] 点击刷新生成下一个码
- [ ] counter 自动递增并存储

### 1.3 otpauth 解析
- [ ] 解析 otpauth:// 协议链接
- [ ] 提取 secret、issuer、name、algorithm、digits、period/counter
- [ ] 支持二维码扫码和手动输入

---

## 模块 2：账号管理 UI

### 2.1 AccountCard 组件
- [ ] 显示图标（emoji/initial/image）
- [ ] 显示验证码（空格分隔，如 `123 456`）
- [ ] 复制按钮
- [ ] TOTP 卡片：底部倒计时进度条
- [ ] HOTP 卡片：点击刷新按钮
- [ ] 长按触发删除确认弹窗

### 2.2 添加账号
- [ ] AddAccount 组件
- [ ] 二维码扫描（调用摄像头）
- [ ] 手动输入 otpauth 链接
- [ ] 手动输入各字段（secret、issuer、name、type、algorithm、digits、period）
- [ ] 图标选择（默认 initial + 随机背景色）

### 2.3 编辑账号
- [ ] EditAccount 组件/弹窗
- [ ] 修改 name、issuer
- [ ] 图标修改（IconPicker）

### 2.4 删除账号
- [ ] 删除确认弹窗
- [ ] 长按卡片触发
- [ ] 删除后更新 order 排序

### 2.5 排序（可选）
- [ ] 拖拽调整顺序
- [ ] 更新 order 字段

---

## 模块 3：图标系统

### 3.1 IconPicker 组件
- [ ] 类型切换：emoji / initial / image / preset
- [ ] Emoji 选择器
- [ ] 背景色调色板（initial 类型）
- [ ] 图片上传（PNG/SVG）
- [ ] 预设图标池选择

### 3.2 预设图标池
- [ ] 常用服务图标（GitHub、Google、Apple、Microsoft 等）
- [ ] 存储在 `src/assets/preset-icons/`

### 3.3 首字母图标生成
- [ ] 自动提取 name 首字母大写
- [ ] 随机生成背景色（存储在 bgColor）
- [ ] 样式：居中白色文字

---

## 模块 4：安全与加密（Rust 后端）

### 4.1 数据加密
- [ ] AES-256-GCM 加密/解密 secret
- [ ] PBKDF2 密钥派生（100,000 迭代 + 随机盐）
- [ ] 每个账号 secret 单独加密

### 4.2 数据库
- [ ] SQLite + SQLCipher 整体加密
- [ ] accounts 表结构
- [ ] settings 表结构
- [ ] CRUD 操作

### 4.3 生物识别
- [ ] macOS：Keychain Touch ID
- [ ] Windows：Windows Hello
- [ ] 失败 3 次回退主密码
- [ ] 检测设备支持与权限状态

### 4.4 密码管理
- [ ] 设置主密码（6位数字，两次确认）
- [ ] 验证主密码
- [ ] 修改主密码（重新加密所有数据）
- [ ] 密码提示（最多50字符）

---

## 模块 5：锁定与解锁流程

### 5.1 路由守卫
- [ ] 未设置 → `/setup`
- [ ] 已锁定 → `/unlock`
- [ ] 已解锁 → `/`

### 5.2 锁定触发
- [ ] 应用启动时锁定
- [ ] 后台超时自动锁定（立即/1分钟/5分钟）
- [ ] 设置页手动锁定按钮
- [ ] 监听应用可见性变化

### 5.3 Unlock 页面
- [ ] 6位密码输入
- [ ] 生物识别按钮
- [ ] 显示密码提示

### 5.4 Setup 页面
- [ ] 设置密码（两次确认）
- [ ] 设置密码提示
- [ ] 生物识别开关

---

## 模块 6：剪贴板操作

### 6.1 复制功能
- [ ] 点击验证码复制到剪贴板
- [ ] 自动复制开关设置
- [ ] 复制成功提示

### 6.2 自动清除
- [ ] 30秒/60秒/永不 选项
- [ ] 定时清除剪贴板内容
- [ ] 应用后台时清除

---

## 模块 7：备份导入导出

### 7.1 导出备份
- [ ] 生成 .openotp 文件（zip 格式）
- [ ] AES-256-GCM 加密账号数据 JSON
- [ ] 打包 image 类型图标文件
- [ ] manifest.json 元数据

### 7.2 导入备份
- [ ] 解压 .openotp 文件
- [ ] 解密账号数据 JSON
- [ ] 提取图标文件
- [ ] 合并到本地数据库（处理冲突）

### 7.3 错误处理
- [ ] 密码错误提示
- [ ] 文件损坏提示
- [ ] 版本不兼容提示

---

## 模块 8：设置页面完善

### 8.1 设置项
- [ ] 验证主密码
- [ ] 修改主密码弹窗
- [ ] 生物识别开关
- [ ] 自动复制开关
- [ ] 剪贴板清除时间选择
- [ ] 应用锁定时间选择
- [ ] 导出备份按钮
- [ ] 导入备份按钮
- [ ] 关于信息（版本号、开源地址）

---

## 模块 9：工具函数

### 9.1 otp.ts
- [ ] generateTOTP(secret, algorithm, digits, period)
- [ ] generateHOTP(secret, counter, algorithm, digits)
- [ ] parseOtpauthUrl(url)

### 9.2 crypto.ts
- [ ] encryptSecret(secret, password)
- [ ] decryptSecret(encrypted, password)
- [ ] deriveKey(password, salt)

### 9.3 backup.ts
- [ ] exportBackup(accounts, password)
- [ ] importBackup(file, password)
- [ ] validateBackupManifest(manifest)

---

## 模块 10：Tauri 命令

### 10.1 数据存储命令
- [ ] `save_account(account)`
- [ ] `get_accounts()`
- [ ] `update_account(id, updates)`
- [ ] `delete_account(id)`
- [ ] `get_settings()`
- [ ] `save_settings(settings)`

### 10.2 加密命令
- [ ] `encrypt_data(data, password)`
- [ ] `decrypt_data(encrypted, password)`
- [ ] `derive_key(password)`
- [ ] `verify_password(password, hash)`

### 10.3 生物识别命令
- [ ] `check_biometric_support()`
- [ ] `biometric_auth()`

### 10.4 剪贴板命令
- [ ] `copy_to_clipboard(text)`
- [ ] `clear_clipboard()`

### 10.5 扫码命令
- [ ] `scan_qrcode()` - 调用摄像头
- [ ] `parse_qrcode(image)` - 解析二维码图片

---

## 模块 11：移动端适配

### 11.1 iOS
- [ ] Tauri iOS 配置
- [ ] Touch ID / Face ID
- [ ] 相机权限

### 11.2 Android
- [ ] Tauri Android 配置
- [ ] 指纹识别
- [ ] 相机权限

---

## 执行顺序建议

1. **模块 1 + 9.1**：验证码生成核心（可独立测试）
2. **模块 2 + 3**：账号管理 UI（依赖模块 1）
3. **模块 4 + 5 + 10**：安全与后端（核心依赖）
4. **模块 6**：剪贴板
5. **模块 7 + 9.3**：备份
6. **模块 8**：设置完善
7. **模块 11**：移动端适配

---

## 文件清单

### 新增文件
- `src/components/AccountCard.vue`
- `src/components/AddAccount.vue`
- `src/components/EditAccount.vue`
- `src/components/IconPicker.vue`
- `src/components/DeleteConfirm.vue`
- `src/utils/otp.ts`
- `src/utils/crypto.ts`
- `src/utils/backup.ts`
- `src/assets/preset-icons/*.png`

### 修改文件
- `src/views/Home.vue` - AccountCard 集成
- `src/views/Settings.vue` - 完善设置项
- `src/views/Setup.vue` - 密码加密存储
- `src/views/Unlock.vue` - 密码验证 + 生物识别
- `src/stores/accounts.ts` - 数据持久化
- `src/stores/settings.ts` - 数据持久化
- `src-tauri/src/lib.rs` - 注册命令
- `src-tauri/src/storage.rs` - 新增
- `src-tauri/src/biometric.rs` - 新增
- `src-tauri/src/commands/*.rs` - 新增