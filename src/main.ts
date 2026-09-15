import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { getCurrentWindow } from '@tauri-apps/api/window'
import router from './router'
import i18n from './locales'
import './style.css'
import './theme.css'
import App from './App.vue'
import { useSettingsStore } from './stores'
import { useAccountStore } from './stores'

/**
 * The menu bar popover is a borderless, transparent window, and that has to
 * hold for every route it renders — including the unlock screen it shows while
 * the app is locked. Marking the document per window rather than per view keeps
 * that true.
 */
try {
  if (getCurrentWindow().label === 'popover') {
    document.documentElement.classList.add('popover-window')
  }
} catch {
  // Running outside Tauri (unit tests, plain browser): nothing to mark.
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)

const settingsStore = useSettingsStore()
settingsStore.checkSetup().then(() => {
  settingsStore.loadSettings()
})

app.mount('#app')

const accountStore = useAccountStore()
accountStore.loadAccounts()
