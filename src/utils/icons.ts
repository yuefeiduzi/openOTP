import type { AccountIcon, IconType } from '@/types'
import { getPresetIconUrl } from './presetIcons'

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#E59866',
]

export function getRandomBgColor(): string {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
}

export function createDefaultIcon(name: string): AccountIcon {
  return {
    type: 'initial',
    value: name.charAt(0).toUpperCase(),
    bgColor: getRandomBgColor(),
  }
}

function getInitialStyle(icon: AccountIcon): Record<string, string> {
  return {
    backgroundColor: icon.bgColor || PRESET_COLORS[0],
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

/**
 * What a renderer should draw for an account icon. Every surface that shows an
 * icon (the account card, the pickers, the editors) goes through
 * [`renderIcon`], so a new icon type only has to be registered here.
 */
export type IconRenderResult =
  | { type: 'text'; value: string; style?: Record<string, string> }
  | { type: 'image'; value: string }
  | { type: 'placeholder' }

export interface IconProvider {
  type: IconType
  renderIcon(icon: AccountIcon, name?: string): IconRenderResult
}

const providers = new Map<IconType, IconProvider>()

export function registerIconProvider(provider: IconProvider): void {
  providers.set(provider.type, provider)
}

export function getIconProvider(type: IconType): IconProvider | undefined {
  return providers.get(type)
}

/** Letter shown for an account: its name wins, then the stored value. */
function initialFor(icon: AccountIcon, name?: string): string {
  const source = name || icon.value || '?'
  return source.charAt(0).toUpperCase()
}

function textIcon(value: string, style?: Record<string, string>): IconRenderResult {
  return { type: 'text', value, style }
}

const placeholder: IconRenderResult = { type: 'placeholder' }

const emojiProvider: IconProvider = {
  type: 'emoji',
  renderIcon(icon) {
    return textIcon(icon.value || '🔑')
  },
}

const initialProvider: IconProvider = {
  type: 'initial',
  renderIcon(icon, name) {
    return textIcon(initialFor(icon, name), getInitialStyle(icon))
  },
}

const presetProvider: IconProvider = {
  type: 'preset',
  renderIcon(icon, name) {
    const url = getPresetIconUrl(icon.value)
    // An unknown preset name must not become a broken <img>, so fall back to
    // the initial letter the same way the other text providers do.
    return url ? { type: 'image', value: url } : textIcon(initialFor(icon, name), getInitialStyle(icon))
  },
}

const imageProvider: IconProvider = {
  type: 'image',
  renderIcon(icon) {
    const value = icon.value || ''
    if (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/')) {
      return { type: 'image', value }
    }
    // Old or hand-edited data may hold a bare file name we cannot resolve.
    return placeholder
  },
}

registerIconProvider(emojiProvider)
registerIconProvider(initialProvider)
registerIconProvider(presetProvider)
registerIconProvider(imageProvider)

/** Single entry point for turning a stored icon into something renderable. */
export function renderIcon(icon: AccountIcon | undefined | null, name?: string): IconRenderResult {
  if (!icon) {
    return placeholder
  }

  const provider = getIconProvider(icon.type)
  return provider ? provider.renderIcon(icon, name) : placeholder
}
