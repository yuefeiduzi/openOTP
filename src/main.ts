import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './locales'
import './style.css'
import './theme.css'
import App from './App.vue'
import { useSettingsStore } from './stores'
import { useAccountStore } from './stores'

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
