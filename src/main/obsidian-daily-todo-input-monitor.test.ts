import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readObsidianDailyTodoAxSnapshot } from './obsidian-daily-todo-ax-reader'
import { ObsidianDailyTodoInputMonitor } from './obsidian-daily-todo-input-monitor'

vi.mock('./obsidian-daily-todo-ax-reader', () => ({
  readObsidianDailyTodoAxSnapshot: vi.fn()
}))

describe('ObsidianDailyTodoInputMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(readObsidianDailyTodoAxSnapshot).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('captures the current accessible window text after it stabilizes', async () => {
    vi.mocked(readObsidianDailyTodoAxSnapshot).mockResolvedValue({
      bundleId: 'com.bytedance.ee.lark',
      appName: 'Feishu',
      windowTitle: '住宿问题排查专享群',
      role: 'AXWindow',
      value: '希望今天能先给个归因，目前反馈过来的都是安心系列订单。'
    })
    const callback = vi.fn()
    const monitor = new ObsidianDailyTodoInputMonitor()

    monitor.start(callback)
    await vi.advanceTimersByTimeAsync(1_700)

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        app: 'Feishu',
        reason: 'content_stable',
        text: '希望今天能先给个归因，目前反馈过来的都是安心系列订单。'
      })
    )
    monitor.stop()
  })

  it('does not recapture Orca content and create a self-analysis loop', async () => {
    vi.mocked(readObsidianDailyTodoAxSnapshot).mockResolvedValue({
      bundleId: 'com.stablyai.orca',
      appName: 'Orca',
      windowTitle: 'Todo 收集',
      role: 'AXWindow',
      value: '最近监听原文 正在立即分析'
    })
    const callback = vi.fn()
    const monitor = new ObsidianDailyTodoInputMonitor()

    monitor.start(callback)
    await vi.advanceTimersByTimeAsync(3_000)

    expect(callback).not.toHaveBeenCalled()
    monitor.stop()
  })
})
