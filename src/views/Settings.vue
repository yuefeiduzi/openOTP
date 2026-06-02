<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeFile } from '@tauri-apps/plugin-fs'
import { useSettingsStore, useAccountStore } from '@/stores'
import { createBackup, restoreBackup } from '@/utils/backup'
import { importAndOTPBackup } from '@/utils/andotp'
import { setLocale, getSavedLocalePreference } from '@/locales'
import PinInput from '@/components/PinInput.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import { enableDebugLog, disableDebugLog, isDebugEnabled, exportLogsText } from '@/utils/debug'

const router = useRouter()
const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
const { t } = useI18n()

const languagePreference = ref<'auto' | 'zh-CN' | 'en-US'>('auto')

const showPasswordModal = ref(false)
const passwordStep = ref<'verify' | 'change'>('verify')
const passwordModalPurpose = ref<'change' | 'export'>('change')
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')
const passwordHash = ref('')

const showSetPasswordModal = ref(false)
const setNewPassword = ref('')
const setConfirmPassword = ref('')
const setPasswordHint = ref('')
const setEnableBiometric = ref(true)
const setPasswordError = ref('')
const setPasswordSuccess = ref('')

const showHintModal = ref(false)
const hintValue = ref('')

const biometricAvailable = ref(false)
const biometricType = ref('')

const showExportSheet = ref(false)
const exportMode = ref<'none' | 'custom' | 'app'>('none')
const showExportPasswordModal = ref(false)
const exportCustomPassword = ref('')
const exportConfirmPassword = ref('')
const exportPasswordError = ref('')

const showLangSheet = ref(false)

const showImportPasswordModal = ref(false)
const importFilePath = ref('')
const importFileContent = ref('')
const importPassword = ref('')
const importPasswordError = ref('')

const toastMessage = ref('')
const toastError = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, isError = false) {
  toastMessage.value = msg
  toastError.value = isError
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2500)
}

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

  try {
    const settings = await invoke<{
      biometric_enabled: boolean
      auto_copy: boolean
      clipboard_clear_time: number
      lock_timeout: number
      password_hint: string
    }>('get_settings')
    settingsStore.updateSettings({
      biometricEnabled: settings.biometric_enabled,
      autoCopy: settings.auto_copy,
      clipboardClearTime: settings.clipboard_clear_time,
      lockTimeout: settings.lock_timeout,
      passwordHint: settings.password_hint
    })
  } catch {
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

async function saveSettings() {
  try {
    await invoke('save_settings', {
      settings: {
        biometric_enabled: settingsStore.settings.biometricEnabled,
        auto_copy: settingsStore.settings.autoCopy,
        clipboard_clear_time: settingsStore.settings.clipboardClearTime,
        lock_timeout: settingsStore.settings.lockTimeout,
        password_hint: settingsStore.settings.passwordHint
      }
    })
  } catch {
  }
}

function handleLanguageChange(value: 'auto' | 'zh-CN' | 'en-US') {
  languagePreference.value = value
  setLocale(value)
  settingsStore.updateSettings({ language: value })
  saveSettings()
}

function toggleBiometric() {
  settingsStore.settings.biometricEnabled = !settingsStore.settings.biometricEnabled
  saveSettings()
}

function toggleAutoCopy() {
  settingsStore.settings.autoCopy = !settingsStore.settings.autoCopy
  saveSettings()
}

function setClipboardClearTime(value: number) {
  settingsStore.settings.clipboardClearTime = value
  saveSettings()
}

function setLockTimeout(value: number) {
  settingsStore.settings.lockTimeout = value
  saveSettings()
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
  saveSettings()
}

function handleHintKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') saveHint()
  else if (e.key === 'Escape') closeHintModal()
}

function openChangePassword() {
  showPasswordModal.value = true
  passwordModalPurpose.value = 'change'
  passwordStep.value = 'verify'
  currentPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  passwordError.value = ''
  passwordSuccess.value = ''
}

function closePasswordModal() {
  showPasswordModal.value = false
}

async function verifyCurrentPassword() {
  passwordError.value = ''
  passwordSuccess.value = ''

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
      if (passwordModalPurpose.value === 'export') {
        showPasswordModal.value = false
        await doExport(currentPassword.value)
        return
      }

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
  passwordSuccess.value = ''

  if (newPassword.value.length !== 6) {
    passwordError.value = t('errors.passwordLength')
    return
  }

  if (newPassword.value !== confirmNewPassword.value) {
    passwordError.value = t('errors.passwordMismatch')
    return
  }

  try {
    const hash = await invoke<string>('hash_password_cmd', { password: newPassword.value })
    await invoke('save_password_hash', { hash })
    passwordSuccess.value = t('errors.changePasswordSuccess')
    setTimeout(() => closePasswordModal(), 1500)
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
  setPasswordSuccess.value = ''
  showSetPasswordModal.value = true
}

function closeSetPasswordModal() {
  showSetPasswordModal.value = false
}

async function submitSetPassword() {
  setPasswordError.value = ''
  setPasswordSuccess.value = ''

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
    setPasswordSuccess.value = t('errors.changePasswordSuccess')
    setTimeout(() => closeSetPasswordModal(), 1500)
  } catch {
    setPasswordError.value = t('errors.changePasswordFailed')
  }
}

function openExportSheet() {
  exportMode.value = 'none'
  showExportSheet.value = true
}

async function handleExportConfirm() {
  if (exportMode.value === 'custom') {
    showExportSheet.value = false
    exportCustomPassword.value = ''
    exportConfirmPassword.value = ''
    exportPasswordError.value = ''
    showExportPasswordModal.value = true
    return
  }

  if (exportMode.value === 'app') {
    showExportSheet.value = false
    await handleExportWithAppPassword()
    return
  }

  showExportSheet.value = false
  await new Promise(r => setTimeout(r, 350))
  await doExport('')
}

async function handleExportWithAppPassword() {
  currentPassword.value = ''
  passwordError.value = ''
  passwordModalPurpose.value = 'export'
  passwordStep.value = 'verify'
  showPasswordModal.value = true
}

async function doExport(password: string) {
  try {
    const filePath = await save({
      title: t('settings.exportBackup'),
      defaultPath: 'openotp-backup.openotp',
      filters: [{ name: 'OpenOTP Backup', extensions: ['openotp'] }],
    })

    if (!filePath) return

    const json = await createBackup(accountStore.accounts, password)
    const encoder = new TextEncoder()
    await writeFile(filePath, encoder.encode(json))
    showToast(t('settings.exportSuccess', { path: filePath }))
  } catch (err) {
    showToast(t('errors.exportFailed', { error: String(err) }), true)
  }
}

async function handleExportPasswordConfirm() {
  exportPasswordError.value = ''

  if (exportCustomPassword.value.length < 6) {
    exportPasswordError.value = t('errors.backupPasswordLength')
    return
  }
  if (exportCustomPassword.value !== exportConfirmPassword.value) {
    exportPasswordError.value = t('errors.backupPasswordMismatch')
    return
  }

  showExportPasswordModal.value = false
  await doExport(exportCustomPassword.value)
}

async function handleImportBackup() {
  try {
    const filePath = await open({
      filters: [{ name: 'OpenOTP Backup', extensions: ['openotp'] }],
      multiple: false,
    })

    if (!filePath) return

    const fileContent = await readTextFile(filePath)
    
    let payload: any
    try {
      payload = JSON.parse(fileContent)
    } catch {
      showToast(t('errors.importFailed', { error: 'Invalid backup file' }), true)
      return
    }

    if (!payload.data || !payload.data.iv) {
      showToast(t('errors.importFailed', { error: 'Invalid backup format' }), true)
      return
    }

    importFilePath.value = filePath
    importFileContent.value = fileContent
    importPassword.value = ''
    importPasswordError.value = ''
    showImportPasswordModal.value = true
  } catch (err) {
    showToast(t('errors.importFailed', { error: String(err) }), true)
  }
}

async function handleImportPasswordConfirm() {
  importPasswordError.value = ''

  if (!importPassword.value) {
    importPasswordError.value = t('errors.backupPasswordRequired')
    return
  }

  try {
    const { manifest, accounts } = await restoreBackup(importFileContent.value, importPassword.value)

    for (const account of accounts) {
      accountStore.addAccount(account)
    }

    showImportPasswordModal.value = false
    showToast(t('errors.importSuccess', { count: manifest.accountCount }))
  } catch {
    importPasswordError.value = t('errors.passwordError')
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
    const accounts = importAndOTPBackup(fileContent)

    for (const account of accounts) {
      accountStore.addAccount(account)
    }

    showToast(t('errors.andOTPImportSuccess', { count: accounts.length }))
  } catch (err) {
    showToast(t('errors.andOTPImportFailed', { error: String(err) }), true)
  }
}

function lockApp() {
  settingsStore.lock()
  router.push('/unlock')
}

function goBack() {
  router.back()
}

function openSourceCode() {
  window.open('https://github.com/openotp/openotp', '_blank')
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
      </section>

      <div class="divider"></div>

      <section class="section about-section">
        <h2 class="section-title">{{ t('settings.about') }}</h2>
        <p class="about-line">{{ t('settings.version') }}</p>
        <p class="about-line about-copy" @click="navigator.clipboard.writeText('https://github.com/openotp/openotp'); showToast('已复制')">
          github.com/openotp/openotp
        </p>
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
      :visible="showLangSheet"
      :title="t('settings.language')"
      cancel-text="取消"
      confirm-text=""
      @close="showLangSheet = false"
      @confirm="showLangSheet = false"
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
      :visible="showExportSheet"
      :title="t('settings.exportBackup')"
      :confirm-text="t('settings.startExport')"
      cancel-text="取消"
      @close="showExportSheet = false"
      @confirm="handleExportConfirm"
    >
      <div class="export-options">
        <label class="radio-item" :class="{ active: exportMode === 'none' }">
          <input v-model="exportMode" type="radio" value="none" />
          <span>{{ t('settings.exportNoPassword') }}</span>
        </label>
        <label class="radio-item" :class="{ active: exportMode === 'custom' }">
          <input v-model="exportMode" type="radio" value="custom" />
          <span>{{ t('settings.exportCustomPassword') }}</span>
        </label>
        <label class="radio-item" :class="{ active: exportMode === 'app' }">
          <input v-model="exportMode" type="radio" value="app" />
          <span>{{ t('settings.exportAppPassword') }}</span>
        </label>
      </div>
    </BottomSheet>

    <div v-if="showExportPasswordModal" class="modal-overlay" @click.self="showExportPasswordModal = false">
      <div class="modal">
        <h3 class="modal-title">{{ t('settings.setExportPassword') }}</h3>
        <div class="form-group">
          <label>{{ t('setup.masterPassword') }}</label>
          <PinInput v-model="exportCustomPassword" />
        </div>
        <div class="form-group">
          <label>{{ t('setup.confirmPassword') }}</label>
          <PinInput v-model="exportConfirmPassword" />
        </div>
        <p v-if="exportPasswordError" class="form-error">{{ exportPasswordError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showExportPasswordModal = false">取消</button>
          <button class="btn btn-primary" @click="handleExportPasswordConfirm">{{ t('settings.startExport') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showImportPasswordModal" class="modal-overlay" @click.self="showImportPasswordModal = false">
      <div class="modal">
        <h3 class="modal-title">{{ t('settings.importBackup') }}</h3>
        <div class="form-group">
          <label>{{ t('settings.backupPassword') }}</label>
          <PinInput v-model="importPassword" />
        </div>
        <p v-if="importPasswordError" class="form-error">{{ importPasswordError }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showImportPasswordModal = false">取消</button>
          <button class="btn btn-primary" @click="handleImportPasswordConfirm">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal">
      <div class="modal">
        <h3 class="modal-title">{{ passwordModalPurpose === 'export' ? t('settings.verifyPassword') : t('settings.changePassword') }}</h3>

        <template v-if="passwordStep === 'verify'">
          <div class="form-group">
            <label>{{ t('unlock.enterPassword') }}</label>
            <PinInput v-model="currentPassword" />
          </div>
          <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closePasswordModal">取消</button>
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
          <p v-if="passwordSuccess" class="form-success">{{ passwordSuccess }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closePasswordModal">取消</button>
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
        <p v-if="setPasswordSuccess" class="form-success">{{ setPasswordSuccess }}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeSetPasswordModal">取消</button>
          <button class="btn btn-primary" @click="submitSetPassword">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showHintModal" class="modal-overlay" @click.self="closeHintModal">
      <div class="modal">
        <h3 class="modal-title">{{ t('settings.passwordHint') }}</h3>

        <div v-if="settingsStore.settings.passwordHint" class="hint-current">
          <span class="hint-current-label">当前提示</span>
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
          <button class="btn btn-secondary" @click="closeHintModal">取消</button>
          <button class="btn btn-primary" @click="saveHint">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="toastMessage" class="toast" :class="{ error: toastError }">
      {{ toastMessage }}
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
  color: #333;
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
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 12px 0;
}

.divider {
  height: 1px;
  background: #eee;
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
  color: #333;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-btn {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;
  display: flex;
  align-items: center;
}

.setting-btn:hover {
  border-color: #4a90d9;
  background: #f8fbff;
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
  background-color: #ccc;
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
  background-color: #4a90d9;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.status-text {
  font-size: 12px;
  color: #999;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  color: #333;
}

.radio-item:hover {
  background: #f5f5f5;
}

.radio-item.active {
  background: #eef4ff;
}

.radio-item input[type="radio"] {
  accent-color: #4a90d9;
  width: 18px;
  height: 18px;
}

.about-section {
  padding-bottom: 24px;
}

.about-line {
  margin: 4px 0;
  font-size: 13px;
  color: #999;
}

.about-copy {
  color: #666;
  cursor: pointer;
  user-select: all;
}

.about-copy:hover {
  color: #4a90d9;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 16px;
  box-sizing: border-box;
  outline: none;
}

.form-input:focus {
  border-color: #4a90d9;
}

.form-error {
  color: #e74c3c;
  font-size: 13px;
  margin: 8px 0;
}

.form-success {
  color: #27ae60;
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
  background: #f0f0f0;
  color: #666;
}

.btn-primary {
  background: #4a90d9;
  color: white;
}

.btn-primary:hover {
  background: #3a7bc8;
}

.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 14px 24px;
  border-radius: 10px;
  font-size: 14px;
  z-index: 400;
  text-align: center;
  pointer-events: none;
  white-space: nowrap;
}

.toast.error {
  background: rgba(231, 76, 60, 0.9);
}

.lang-options {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lang-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 15px;
  color: #333;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.lang-option:hover {
  background: #f5f5f5;
}

.lang-option.active {
  background: #eef4ff;
  color: #4a90d9;
  font-weight: 500;
}

.lang-check {
  color: #4a90d9;
  font-size: 16px;
}
</style>
