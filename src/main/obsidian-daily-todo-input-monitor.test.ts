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

  it('surfaces accessibility failures instead of silently appearing active', async () => {
    vi.mocked(readObsidianDailyTodoAxSnapshot).mockRejectedValue(
      new Error('macOS blocked Todo monitoring: assistive access is not allowed')
    )
    const callback = vi.fn()
    const errorCallback = vi.fn()
    const monitor = new ObsidianDailyTodoInputMonitor()

    monitor.start(callback, errorCallback)
    await vi.advanceTimersByTimeAsync(450)

    expect(callback).not.toHaveBeenCalled()
    expect(errorCallback).toHaveBeenCalledWith(
      'macOS blocked Todo monitoring: assistive access is not allowed'
    )
    monitor.stop()
  })

  it('passes the latest app allowlist into every accessibility poll', async () => {
    const allowedBundleIds = vi
      .fn<() => readonly string[]>()
      .mockReturnValueOnce(['com.bytedance.ee.lark'])
      .mockReturnValue(['com.tinyspeck.slackmacgap'])
    vi.mocked(readObsidianDailyTodoAxSnapshot).mockResolvedValue(null)
    const monitor = new ObsidianDailyTodoInputMonitor({ allowedBundleIds })

    monitor.start(vi.fn())
    await vi.advanceTimersByTimeAsync(850)

    expect(readObsidianDailyTodoAxSnapshot).toHaveBeenNthCalledWith(
      1,
      ['com.bytedance.ee.lark'],
      []
    )
    expect(readObsidianDailyTodoAxSnapshot).toHaveBeenNthCalledWith(
      2,
      ['com.tinyspeck.slackmacgap'],
      []
    )
    monitor.stop()
  })
})
