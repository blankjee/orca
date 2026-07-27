import type { WebContents } from 'electron'

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
  ObsidianDailyTodoCandidateMonitorStartInput,
  ObsidianDailyTodoCandidateMonitorStatusResult
} from '../shared/obsidian-daily-todo-candidate'

const TODO_SIGNAL_PATTERN =
  /提醒我|提示我|记得|帮我记|帮我提醒|待办|todo|TODO|明天|今天|下周|下个周|周一|周二|周三|周四|周五|周六|周日|写|做|处理|跟进|提交|完成|开会|会议|周报|日报|月报/u

export class ObsidianDailyTodoCandidateMonitorController {
  private readonly monitor = new ObsidianDailyTodoInputMonitor()
  private target: ObsidianDailyTodoCandidateMonitorStartInput | null = null
  private analyzing = false
  private lastAnalyzedText = ''
  private webContents: WebContents | null = null

  constructor(private readonly candidateService: ObsidianDailyTodoCandidateService) {}

  start(
    input: ObsidianDailyTodoCandidateMonitorStartInput,
    webContents: WebContents
  ): ObsidianDailyTodoCandidateMonitorStatusResult {
    if (!input.directory.trim() || !input.filePath.trim()) {
      return { ok: false, code: 'invalid-input', message: 'Invalid monitor input.' }
    }
    this.target = input
    this.webContents = webContents
    this.monitor.start((event) => this.handleInputEvent(event))
    return { ok: true, running: true }
  }

  stop(): ObsidianDailyTodoCandidateMonitorStatusResult {
    this.monitor.stop()
    this.target = null
    this.webContents = null
    this.analyzing = false
    return { ok: true, running: false }
  }

  status(): ObsidianDailyTodoCandidateMonitorStatusResult {
    return { ok: true, running: this.monitor.isRunning }
  }

  private async handleInputEvent(event: ObsidianDailyTodoInputMonitorEvent): Promise<void> {
    const target = this.target
    if (!target || this.analyzing) {
      return
    }
    const sourceText = event.text.trim()
    if (!sourceText || sourceText === this.lastAnalyzedText) {
      return
    }
    if (!TODO_SIGNAL_PATTERN.test(sourceText)) {
      console.log(
        `[obsidian-ai-capture][monitor] captured but skipped: ${sourceText.slice(0, 120)}`
      )
      return
    }
    console.log(`[obsidian-ai-capture][monitor] analyzing: ${sourceText.slice(0, 120)}`)
    this.webContents?.send('obsidianDailyTodos:candidates:changed', {
      source: 'monitor-captured',
      app: event.app,
      reason: event.reason,
      sourceText
    })
    this.analyzing = true
    try {
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
        console.log(`[obsidian-ai-capture][monitor] analyze ok: ${result.candidates.length}`)
        this.webContents?.send('obsidianDailyTodos:candidates:changed', {
          source: 'monitor-analyzed',
          app: event.app,
          reason: event.reason,
          sourceText
        })
      } else {
        console.warn(`[obsidian-ai-capture][monitor] analyze failed: ${result.message}`)
        this.webContents?.send('obsidianDailyTodos:candidates:monitorError', result.message)
      }
    } finally {
      this.analyzing = false
    }
  }
}
