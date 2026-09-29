import { describe, it, expect } from 'vitest'
import zhCN from './zh-CN'
import enUS from './en-US'

type LocaleTree = { [key: string]: string | LocaleTree }

function flatten(tree: LocaleTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  )
}

/** Raw contents of every source file, so the locale files can be linted. */
const sources: Record<string, string> = import.meta.glob('../**/*.{ts,vue}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// Paths are relative to this file: './' is the locales directory itself.
const sourceEntries = Object.entries(sources).filter(
  ([path]) => path.startsWith('../') && !path.endsWith('.test.ts'),
)

const combined = sourceEntries.map(([, source]) => source).join('\n')

const zhKeys = flatten(zhCN as LocaleTree)
const enKeys = flatten(enUS as LocaleTree)

describe('translations', () => {
  it('should collect the source files to check', () => {
    expect(sourceEntries.length).toBeGreaterThan(20)
    expect(sourceEntries.some(([path]) => path.endsWith('Settings.vue'))).toBe(true)
  })

  it('should define the same keys in every locale', () => {
    expect(zhKeys.filter(key => !enKeys.includes(key))).toEqual([])
    expect(enKeys.filter(key => !zhKeys.includes(key))).toEqual([])
  })

  it('should not reference keys that do not exist', () => {
    const referenced = [...combined.matchAll(/\bt\(\s*'([A-Za-z0-9_.]+)'/g)].map(match => match[1])
    const missing = [...new Set(referenced)].filter(key => !zhKeys.includes(key))

    expect(missing).toEqual([])
  })

  it('should not define keys that nothing uses', () => {
    const unused = zhKeys.filter(
      key => !combined.includes(`'${key}'`) && !combined.includes(`"${key}"`) && !combined.includes(`\`${key}\``),
    )

    // Keys are matched as literals, so keep t() calls static: a key built by
    // string concatenation would be reported here even though it is used.
    expect(unused).toEqual([])
  })

  it('should not leave hardcoded Chinese next to translated labels', () => {
    const offenders: string[] = []

    for (const [path, source] of sourceEntries) {
      const withoutHtmlComments = source.replace(/<!--[\s\S]*?-->/g, '')

      const hardcoded = withoutHtmlComments.split('\n').some(rawLine => {
        const line = rawLine.trim()
        // Comments may be written in Chinese; user-visible text may not.
        if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) {
          return false
        }
        // A quoted literal, or text sitting between tags in a template.
        return (
          /['"`][^'"`]*[\u4e00-\u9fff]/.test(rawLine) ||
          />[^<>]*[\u4e00-\u9fff][^<>]*</.test(rawLine)
        )
      })

      if (hardcoded) {
        offenders.push(path)
      }
    }

    expect(offenders).toEqual([])
  })
})
