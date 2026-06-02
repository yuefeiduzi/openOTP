<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores'
import GlobalToast from '@/components/GlobalToast.vue'

const settingsStore = useSettingsStore()
let hiddenTime: number | null = null

function handleVisibilityChange() {
  if (document.hidden) {
    hiddenTime = Date.now()
  } else if (hiddenTime && settingsStore.isSetup) {
    const elapsedMinutes = (Date.now() - hiddenTime) / 60000
    if (elapsedMinutes >= settingsStore.settings.lockTimeout) {
      settingsStore.lock()
    }
    hiddenTime = null
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
