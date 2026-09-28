import { describe, it, expect } from 'vitest'
import { PRESET_ICONS, getPresetIcon, getPresetIconUrl } from './presetIcons'

describe('PRESET_ICONS', () => {
  it('should expose every checked-in brand icon', () => {
    expect(PRESET_ICONS.length).toBeGreaterThanOrEqual(23)
    expect(PRESET_ICONS.map(icon => icon.name)).toContain('github')
  })

  it('should build data URLs the image tag can render', () => {
    for (const icon of PRESET_ICONS) {
      expect(icon.url.startsWith('data:image/svg+xml,')).toBe(true)
      // '#' must stay escaped or the data URL would be truncated at the colour.
      expect(icon.url).not.toContain('#')
    }
  })

  it('should keep every brand colour in the artwork', () => {
    const google = decodeURIComponent(getPresetIconUrl('google'))
    expect(google).toContain('#4285F4')
  })

  it('should mark artwork that is invisible on the dark surface', () => {
    // #181717 vs the dark surface is about 1.3:1 — the icon needs the silhouette.
    expect(getPresetIcon('github')?.lowContrastInDark).toBe(true)
    // #F38020 is bright enough to stay as-is.
    expect(getPresetIcon('cloudflare')?.lowContrastInDark).toBe(false)
  })

  it('should treat a multicolour mark as readable when one colour is', () => {
    // The Microsoft four squares are bright even though the mark as a whole is
    // not a single colour.
    expect(getPresetIcon('microsoft')?.lowContrastInDark).toBe(false)
  })

  it('should return an empty URL for an unknown name', () => {
    expect(getPresetIconUrl('no-such-brand')).toBe('')
  })
})