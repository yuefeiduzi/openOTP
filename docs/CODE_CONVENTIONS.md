# 代码与测试规范

## 前端（Vue 3 + TypeScript）
- Vue 组件使用 `<script setup lang="ts">` 语法
- 使用 Composition API
- 状态管理使用 Pinia
- 路径别名：`@/` 指向 `src/`

## 前后端通信
- 前端与 Rust 通过 Tauri `invoke` 通信
- Rust 命令以 `#[tauri::command]` 注册（命名无统一后缀，个别历史命令带 `_cmd`）

## Rust
- 遵循标准 Rust 格式规范（`cargo fmt`）

## 测试
- 使用 vitest + @vue/test-utils + happy-dom

## Git 提交与推送
- 提交信息遵循 Conventional Commits：`type(scope): subject`；type 用 `feat` / `fix` / `docs` / `chore` / `test` / `refactor` 等，scope 可选，subject 用英文
- **默认提交**：任务完成后由 agent 直接 `git commit`，无需每次询问
- **推送归用户**：agent **绝不执行 `git push`**；是否推送、何时推送由用户自行操作
