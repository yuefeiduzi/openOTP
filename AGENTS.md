# openOTP 项目配置

## 项目概述
开源、跨平台、纯本地的二步验证器，基于 Tauri 2.0 + Vue 3 + TypeScript

## 技术栈
- 前端：Vue 3 + TypeScript + Pinia + Vue Router
- 桌面端：Tauri 2.0 (Rust)
- 数据库：SQLite (SQLCipher 加密)
- 加密：AES-256-GCM

## 开发命令
- `pnpm dev` - 启动 Vite 开发服务器
- `pnpm build` - 构建前端生产版本
- `pnpm tauri dev` - 启动 Tauri 开发模式（桌面应用）
- `pnpm tauri:build` - 构建 Tauri 应用

## 代码规范
- Vue 组件使用 `<script setup lang="ts">` 语法
- 使用 Composition API
- 状态管理使用 Pinia
- 路径别名：`@/` 指向 `src/`
- Rust 后端遵循标准 Rust 格式规范

## 项目结构
```
src/
├── views/         # 页面组件 (Home, Setup, Unlock, Settings)
├── components/    # 可复用组件
├── stores/        # Pinia 状态管理
├── router/        # Vue Router 路由配置
├── types/         # TypeScript 类型定义
├── utils/         # 工具函数
└── assets/        # 静态资源

src-tauri/
├── src/           # Rust 后端代码
├── capabilities/  # Tauri 权限配置
└── tauri.conf.json # Tauri 配置
```

## 设计文档
详细设计文档位于：`docs/superpowers/specs/2026-05-18-openotp-design.md`

## 支持平台
- macOS (桌面端)
- Windows (桌面端)
- iOS (移动端)
- Android (移动端)
