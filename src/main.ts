import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './locales'
import './style.css'
import './theme.css'
import App from './App.vue'
import { useSettingsStore } from './stores'
import { useAccountStore } from './stores'
import { currentWindowLabel } from './utils/windowMode'
import { suppressNativeContextMenu } from './utils/contextMenu'
import { syncSettingsOnChange } from './utils/settingsSync'

/**
 * The menu bar popover is a borderless, transparent window, and that has to
 * hold for every route it renders — including the unlock screen it shows while
 * the app is locked. Marking the document per window rather than per view keeps
 * that true.
 */
const label = currentWindowLabel()
if (label === 'popover') {
  document.documentElement.classList.add('popover-window')
  // 弹窗只用来读码：右键不该弹出 webview 自带的菜单（带锁时它显示的是解锁页）。
  // 主窗口不抑制：账号卡片自己画删除菜单，卡片以外保持默认。
  suppressNativeContextMenu()
}
// Same treatment, tighter inset: the tray's secondary-click menu is also a
// transparent window whose #app element draws the panel.
if (label === 'tray-menu') {
  document.documentElement.classList.add('tray-menu-window')
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)

const settingsStore = useSettingsStore()
settingsStore.checkSetup().then(() => {
  settingsStore.loadSettings()
  void syncSettingsOnChange(() => settingsStore.loadSettings())
})

app.mount('#app')

const accountStore = useAccountStore()
accountStore.loadAccounts()
