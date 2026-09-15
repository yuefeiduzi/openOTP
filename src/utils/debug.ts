interface LogEntry {
  time: string
  level: 'info' | 'warn' | 'error'
  args: string
}

const logs: LogEntry[] = []
let enabled = false
let originalLog: typeof console.log
let originalWarn: typeof console.warn
let originalError: typeof console.error

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return a.message + '\n' + (a.stack || '')
      if (typeof a === 'object') {
        try { return JSON.stringify(a, null, 2) } catch { return String(a) }
      }
      return String(a)
    })
    .join(' ')
}

export function enableDebugLog(): void {
  if (enabled) return

  logs.length = 0
  enabled = true

  originalLog = console.log.bind(console)
  originalWarn = console.warn.bind(console)
  originalError = console.error.bind(console)

  console.log = (...args: unknown[]) => {
    if (enabled) {
      logs.push({
        time: new Date().toISOString(),
        level: 'info',
        args: formatArgs(args),
      })
    }
    originalLog(...args)
  }

  console.warn = (...args: unknown[]) => {
    if (enabled) {
      logs.push({
        time: new Date().toISOString(),
        level: 'warn',
        args: formatArgs(args),
      })
    }
    originalWarn(...args)
  }

  console.error = (...args: unknown[]) => {
    if (enabled) {
      logs.push({
        time: new Date().toISOString(),
        level: 'error',
        args: formatArgs(args),
      })
    }
    originalError(...args)
  }
}

export function disableDebugLog(): void {
  if (!enabled) return
  enabled = false
  if (originalLog) console.log = originalLog
  if (originalWarn) console.warn = originalWarn
  if (originalError) console.error = originalError
}

export function isDebugEnabled(): boolean {
  return enabled
}

export function exportLogsText(): string {
  return logs
    .map((entry) => `[${entry.time}] [${entry.level.toUpperCase()}] ${entry.args}`)
    .join('\n')
}
