import { execFile } from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readObsidianDailyTodoAxSnapshot } from './obsidian-daily-todo-ax-reader'

vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}))

describe('readObsidianDailyTodoAxSnapshot', () => {
  beforeEach(() => {
    vi.mocked(execFile).mockReset()
  })

  it('passes the allowlist into System Events and returns no text for other apps', async () => {
    let script = ''
    vi.mocked(execFile).mockImplementation((...args) => {
      const commandArgs = args[1] as string[]
      script = commandArgs[1] || ''
      const callback = args[3] as (error: Error | null, stdout: string, stderr: string) => void
      callback(null, 'com.apple.TextEdit|@@@|TextEdit|@@@||@@@||@@@|0|@@@|\n', '')
      return { on: vi.fn() } as never
    })

    const snapshot = await readObsidianDailyTodoAxSnapshot([
      'com.bytedance.ee.lark',
      'com.tinyspeck.slackmacgap'
    ])

    expect(script).toContain(
      'set allowedBundleIds to {"com.bytedance.ee.lark", "com.tinyspeck.slackmacgap"}'
    )
    expect(snapshot).toEqual({
      bundleId: 'com.apple.TextEdit',
      appName: 'TextEdit',
      windowTitle: '',
      role: '',
      monitored: false,
      value: ''
    })
  })

  it('removes complete ignored lines before returning captured text', async () => {
    vi.mocked(execFile).mockImplementation((...args) => {
      const callback = args[3] as (error: Error | null, stdout: string, stderr: string) => void
      callback(
        null,
        'com.bytedance.ee.lark|@@@|Feishu|@@@|项目群|@@@|AXTextArea|@@@|1|@@@|沟通时请保持“公开可接受”\n提醒我写周报测试哈33\n',
        ''
      )
      return { on: vi.fn() } as never
    })

    const snapshot = await readObsidianDailyTodoAxSnapshot(
      ['com.bytedance.ee.lark'],
      ['沟通时请保持"公开可接受"']
    )

    expect(snapshot?.value).toBe('提醒我写周报测试哈33')
  })
})
