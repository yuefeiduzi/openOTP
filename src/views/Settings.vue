<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs'
import { useSettingsStore, useAccountStore } from '@/stores'
import type { AppSettings } from '@/types'
import { exportBackup, inspectBackup, importBackup, MIN_BACKUP_PASSWORD_LENGTH } from '@/utils/backup'
import { copyToClipboard } from '@/utils/clipboard'
import { importAndOTPBackup } from '@/utils/andotp'
import { setLocale, getSavedLocalePreference } from '@/locales'
import PinInput from '@/components/PinInput.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import { enableDebugLog, disableDebugLog, isDebugEnabled, exportLogsText } from '@/utils/debug'
import { useToast } from '@/composables/useToast'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
const { t } = useI18n()
const { show: showToast } = useToast()
const { setTheme } = useTheme()

const REPOSITORY_URL = 'https://github.com/yuefeiduzi/openOTP'

const languagePreference = ref<'auto' | 'zh-CN' | 'en-US'>('auto')

const themePreference = ref<'light' | 'dark' | 'auto'>('auto')
const showThemeSheet = ref(false)

const showPasswordModal = ref(false)
const passwordStep = ref<'verify' | 'change'>('verify')
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const passwordError = ref('')
const passwordHash = ref('')

const showSetPasswordModal = ref(false)
const setNewPassword = ref('')
const setConfirmPassword = ref('')
const setPasswordHint = ref('')
const setEnableBiometric = ref(true)
const setPasswordError = ref('')

const showHintModal = ref(false)
const hintValue = ref('')

const biometricAvailable = ref(false)
const isDesktop = ref(false)
const biometricType = ref('')

const showExportSheet = ref(false)
const exportMode = ref<'encrypted' | 'none'>('encrypted')
const showExportPasswordModal = ref(false)
const exportPassword = ref('')
const exportPasswordError = ref('')

const showLangSheet = ref(false)

const showClipboardSheet = ref(false)
const showLockSheet = ref(false)

const showImportPasswordModal = ref(false)
const importFilePath = ref('')
const importPassword = ref('')
const importPasswordError = ref('')

const biometricLabel = computed(() => {
  const labels: Record<string, string> = {
    touchid: t('biometric.touchid'),
    faceid: t('biometric.faceid'),
    fingerprint: t('biometric.fingerprint'),
    face: t('biometric.face')
  }
  return labels[biometricType.value] || t('biometric.default')
})

onMounted(async () => {
  languagePreference.value = getSavedLocalePreference()
  themePreference.value = settingsStore.settings.theme

  try {
    const settings = await invoke<AppSettings>('get_settings')
    settingsStore.updateSettings(settings)
    themePreference.value = settings.theme
  } catch {
  }

  try {
    isDesktop.value = await invoke<boolean>('is_desktop')
  } catch {
    isDesktop.value = false
  }

  try {
    biometricAvailable.value = await invoke<boolean>('check_biometric')
    if (biometricAvailable.value) {
      biometricType.value = await invoke<string>('get_biometric_type')
    }
  } catch {
    biometricAvailable.value = false
  }
})



function handleLanguageChange(value: 'auto' | 'zh-CN' | 'en-US') {
  languagePreference.value = value
  setLocale(value)
  settingsStore.updateSettings({ language: value })
  settingsStore.saveSettings()
}

function handleThemeChange(value: 'light' | 'dark' | 'auto') {
  themePreference.value = value
  setTheme(value)
}

function openHintModal() {
  hintValue.value = settingsStore.settings.passwordHint
  showHintModal.value = true
}

function closeHintModal() {
  showHintModal.value = false
}

function saveHint() {
  if (hintValue.value.length > 50) {
    hintValue.value = hintValue.value.slice(0, 50)
  }
  settingsStore.settings.passwordHint = hintValue.value
  showHintModal.value = false
  settingsStore.saveSettings()
  showToast(t('settings.hintSaved'))
}

function handleHintKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') saveHint()
  else if (e.key === 'Escape') closeHintModal()
}

function openChangePassword() {
  showPasswordModal.value = true
  passwordStep.value = 'verify'
  currentPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  passwordError.value = ''
}

function closePasswordModal() {
  showPasswordModal.value = false
}

async function verifyCurrentPassword() {
  passwordError.value = ''

  if (currentPassword.value.length !== 6) {
    passwordError.value = t('errors.changePasswordVerify')
    return
  }

  try {
    passwordHash.value = await invoke<string>('load_password_hash')
    const valid = await invoke<boolean>('verify_password_cmd', {
      password: currentPassword.value,
      hash: passwordHash.value
    })

    if (valid) {
      if (settingsStore.settings.biometricEnabled && biometricAvailable.value) {
        try {
          const bioSuccess = await invoke<boolean>('biometric_auth', { reason: t('biometric.changePassword') })
          if (!bioSuccess) {
            passwordError.value = t('errors.biometricFailed')
            return
          }
        } catch (e) {
          const err = e as { type: string }
          if (err.type === 'UserCancelled') {
            passwordError.value = t('errors.biometricRequired')
          } else {
            passwordError.value = t('errors.biometricFailed')
          }
          return
        }
      }
      passwordStep.value = 'change'
    } else {
      passwordError.value = t('errors.passwordVerifyFailed')
    }
  } catch {
    passwordError.value = t('errors.verifyFailed')
  }
}

async function submitNewPassword() {
  passwordError.value = ''

  if (newPassword.value.length !== 6) {
    passwordError.value = t('errors.passwordLength')
    return
  }

  if (newPassword.value !== confirmNewPassword.value) {
    passwordError.value = t('errors.changePasswordMismatch')
    return
  }

  try {
    const hash = await invoke<string>('hash_password_cmd', { password: newPassword.value })
    await invoke('save_password_hash', { hash })
    closePasswordModal()
    showToast(t('errors.changePasswordSuccess'))
  } catch {
    passwordError.value = t('errors.changePasswordFailed')
  }
}

function openSetPassword() {
  setNewPassword.value = ''
  setConfirmPassword.value = ''
  setPasswordHint.value = settingsStore.settings.passwordHint
  setEnableBiometric.value = biometricAvailable.value
  setPasswordError.value = ''
  showSetPasswordModal.value = true
}

function closeSetPasswordModal() {
  showSetPasswordModal.value = false
}

async function submitSetPassword() {
  setPasswordError.value = ''

  if (setNewPassword.value.length !== 6) {
    setPasswordError.value = t('errors.passwordLength')
    return
  }
  if (setNewPassword.value !== setConfirmPassword.value) {
    setPasswordError.value = t('errors.passwordMismatch')
    return
  }

  try {
    if (setEnableBiometric.value && biometricAvailable.value) {
      const success = await invoke<boolean>('biometric_auth', { reason: t('biometric.setup') })
      if (!success) {
        setPasswordError.value = t('errors.biometricFailed')
        return
      }
    }

    settingsStore.updateSettings({
      passwordHint: setPasswordHint.value,
      biometricEnabled: setEnableBiometric.value
    })
    await settingsStore.savePassword(setNewPassword.value)
    await settingsStore.saveSettings()
    closeSetPasswordModal()
    showToast(t('errors.changePasswordSuccess'))
  } catch {
    setPasswordError.value = t('errors.changePasswordFailed')
  }
}

function openExportSheet() {
  exportMode.value = 'encrypted'
  showExportSheet.value = true
}

async function handleExportConfirm() {
  if (exportMode.value === 'encrypted') {
    showExportSheet.value = false
    exportPassword.value = ''
    exportPasswordError.value = ''
    showExportPasswordModal.value = true
    return
  }

  showExportSheet.value = false
  await new Promise(r => setTimeout(r, 350))
  await doExport(null)
}

async function doExport(password: string | null) {
  try {
    const filePath = await save({
      title: t('settings.exportBackup'),
      defaultPath: 'openotp-backup.zip',
      filters: [{ name: 'OpenOTP Backup', extensions: ['zip'] }],
    })

    if (!filePath) return

    await exportBackup(filePath, accountStore.accounts, password)
    showToast(t('settings.exportSuccess', { path: filePath }))
  } catch (err) {
    showToast(t('errors.exportFailed', { error: String(err) }), true)
  }
}

async function handleExportPasswordConfirm() {
  exportPasswordError.value = ''

  if (exportPassword.value.length < MIN_BACKUP_PASSWORD_LENGTH) {
    exportPasswordError.value = t('errors.backupPasswordTooShort', {
      min: MIN_BACKUP_PASSWORD_LENGTH,
    })
    return
  }

  showExportPasswordModal.value = false
  await doExport(exportPassword.value)
}

async function handleImportBackup() {
  try {
    const filePath = await open({
      filters: [{ name: 'OpenOTP Backup', extensions: ['zip', 'openotp'] }],
      multiple: false,
    })

    if (!filePath) return

    const manifest = await inspectBackup(filePath)

    // Unencrypted backups need no password.
    if (!manifest.encrypted) {
      await applyImport(filePath, null)
      return
    }

    importFilePath.value = filePath
    importPassword.value = ''
    importPasswordError.value = ''
    showImportPasswordModal.value = true
  } catch (err) {
    showToast(t('errors.importFailed', { error: String(err) }), true)
  }
}

async function applyImport(filePath: string, password: string | null) {
  const { manifest, accounts } = await importBackup(filePath, password)

  accountStore.importAccounts(accounts)

  showImportPasswordModal.value = false
  showToast(t('errors.importSuccess', { count: manifest.accountCount }))
}

async function handleImportPasswordConfirm() {
  importPasswordError.value = ''

  if (!importPassword.value) {
    importPasswordError.value = t('errors.backupPasswordRequired')
    return
  }

  try {
    await applyImport(importFilePath.value, importPassword.value)
  } catch (err) {
    importPasswordError.value = t('errors.passwordError')
    showToast(t('errors.importFailed', { error: String(err) }), true)
  }
}

async function importAndOTPAccounts() {
  try {
    const filePath = await open({
      filters: [{ name: 'andOTP Backup', extensions: ['json'] }],
      multiple: false,
    })

    if (!filePath) return

    const fileContent = await readTextFile(filePath)
    const { accounts, skipped } = importAndOTPBackup(fileContent)

    accountStore.importAccounts(accounts)

    showToast(
      skipped > 0
        ? t('errors.andOTPImportPartial', { count: accounts.length, skipped })
        : t('errors.andOTPImportSuccess', { count: accounts.length }),
      skipped > 0,
    )
  } catch (err) {
    showToast(t('errors.andOTPImportFailed', { error: String(err) }), true)
  }
}

async function copyGithubLink() {
  const copied = await copyToClipboard(REPOSITORY_URL)
  showToast(copied ? t('settings.linkCopied') : t('errors.copyFailed'), !copied)
}

function handleMenuBarOnlyToggle(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateSettings({ menuBarOnly: enabled })
  settingsStore.saveSettings()
  invoke('set_menu_bar_only', { enabled })
}

const CLIPBOARD_OPTIONS = [
  { value: 30, label: 'settings.clipboard30s' },
  { value: 60, label: 'settings.clipboard60s' },
  { value: 0, label: 'settings.clipboardNever' },
] as const

const clipboardClearLabel = computed(() => {
  const current = settingsStore.settings.clipboardClearTime
  const option = CLIPBOARD_OPTIONS.find(o => o.value === current)
  return option ? t(option.label) : t('settings.clipboardNever')
})

function handleAutoCopyToggle(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateSettings({ autoCopy: enabled })
  settingsStore.saveSettings()
}

const LOCK_OPTIONS = [
  { value: 0, label: 'settings.lockImmediate' },
  { value: 1, label: 'settings.lock1min' },
  { value: 5, label: 'settings.lock5min' },
] as const

const lockTimeoutLabel = computed(() => {
  const current = settingsStore.settings.lockTimeout
  const option = LOCK_OPTIONS.find(o => o.value === current)
  return option ? t(option.label) : t('settings.lockImmediate')
})

function handleLockTimeoutChange(minutes: number) {
  settingsStore.updateSettings({ lockTimeout: minutes })
  settingsStore.saveSettings()
  showLockSheet.value = false
}

function lockApp() {
  settingsStore.lock()
  router.push('/unlock')
}

// macOS keeps no tray menu (see lib.rs), so App mode needs its own way to quit.
function quitApp() {
  invoke('quit_app')
}

function handleClipboardClearChange(seconds: number) {
  settingsStore.updateSettings({ clipboardClearTime: seconds })
  settingsStore.saveSettings()
  showClipboardSheet.value = false
}

function handleBiometricToggle(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateSettings({ biometricEnabled: enabled })
  settingsStore.saveSettings()
}

function goBack() {
  router.back()
}

const debugEnabled = ref(isDebugEnabled())

function toggleDebug() {
  if (isDebugEnabled()) {
    disableDebugLog()
    debugEnabled.value = false
    showToast(t('settings.debugDisabled'))
  } else {
    enableDebugLog()
    debugEnabled.value = true
    showToast(t('settings.debugEnabled'))
  }
}

async function exportDebugLogs() {
  try {
    const filePath = await save({
      title: t('settings.exportLogs'),
      defaultPath: 'openotp-debug.log',
      filters: [{ name: 'Log File', extensions: ['log', 'txt'] }],
    })
    if (!filePath) return
    const text = exportLogsText()
    const encoder = new TextEncoder()
    await writeFile(filePath, encoder.encode(text))
    showToast(t('settings.logExported', { path: filePath }))
  } catch (err) {
    showToast(t('errors.exportFailed', { error: String(err) }), true)
  }
}
</script>

<template>
  <div class="settings">
    <header class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>{{ t('settings.title') }}</h1>
    </header>

    <div class="content">
      <section class="section">
        <h2 class="section-title">{{ t('settings.languageSettings') }}</h2>
        <div class="setting-item setting-action">
          <button class="setting-btn" @click="showLangSheet = true">
            {{ languagePreference === 'auto' ? t('settings.languageAuto') : languagePreference === 'zh-CN' ? t('settings.languageZhCN') : t('settings.languageEnUS') }}
            <span class="btn-arrow">›</span>
          </button>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <h2 class="section-title">{{ t('settings.appearanceSettings') }}</h2>
        <div class="setting-item setting-action">
          <button class="setting-btn" @click="showThemeSheet = true">
            {{ themePreference === 'auto' ? t('settings.themeAuto') : themePreference === 'light' ? t('settings.themeLight') : t('settings.themeDark') }}
            <span class="btn-arrow">›</span>
          </button>
        </div>

        <div v-if="isDesktop" class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.menuBarOnly') }}</span>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                :checked="settingsStore.settings.menuBarOnly"
                @change="handleMenuBarOnlyToggle"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <h2 class="section-title">{{ t('settings.dataManagement') }}</h2>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="openExportSheet">{{ t('settings.exportBackup') }}</button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="handleImportBackup">{{ t('settings.importBackup') }}</button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="importAndOTPAccounts">{{ t('settings.importAndOTP') }}</button>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <h2 class="section-title">{{ t('settings.securitySettings') }}</h2>

        <div class="setting-item setting-action">
          <button
            v-if="!settingsStore.hasPassword"
            class="setting-btn"
            @click="openSetPassword"
          >
            {{ t('settings.setPassword') }}
          </button>
          <button
            v-else
            class="setting-btn"
            @click="openChangePassword"
          >
            {{ t('settings.changePassword') }}
          </button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="openHintModal">
            {{ t('settings.passwordHint') }}<span v-if="settingsStore.settings.passwordHint" class="setting-hint-val">{{ settingsStore.settings.passwordHint }}</span>
            <span v-else class="setting-hint-empty">{{ t('settings.clickToSet') }}</span>
          </button>
        </div>

        <div v-if="biometricAvailable" class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.biometricUnlock') }}</span>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                :checked="settingsStore.settings.biometricEnabled"
                @change="handleBiometricToggle"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.autoCopy') }}</span>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                :checked="settingsStore.settings.autoCopy"
                @change="handleAutoCopyToggle"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="showClipboardSheet = true">
            {{ t('settings.clipboardClearTime') }}
            <span class="setting-hint-val">{{ clipboardClearLabel }}</span>
          </button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="showLockSheet = true">
            {{ t('settings.lockTimeout') }}
            <span class="setting-hint-val">{{ lockTimeoutLabel }}</span>
          </button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="lockApp">{{ t('settings.lockApp') }}</button>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section about-section">
        <h2 class="section-title">{{ t('settings.about') }}</h2>
        <p class="about-line">{{ t('settings.version') }}</p>
        <p class="about-line about-copy" @click="copyGithubLink()">
          {{ t('settings.sourceCode') }}<span class="about-url">github.com/yuefeiduzi/openOTP</span>
        </p>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="quitApp">{{ t('settings.quit') }}</button>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <h2 class="section-title">{{ t('settings.debugMode') }}</h2>

        <div class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.debugMode') }}</span>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" :checked="debugEnabled" @change="toggleDebug" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div v-if="debugEnabled" class="setting-item setting-action">
          <button class="setting-btn" @click="exportDebugLogs">
            {{ t('settings.exportLogs') }}
          </button>
        </div>
      </section>
    </div>

    <BottomSheet
      :visible="showLockSheet"
      :title="t('settings.lockTimeout')"
      hide-actions
      @close="showLockSheet = false"
    >
      <div class="lang-options">
        <button
          v-for="opt in LOCK_OPTIONS"
          :key="opt.value"
          class="lang-option"
          :class="{ active: settingsStore.settings.lockTimeout === opt.value }"
          @click="handleLockTimeoutChange(opt.value)"
        >
          {{ t(opt.label) }}
          <span v-if="settingsStore.settings.lockTimeout === opt.value" class="lang-check">✓</span>
        </button>
      </div>
    </BottomSheet>

    <BottomSheet
      :visible="showClipboardSheet"
      :title="t('settings.clipboardClearTime')"
      hide-actions
      @close="showClipboardSheet = false"
    >
      <div class="lang-options">
        <button
          v-for="opt in CLIPBOARD_OPTIONS"
          :key="opt.value"
          class="lang-option"
          :class="{ active: settingsStore.settings.clipboardClearTime === opt.value }"
          @click="handleClipboardClearChange(opt.value)"
        >
          {{ t(opt.label) }}
          <span v-if="settingsStore.settings.clipboardClearTime === opt.value" class="lang-check">✓</span>
        </button>
      </div>
    </BottomSheet>

    <BottomSheet
      :visible="showLangSheet"
      :title="t('settings.language')"
      hide-actions
      @close="showLangSheet = false"
    >
      <div class="lang-options">
        <button
          v-for="opt in [{ value: 'auto', label: t('settings.languageAuto') }, { value: 'zh-CN', label: t('settings.languageZhCN') }, { value: 'en-US', label: t('settings.languageEnUS') }]"
          :key="opt.value"
          class="lang-option"
          :class="{ active: languagePreference === opt.value }"
          @click="handleLanguageChange(opt.value as 'auto' | 'zh-CN' | 'en-US'); showLangSheet = false"
        >
          {{ opt.label }}
          <span v-if="languagePreference === opt.value" class="lang-check">✓</span>
        </button>
      </div>
    </BottomSheet>

    <BottomSheet
      :visible="showThemeSheet"
      :title="t('settings.theme')"
      hide-actions
      @close="showThemeSheet = false"
    >
      <div class="lang-options">
        <button
          v-for="opt in [{ value: 'auto', label: t('settings.themeAuto') }, { value: 'light', label: t('settings.themeLight') }, { value: 'dark', label: t('settings.themeDark') }]"
          :key="opt.value"
          class="lang-option"
          :class="{ active: themePreference === opt.value }"
          @click="handleThemeChange(opt.value as 'light' | 'dark' | 'auto'); showThemeSheet = false"
        >
          {{ opt.label }}
          <span v-if="themePreference === opt.value" class="lang-check">✓</span>
        </button>
      </div>
    </BottomSheet>

    <BottomSheet
      :visible="showExportSheet"
      :title="t('settings.exportBackup')"
      :confirm-text="t('settings.startExport')"
      :cancel-text="t('common.cancel')"
      @close="showExportSheet = false"
      @confirm="handleExportConfirm"
    >
      <div class="export-options">
        <label class="radio-item" :class="{ active: exportMode === 'encrypted' }">
          <input v-model="exportMode" type="radio" value="encrypted" />
          <span>{{ t('settings.exportEncrypted') }}</span>
        </label>
        <label class="radio-item" :class="{ active: exportMode === 'none' }">
          <input v-model="exportMode" type="radio" value="none" />
          <span>{{ t('settings.exportNoPassword') }}</span>
        </label>
        <p v-if="exportMode === 'none'" class="export-warning">
          {{ t('settings.exportNoPasswordWarning') }}
        </p>
      </div>
    </BottomSheet>

    <div v-if="showExportPasswordModal" class="modal-overlay" @click.self="showExportPasswordModal = false">
      <div class="modal">
        <h3 class="modal-title">{{ t('settings.setExportPassword') }}</h3>
        <div class="form-group">
          <label>{{ t('settings.backupPassword') }}</label>
          <input
            v-model="exportPassword"
            type="password"
            class="input"
            :placeholder="t('settings.backupPasswordHint', { min: MIN_BACKUP_PASSWORD_LENGTH })"
          />
        </div>
        <p class="form-note">{{ t('settings.backupPasswordNote') }}</p>
        <p v-if="exportPasswordError" class="form-error">{{ exportPasswordError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showExportPasswordModal = false">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" @click="handleExportPasswordConfirm">{{ t('settings.startExport') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showImportPasswordModal" class="modal-overlay" @click.self="showImportPasswordModal = false">
      <div class="modal">
        <h3 class="modal-title">{{ t('settings.importBackup') }}</h3>
        <div class="form-group">
          <label>{{ t('settings.backupPassword') }}</label>
          <input v-model="importPassword" type="password" class="input" />
        </div>
        <p v-if="importPasswordError" class="form-error">{{ importPasswordError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showImportPasswordModal = false">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" @click="handleImportPasswordConfirm">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal">
      <div class="modal">
        <h3 class="modal-title">{{ t('settings.changePassword') }}</h3>

        <template v-if="passwordStep === 'verify'">
          <div class="form-group">
            <label>{{ t('unlock.enterPassword') }}</label>
            <PinInput v-model="currentPassword" />
          </div>
          <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closePasswordModal">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="verifyCurrentPassword">{{ t('common.confirm') }}</button>
          </div>
        </template>

        <template v-if="passwordStep === 'change'">
          <div class="form-group">
            <label>{{ t('setup.masterPassword') }}</label>
            <PinInput v-model="newPassword" />
          </div>
          <div class="form-group">
            <label>{{ t('setup.confirmPassword') }}</label>
            <PinInput v-model="confirmNewPassword" />
          </div>
          <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closePasswordModal">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="submitNewPassword">{{ t('common.save') }}</button>
          </div>
        </template>
      </div>
    </div>

    <div v-if="showSetPasswordModal" class="modal-overlay" @click.self="closeSetPasswordModal">
      <div class="modal">
        <h3 class="modal-title">{{ t('settings.setPassword') }}</h3>
        <div class="form-group">
          <label>{{ t('setup.masterPassword') }}</label>
          <PinInput v-model="setNewPassword" />
        </div>
        <div class="form-group">
          <label>{{ t('setup.confirmPassword') }}</label>
          <PinInput v-model="setConfirmPassword" />
        </div>
        <div class="form-group">
          <label>{{ t('setup.passwordHint') }}</label>
          <input
            v-model="setPasswordHint"
            type="text"
            maxlength="50"
            :placeholder="t('setup.hintPlaceholder')"
            class="form-input"
          />
        </div>
        <div v-if="biometricAvailable" class="form-group checkbox">
          <label>
            <input v-model="setEnableBiometric" type="checkbox" />
            {{ t('setup.enableBiometric', { biometric: biometricLabel }) }}
          </label>
        </div>
        <p v-if="setPasswordError" class="form-error">{{ setPasswordError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeSetPasswordModal">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" @click="submitSetPassword">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showHintModal" class="modal-overlay" @click.self="closeHintModal">
      <div class="modal">
        <h3 class="modal-title">{{ t('settings.passwordHint') }}</h3>

        <div v-if="settingsStore.settings.passwordHint" class="hint-current">
          <span class="hint-current-label">{{ t('settings.hintCurrent') }}</span>
          <span class="hint-current-text">{{ settingsStore.settings.passwordHint }}</span>
        </div>

        <div class="form-group">
          <input
            v-model="hintValue"
            type="text"
            maxlength="50"
            class="form-input"
            :placeholder="t('setup.hintPlaceholder')"
            @keydown="handleHintKeydown"
            autofocus
          />
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeHintModal">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" @click="saveHint">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  display: flex;
  align-items: center;
  padding: 16px;
  padding-bottom: 0;
}

.back-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  margin-right: 12px;
  color: var(--text-primary);
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 12px 0;
}

.divider {
  height: 1px;
  background: var(--border-color);
  margin: 8px 0 16px 0;
}

.setting-item {
  padding: 4px 0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.setting-action {
  padding: 6px 0;
}

.setting-label {
  font-size: 15px;
  color: var(--text-primary);
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-btn {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;
  transition: border-color 0.2s, background 0.2s;
  display: flex;
  align-items: center;
}

.setting-btn:hover {
  border-color: var(--accent);
  background: var(--bg-secondary);
}

.btn-arrow {
  margin-left: auto;
  font-size: 18px;
  color: var(--text-secondary);
}

.setting-hint-val {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-hint-empty {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--toggle-track-off);
  border-radius: 24px;
  transition: background-color 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--accent);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.status-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.export-warning {
  margin: 4px 14px 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--progress-red);
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 15px;
  color: var(--text-primary);
}

.radio-item:hover {
  background: var(--bg-secondary);
}

.radio-item.active {
  background: rgba(74, 144, 217, 0.1);
}

.radio-item input[type="radio"] {
  accent-color: var(--accent);
  width: 18px;
  height: 18px;
}

.lang-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lang-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  border: none;
  background: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-primary);
  transition: background 0.2s;
  width: 100%;
}

.lang-option:hover {
  background: var(--bg-secondary);
}

.lang-option.active {
  background: rgba(74, 144, 217, 0.1);
  color: var(--accent);
}

.lang-check {
  font-size: 16px;
  color: var(--accent);
}

.about-section {
  padding-bottom: 24px;
}

.about-line {
  margin: 4px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.about-url {
  margin-left: 6px;
  color: var(--accent);
}

.about-copy {
  color: var(--btn-secondary-text);
  cursor: pointer;
  user-select: all;
}

.about-copy:hover {
  color: var(--accent);
}

.hint-current {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 12px;
}

.hint-current-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.hint-current-text {
  font-size: 14px;
  color: var(--text-primary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: 24px;
}

.modal {
  background: var(--card-bg);
  color: var(--text-primary);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  text-align: center;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: var(--btn-secondary-text);
  margin-bottom: 8px;
  text-align: left;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 16px;
  box-sizing: border-box;
  outline: none;
  background: var(--card-bg);
  color: var(--text-primary);
}

.form-input:focus {
  border-color: var(--accent);
}

.form-error {
  color: var(--progress-red);
  font-size: 13px;
  margin: 8px 0;
}

.form-note {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  margin: 8px 0 0;
}

.form-success {
  color: var(--progress-green);
  font-size: 13px;
  margin: 8px 0;
}

.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.btn-secondary {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  opacity: 0.85;
}
</style>
