<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import AccountCodeList from '@/components/AccountCodeList.vue'

async function openMainWindow() {
  await invoke('show_main_window')
}
</script>

<template>
  <div class="popover">
    <header class="popover-header">
      <span class="popover-title">OpenOTP</span>
      <button class="popover-icon-btn" @click="openMainWindow">
        <img class="popover-icon" src="/icon.png" alt="OpenOTP" />
      </button>
    </header>
    <AccountCodeList />
  </div>
</template>

<style scoped>
.popover {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  border-radius: 16px;
  overflow: hidden;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.popover-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.popover-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 8px;
  transition: background 0.15s;
}

.popover-icon-btn:hover {
  background: var(--bg-secondary);
}

.popover-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}
</style>
