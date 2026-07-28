import type { WebContents } from 'electron'
import { describe, expect, it, vi } from 'vitest'

import type { ObsidianDailyTodoCandidate } from '../shared/obsidian-daily-todo-candidate'
import { ObsidianDailyTodoCandidateMonitorController } from './obsidian-daily-todo-candidate-monitor'
import type { ObsidianDailyTodoInputMonitorEvent } from './obsidian-daily-todo-input-monitor'

class FakeInputMonitor {
  isRunning = false
  private callback: ((event: ObsidianDailyTodoInputMonitorEvent) => void | Promise<void>) | null =
    null
  private errorCallback: ((message: string) => void) | null = null

  start(
    callback: (event: ObsidianDailyTodoInputMonitorEvent) => void | Promise<void>,
    errorCallback?: (message: string) => void
  ): void {
    this.isRunning = true
    this.callback = callback
    this.errorCallback = errorCallback ?? null
  }

  stop(): void {
    this.isRunning = false
    this.callback = null
    this.errorCallback = null
  }

  async emit(event: ObsidianDailyTodoInputMonitorEvent): Promise<void> {
    await this.callback?.(event)
  }

  fail(message: string): void {
    this.errorCallback?.(message)
  }
}

function buildEvent(text: string, timestamp: number): ObsidianDailyTodoInputMonitorEvent {
  return {
    text,
    app: 'Feishu',
    bundleId: 'com.bytedance.ee.lark',
    windowTitle: '住宿问题排查专享群',
    timestamp,
    reason: 'content_stable'
  }
}

function buildCandidate(id: string, title: string, sourceText: string): ObsidianDailyTodoCandidate {
  return {
    id,
    title,
    context: '从聊天记录中识别',
    sourceText,
    sourceApp: 'Feishu',
    confidence: 0.93,
    priority: 'P2',
    group: '今日任务',
    createdAt: 100,
    status: 'pending'
  }
}

describe('ObsidianDailyTodoCandidateMonitorController', () => {
  it('stops and reports a fatal accessibility failure', () => {
    const monitor = new FakeInputMonitor()
    const send = vi.fn()
    const controller = new ObsidianDailyTodoCandidateMonitorController(
      {
        list: vi.fn(),
        analyzeText: vi.fn()
      },
      { monitor }
    )
    controller.start(
      { directory: '/tmp/obsidian-monitor-test', filePath: '/tmp/obsidian-monitor-test/note.md' },
      { send } as unknown as WebContents
    )

    monitor.fail('macOS blocked Todo monitoring: assistive access is not allowed')

    expect(controller.status()).toEqual({ ok: true, running: false })
    expect(send).toHaveBeenCalledWith(
      'obsidianDailyTodos:candidates:monitorError',
      'macOS blocked Todo monitoring: assistive access is not allowed',
      true
    )
  })

  it('immediately analyzes captured text without requiring action keywords', async () => {
    const monitor = new FakeInputMonitor()
    const sourceText = '客服后台没有记录，住宿推翻和到无的订单需要确认归因。'
    const candidate = buildCandidate('candidate-1', '排查住宿订单缺少判责记录的原因', sourceText)
    const candidateService = {
      list: vi.fn().mockResolvedValue({ ok: true as const, candidates: [] }),
      analyzeText: vi.fn().mockResolvedValue({ ok: true as const, candidates: [candidate] })
    }
    const notify = vi.fn()
    const send = vi.fn()
    const controller = new ObsidianDailyTodoCandidateMonitorController(candidateService, {
      monitor,
      notify
    })
    controller.start(
      { directory: '/tmp/obsidian-monitor-test', filePath: '/tmp/obsidian-monitor-test/note.md' },
      { send } as unknown as WebContents
    )

    await monitor.emit(buildEvent(sourceText, 100))

    expect(candidateService.analyzeText).toHaveBeenCalledWith(
      expect.objectContaining({ sourceText, sourceApp: 'Feishu' })
    )
    expect(send).toHaveBeenNthCalledWith(
      1,
      'obsidianDailyTodos:candidates:changed',
      expect.objectContaining({
        source: 'monitor-captured',
        sourceText,
        analysisStatus: 'analyzing'
      })
    )
    expect(send).toHaveBeenLastCalledWith(
      'obsidianDailyTodos:candidates:changed',
      expect.objectContaining({
        source: 'monitor-analyzed',
        analysisStatus: 'todo',
        candidateTitles: [candidate.title]
      })
    )
    expect(notify).toHaveBeenCalledWith(expect.anything(), 'Feishu', [candidate])
  })

  it('queues the latest capture while an analysis is running', async () => {
    const monitor = new FakeInputMonitor()
    let resolveFirst!: (value: { ok: true; candidates: ObsidianDailyTodoCandidate[] }) => void
    const firstResult = new Promise<{ ok: true; candidates: ObsidianDailyTodoCandidate[] }>(
      (resolve) => {
        resolveFirst = resolve
      }
    )
    const firstText = '第一段会话'
    const secondText = '第二段会话'
    const firstCandidate = buildCandidate('candidate-1', '跟进第一段会话', firstText)
    const secondCandidate = buildCandidate('candidate-2', '跟进第二段会话', secondText)
    const candidateService = {
      list: vi.fn().mockResolvedValue({ ok: true as const, candidates: [] }),
      analyzeText: vi
        .fn()
        .mockImplementationOnce(() => firstResult)
        .mockResolvedValueOnce({ ok: true as const, candidates: [secondCandidate] })
    }
    const controller = new ObsidianDailyTodoCandidateMonitorController(candidateService, {
      monitor,
      notify: vi.fn()
    })
    controller.start(
      { directory: '/tmp/obsidian-monitor-test', filePath: '/tmp/obsidian-monitor-test/note.md' },
      { send: vi.fn() } as unknown as WebContents
    )

    const firstAnalysis = monitor.emit(buildEvent(firstText, 100))
    await vi.waitFor(() => expect(candidateService.analyzeText).toHaveBeenCalledTimes(1))
    await monitor.emit(buildEvent(secondText, 200))
    resolveFirst({ ok: true, candidates: [firstCandidate] })
    await firstAnalysis
    await vi.waitFor(() => expect(candidateService.analyzeText).toHaveBeenCalledTimes(2))

    expect(candidateService.analyzeText).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceText: secondText })
    )
  })
})
