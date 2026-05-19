<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores'

const router = useRouter()
const settingsStore = useSettingsStore()

function goBack() {
  router.back()
}

function exportBackup() {
  // TODO: Implement export
}

function importBackup() {
  // TODO: Implement import
}
</script>

<template>
  <div class="settings">
    <header class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>设置</h1>
    </header>

    <div class="settings-list">
      <div class="setting-item">
        <label>
          <span>生物识别解锁</span>
          <input 
            type="checkbox"
            v-model="settingsStore.settings.biometricEnabled"
          />
        </label>
      </div>

      <div class="setting-item">
        <label>
          <span>自动复制到剪贴板</span>
          <input 
            type="checkbox"
            v-model="settingsStore.settings.autoCopy"
          />
        </label>
      </div>

      <div class="setting-item">
        <span>剪贴板清除时间</span>
        <select v-model.number="settingsStore.settings.clipboardClearTime">
          <option :value="30">30秒</option>
          <option :value="60">60秒</option>
          <option :value="0">永不</option>
        </select>
      </div>

      <div class="setting-item">
        <span>应用锁定时间</span>
        <select v-model.number="settingsStore.settings.lockTimeout">
          <option :value="0">立即</option>
          <option :value="1">1分钟</option>
          <option :value="5">5分钟</option>
        </select>
      </div>

      <div class="setting-item">
        <button class="action-btn" @click="exportBackup">导出备份</button>
      </div>

      <div class="setting-item">
        <button class="action-btn" @click="importBackup">导入备份</button>
      </div>

      <div class="setting-item">
        <button class="action-btn danger">修改主密码</button>
      </div>
    </div>

    <footer class="footer">
      <p>openOTP v0.1.0</p>
      <p>开源地址：github.com/openotp/openotp</p>
    </footer>
  </div>
</template>

<style scoped>
.settings {
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.back-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding-right: 12px;
}

.header h1 {
  font-size: 20px;
}

.settings-list {
  margin-bottom: 24px;
}

.setting-item {
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.setting-item label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.setting-item select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.action-btn {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  cursor: pointer;
}

.action-btn.danger {
  border-color: #e74c3c;
  color: #e74c3c;
}

.footer {
  text-align: center;
  color: #999;
  font-size: 12px;
}

.footer p {
  margin: 4px 0;
}
</style>