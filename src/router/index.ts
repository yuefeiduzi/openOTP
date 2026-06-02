import { createRouter, createWebHashHistory } from 'vue-router'
import { useSettingsStore } from '@/stores'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue')
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/views/Setup.vue')
    },
    {
      path: '/unlock',
      name: 'unlock',
      component: () => import('@/views/Unlock.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue')
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const settingsStore = useSettingsStore()
  await settingsStore.checkSetup()

  if (!settingsStore.isSetup && to.name !== 'setup') {
    next({ name: 'setup' })
    return
  }

  if (!settingsStore.hasPassword && settingsStore.isLocked) {
    settingsStore.unlock()
  }

  if (settingsStore.isLocked && to.name !== 'unlock' && to.name !== 'setup') {
    next({ name: 'unlock' })
    return
  }

  next()
})

export default router