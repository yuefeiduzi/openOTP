<script setup lang="ts">
import { computed, ref } from 'vue'
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
  (e: 'add'): void
}>()

const accounts = computed(() =>
  accountStore.accounts
    .filter(a => a.type === 'totp')
    .sort((a, b) => a.order - b.order)
)

interface AccountGroup {
  key: string
  issuer: string
  accounts: Account[]
}

const groups = computed<AccountGroup[]>(() => {
  const map = new Map<string, AccountGroup>()
  for (const account of accounts.value) {
    const key = (account.issuer || account.name || '').trim().toLowerCase() || account.id
    let group = map.get(key)
    if (!group) {
      group = { key, issuer: account.issuer || account.name || '', accounts: [] }
      map.set(key, group)
    }
    group.accounts.push(account)
  }
  return [...map.values()]
})

const expandedGroups = ref<Set<string>>(new Set())

function toggleGroup(key: string) {
  const next = new Set(expandedGroups.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  expandedGroups.value = next
}

function handleCopy(code: string) {
  navigator.clipboard.writeText(code)
  showToast(t('home.copied'))
}
</script>

<template>
  <div class="account-code-list">
    <div v-if="accounts.length === 0" class="empty">
      <p class="empty-text">{{ t('home.noAccounts', { type: 'TOTP' }) }}</p>
      <button class="empty-add-btn" @click="emit('add')">
        {{ t('home.addFirstAccount') }}
      </button>
    </div>
    <template v-for="group in groups" :key="group.key">
      <AccountCard
        :account="group.accounts[0]"
        @copy="handleCopy"
        @delete="emit('delete', group.accounts[0])"
        @edit="emit('edit', group.accounts[0])"
      />
      <button
        v-if="group.accounts.length > 1"
        class="group-toggle"
        @click="toggleGroup(group.key)"
      >
        <span class="group-arrow" :class="{ expanded: expandedGroups.has(group.key) }">›</span>
        {{ expandedGroups.has(group.key)
          ? t('home.collapseGroup')
          : t('home.sameIssuerMore', { count: group.accounts.length - 1 }) }}
      </button>
      <template v-if="expandedGroups.has(group.key)">
        <AccountCard
          v-for="account in group.accounts.slice(1)"
          :key="account.id"
          :account="account"
          @copy="handleCopy"
          @delete="emit('delete', account)"
          @edit="emit('edit', account)"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.account-code-list {
  flex: 1;
  overflow-y: auto;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 32px;
  text-align: center;
}

.empty-text {
  color: var(--text-secondary);
}

.empty-add-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.empty-add-btn:hover {
  background: var(--accent-hover);
}

.group-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin: 4px 0;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: var(--bg-secondary, var(--card-bg));
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.group-toggle:hover {
  background: var(--card-bg);
}

.group-arrow {
  display: inline-block;
  transition: transform 0.2s;
}

.group-arrow.expanded {
  transform: rotate(90deg);
}
</style>
