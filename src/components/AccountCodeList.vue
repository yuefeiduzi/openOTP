<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccountStore, useSettingsStore } from '@/stores'
import type { Account } from '@/types'
import AccountCard from '@/components/AccountCard.vue'
import { useToast } from '@/composables/useToast'
import { copyToClipboard } from '@/utils/clipboard'
import { siteIdentityOf } from '@/utils/site'

const accountStore = useAccountStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const { show: showToast } = useToast()

const props = withDefaults(defineProps<{
  /**
   * Whether this list may offer to add an account. Adding needs app mode (QR
   * picker, manual entry), so the menu bar popover turns it off and says so
   * instead.
   */
  allowAdd?: boolean
  /**
   * Read-only list (the menu bar popover): codes can be read and copied, but
   * accounts cannot be edited or deleted there.
   */
  readOnly?: boolean
}>(), {
  allowAdd: true,
  readOnly: false,
})

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

const searchQuery = ref('')

/** Searching switches the list from grouped to a flat list of matches. */
const isSearching = computed(() => searchQuery.value.trim().length > 0)

const searchResults = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()
  return accounts.value.filter(account =>
    (account.name || '').toLowerCase().includes(needle) ||
    (account.issuer || '').toLowerCase().includes(needle),
  )
})

interface AccountGroup {
  key: string
  issuer: string
  accounts: Account[]
}

const groups = computed<AccountGroup[]>(() => {
  const map = new Map<string, AccountGroup>()
  for (const account of accounts.value) {
    const { key, label } = siteIdentityOf(account)
    let group = map.get(key)
    if (!group) {
      group = { key, issuer: label, accounts: [] }
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

/**
 * Drag to reorder. The list renders grouped and partially collapsed, so the
 * move is applied to the full id order: the dragged account is taken out and
 * re-inserted at the target's position, before or after it depending on which
 * half of the card the pointer is over.
 */
const draggedId = ref<string | null>(null)
const dropTarget = ref<{ id: string; after: boolean } | null>(null)

const fullOrder = computed(() =>
  [...accountStore.accounts].sort((a, b) => a.order - b.order).map(a => a.id)
)

function handleDragStart(id: string, event: DragEvent) {
  draggedId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
}

function handleDragOver(id: string, event: DragEvent) {
  if (draggedId.value === null || draggedId.value === id) {
    return
  }
  // Needed for the drop event to fire at all.
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }

  const card = event.currentTarget as HTMLElement | null
  const after = card
    ? event.clientY > card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2
    : false
  dropTarget.value = { id, after }
}

function handleDrop() {
  const target = dropTarget.value
  const id = draggedId.value

  resetDrag()

  if (!target || id === null || target.id === id) {
    return
  }

  const ids = fullOrder.value.filter(existing => existing !== id)
  const at = ids.indexOf(target.id)
  if (at === -1) {
    return
  }

  ids.splice(target.after ? at + 1 : at, 0, id)
  accountStore.reorderAccounts(ids)
}

function isDropTarget(id: string, after: boolean): boolean {
  return dropTarget.value?.id === id && dropTarget.value.after === after
}

function resetDrag() {
  draggedId.value = null
  dropTarget.value = null
}

async function handleCopy(code: string) {
  const copied = await copyToClipboard(code)

  if (!copied) {
    showToast(t('errors.copyFailed'), true)
    return
  }

  showToast(t('home.copied'))
}
</script>

<template>
  <div
    class="account-code-list"
    @dragover.prevent
    @drop="handleDrop"
    @dragend="resetDrag"
  >
    <div v-if="accounts.length === 0" class="empty">
      <p class="empty-text">{{ t('home.noAccounts', { type: t('home.totp') }) }}</p>
      <p v-if="!props.allowAdd" class="empty-text">{{ t('home.addInAppMode') }}</p>
      <button v-if="props.allowAdd" class="empty-add-btn" @click="emit('add')">
        {{ t('home.addFirstAccount') }}
      </button>
    </div>
    <input
      v-if="accounts.length"
      v-model="searchQuery"
      class="search-input"
      type="search"
      :placeholder="t('home.searchPlaceholder')"
      :aria-label="t('home.searchPlaceholder')"
    />

    <template v-if="isSearching">
      <AccountCard
        v-for="account in searchResults"
        :key="account.id"
        :account="account"
        :copy-on-tap="settingsStore.settings.autoCopy"
        :read-only="props.readOnly"
        :site-label="siteIdentityOf(account).label"
        show-account-name
        @copy="handleCopy"
        @delete="emit('delete', account)"
        @edit="emit('edit', account)"
      />
      <p v-if="!searchResults.length" class="no-results">{{ t('home.noSearchResults') }}</p>
    </template>

    <template v-for="group in groups" v-else :key="group.key">
      <AccountCard
        :account="group.accounts[0]"
        :copy-on-tap="settingsStore.settings.autoCopy"
        :read-only="props.readOnly"
        :site-label="group.issuer"
        show-account-name
        :class="{ dragging: draggedId === group.accounts[0].id }"
        :data-drop-before="isDropTarget(group.accounts[0].id, false) ? '' : undefined"
        :data-drop-after="isDropTarget(group.accounts[0].id, true) ? '' : undefined"
        draggable="true"
        @dragstart="handleDragStart(group.accounts[0].id, $event)"
        @dragover="handleDragOver(group.accounts[0].id, $event)"
        @drop="handleDrop"
        @dragend="resetDrag"
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
          :copy-on-tap="settingsStore.settings.autoCopy"
          :read-only="props.readOnly"
          :site-label="group.issuer"
          show-account-name
          :class="{ dragging: draggedId === account.id }"
          :data-drop-before="isDropTarget(account.id, false) ? '' : undefined"
          :data-drop-after="isDropTarget(account.id, true) ? '' : undefined"
          draggable="true"
          @dragstart="handleDragStart(account.id, $event)"
          @dragover="handleDragOver(account.id, $event)"
          @drop="handleDrop"
          @dragend="resetDrag"
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
  position: relative;
  flex: 1;
  overflow-y: auto;
}

.dragging {
  opacity: 0.4;
}

/* Drop indicators sit on the card that would be pushed aside. */
.account-code-list :deep(.account-card[data-drop-before]) {
  box-shadow: 0 -2px 0 0 var(--accent);
}

.account-code-list :deep(.account-card[data-drop-after]) {
  box-shadow: 0 2px 0 0 var(--accent);
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--focus-ring);
}

.no-results {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
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
