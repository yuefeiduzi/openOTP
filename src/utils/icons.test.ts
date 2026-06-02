import { describe, it, expect } from 'vitest'
import {
  getRandomBgColor,
  getIconDisplay,
  isEmojiIcon,
  getInitialStyle,
} from './icons'
import type { AccountIcon } from '@/types'

describe('getRandomBgColor', () => {
  it('should return a color from the preset palette', () => {
    const PRESET_COLORS = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#E59866',
    ]
    const color = getRandomBgColor()
    expect(PRESET_COLORS).toContain(color)
  })

  it('should return different colors across multiple calls', () => {
    const colors = new Set<string>()
    for (let i = 0; i < 50; i++) {
      colors.add(getRandomBgColor())
    }
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe('getIconDisplay', () => {
  it('should return emoji value for emoji type', () => {
    const icon: AccountIcon = { type: 'emoji', value: '🔑', bgColor: '' }
    expect(getIconDisplay(icon, 'Test')).toBe('🔑')
  })

  it('should return image value for image type', () => {
    const icon: AccountIcon = { type: 'image', value: 'icon.png', bgColor: '' }
    expect(getIconDisplay(icon, 'Test')).toBe('icon.png')
  })

  it('should return first letter of name for initial type with name', () => {
    const icon: AccountIcon = { type: 'initial', value: 'T', bgColor: '#FF6B6B' }
    expect(getIconDisplay(icon, 'Test')).toBe('T')
  })

  it('should fall back to uppercase icon value when no name', () => {
    const icon: AccountIcon = { type: 'initial', value: 'x', bgColor: '#FF6B6B' }
    expect(getIconDisplay(icon)).toBe('X')
  })

  it('should return uppercase for icon value when no name provided', () => {
    const icon: AccountIcon = { type: 'initial', value: 'a', bgColor: '#000' }
    expect(getIconDisplay(icon, undefined)).toBe('A')
  })
})

describe('isEmojiIcon', () => {
  it('should return true for emoji type', () => {
    const icon: AccountIcon = { type: 'emoji', value: '🔑', bgColor: '' }
    expect(isEmojiIcon(icon)).toBe(true)
  })

  it('should return false for initial type', () => {
    const icon: AccountIcon = { type: 'initial', value: 'T', bgColor: '#FF6B6B' }
    expect(isEmojiIcon(icon)).toBe(false)
  })

  it('should return false for image type', () => {
    const icon: AccountIcon = { type: 'image', value: 'img.png', bgColor: '' }
    expect(isEmojiIcon(icon)).toBe(false)
  })

  it('should return false for preset type', () => {
    const icon: AccountIcon = { type: 'preset', value: 'github', bgColor: '' }
    expect(isEmojiIcon(icon)).toBe(false)
  })
})

describe('getInitialStyle', () => {
  it('should return inline style object with background color', () => {
    const icon: AccountIcon = { type: 'initial', value: 'A', bgColor: '#FF6B6B' }
    const style = getInitialStyle(icon)
    expect(style.backgroundColor).toBe('#FF6B6B')
    expect(style.color).toBe('#fff')
    expect(style.display).toBe('flex')
    expect(style.alignItems).toBe('center')
    expect(style.justifyContent).toBe('center')
    expect(style.borderRadius).toBe('50%')
    expect(style.fontSize).toBe('16px')
    expect(style.fontWeight).toBe('bold')
    expect(style.textTransform).toBe('uppercase')
  })

  it('should return width and height as strings', () => {
    const icon: AccountIcon = { type: 'initial', value: 'B', bgColor: '#4ECDC4' }
    const style = getInitialStyle(icon)
    expect(style.width).toBe('36px')
    expect(style.height).toBe('36px')
  })
})
