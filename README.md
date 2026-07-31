# openOTP

开源、跨平台、纯本地的二步验证器

## 功能

- TOTP 验证码生成
- 二维码扫描 / 手动输入添加账号
- AES-256-GCM 加密存储
- 生物识别解锁（指纹/面容）
- 加密备份导入导出（.openotp）
- 跨平台：macOS / Windows / iOS / Android

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
