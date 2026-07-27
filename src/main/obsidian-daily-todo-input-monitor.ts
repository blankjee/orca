import {
  readObsidianDailyTodoAxSnapshot,
  type ObsidianDailyTodoAxSnapshot
} from './obsidian-daily-todo-ax-reader'

export type ObsidianDailyTodoInputMonitorReason = 'value_cleared' | 'focus_changed' | 'content_jump'

export type ObsidianDailyTodoInputMonitorEvent = {
  text: string
  app: string
  bundleId: string
  windowTitle: string
  timestamp: number
  reason: ObsidianDailyTodoInputMonitorReason
}

type InputCallback = (event: ObsidianDailyTodoInputMonitorEvent) => void | Promise<void>

const POLL_INTERVAL_MS = 250
const MIN_TEXT_LEN = 2
const MAX_VALUE_LEN = 2000
const BROWSER_MIN_DWELL_MS = 30_000

const BROWSER_BUNDLE_IDS = new Set([
  'com.google.Chrome',
  'com.google.Chrome.canary',
  'com.apple.Safari',
  'com.apple.SafariTechnologyPreview',
  'com.microsoft.edgemac',
  'com.microsoft.edgemac.Beta',
  'company.thebrowser.Browser',
  'org.mozilla.firefox',
  'com.brave.Browser',
  'com.operasoftware.Opera'
])

function focusKey(snapshot: ObsidianDailyTodoAxSnapshot): string {
  return `${snapshot.bundleId}|${snapshot.role}`
}

function isBrowser(bundleId: string | undefined): boolean {
  return Boolean(bundleId && BROWSER_BUNDLE_IDS.has(bundleId))
}

function stripTail(text: string): string {
  return text.replace(/(?:\s|\u200B|\u200C|\u200D|\uFEFF)+$/gu, '')
}

function isContentJump(oldText: string, newText: string): boolean {
  const oldValue = stripTail(oldText)
  const newValue = stripTail(newText)
  if (oldValue.length < 4 || newValue.length < 4) {
    return false
  }
  if (oldValue.includes(newValue) || newValue.includes(oldValue)) {
    return false
  }
  const minLength = Math.min(oldValue.length, newValue.length)
  const threshold = Math.max(3, Math.floor(minLength * 0.3))
  let commonPrefix = 0
  for (let index = 0; index < minLength; index += 1) {
    if (oldValue[index] === newValue[index]) {
      commonPrefix += 1
    } else {
      break
    }
  }
  if (commonPrefix >= threshold) {
    return false
  }
  let commonSuffix = 0
  for (let index = 1; index <= minLength; index += 1) {
    if (oldValue[oldValue.length - index] === newValue[newValue.length - index]) {
      commonSuffix += 1
    } else {
      break
    }
  }
  return commonSuffix < threshold
}

export class ObsidianDailyTodoInputMonitor {
  private timer: NodeJS.Timeout | null = null
  private polling = false
  private callback: InputCallback | null = null
  private lastSnapshot: ObsidianDailyTodoAxSnapshot | null = null
  private lastNonEmptyValue = ''
  private valueOnFocusEnter = ''
  private focusEnteredAt = 0
  private started = false

  get isRunning(): boolean {
    return this.started
  }

  start(callback: InputCallback): void {
    if (this.started) {
      this.callback = callback
      return
    }
    this.callback = callback
    this.started = true
    this.timer = setInterval(() => {
      void this.tick()
    }, POLL_INTERVAL_MS)
    console.log('[obsidian-ai-capture][monitor] started')
  }

  stop(): void {
    if (!this.started) {
      return
    }
    if (this.timer) {
      clearInterval(this.timer)
    }
    this.timer = null
    this.callback = null
    this.started = false
    this.resetState()
    console.log('[obsidian-ai-capture][monitor] stopped')
  }

  private resetState(): void {
    this.lastSnapshot = null
    this.lastNonEmptyValue = ''
    this.valueOnFocusEnter = ''
    this.focusEnteredAt = 0
  }

  private async tick(): Promise<void> {
    if (this.polling) {
      return
    }
    this.polling = true
    try {
      const snapshot = await readObsidianDailyTodoAxSnapshot()
      if (!snapshot) {
        return
      }
      if ((snapshot.value || '').length > MAX_VALUE_LEN) {
        if (this.lastSnapshot) {
          this.resetState()
        }
        return
      }
      this.handleSnapshot(snapshot)
    } finally {
      this.polling = false
    }
  }

  private handleSnapshot(snapshot: ObsidianDailyTodoAxSnapshot): void {
    const previous = this.lastSnapshot
    const currentValue = snapshot.value || ''
    const now = Date.now()
    if (!previous) {
      this.lastSnapshot = snapshot
      this.focusEnteredAt = now
      this.valueOnFocusEnter = currentValue
      if (currentValue.length >= MIN_TEXT_LEN) {
        this.lastNonEmptyValue = currentValue
      }
      return
    }

    const focusChanged = focusKey(previous) !== focusKey(snapshot)
    if (focusChanged) {
      const dwellMs = now - this.focusEnteredAt
      const dwellPass = !isBrowser(previous.bundleId) || dwellMs >= BROWSER_MIN_DWELL_MS
      const userModified = this.lastNonEmptyValue !== this.valueOnFocusEnter
      if (dwellPass && userModified && this.lastNonEmptyValue.length >= MIN_TEXT_LEN) {
        this.emit(this.lastNonEmptyValue, previous, 'focus_changed')
      }
      this.lastNonEmptyValue = currentValue.length >= MIN_TEXT_LEN ? currentValue : ''
      this.valueOnFocusEnter = currentValue
      this.focusEnteredAt = now
      this.lastSnapshot = snapshot
      return
    }

    const previousHadText = (previous.value || '').length >= MIN_TEXT_LEN
    const currentHasText = currentValue.length >= MIN_TEXT_LEN
    if (previousHadText && !currentHasText) {
      const dwellMs = now - this.focusEnteredAt
      const dwellPass = !isBrowser(snapshot.bundleId) || dwellMs >= BROWSER_MIN_DWELL_MS
      const userModified = this.lastNonEmptyValue !== this.valueOnFocusEnter
      if (dwellPass && userModified && this.lastNonEmptyValue) {
        this.emit(this.lastNonEmptyValue, previous, 'value_cleared')
      }
      this.lastNonEmptyValue = ''
    } else if (currentHasText) {
      const previousValue = previous.value || ''
      if (
        currentValue !== previousValue &&
        this.lastNonEmptyValue.length >= MIN_TEXT_LEN &&
        isContentJump(this.lastNonEmptyValue, currentValue)
      ) {
        const dwellMs = now - this.focusEnteredAt
        const dwellPass = !isBrowser(snapshot.bundleId) || dwellMs >= BROWSER_MIN_DWELL_MS
        if (dwellPass) {
          this.emit(this.lastNonEmptyValue, previous, 'content_jump')
        }
        this.focusEnteredAt = now
      }
      this.lastNonEmptyValue = currentValue
    }

    this.lastSnapshot = snapshot
  }

  private emit(
    text: string,
    snapshot: ObsidianDailyTodoAxSnapshot,
    reason: ObsidianDailyTodoInputMonitorReason
  ): void {
    const callback = this.callback
    if (!callback) {
      return
    }
    const trimmed = text.trim()
    if (trimmed.length < MIN_TEXT_LEN) {
      return
    }
    const sourceText =
      isBrowser(snapshot.bundleId) && snapshot.windowTitle
        ? `[页面: ${snapshot.windowTitle}]\n${trimmed}`
        : trimmed
    void callback({
      text: sourceText,
      app: snapshot.appName || 'Unknown',
      bundleId: snapshot.bundleId || 'unknown',
      windowTitle: snapshot.windowTitle || '',
      timestamp: Date.now(),
      reason
    })
  }
}
