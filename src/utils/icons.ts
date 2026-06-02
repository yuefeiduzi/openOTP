import type { AccountIcon, IconType } from '@/types'

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#E59866',
]

export function getRandomBgColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
}

export function getIconDisplay(icon: AccountIcon, name?: string): string {
  if (icon.type === 'emoji' || icon.type === 'image') {
    return icon.value
  }
  if (name) {
    return name.charAt(0).toUpperCase()
  }
  return icon.value.toUpperCase()
}

export function isEmojiIcon(icon: AccountIcon): boolean {
  return icon.type === 'emoji'
}

export function getInitialStyle(icon: AccountIcon): Record<string, string> {
  return {
    backgroundColor: icon.bgColor,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    fontSize: '16px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
}

export interface IconProvider {
  type: IconType
  renderIcon(icon: AccountIcon, name?: string): IconRenderResult
  editorComponent?: string
}

export interface IconRenderResult {
  type: 'text' | 'image' | 'component'
  value?: string
  style?: Record<string, string>
}

const providers = new Map<IconType, IconProvider>()

export function registerIconProvider(provider: IconProvider): void {
  providers.set(provider.type, provider)
}

export function getIconProvider(type: IconType): IconProvider | undefined {
  return providers.get(type)
}

const emojiProvider: IconProvider = {
  type: 'emoji',
  renderIcon(icon) {
    return { type: 'text', value: icon.value }
  },
}

const initialProvider: IconProvider = {
  type: 'initial',
  renderIcon(icon, name) {
    const initial = name ? name.charAt(0).toUpperCase() : icon.value.toUpperCase()
    return {
      type: 'text',
      value: initial,
      style: getInitialStyle(icon),
    }
  },
}

const presetProvider: IconProvider = {
  type: 'preset',
  renderIcon(icon) {
    return { type: 'text', value: icon.value || '?' }
  },
}

const imageProvider: IconProvider = {
  type: 'image',
  renderIcon(icon) {
    return { type: 'image', value: icon.value }
  },
}

registerIconProvider(emojiProvider)
registerIconProvider(initialProvider)
registerIconProvider(presetProvider)
registerIconProvider(imageProvider)

export function createDefaultIcon(name: string): AccountIcon {
  return {
    type: 'initial',
    value: name.charAt(0).toUpperCase(),
    bgColor: getRandomBgColor(),
  }
}
