<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '@/stores'
import type { Account } from '@/types'
import AccountCard from '@/components/AccountCard.vue'
import { useToast } from '@/composables/useToast'

const accountStore = useAccountStore()
const { t } = useI18n()
const { show: showToast } = useToast()

const emit = defineEmits<{
  (e: 'delete', account: Account): void
  (e: 'edit', account: Account): void
}>()

const accounts = computed(() =>
  accountStore.accounts
    .filter(a => a.type === 'totp')
    .sort((a, b) => a.order - b.order)
)

function handleCopy(code: string) {
  navigator.clipboard.writeText(code)
  showToast(t('home.copied'))
}
</script>

<template>
  <div class="account-code-list">
    <p v-if="accounts.length === 0" class="empty">
      {{ t('home.noAccounts', { type: 'TOTP' }) }}
    </p>
    <AccountCard
      v-for="account in accounts"
      :key="account.id"
      :account="account"
      @copy="handleCopy"
      @delete="emit('delete', account)"
      @edit="emit('edit', account)"
    />
  </div>
</template>

<style scoped>
.account-code-list {
  flex: 1;
  overflow-y: auto;
}

.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 32px;
}
</style>
