import { ref } from 'vue'

interface ToastState {
  message: string
  error: boolean
  visible: boolean
}

const state = ref<ToastState>({
  message: '',
  error: false,
  visible: false,
})

let timer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  function show(message: string, error = false) {
    if (timer) clearTimeout(timer)
    state.value = { message, error, visible: true }
    timer = setTimeout(() => {
      state.value.visible = false
    }, 2000)
  }

  function hide() {
    if (timer) clearTimeout(timer)
    state.value.visible = false
  }

  return {
    toast: state,
    show,
    hide,
  }
}
