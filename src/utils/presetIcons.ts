// SVG sources are imported raw rather than through Vite's asset pipeline so the
// artwork's own colour stays readable in code. The dark theme needs it: a brand
// colour that is nearly as dark as the surface has to be drawn as a silhouette
// instead of being left as-is (see `lowContrastInDark`).
const modules = import.meta.glob('../assets/preset-icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export interface PresetIcon {
  name: string
  url: string
  /** True when every colour in the artwork is too dark for the dark theme. */
  lowContrastInDark: boolean
}

/** `--bg-secondary` of the dark theme, the surface a preset icon sits on. */
const DARK_SURFACE = '#2c2c2e'
/** Below this contrast ratio a mark reads as invisible rather than as an icon. */
const MIN_CONTRAST = 3

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG relative luminance of a `#rgb` / `#rrggbb` colour. */
function relativeLuminance(hex: string): number {
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex

  const r = channel(parseInt(full.slice(1, 3), 16))
  const g = channel(parseInt(full.slice(3, 5), 16))
  const b = channel(parseInt(full.slice(5, 7), 16))

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function fillColors(svg: string): string[] {
  return [...svg.matchAll(/fill="(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})"/g)].map(match => match[1])
}

/**
 * An icon counts as low contrast when *its brightest colour* is still close to
 * the dark surface: a multi-colour mark stays readable as long as one of its
 * colours is, so only icons that are dark throughout get the silhouette.
 */
function isLowContrastInDark(svg: string): boolean {
  const colors = fillColors(svg)
  if (colors.length === 0) {
    return false
  }

  const best = Math.max(...colors.map(color => contrastRatio(color, DARK_SURFACE)))
  return best < MIN_CONTRAST
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const PRESET_ICONS: PresetIcon[] = Object.entries(modules)
  .map(([path, svg]) => ({
    name: path.split('/').pop()!.replace(/\.svg$/, ''),
    url: toDataUrl(svg),
    lowContrastInDark: isLowContrastInDark(svg),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function getPresetIcon(name: string): PresetIcon | undefined {
  return PRESET_ICONS.find(icon => icon.name === name)
}

export function getPresetIconUrl(name: string): string {
  return getPresetIcon(name)?.url ?? ''
}
