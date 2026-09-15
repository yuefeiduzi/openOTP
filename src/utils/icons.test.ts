import { describe, it, expect } from 'vitest'
import type { AccountIcon } from '@/types'
import {
  getRandomBgColor,
  createDefaultIcon,
  renderIcon,
  getIconProvider,
  registerIconProvider,
} from './icons'

const icon = (overrides: Partial<AccountIcon> = {}): AccountIcon => ({
  type: 'initial',
  value: 'A',
  bgColor: '#123456',
  ...overrides,
})

describe('getRandomBgColor', () => {
  it('should return a colour from the preset palette', () => {
    const color = getRandomBgColor()
    expect(color).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('should return different colours across multiple calls', () => {
    const colors = new Set(Array.from({ length: 40 }, () => getRandomBgColor()))
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe('createDefaultIcon', () => {
  it('should derive the initial from the name', () => {
    const icon = createDefaultIcon('github')
    expect(icon.type).toBe('initial')
    expect(icon.value).toBe('G')
    expect(icon.bgColor).toBeTruthy()
  })
})

describe('initial icon styling', () => {
  it('should use the stored background colour', () => {
    const result = renderIcon(icon({ bgColor: '#abcdef' })) as { style: Record<string, string> }
    expect(result.style.backgroundColor).toBe('#abcdef')
  })

  it('should fall back to a palette colour when none is stored', () => {
    const result = renderIcon(icon({ bgColor: '' })) as { style: Record<string, string> }
    expect(result.style.backgroundColor).toMatch(/^#[0-9A-F]{6}$/i)
  })
})

describe('renderIcon', () => {
  it('should render emoji icons as text', () => {
    expect(renderIcon(icon({ type: 'emoji', value: '' }))).toEqual({
      type: 'text',
      value: '🔑',
      style: undefined,
    })
  })

  it('should fall back to a key emoji for an empty emoji icon', () => {
    const result = renderIcon(icon({ type: 'emoji', value: '' }))
    expect(result).toMatchObject({ type: 'text', value: '🔑' })
  })

  it('should render initial icons from the account name', () => {
    const result = renderIcon(icon({ type: 'initial', value: 'x' }), 'github')
    expect(result).toMatchObject({ type: 'text', value: 'G' })
    expect((result as { style: Record<string, string> }).style.borderRadius).toBe('50%')
  })

  it('should fall back to the stored value when no name is available', () => {
    const result = renderIcon(icon({ type: 'initial', value: 'z' }))
    expect(result).toMatchObject({ type: 'text', value: 'Z' })
  })

  it('should render known preset icons as images', () => {
    const result = renderIcon(icon({ type: 'preset', value: 'github' }))
    expect(result.type).toBe('image')
  })

  it('should degrade an unknown preset to an initial instead of a broken image', () => {
    const result = renderIcon(icon({ type: 'preset', value: 'not-a-preset' }), 'gitlab')
    expect(result).toMatchObject({ type: 'text', value: 'G' })
  })

  it('should render uploaded images from data URLs', () => {
    const result = renderIcon(icon({ type: 'image', value: 'data:image/png;base64,AAA' }))
    expect(result).toEqual({ type: 'image', value: 'data:image/png;base64,AAA' })
  })

  it('should show a placeholder for an unresolvable image value', () => {
    expect(renderIcon(icon({ type: 'image', value: 'icon.png' }))).toEqual({ type: 'placeholder' })
  })

  it('should show a placeholder when there is no icon at all', () => {
    expect(renderIcon(null)).toEqual({ type: 'placeholder' })
    expect(renderIcon(undefined)).toEqual({ type: 'placeholder' })
  })
})

describe('icon providers', () => {
  it('should return the provider registered for a type', () => {
    expect(getIconProvider('emoji')?.type).toBe('emoji')
    expect(getIconProvider('preset')?.type).toBe('preset')
  })

  it('should let a new icon type be plugged in without touching the renderers', () => {
    registerIconProvider({
      type: 'initial',
      renderIcon: () => ({ type: 'text', value: 'override' }),
    })

    expect(renderIcon(icon())).toEqual({ type: 'text', value: 'override' })

    // Restore the real provider so other tests are unaffected.
    registerIconProvider({
      type: 'initial',
      renderIcon: (i, name) => ({
        type: 'text',
        value: (name || i.value || '?').charAt(0).toUpperCase(),
        style: { backgroundColor: i.bgColor },
      }),
    })
    expect(renderIcon(icon(), 'alice')).toMatchObject({ value: 'A' })
  })
})