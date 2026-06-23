<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Account, AccountIcon } from '@/types'
import { parseOtpauthUrl } from '@/utils/otp'
import { getRandomBgColor } from '@/utils/icons'
import jsQR from 'jsqr'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  add: [data: Partial<Account>]
}>()

const { t } = useI18n()
const activeTab = ref<'qr' | 'url' | 'manual'>('url')
const otpauthUrl = ref('')
const parseError = ref('')
const manualMode = ref(false)

const manualName = ref('')
const manualIssuer = ref('')
const manualSecret = ref('')
const manualAlgorithm = ref<'sha1' | 'sha256' | 'sha512'>('sha1')
const manualDigits = ref<6 | 7 | 8>(6)
const manualPeriod = ref(30)

const qrImageUrl = ref<string | null>(null)
const qrScanning = ref(false)
const qrError = ref('')
const qrResult = ref('')

const parsedPreview = computed(() => {
  if (!otpauthUrl.value.trim()) {
    parseError.value = ''
    return null
  }
  try {
    const result = parseOtpauthUrl(otpauthUrl.value)
    parseError.value = ''
    return result
  } catch (e) {
    parseError.value = e instanceof Error ? e.message : 'Invalid URL'
    return null
  }
})

watch(() => props.visible, (val) => {
  if (val) {
    otpauthUrl.value = ''
    parseError.value = ''
    manualMode.value = false
    activeTab.value = 'url'
    manualName.value = ''
    manualIssuer.value = ''
    manualSecret.value = ''
    manualAlgorithm.value = 'sha1'
    manualDigits.value = 6
    manualPeriod.value = 30
    qrImageUrl.value = null
    qrScanning.value = false
    qrError.value = ''
    qrResult.value = ''
  }
})

async function selectQrImage() {
  qrError.value = ''
  qrResult.value = ''

  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const filePath = await open({
      title: t('addAccount.scanQR'),
      filters: [{
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
      }]
    })

    if (!filePath) return

    qrScanning.value = true

    const { readFile } = await import('@tauri-apps/plugin-fs')
    const bytes = await readFile(filePath)

    const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp'
    }
    const mime = mimeMap[ext] || 'image/png'

    if (qrImageUrl.value) {
      URL.revokeObjectURL(qrImageUrl.value)
    }

    const blob = new Blob([bytes], { type: mime })
    qrImageUrl.value = URL.createObjectURL(blob)

    await nextTick()
    await decodeQr()
  } catch (e) {
    qrError.value = e instanceof Error ? e.message : t('addAccount.selectFailed')
  } finally {
    qrScanning.value = false
  }
}

function decodeQr(): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        qrError.value = t('addAccount.cannotCreateCanvas')
        resolve()
        return
      }

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        qrResult.value = code.data
        otpauthUrl.value = code.data
        qrError.value = ''
        activeTab.value = 'url'
      } else {
        qrError.value = t('addAccount.qrNotRecognized')
      }
      resolve()
    }
    img.onerror = () => {
      qrError.value = t('addAccount.imageLoadFailed')
      resolve()
    }
    img.src = qrImageUrl.value!
  })
}

function handleCancel() {
  emit('close')
}

function handleAdd() {
  let data: Partial<Account>

  if (activeTab.value === 'url' && parsedPreview.value) {
    data = { ...parsedPreview.value }
  } else if (activeTab.value === 'manual' || manualMode.value) {
    data = {
      name: manualName.value,
      issuer: manualIssuer.value,
      secret: manualSecret.value,
      type: 'totp',
      algorithm: manualAlgorithm.value,
      digits: manualDigits.value,
      period: manualPeriod.value,
    }
  } else {
    return
  }

  if (!data.name || !data.secret) return

  const icon: AccountIcon = {
    type: 'initial',
    value: (data.name || '').charAt(0).toUpperCase(),
    bgColor: getRandomBgColor(),
  }

  data.icon = icon

  if (!data.algorithm) data.algorithm = 'sha1'
  if (!data.digits) data.digits = 6
  if (!data.period) data.period = 30
  data.type = 'totp'

  emit('add', data)
}

function useParsedData() {
  if (parsedPreview.value) {
    manualName.value = parsedPreview.value.name || ''
    manualIssuer.value = parsedPreview.value.issuer || ''
    manualSecret.value = parsedPreview.value.secret || ''
    manualAlgorithm.value = parsedPreview.value.algorithm || 'sha1'
    manualDigits.value = parsedPreview.value.digits || 6
    manualPeriod.value = parsedPreview.value.period || 30
    manualMode.value = true
    activeTab.value = 'manual'
  }
}
</script>

<template>
  <div v-if="visible" class="overlay" @click.self="handleCancel">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ t('addAccount.title') }}</h2>
      </div>

      <div class="tab-bar">
        <button
          :class="['tab-btn', { active: activeTab === 'qr' }]"
          @click="activeTab = 'qr'; manualMode = false"
        >
          {{ t('addAccount.scanQR') }}
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'url' }]"
          @click="activeTab = 'url'; manualMode = false"
        >
          {{ t('addAccount.otpUrl') }}
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'manual' || manualMode }]"
          @click="activeTab = 'manual'; manualMode = true"
        >
          {{ t('addAccount.manual') }}
        </button>
      </div>

      <div v-if="!manualMode && activeTab === 'qr'" class="qr-section">
        <div v-if="!qrImageUrl" class="qr-placeholder">
          <button class="scan-btn" @click="selectQrImage" :disabled="qrScanning">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="16" height="16" rx="3" stroke="#999" stroke-width="2.5"/>
              <rect x="28" y="4" width="16" height="16" rx="3" stroke="#999" stroke-width="2.5"/>
              <rect x="4" y="28" width="16" height="16" rx="3" stroke="#999" stroke-width="2.5"/>
              <rect x="36" y="36" width="8" height="8" rx="2" stroke="#999" stroke-width="2.5"/>
              <rect x="28" y="36" width="4" height="8" rx="1.5" fill="#999"/>
            </svg>
            <span class="scan-label">{{ qrScanning ? t('addAccount.processing') : t('addAccount.selectQRImage') }}</span>
          </button>
        </div>

        <div v-if="qrImageUrl" class="qr-preview">
          <img :src="qrImageUrl" alt="QR preview" class="qr-preview-img" />
          <div v-if="qrScanning" class="qr-status">{{ t('addAccount.recognizing') }}</div>
          <div v-if="qrResult && !qrScanning" class="qr-success">
            {{ t('addAccount.recognized') }}
          </div>
          <div v-if="qrError" class="qr-fail">{{ qrError }}</div>
          <button v-if="qrError" class="scan-btn retry" @click="selectQrImage">
            {{ t('common.retry') }}
          </button>
        </div>
      </div>

      <div v-if="!manualMode && activeTab === 'url'" class="url-section">
        <div class="field-group">
          <label class="field-label">{{ t('addAccount.otpauthUrl') }}</label>
          <input
            v-model="otpauthUrl"
            type="text"
            class="input"
            :placeholder="t('addAccount.otpauthPlaceholder')"
          />
        </div>

        <div v-if="parseError" class="parse-error">{{ t('addAccount.parseError') }}</div>

        <div v-if="parsedPreview" class="preview-section">
          <div class="preview-row">
            <span class="preview-label">{{ t('addAccount.previewType') }}</span>
            <span class="preview-value">{{ parsedPreview.type }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">{{ t('addAccount.previewName') }}</span>
            <span class="preview-value">{{ parsedPreview.name }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">{{ t('addAccount.previewIssuer') }}</span>
            <span class="preview-value">{{ parsedPreview.issuer || '-' }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">{{ t('addAccount.previewAlgorithm') }}</span>
            <span class="preview-value">{{ parsedPreview.algorithm || 'sha1' }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">{{ t('addAccount.previewDigits') }}</span>
            <span class="preview-value">{{ parsedPreview.digits || 6 }}</span>
          </div>
          <button class="edit-fields-btn" @click="useParsedData">
            {{ t('addAccount.editAndAdd') }}
          </button>
        </div>
      </div>

      <div v-if="manualMode || activeTab === 'manual'" class="manual-section">
        <div class="field-group">
          <label class="field-label">{{ t('addAccount.accountName') }}</label>
          <input v-model="manualName" type="text" class="input" :placeholder="t('addAccount.accountNamePlaceholder')" />
        </div>

        <div class="field-group">
          <label class="field-label">{{ t('addAccount.issuer') }}</label>
          <input v-model="manualIssuer" type="text" class="input" :placeholder="t('addAccount.issuerPlaceholder')" />
        </div>

        <div class="field-group">
          <label class="field-label">{{ t('addAccount.secretKey') }}</label>
          <input v-model="manualSecret" type="text" class="input" :placeholder="t('addAccount.secretPlaceholder')" />
        </div>

        <div class="field-row">
          <div class="field-group">
            <label class="field-label">{{ t('addAccount.algorithm') }}</label>
            <select v-model="manualAlgorithm" class="input">
              <option value="sha1">SHA1</option>
              <option value="sha256">SHA256</option>
              <option value="sha512">SHA512</option>
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">{{ t('addAccount.digits') }}</label>
            <select v-model="manualDigits" class="input">
              <option :value="6">6</option>
              <option :value="7">7</option>
              <option :value="8">8</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field-group">
            <label class="field-label">{{ t('addAccount.period') }}</label>
            <input v-model.number="manualPeriod" type="number" class="input" min="1" />
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-cancel" @click="handleCancel">{{ t('common.cancel') }}</button>
        <button class="btn btn-add" @click="handleAdd">{{ t('common.add') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--card-bg);
  color: var(--text-primary);
  border-radius: 12px;
  padding: 20px;
  width: 420px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.modal-header {
  margin-bottom: 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.tab-bar {
  display: flex;
  margin-bottom: 16px;
  border-radius: 8px;
  background: var(--bg-secondary);
  padding: 3px;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--btn-secondary-text);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
  white-space: nowrap;
}

.tab-btn.active {
  background: var(--card-bg);
  color: var(--text-primary);
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.scan-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 48px;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.scan-btn:hover {
  border-color: var(--accent);
  background: rgba(74, 144, 217, 0.1);
}

.scan-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scan-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.qr-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qr-preview-img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.qr-status {
  font-size: 13px;
  color: var(--text-secondary);
}

.qr-success {
  font-size: 13px;
  color: var(--progress-green);
}

.qr-fail {
  font-size: 13px;
  color: var(--progress-red);
}

.scan-btn.retry {
  padding: 8px 20px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--btn-secondary-text);
  border-radius: 6px;
  cursor: pointer;
}

.scan-btn.retry:hover {
  background: var(--bg-secondary);
}

.field-group {
  margin-bottom: 12px;
}

.field-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.input:focus {
  outline: none;
  border-color: var(--accent);
}

.field-row {
  display: flex;
  gap: 12px;
}

.field-row .field-group {
  flex: 1;
}

.parse-error {
  font-size: 12px;
  color: var(--progress-red);
  margin-bottom: 12px;
}

.preview-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.preview-label {
  color: var(--text-secondary);
}

.preview-value {
  color: var(--text-primary);
  font-weight: 500;
}

.edit-fields-btn {
  width: 100%;
  margin-top: 10px;
  padding: 8px 0;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.edit-fields-btn:hover {
  background: var(--accent);
  color: #fff;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--btn-secondary-text);
}

.btn-cancel:hover {
  background: var(--bg-secondary);
}

.btn-add {
  border: none;
  background: var(--accent);
  color: #fff;
}

.btn-add:hover {
  opacity: 0.85;
}
</style>
