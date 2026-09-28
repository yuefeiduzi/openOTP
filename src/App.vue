<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useRouter } from 'vue-router'
import { useAccountStore, useSettingsStore } from '@/stores'
import { useTheme } from '@/composables/useTheme'
import GlobalToast from '@/components/GlobalToast.vue'

useTheme()

const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
const router = useRouter()
let hiddenTime: number | null = null

function handleVisibilityChange() {
  if (document.hidden) {
    hiddenTime = Date.now()
  } else {
    if (hiddenTime && settingsStore.isSetup) {
      const elapsedMinutes = (Date.now() - hiddenTime) / 60000
      if (elapsedMinutes >= settingsStore.settings.lockTimeout) {
        settingsStore.lock()
      }
      hiddenTime = null
    }

    // Accounts may have been added, edited or removed from the menu bar
    // popover, which is a separate webview with its own store.
    accountStore.loadAccounts()
  }
}

// The tray menu lives in its own window, so opening 偏好设置 shows the main window
// and asks it to switch route through this event.
let unlistenNavigate: UnlistenFn | null = null

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)

  listen<string>('navigate', (event) => {
    router.push(event.payload)
  })
    .then((unlisten) => {
      unlistenNavigate = unlisten
    })
    // Outside Tauri (unit tests, plain browser) there is nothing to listen to.
    .catch(() => {})
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  unlistenNavigate?.()
})
</script>

<template>
  <div class="app">
    <router-view />
    <GlobalToast />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100%;
}
</style>
