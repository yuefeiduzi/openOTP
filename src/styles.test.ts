import { describe, it, expect } from 'vitest'

const components = import.meta.glob('./**/*.vue', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>


function styleBlocks(source: string): string[] {
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1])
}

describe('component styles', () => {
  it('should not combine :global() with :deep() in one selector', () => {
    // Vue's SFC compiler silently drops the descendant part of such a selector:
    // `:global(html.popover-window) :deep(.pin-box) { width: 34px }` compiled to
    // `html.popover-window { width: 34px }` — a rule on <html> itself, which made
    // the whole menu bar popover 34px wide and wrapped every element in it.
    //
    // Per-window overrides like the popover's PIN sizes therefore live in the
    // global sheet (`style.css`), where `html.popover-window .unlock .pin-box`
    // compiles to exactly that.
    const offenders: string[] = []

    for (const [path, source] of Object.entries(components)) {
      for (const block of styleBlocks(source)) {
        for (const [selector] of block.matchAll(/[^{}]+\{/g)) {
          if (selector.includes(':global(') && selector.includes(':deep(')) {
            offenders.push(`${path}: ${selector.trim()}`)
          }
        }
      }
    }

    expect(offenders).toEqual([])
  })
})

describe('setting row colours', () => {
  it('should set a text colour on the setting rows', () => {
    // Buttons do not inherit `color`. The rows style their own background, so
    // without a colour of their own the labels fall back to the platform
    // default — black, which is unreadable on the dark theme's cards.
    const block = styleBlocks(components['./views/Settings.vue']).join('\n')
    const rule = block.match(/\.setting-btn\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(rule).toMatch(/color\s*:/)
  })
})