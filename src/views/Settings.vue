<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { useSettingsStore, useAccountStore } from '@/stores'
import { createBackup, restoreBackup } from '@/utils/backup'
import { importAndOTPBackup } from '@/utils/andotp'
import { setLocale, getSavedLocalePreference } from '@/locales'

const router = useRouter()
const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
const { t } = useI18n()

const languagePreference = ref<'auto' | 'zh-CN' | 'en-US'>('auto')

const showPasswordModal = ref(false)
const passwordStep = ref<'verify' | 'change'>('verify')
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

const showBackupModal = ref(false)
const backupMode = ref<'export' | 'import'>('export')
const backupPassword = ref('')
const backupConfirmPassword = ref('')
const backupMessage = ref('')
const backupError = ref('')

const editingHint = ref(false)
const hintValue = ref('')

const biometricAvailable = ref(false)
const biometricType = ref('')

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

function startEditingHint() {
  hintValue.value = settingsStore.settings.passwordHint
  editingHint.value = true
}

function saveHint() {
  if (hintValue.value.length > 50) {
    hintValue.value = hintValue.value.slice(0, 50)
  }
  settingsStore.settings.passwordHint = hintValue.value
  editingHint.value = false
  saveSettings()
}

function cancelHint() {
  editingHint.value = false
}

function handleHintKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    saveHint()
  } else if (e.key === 'Escape') {
    cancelHint()
  }
}

function openChangePassword() {
  showPasswordModal.value = true
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
    setTimeout(() => {
      closeSetPasswordModal()
    }, 1500)
  } catch {
    setPasswordError.value = t('errors.changePasswordFailed')
  }
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
    passwordError.value = t('errors.changePasswordMismatch')
    return
  }

  try {
    const hash = await invoke<string>('hash_password_cmd', {
      password: newPassword.value
    })
    await invoke('save_password_hash', { hash })
    passwordSuccess.value = t('errors.changePasswordSuccess')
    setTimeout(() => {
      closePasswordModal()
    }, 1500)
  } catch {
    passwordError.value = t('errors.changePasswordFailed')
  }
}

function openBackupExport() {
  backupMode.value = 'export'
  backupPassword.value = ''
  backupConfirmPassword.value = ''
  backupMessage.value = ''
  backupError.value = ''
  showBackupModal.value = true
}

function openBackupImport() {
  backupMode.value = 'import'
  backupPassword.value = ''
  backupConfirmPassword.value = ''
  backupMessage.value = ''
  backupError.value = ''
  showBackupModal.value = true
}

function closeBackupModal() {
  showBackupModal.value = false
}

async function confirmBackupExport() {
  backupError.value = ''
  backupMessage.value = ''

  if (!backupPassword.value || backupPassword.value.length < 6) {
    backupError.value = t('errors.backupPasswordLength')
    return
  }
  if (backupPassword.value !== backupConfirmPassword.value) {
    backupError.value = t('errors.backupPasswordMismatch')
    return
  }

  try {
    const filePath = await save({
      defaultPath: 'openotp-backup.openotp',
      filters: [{ name: 'openOTP Backup', extensions: ['openotp'] }],
    })

    if (!filePath) {
      closeBackupModal()
      return
    }

    const json = await createBackup(accountStore.accounts, backupPassword.value)
    await writeTextFile(filePath, json)
    backupMessage.value = t('common.save')
    setTimeout(() => closeBackupModal(), 1500)
  } catch (err) {
    backupError.value = t('errors.exportFailed', { error: String(err) })
  }
}

async function confirmBackupImport() {
  backupError.value = ''
  backupMessage.value = ''

  if (!backupPassword.value) {
    backupError.value = t('errors.backupPasswordRequired')
    return
  }

  try {
    const filePath = await open({
      filters: [{ name: 'openOTP Backup', extensions: ['openotp'] }],
      multiple: false,
    })

    if (!filePath) {
      closeBackupModal()
      return
    }

    const fileContent = await readTextFile(filePath)
    const { manifest, accounts } = await restoreBackup(fileContent, backupPassword.value)

    for (const account of accounts) {
      accountStore.addAccount(account)
    }

    backupMessage.value = t('errors.importSuccess', { count: manifest.accountCount })
    setTimeout(() => closeBackupModal(), 2000)
  } catch (err) {
    backupError.value = t('errors.importFailed', { error: String(err) })
  }
}

function exportBackup() {
  openBackupExport()
}

function importBackup() {
  openBackupImport()
}

async function importJsonAccounts() {
  try {
    const filePath = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    })

    if (!filePath) return

    const fileContent = await readTextFile(filePath)
    const accounts = JSON.parse(fileContent)

    for (const account of accounts) {
      account.id = generateId()
      accountStore.addAccount(account)
    }

    backupMessage.value = `成功导入 ${accounts.length} 个账户`
    showBackupModal.value = true
    setTimeout(() => {
      showBackupModal.value = false
    }, 2000)
  } catch (err) {
    backupError.value = `导入失败：${String(err)}`
    showBackupModal.value = true
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
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

    backupMessage.value = t('errors.andOTPImportSuccess', { count: accounts.length })
    showBackupModal.value = true
    setTimeout(() => {
      showBackupModal.value = false
    }, 2000)
  } catch (err) {
    backupError.value = t('errors.andOTPImportFailed', { error: String(err) })
    showBackupModal.value = true
  }
}

function lockApp() {
  settingsStore.lock()
  router.push('/unlock')
}

function goBack() {
  router.back()
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
        <div class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.language') }}</span>
          <div class="setting-control">
            <select :value="languagePreference" @change="handleLanguageChange(($event.target as HTMLSelectElement).value as 'auto' | 'zh-CN' | 'en-US')">
              <option value="auto">{{ t('settings.languageAuto') }}</option>
              <option value="zh-CN">{{ t('settings.languageZhCN') }}</option>
              <option value="en-US">{{ t('settings.languageEnUS') }}</option>
            </select>
          </div>
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
            class="setting-btn danger" 
            @click="openChangePassword"
          >
            {{ t('settings.changePassword') }}
          </button>
        </div>

        <div class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.passwordHint') }}</span>
          <div class="setting-control hint-control">
            <template v-if="editingHint">
              <input
                v-model="hintValue"
                type="text"
                maxlength="50"
                class="hint-input"
                @keydown="handleHintKeydown"
                @blur="saveHint"
                autofocus
              />
            </template>
            <template v-else>
              <span
                class="hint-text"
                :class="{ empty: !settingsStore.settings.passwordHint }"
                @click="startEditingHint"
              >
                {{ settingsStore.settings.passwordHint || t('settings.clickToSet') }}
              </span>
            </template>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <h2 class="section-title">{{ t('settings.securityOptions') }}</h2>

        <div class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.biometricUnlock') }}</span>
          <div class="setting-control">
            <label class="toggle" :class="{ disabled: !biometricAvailable }">
              <input
                type="checkbox"
                :checked="settingsStore.settings.biometricEnabled"
                :disabled="!biometricAvailable"
                @change="toggleBiometric"
              />
              <span class="toggle-slider"></span>
            </label>
            <span v-if="!biometricAvailable" class="status-text">{{ t('settings.biometricNotAvailable') }}</span>
          </div>
        </div>

        <div class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.autoCopy') }}</span>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                :checked="settingsStore.settings.autoCopy"
                @change="toggleAutoCopy"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.clipboardClearTime') }}</span>
          <div class="setting-control">
            <select
              :value="settingsStore.settings.clipboardClearTime"
              @change="setClipboardClearTime(Number(($event.target as HTMLSelectElement).value))"
            >
              <option :value="30">{{ t('settings.clipboard30s') }}</option>
              <option :value="60">{{ t('settings.clipboard60s') }}</option>
              <option :value="0">{{ t('settings.clipboardNever') }}</option>
            </select>
          </div>
        </div>

        <div class="setting-item setting-row">
          <span class="setting-label">{{ t('settings.lockTimeout') }}</span>
          <div class="setting-control">
            <select
              :value="settingsStore.settings.lockTimeout"
              @change="setLockTimeout(Number(($event.target as HTMLSelectElement).value))"
            >
              <option :value="0">{{ t('settings.lockImmediate') }}</option>
              <option :value="1">{{ t('settings.lock1min') }}</option>
              <option :value="5">{{ t('settings.lock5min') }}</option>
            </select>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <h2 class="section-title">{{ t('settings.dataManagement') }}</h2>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="exportBackup">{{ t('settings.exportBackup') }}</button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="importBackup">{{ t('settings.importBackup') }}</button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="importJsonAccounts">导入 JSON 账号</button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="importAndOTPAccounts">{{ t('settings.importAndOTP') }}</button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="lockApp">{{ t('settings.lockApp') }}</button>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section about-section">
        <h2 class="section-title">{{ t('settings.about') }}</h2>
        <p class="about-line">{{ t('settings.version') }}</p>
        <p class="about-line">{{ t('settings.sourceCode') }}</p>
      </section>
    </div>

    <div v-if="showBackupModal" class="modal-overlay" @click.self="closeBackupModal">
      <div class="modal">
        <h3 class="modal-title">{{ backupMode === 'export' ? t('settings.exportBackup') : t('settings.importBackup') }}</h3>

        <template v-if="backupMode === 'export'">
          <div class="form-group">
            <label>{{ t('settings.exportBackup') }}</label>
            <input
              v-model="backupPassword"
              type="password"
              :placeholder="t('errors.backupPasswordLength')"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>{{ t('common.confirm') }}</label>
            <input
              v-model="backupConfirmPassword"
              type="password"
              :placeholder="t('setup.confirmPlaceholder')"
              class="form-input"
            />
          </div>
        </template>

        <template v-if="backupMode === 'import'">
          <div class="form-group">
            <label>{{ t('settings.importBackup') }}</label>
            <input
              v-model="backupPassword"
              type="password"
              :placeholder="t('errors.backupPasswordRequired')"
              class="form-input"
            />
          </div>
        </template>

        <p v-if="backupError" class="form-error">{{ backupError }}</p>
        <p v-if="backupMessage" class="form-success">{{ backupMessage }}</p>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeBackupModal">{{ t('common.cancel') }}</button>
          <button
            class="btn btn-primary"
            @click="backupMode === 'export' ? confirmBackupExport() : confirmBackupImport()"
          >
            {{ backupMode === 'export' ? t('settings.exportBackup') : t('settings.importBackup') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal">
      <div class="modal">
        <h3 class="modal-title">{{ t('settings.changePassword') }}</h3>

        <template v-if="passwordStep === 'verify'">
          <div class="form-group">
            <label>{{ t('setup.setPassword') }}</label>
            <input
              v-model="currentPassword"
              type="password"
              maxlength="6"
              :placeholder="t('errors.changePasswordVerify')"
              class="form-input"
            />
          </div>

          <p v-if="settingsStore.settings.biometricEnabled && biometricAvailable" class="biometric-hint">
            {{ t('setup.enableBiometric', { biometric: biometricLabel }) }}
          </p>

          <p v-if="passwordError" class="form-error">{{ passwordError }}</p>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closePasswordModal">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="verifyCurrentPassword">{{ t('common.confirm') }}</button>
          </div>
        </template>

        <template v-if="passwordStep === 'change'">
          <div class="form-group">
            <label>{{ t('setup.masterPassword') }}</label>
            <input
              v-model="newPassword"
              type="password"
              maxlength="6"
              :placeholder="t('setup.passwordPlaceholder')"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>{{ t('setup.confirmPassword') }}</label>
            <input
              v-model="confirmNewPassword"
              type="password"
              maxlength="6"
              :placeholder="t('setup.confirmPlaceholder')"
              class="form-input"
            />
          </div>

          <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="form-success">{{ passwordSuccess }}</p>

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
          <input
            v-model="setNewPassword"
            type="password"
            maxlength="6"
            :placeholder="t('setup.passwordPlaceholder')"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>{{ t('setup.confirmPassword') }}</label>
          <input
            v-model="setConfirmPassword"
            type="password"
            maxlength="6"
            :placeholder="t('setup.confirmPlaceholder')"
            class="form-input"
          />
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
          <button class="btn btn-secondary" @click="closeSetPasswordModal">{{ t('common.cancel') }}</button>
          <button class="btn btn-primary" @click="submitSetPassword">{{ t('common.save') }}</button>
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
  font-size: 14px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s;
}

.setting-btn:hover {
  border-color: #4a90d9;
}

.setting-btn.danger {
  border-color: #e74c3c;
  color: #e74c3c;
}

.setting-btn.danger:hover {
  background: #e74c3c;
  color: white;
}

select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  outline: none;
}

select:focus {
  border-color: #4a90d9;
}

.hint-control {
  flex: 1;
  max-width: 200px;
  justify-content: flex-end;
}

.hint-text {
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
  word-break: break-all;
  text-align: right;
}

.hint-text:hover {
  background: #f0f0f0;
}

.hint-text.empty {
  color: #bbb;
  font-style: italic;
}

.hint-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #4a90d9;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
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

.about-section {
  padding-bottom: 24px;
}

.about-line {
  margin: 4px 0;
  font-size: 13px;
  color: #999;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  text-align: center;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
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
  margin: -8px 0 12px 0;
}

.form-success {
  color: #27ae60;
  font-size: 13px;
  margin: -8px 0 12px 0;
}

.biometric-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
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
</style>
