import type { AccountIcon } from '@/types'

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
