import { watch, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores'

let mediaQuery: MediaQueryList | null = null

function applyTheme(theme: 'light' | 'dark' | 'auto') {
  if (theme === 'auto') {
    const isDark = mediaQuery?.matches ?? false
    document.documentElement.dataset.theme = isDark ? 'dark' : ''
  } else {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : ''
  }
}

function onSystemThemeChange(e: MediaQueryListEvent) {
  const settingsStore = useSettingsStore()
  if (settingsStore.settings.theme === 'auto') {
    document.documentElement.dataset.theme = e.matches ? 'dark' : ''
  }
}

export function useTheme() {
  const settingsStore = useSettingsStore()

  onMounted(() => {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', onSystemThemeChange)
    applyTheme(settingsStore.settings.theme)
  })

  onUnmounted(() => {
    mediaQuery?.removeEventListener('change', onSystemThemeChange)
  })

  watch(() => settingsStore.settings.theme, (newTheme) => {
    applyTheme(newTheme)
  })

  function setTheme(theme: 'light' | 'dark' | 'auto') {
    settingsStore.updateSettings({ theme })
    settingsStore.saveSettings()
  }

  return { setTheme }
}
