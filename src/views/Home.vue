<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores'

const router = useRouter()
const accountStore = useAccountStore()
const activeTab = ref<'totp' | 'hotp'>('totp')

function goToSettings() {
  router.push('/settings')
}

function addAccount() {
  // TODO: Implement add account modal
}
</script>

<template>
  <div class="home">
    <header class="header">
      <h1>openOTP</h1>
      <button class="settings-btn" @click="goToSettings">
        <span>⚙️</span>
      </button>
    </header>

    <div class="tabs">
      <button 
        :class="['tab', { active: activeTab === 'totp' }]"
        @click="activeTab = 'totp'"
      >
        TOTP
      </button>
      <button 
        :class="['tab', { active: activeTab === 'hotp' }]"
        @click="activeTab = 'hotp'"
      >
        HOTP
      </button>
    </div>

    <div class="account-list">
      <div v-if="activeTab === 'totp'">
        <p v-if="accountStore.totpAccounts.length === 0" class="empty">
          暂无 TOTP 账号
        </p>
        <div 
          v-for="account in accountStore.totpAccounts" 
          :key="account.id"
          class="account-card"
        >
          <span class="icon">{{ account.icon.value || '🔐' }}</span>
          <span class="code">000 000</span>
          <span class="issuer">{{ account.issuer }}</span>
        </div>
      </div>
      <div v-else>
        <p v-if="accountStore.hotpAccounts.length === 0" class="empty">
          暂无 HOTP 账号
        </p>
        <div 
          v-for="account in accountStore.hotpAccounts" 
          :key="account.id"
          class="account-card"
        >
          <span class="icon">{{ account.icon.value || '🔐' }}</span>
          <span class="code">000 000</span>
          <span class="issuer">{{ account.issuer }}</span>
        </div>
      </div>
    </div>

    <button class="add-btn" @click="addAccount">+</button>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
}

.settings-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: #f0f0f0;
  cursor: pointer;
}

.tab.active {
  background: #4a90d9;
  color: white;
}

.account-list {
  flex: 1;
  overflow-y: auto;
}

.empty {
  text-align: center;
  color: #999;
  padding: 32px;
}

.account-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f8f8f8;
  border-radius: 8px;
}

.account-card .icon {
  font-size: 24px;
  margin-right: 12px;
}

.account-card .code {
  flex: 1;
  font-size: 18px;
  font-family: monospace;
  letter-spacing: 2px;
}

.account-card .issuer {
  font-size: 12px;
  color: #666;
}

.add-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #4a90d9;
  color: white;
  font-size: 24px;
  cursor: pointer;
}
</style>