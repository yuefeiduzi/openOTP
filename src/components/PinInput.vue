<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'complete'): void
}>()

const digits = ref<string[]>(['', '', '', '', '', ''])
const inputRefs = ref<(HTMLInputElement | null)[]>([])

watch(() => props.modelValue, (val) => {
  if (val.length <= 6) {
    const chars = val.split('')
    digits.value = Array.from({ length: 6 }, (_, i) => chars[i] || '')
  }
}, { immediate: true })

function setInputRef(index: number) {
  return (el: any) => {
    inputRefs.value[index] = el as HTMLInputElement | null
  }
}

function handleInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const val = target.value.replace(/\D/g, '')
  
  if (val.length > 0) {
    digits.value[index] = val[val.length - 1]
  } else {
    digits.value[index] = ''
  }

  emit('update:modelValue', digits.value.join(''))

  if (val.length > 0 && index < 5) {
    nextTick(() => {
      inputRefs.value[index + 1]?.focus()
    })
  }

  if (index === 5 && digits.value.every(d => d !== '')) {
    nextTick(() => {
      emit('complete')
    })
  }
}

function handleKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    nextTick(() => {
      inputRefs.value[index - 1]?.focus()
    })
  }
  if (event.key === 'ArrowLeft' && index > 0) {
    nextTick(() => {
      inputRefs.value[index - 1]?.focus()
    })
  }
  if (event.key === 'ArrowRight' && index < 5) {
    nextTick(() => {
      inputRefs.value[index + 1]?.focus()
    })
  }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault()
  const paste = event.clipboardData?.getData('text') || ''
  const nums = paste.replace(/\D/g, '').slice(0, 6).split('')
  for (let i = 0; i < 6; i++) {
    digits.value[i] = nums[i] || ''
  }
  emit('update:modelValue', digits.value.join(''))
  
  const lastFilled = Math.min(nums.length, 5)
  nextTick(() => {
    inputRefs.value[lastFilled]?.focus()
  })
  
  if (digits.value.every(d => d !== '')) {
    nextTick(() => {
      emit('complete')
    })
  }
}

function focus(index: number) {
  inputRefs.value[index]?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="pin-input">
    <input
      v-for="(digit, index) in digits"
      :key="index"
      :ref="setInputRef(index)"
      :value="digit"
      :disabled="disabled"
      type="tel"
      maxlength="1"
      inputmode="numeric"
      pattern="[0-9]"
      class="pin-box"
      :class="{ filled: digit !== '' }"
      @input="handleInput(index, $event)"
      @keydown="handleKeydown(index, $event)"
      @paste="handlePaste"
      @focus="$event.target?.select()"
    />
  </div>
</template>

<style scoped>
.pin-input {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.pin-box {
  width: 44px;
  height: 52px;
  border: 2px solid #ddd;
  border-radius: 10px;
  font-size: 22px;
  text-align: center;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #fafafa;
  color: #333;
}

.pin-box:focus {
  border-color: #4a90d9;
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15);
  background: #fff;
}

.pin-box.filled {
  border-color: #b0b0b0;
  background: #fff;
}

.pin-box:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
