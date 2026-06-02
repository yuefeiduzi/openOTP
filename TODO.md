# TODO

## 1. 修复 Bug — 语言下拉框
- 语言选择 BottomSheet 点击选项后不生效 / 样式错位
- 需排查 `handleLanguageChange` 绑定和 `showLangSheet` 关闭时序

## 2. 设计 macOS 菜单栏图标弹出框
- 点击菜单栏图标时弹出简化版主页面（仅显示 TOTP 码，无设置入口）
- 弹出框样式参考 1Password / Bartender 的 Panel 风格
- 要求：小巧、圆角、跟随菜单栏定位

## 3. 深色模式
- 全局 CSS 变量支持 light / dark 主题切换
- 跟随系统外观设置（`prefers-color-scheme`）
- 所有组件（Setup、Unlock、Home、Settings、弹窗）适配暗色

## 4. 应用名称与图标设计
- 确定最终 App 名称（目前 OpenOTP）
- 设计应用图标（icns / ico / png 多尺寸）
- 菜单栏图标需单色模板图标适配 macOS 明暗菜单栏

## 5. 网站图标 — 自定义图片 + 预设图标库
- 编辑弹窗支持上传自定义图片作为账户图标
- 预设常用网站图标库（Google、GitHub、Microsoft、Apple 等）
- 图标模块（`icons.ts`）的 `IconProvider` 扩展口已预留，实现 `preset` 和 `image` provider

## 6. 设置模块样式与交互优化
- 统一设置页视觉风格（间距、圆角、字体层级）
- 各设置项交互一致性（按钮 / 开关 / 选择器）
- 导入导出 BottomSheet 过渡动画优化
- 弹窗动画统一

## 7. 解锁页样式优化
- Unlock 页面整体视觉升级
- PinInput 焦点态动画
- 错误提示动画（抖动？）
- 生物认证按钮样式优化
  - 密码提示展示方式优化

## 8. 梳理全局通用组件，抽象成单独模块
- 盘点所有可复用组件：`BottomSheet`、`PinInput`、`EmojiPicker`、`GlobalToast`、`DeleteConfirm`
- 统一导出入口 `src/components/index.ts`
- 确保各组件 props / emits 命名一致
- 补全组件缺少的 TypeScript 类型导出
- 可考虑按功能分子目录：`components/ui/`（通用）、`components/account/`（业务）
