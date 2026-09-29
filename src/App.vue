<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useAccountStore, useSettingsStore } from '@/stores'
import { useTheme } from '@/composables/useTheme'
import { normalizeLocale, setLocale } from '@/locales'
import GlobalToast from '@/components/GlobalToast.vue'

useTheme()

const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
let hiddenTime: number | null = null

// The popover and the tray menu are separate webviews that are only shown and
// hidden, so they would otherwise keep the language they were created in. The
// settings broadcast reloads this store and the watcher switches the strings.
watch(
  () => settingsStore.settings.language,
  (language) => setLocale(normalizeLocale(language)),
  { immediate: true },
)

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
