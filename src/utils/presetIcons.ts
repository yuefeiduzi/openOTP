const modules = import.meta.glob('../assets/preset-icons/*.svg', { eager: true }) as Record<string, { default: string }>

export interface PresetIcon {
  name: string
  url: string
}

export const PRESET_ICONS: PresetIcon[] = Object.entries(modules)
  .map(([path, mod]) => ({
    name: path.split('/').pop()!.replace(/\.svg$/, ''),
    url: mod.default,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function getPresetIconUrl(name: string): string {
  return PRESET_ICONS.find(p => p.name === name)?.url ?? ''
}
