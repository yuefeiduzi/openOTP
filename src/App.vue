<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAccountStore, useSettingsStore } from '@/stores'
import { useTheme } from '@/composables/useTheme'
import GlobalToast from '@/components/GlobalToast.vue'

useTheme()

const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
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

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
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
