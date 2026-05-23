<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { useSettingsStore, useAccountStore } from '@/stores'
import { createBackup, restoreBackup } from '@/utils/backup'

const router = useRouter()
const settingsStore = useSettingsStore()
const accountStore = useAccountStore()

const showPasswordModal = ref(false)
const passwordStep = ref<'verify' | 'change'>('verify')
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')
const passwordHash = ref('')

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
    touchid: 'Touch ID',
    faceid: 'Face ID',
    fingerprint: '指纹',
    face: '面容'
  }
  return labels[biometricType.value] || '生物识别'
})

onMounted(async () => {
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

async function verifyCurrentPassword() {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (currentPassword.value.length !== 6) {
    passwordError.value = '请输入6位数字密码'
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
          const bioSuccess = await invoke<boolean>('biometric_auth', { reason: '修改主密码' })
          if (!bioSuccess) {
            passwordError.value = '生物识别验证失败'
            return
          }
        } catch (e) {
          const err = e as { type: string }
          if (err.type === 'UserCancelled') {
            passwordError.value = '请完成生物识别验证'
          } else {
            passwordError.value = '生物识别验证失败'
          }
          return
        }
      }
      passwordStep.value = 'change'
    } else {
      passwordError.value = '密码验证失败'
    }
  } catch {
    passwordError.value = '验证失败，请稍后重试'
  }
}

async function submitNewPassword() {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (newPassword.value.length !== 6) {
    passwordError.value = '密码必须是6位数字'
    return
  }

  if (newPassword.value !== confirmNewPassword.value) {
    passwordError.value = '两次密码不一致'
    return
  }

  try {
    const hash = await invoke<string>('hash_password_cmd', {
      password: newPassword.value
    })
    await invoke('save_password_hash', { hash })
    passwordSuccess.value = '密码修改成功'
    setTimeout(() => {
      closePasswordModal()
    }, 1500)
  } catch {
    passwordError.value = '密码修改失败，请稍后重试'
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
    backupError.value = '密码至少6位字符'
    return
  }
  if (backupPassword.value !== backupConfirmPassword.value) {
    backupError.value = '两次密码不一致'
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
    backupMessage.value = '导出成功'
    setTimeout(() => closeBackupModal(), 1500)
  } catch (err) {
    backupError.value = `导出失败：${String(err)}`
  }
}

async function confirmBackupImport() {
  backupError.value = ''
  backupMessage.value = ''

  if (!backupPassword.value) {
    backupError.value = '请输入备份密码'
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

    backupMessage.value = `成功导入 ${manifest.accountCount} 个账户`
    setTimeout(() => closeBackupModal(), 2000)
  } catch (err) {
    backupError.value = `导入失败：${String(err)}`
  }
}

function exportBackup() {
  openBackupExport()
}

function importBackup() {
  openBackupImport()
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
      <h1>设置</h1>
    </header>

    <div class="content">
      <section class="section">
        <h2 class="section-title">安全设置</h2>

        <div class="setting-item setting-action">
          <button class="setting-btn danger" @click="openChangePassword">
            修改主密码
          </button>
        </div>

        <div class="setting-item setting-row">
          <span class="setting-label">密码提示</span>
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
                {{ settingsStore.settings.passwordHint || '点击设置' }}
              </span>
            </template>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <h2 class="section-title">安全选项</h2>

        <div class="setting-item setting-row">
          <span class="setting-label">生物识别解锁</span>
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
            <span v-if="!biometricAvailable" class="status-text">设备不支持</span>
          </div>
        </div>

        <div class="setting-item setting-row">
          <span class="setting-label">自动复制验证码</span>
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
          <span class="setting-label">剪贴板清除时间</span>
          <div class="setting-control">
            <select
              :value="settingsStore.settings.clipboardClearTime"
              @change="setClipboardClearTime(Number(($event.target as HTMLSelectElement).value))"
            >
              <option :value="30">30秒</option>
              <option :value="60">60秒</option>
              <option :value="0">永不</option>
            </select>
          </div>
        </div>

        <div class="setting-item setting-row">
          <span class="setting-label">应用锁定时间</span>
          <div class="setting-control">
            <select
              :value="settingsStore.settings.lockTimeout"
              @change="setLockTimeout(Number(($event.target as HTMLSelectElement).value))"
            >
              <option :value="0">立即</option>
              <option :value="1">1分钟</option>
              <option :value="5">5分钟</option>
            </select>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <h2 class="section-title">数据管理</h2>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="exportBackup">导出备份</button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="importBackup">导入备份</button>
        </div>

        <div class="setting-item setting-action">
          <button class="setting-btn" @click="lockApp">锁定应用</button>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section about-section">
        <h2 class="section-title">关于</h2>
        <p class="about-line">openOTP v0.1.0</p>
        <p class="about-line">开源地址：github.com/openotp/openotp</p>
      </section>
    </div>

    <div v-if="showBackupModal" class="modal-overlay" @click.self="closeBackupModal">
      <div class="modal">
        <h3 class="modal-title">{{ backupMode === 'export' ? '导出备份' : '导入备份' }}</h3>

        <template v-if="backupMode === 'export'">
          <div class="form-group">
            <label>设置备份密码</label>
            <input
              v-model="backupPassword"
              type="password"
              placeholder="至少6位字符"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>确认备份密码</label>
            <input
              v-model="backupConfirmPassword"
              type="password"
              placeholder="请再次输入"
              class="form-input"
            />
          </div>
        </template>

        <template v-if="backupMode === 'import'">
          <div class="form-group">
            <label>备份密码</label>
            <input
              v-model="backupPassword"
              type="password"
              placeholder="输入备份时设置的密码"
              class="form-input"
            />
          </div>
        </template>

        <p v-if="backupError" class="form-error">{{ backupError }}</p>
        <p v-if="backupMessage" class="form-success">{{ backupMessage }}</p>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeBackupModal">取消</button>
          <button
            class="btn btn-primary"
            @click="backupMode === 'export' ? confirmBackupExport() : confirmBackupImport()"
          >
            {{ backupMode === 'export' ? '导出' : '导入' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal">
      <div class="modal">
        <h3 class="modal-title">修改主密码</h3>

        <template v-if="passwordStep === 'verify'">
          <div class="form-group">
            <label>请输入当前密码</label>
            <input
              v-model="currentPassword"
              type="password"
              maxlength="6"
              placeholder="6位数字密码"
              class="form-input"
            />
          </div>

          <p v-if="settingsStore.settings.biometricEnabled && biometricAvailable" class="biometric-hint">
            或使用{{ biometricLabel }}验证
          </p>

          <p v-if="passwordError" class="form-error">{{ passwordError }}</p>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closePasswordModal">取消</button>
            <button class="btn btn-primary" @click="verifyCurrentPassword">验证</button>
          </div>
        </template>

        <template v-if="passwordStep === 'change'">
          <div class="form-group">
            <label>新密码</label>
            <input
              v-model="newPassword"
              type="password"
              maxlength="6"
              placeholder="请输入新的6位数字密码"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>确认新密码</label>
            <input
              v-model="confirmNewPassword"
              type="password"
              maxlength="6"
              placeholder="请再次输入"
              class="form-input"
            />
          </div>

          <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="form-success">{{ passwordSuccess }}</p>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closePasswordModal">取消</button>
            <button class="btn btn-primary" @click="submitNewPassword">保存</button>
          </div>
        </template>
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
