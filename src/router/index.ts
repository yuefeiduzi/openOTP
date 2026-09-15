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
    },
    {
      path: '/popover',
      name: 'popover',
      component: () => import('@/views/PopoverView.vue')
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  // The menu bar popover is a window, not a privileged route: it has to pass
  // the same lock check as the main window, or the tray icon becomes a way to
  // read codes without unlocking.
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
    // Remember where the user was headed so unlocking returns them there.
    next({ name: 'unlock', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } })
    return
  }

  next()
})

export default router