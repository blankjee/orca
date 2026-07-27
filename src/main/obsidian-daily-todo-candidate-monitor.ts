import { BrowserWindow, Notification, type WebContents } from 'electron'

import { loadObsidianDailyTodos } from './obsidian-daily-todo-service'
import {
  buildExistingTodosForCandidateAnalysis,
  type ObsidianDailyTodoCandidateService
} from './obsidian-daily-todo-candidate-service'
import {
  ObsidianDailyTodoInputMonitor,
  type ObsidianDailyTodoInputMonitorEvent
} from './obsidian-daily-todo-input-monitor'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidateMonitorStartInput,
  ObsidianDailyTodoCandidateMonitorStatusResult
} from '../shared/obsidian-daily-todo-candidate'

type CandidateServicePort = Pick<ObsidianDailyTodoCandidateService, 'analyzeText' | 'list'>
type InputMonitorPort = Pick<ObsidianDailyTodoInputMonitor, 'isRunning' | 'start' | 'stop'>
type CandidateMonitorOptions = {
  monitor?: InputMonitorPort
  notify?: (
    webContents: WebContents | null,
    sourceApp: string,
    candidates: readonly ObsidianDailyTodoCandidate[]
  ) => void
}

export class ObsidianDailyTodoCandidateMonitorController {
  private readonly monitor: InputMonitorPort
  private readonly notify: NonNullable<CandidateMonitorOptions['notify']>
  private target: ObsidianDailyTodoCandidateMonitorStartInput | null = null
  private analyzing = false
  private lastAnalyzedText = ''
  private lastCapturedText = ''
  private pendingEvent: ObsidianDailyTodoInputMonitorEvent | null = null
  private webContents: WebContents | null = null

  constructor(
    private readonly candidateService: CandidateServicePort,
    options: CandidateMonitorOptions = {}
  ) {
    this.monitor = options.monitor ?? new ObsidianDailyTodoInputMonitor()
    this.notify = options.notify ?? showTodoCandidateNotification
  }

  start(
    input: ObsidianDailyTodoCandidateMonitorStartInput,
    webContents: WebContents
  ): ObsidianDailyTodoCandidateMonitorStatusResult {
    if (!input.directory.trim() || !input.filePath.trim()) {
      return { ok: false, code: 'invalid-input', message: 'Invalid monitor input.' }
    }
    this.target = input
    this.webContents = webContents
    this.monitor.start(
      (event) => this.handleInputEvent(event),
      (message) => this.handleMonitorError(message)
    )
    return { ok: true, running: true }
  }

  stop(): ObsidianDailyTodoCandidateMonitorStatusResult {
    this.monitor.stop()
    this.target = null
    this.webContents = null
    this.analyzing = false
    this.pendingEvent = null
    this.lastCapturedText = ''
    this.lastAnalyzedText = ''
    return { ok: true, running: false }
  }

  status(): ObsidianDailyTodoCandidateMonitorStatusResult {
    return { ok: true, running: this.monitor.isRunning }
  }

  private handleMonitorError(message: string): void {
    // Why: a TCC denial is fatal for accessibility polling; leaving the toggle
    // active would claim monitoring works while every snapshot is being discarded.
    this.monitor.stop()
    this.target = null
    this.webContents?.send('obsidianDailyTodos:candidates:monitorError', message, true)
  }

  private async handleInputEvent(event: ObsidianDailyTodoInputMonitorEvent): Promise<void> {
    if (!this.target) {
      return
    }
    const sourceText = event.text.trim()
    if (!sourceText || sourceText === this.lastCapturedText) {
      return
    }
    this.lastCapturedText = sourceText
    this.publishActivity(event, 'monitor-captured', 'analyzing')
    if (this.analyzing) {
      // Why: accessibility changes can arrive while vision/text analysis is in flight.
      // Keep the newest capture instead of silently dropping the user's next message.
      this.pendingEvent = event
      return
    }
    await this.analyzeEvent(event)
  }

  private async analyzeEvent(event: ObsidianDailyTodoInputMonitorEvent): Promise<void> {
    const target = this.target
    if (!target) {
      return
    }
    const sourceText = event.text.trim()
    console.log(
      `[obsidian-ai-capture][monitor] analyzing ${sourceText.length} chars from ${event.app}`
    )
    this.analyzing = true
    try {
      const beforeResult = await this.candidateService.list()
      const existingCandidateIds = new Set(
        beforeResult.ok ? beforeResult.candidates.map((candidate) => candidate.id) : []
      )
      const snapshot = await loadObsidianDailyTodos(
        target.directory,
        target.filePath,
        new Date(),
        false
      )
      const existingTodos = snapshot.ok
        ? buildExistingTodosForCandidateAnalysis(snapshot.snapshot.todos)
        : []
      const result = await this.candidateService.analyzeText({
        directory: target.directory,
        filePath: target.filePath,
        sourceText,
        sourceApp: event.app,
        existingTodos
      })
      if (result.ok) {
        this.lastAnalyzedText = sourceText
        const newCandidates = result.candidates.filter(
          (candidate) => !existingCandidateIds.has(candidate.id)
        )
        console.log(`[obsidian-ai-capture][monitor] analyze ok: ${newCandidates.length} new`)
        this.publishActivity(
          event,
          'monitor-analyzed',
          newCandidates.length > 0 ? 'todo' : 'no-todo',
          newCandidates.map((candidate) => candidate.title)
        )
        if (newCandidates.length > 0) {
          this.notify(this.webContents, event.app, newCandidates)
        }
      } else {
        console.warn(`[obsidian-ai-capture][monitor] analyze failed: ${result.message}`)
        this.publishActivity(event, 'monitor-analyzed', 'error')
        this.webContents?.send('obsidianDailyTodos:candidates:monitorError', result.message)
      }
    } finally {
      this.analyzing = false
      const pendingEvent = this.pendingEvent
      this.pendingEvent = null
      if (pendingEvent && pendingEvent.text.trim() !== this.lastAnalyzedText) {
        void this.analyzeEvent(pendingEvent)
      }
    }
  }

  private publishActivity(
    event: ObsidianDailyTodoInputMonitorEvent,
    source: 'monitor-captured' | 'monitor-analyzed',
    analysisStatus: 'analyzing' | 'todo' | 'no-todo' | 'error',
    candidateTitles: string[] = []
  ): void {
    this.webContents?.send('obsidianDailyTodos:candidates:changed', {
      source,
      app: event.app,
      reason: event.reason,
      sourceText: event.text.trim(),
      capturedAt: event.timestamp,
      analysisStatus,
      candidateCount: candidateTitles.length,
      candidateTitles
    })
  }
}

function showTodoCandidateNotification(
  webContents: WebContents | null,
  sourceApp: string,
  candidates: readonly { title: string }[]
): void {
  if (!Notification.isSupported()) {
    return
  }
  const titles = candidates
    .slice(0, 3)
    .map((candidate) => candidate.title)
    .join('；')
  const extraCount = Math.max(0, candidates.length - 3)
  const notification = new Notification({
    title: `发现 ${candidates.length} 条 Todo 候选`,
    body: `${sourceApp} · ${titles}${extraCount > 0 ? `；另有 ${extraCount} 条` : ''}`
  })
  notification.on('click', () => {
    const window = webContents ? BrowserWindow.fromWebContents(webContents) : null
    window?.show()
    window?.focus()
  })
  notification.show()
}
