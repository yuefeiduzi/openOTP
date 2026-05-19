<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Account, AccountIcon } from '@/types'
import { parseOtpauthUrl } from '@/utils/otp'
import { getRandomBgColor } from '@/utils/icons'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  add: [data: Partial<Account>]
}>()

const activeTab = ref<'qr' | 'url' | 'manual'>('url')
const otpauthUrl = ref('')
const parseError = ref('')
const manualMode = ref(false)

const manualName = ref('')
const manualIssuer = ref('')
const manualSecret = ref('')
const manualType = ref<'totp' | 'hotp'>('totp')
const manualAlgorithm = ref<'sha1' | 'sha256' | 'sha512'>('sha1')
const manualDigits = ref<6 | 7 | 8>(6)
const manualPeriod = ref(30)

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
    manualType.value = 'totp'
    manualAlgorithm.value = 'sha1'
    manualDigits.value = 6
    manualPeriod.value = 30
  }
})

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
      type: manualType.value,
      algorithm: manualAlgorithm.value,
      digits: manualDigits.value,
      period: manualPeriod.value,
      counter: manualType.value === 'hotp' ? 0 : undefined,
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
  if (!data.period && data.type === 'totp') data.period = 30
  if (data.counter === undefined && data.type === 'hotp') data.counter = 0
  if (!data.type) data.type = 'totp'

  emit('add', data)
}

function useParsedData() {
  if (parsedPreview.value) {
    manualName.value = parsedPreview.value.name || ''
    manualIssuer.value = parsedPreview.value.issuer || ''
    manualSecret.value = parsedPreview.value.secret || ''
    manualType.value = parsedPreview.value.type || 'totp'
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
        <h2 class="modal-title">添加账号</h2>
      </div>

      <div class="tab-bar">
        <button
          :class="['tab-btn', { active: activeTab === 'url' }]"
          @click="activeTab = 'url'; manualMode = false"
        >
          OTP URL
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'manual' || manualMode }]"
          @click="activeTab = 'manual'; manualMode = true"
        >
          手动输入
        </button>
      </div>

      <div v-if="!manualMode && activeTab === 'url'" class="url-section">
        <div class="field-group">
          <label class="field-label">otpauth:// URL</label>
          <input
            v-model="otpauthUrl"
            type="text"
            class="input"
            placeholder="otpauth://totp/..."
          />
        </div>

        <div v-if="parseError" class="parse-error">{{ parseError }}</div>

        <div v-if="parsedPreview" class="preview-section">
          <div class="preview-row">
            <span class="preview-label">类型</span>
            <span class="preview-value">{{ parsedPreview.type }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">名称</span>
            <span class="preview-value">{{ parsedPreview.name }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">发行方</span>
            <span class="preview-value">{{ parsedPreview.issuer || '-' }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">算法</span>
            <span class="preview-value">{{ parsedPreview.algorithm || 'sha1' }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">位数</span>
            <span class="preview-value">{{ parsedPreview.digits || 6 }}</span>
          </div>
          <button class="edit-fields-btn" @click="useParsedData">
            修改并添加
          </button>
        </div>
      </div>

      <div v-if="manualMode || activeTab === 'manual'" class="manual-section">
        <div class="field-group">
          <label class="field-label">账号名称</label>
          <input v-model="manualName" type="text" class="input" placeholder="例如: user@example.com" />
        </div>

        <div class="field-group">
          <label class="field-label">发行方</label>
          <input v-model="manualIssuer" type="text" class="input" placeholder="例如: Google" />
        </div>

        <div class="field-group">
          <label class="field-label">密钥 (Base32)</label>
          <input v-model="manualSecret" type="text" class="input" placeholder="JBSWY3DPEHPK3PXP" />
        </div>

        <div class="field-row">
          <div class="field-group">
            <label class="field-label">类型</label>
            <select v-model="manualType" class="input">
              <option value="totp">TOTP</option>
              <option value="hotp">HOTP</option>
            </select>
          </div>

          <div class="field-group">
            <label class="field-label">算法</label>
            <select v-model="manualAlgorithm" class="input">
              <option value="sha1">SHA1</option>
              <option value="sha256">SHA256</option>
              <option value="sha512">SHA512</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field-group">
            <label class="field-label">位数</label>
            <select v-model="manualDigits" class="input">
              <option :value="6">6</option>
              <option :value="7">7</option>
              <option :value="8">8</option>
            </select>
          </div>

          <div v-if="manualType === 'totp'" class="field-group">
            <label class="field-label">周期 (秒)</label>
            <input v-model.number="manualPeriod" type="number" class="input" min="1" />
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-cancel" @click="handleCancel">取消</button>
        <button class="btn btn-add" @click="handleAdd">添加</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  width: 400px;
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
  color: #222;
}

.tab-bar {
  display: flex;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #f5f5f5;
  padding: 3px;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.tab-btn.active {
  background: #fff;
  color: #333;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.field-group {
  margin-bottom: 12px;
}

.field-label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.input:focus {
  outline: none;
  border-color: #4A90D9;
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
  color: #F44336;
  margin-bottom: 12px;
}

.preview-section {
  background: #f9f9f9;
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
  color: #888;
}

.preview-value {
  color: #333;
  font-weight: 500;
}

.edit-fields-btn {
  width: 100%;
  margin-top: 10px;
  padding: 8px 0;
  border: 1px solid #4A90D9;
  border-radius: 6px;
  background: #fff;
  color: #4A90D9;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.edit-fields-btn:hover {
  background: #4A90D9;
  color: #fff;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  border: 1px solid #ddd;
  background: #fff;
  color: #666;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-add {
  border: none;
  background: #4A90D9;
  color: #fff;
}

.btn-add:hover {
  background: #3a7bc8;
}
</style>
