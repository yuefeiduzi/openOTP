# openOTP

开源、跨平台、纯本地的二步验证器

## 功能

- TOTP 验证码生成
- 二维码扫描 / 手动输入添加账号
- 本地数据明文存储（依赖系统磁盘加密），密码 + 生物识别解锁
- 生物识别解锁（macOS 指纹/面容；其它平台使用 PIN）
- 备份导入导出：标准 zip 容器，可选 AES-256 加密（自定义密码 / 不加密）
- 托盘常驻模式：托盘弹窗查看验证码，主窗口关闭即隐藏（macOS 菜单栏 / Windows 托盘）
- 跨平台：macOS / Windows（桌面端体验一致，托盘常驻模式两端都支持）

## 平台支持

| 平台 | 状态 | 生物识别 |
|---|---|---|
| macOS | ✅ 完整支持 | Touch ID / Face ID |
| Windows | ✅ 主窗口与托盘常驻模式 | 无，使用 PIN |
| Linux | ⚠️ 未验证（托盘代码为桌面通用实现） | 无，使用 PIN |
| Android | ❌ 工程未初始化 | 计划支持指纹（待接入） |
| iOS | ❌ 工程未初始化 | 无，使用 PIN |

## 技术栈

- **前端**：Vue 3 + TypeScript + Pinia + vue-i18n
- **桌面端**：Tauri 2.0 (Rust)
- **存储**：JSON 文件存储（非数据库）
- **加密**：AES-256-GCM + PBKDF2-HMAC-SHA256

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 启动 Tauri 开发模式
pnpm tauri:dev

# 构建生产版本
pnpm tauri:build

# 运行测试
pnpm test
```

## 项目结构

```
openOTP/
├── src/                    # Vue 前端
│   ├── views/              # 页面
│   ├── components/         # 组件
│   ├── stores/             # Pinia 状态管理
│   ├── composables/        # 组合式函数
│   ├── locales/            # 国际化
│   ├── router/             # Vue Router
│   ├── types/              # TypeScript 类型
│   └── utils/              # 工具函数
├── src-tauri/              # Tauri 后端 (Rust)
├── docs/                   # 文档
└── AGENTS.md               # 项目配置
```

## License

MIT
