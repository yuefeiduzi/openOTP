import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

export type Locale = 'zh-CN' | 'en-US'

/** The app's own language is Chinese; English is opt-in. */
export const DEFAULT_LOCALE: Locale = 'zh-CN'

/**
 * Narrows a stored preference to a language the app has strings for. Historical
 * values ("auto", or anything hand-edited) mean the default.
 */
export function normalizeLocale(value: unknown): Locale {
  return value === 'en-US' ? 'en-US' : DEFAULT_LOCALE
}

/**
 * Cache of the saved language, kept next to the settings file so the first
 * render — which happens before the settings are loaded — is already in the
 * right language instead of flashing the default one.
 */
function getInitialLocale(): Locale {
  try {
    return normalizeLocale(localStorage.getItem('locale'))
  } catch {
    // No storage (a plain browser without it, a test environment, hardened
    // webview profiles): start on the default and let the saved settings say.
    return DEFAULT_LOCALE
  }
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem('locale', locale)
  } catch {
    // The cache is an optimisation; the settings file is the real record.
  }
}

export default i18n