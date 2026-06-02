<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toast } = useToast()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div v-if="toast.visible" class="global-toast" :class="{ error: toast.error }">
        {{ toast.message }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.global-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 14px 28px;
  border-radius: 10px;
  font-size: 14px;
  z-index: 9999;
  pointer-events: none;
  white-space: nowrap;
}

.global-toast.error {
  background: rgba(231, 76, 60, 0.9);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}
</style>
