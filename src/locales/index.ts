import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

function getSystemLocale(): 'zh-CN' | 'en-US' {
  const systemLang = navigator.language || 'zh-CN'
  return systemLang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

function getInitialLocale(): 'zh-CN' | 'en-US' {
  const saved = localStorage.getItem('locale')
  
  if (!saved || saved === 'auto') {
    return getSystemLocale()
  }
  
  return saved as 'zh-CN' | 'en-US'
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

export function setLocale(locale: 'auto' | 'zh-CN' | 'en-US'): void {
  if (locale === 'auto') {
    const systemLocale = getSystemLocale()
    i18n.global.locale.value = systemLocale
  } else {
    i18n.global.locale.value = locale
  }
  
  localStorage.setItem('locale', locale)
}

export function getCurrentLocale(): string {
  return i18n.global.locale.value
}

export function getSavedLocalePreference(): 'auto' | 'zh-CN' | 'en-US' {
  return (localStorage.getItem('locale') as 'auto' | 'zh-CN' | 'en-US') || 'auto'
}

export default i18n