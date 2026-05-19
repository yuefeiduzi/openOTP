export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export async function clearClipboard(): Promise<void> {
  await navigator.clipboard.writeText('')
}

export function scheduleClearClipboard(delaySeconds: number): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    void clearClipboard()
  }, delaySeconds * 1000)
}

export function cancelScheduledClear(timerId: ReturnType<typeof setTimeout>): void {
  clearTimeout(timerId)
}
