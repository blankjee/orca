import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import type { ObsidianDailyTodoItem } from '../shared/obsidian-daily-todo'
import { ObsidianDailyTodoFocusService } from './obsidian-daily-todo-focus-service'

const TODO: ObsidianDailyTodoItem = {
  id: 'todo-1',
  text: '完成聚焦功能',
  rawLine: '- [ ] 完成聚焦功能',
  lineNumber: 3,
  status: 'pending',
  group: '今日任务',
  depth: 0,
  parentId: null,
  priority: 'P1',
  timeText: null
}

describe('ObsidianDailyTodoFocusService', () => {
  it('persists pause and resume using active time only', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-focus-'))
    let now = 1_000
    const service = new ObsidianDailyTodoFocusService({
      stateFilePath: join(directory, 'focus.json'),
      now: () => now
    })

    await service.start({
      directory,
      filePath: join(directory, '2026-07-27.md'),
      noteDate: '2026-07-27',
      todo: TODO,
      durationMinutes: 25,
      goal: '完成主链路'
    })
    now += 60_000
    const paused = await service.pause()
    expect(paused.ok && paused.session?.activeElapsedMs).toBe(60_000)
    now += 120_000
    await service.resume()
    now += 30_000

    const restored = new ObsidianDailyTodoFocusService({
      stateFilePath: join(directory, 'focus.json'),
      now: () => now
    })
    const state = await restored.get()
    expect(state.ok && state.session?.status).toBe('running')
    expect(state.ok && state.session?.activeElapsedMs).toBe(60_000)
  })

  it('recovers an expired running session once', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-focus-'))
    const stateFilePath = join(directory, 'focus.json')
    await writeFile(
      stateFilePath,
      JSON.stringify({
        id: 'session',
        directory,
        filePath: join(directory, '2026-07-27.md'),
        noteDate: '2026-07-27',
        todo: TODO,
        durationMs: 60_000,
        activeElapsedMs: 0,
        runningSince: 1_000,
        startedAt: 1_000,
        status: 'running',
        goal: '',
        notes: ''
      })
    )
    let notifications = 0
    const service = new ObsidianDailyTodoFocusService({
      stateFilePath,
      now: () => 70_000,
      onElapsed: () => {
        notifications += 1
      }
    })

    const state = await service.get()
    expect(state.ok && state.session?.status).toBe('elapsed')
    expect(notifications).toBe(1)
    await service.get()
    expect(notifications).toBe(1)
    expect(JSON.parse(await readFile(stateFilePath, 'utf8')).status).toBe('elapsed')
  })

  it('finishes early and appends the actual focus time to the task work record', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-focus-'))
    const filePath = join(directory, '2026-07-27.md')
    await writeFile(
      filePath,
      ['## 今日任务', '', '- [ ] 完成聚焦功能 #P1', '', '## 工作记录', ''].join('\n')
    )
    let now = new Date(2026, 6, 27, 9, 0).getTime()
    const service = new ObsidianDailyTodoFocusService({
      stateFilePath: join(directory, 'focus.json'),
      now: () => now
    })
    await service.start({
      directory,
      filePath,
      noteDate: '2026-07-27',
      todo: { ...TODO, rawLine: '- [ ] 完成聚焦功能 #P1', lineNumber: 3 },
      durationMinutes: 25,
      goal: '完成主链路'
    })
    now += 5 * 60_000
    await service.update({ notes: '完成持久化验证' })

    const result = await service.finish()
    const markdown = await readFile(filePath, 'utf8')
    expect(result.ok && result.focusedMs).toBe(5 * 60_000)
    expect(markdown).toContain('### 完成聚焦功能')
    expect(markdown).toContain('09:00–09:05 · 5 分钟 · 完成')
    expect(markdown).toContain('目标：完成主链路 · 记录：完成持久化验证')
  })
})
