/**
 * 弹窗窗口不该出现 webview 自带的右键菜单（重新载入 / 检查元素）：菜单栏 popover
 * 只用来读码，右键不该有任何反应。
 *
 * 主窗口不调用它：那里账号卡片自己画一层删除菜单，卡片以外保持默认。
 */
export function suppressNativeContextMenu(): void {
  document.addEventListener('contextmenu', event => event.preventDefault())
}