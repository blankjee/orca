import { mkdtemp, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import {
  addObsidianDailyTodoToNote,
  loadObsidianDailyTodos,
  saveObsidianDailyWorkRecordToNote,
  setObsidianDailyTodoStatus,
  updateObsidianDailyTodoTextInNote
} from './obsidian-daily-todo-service'

const TODAY = new Date(2026, 6, 16, 12)

describe('Obsidian daily todo service', () => {
  it('discovers today and all daily notes recursively from the vault root', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-obsidian-vault-'))
    const nested = join(directory, 'blankjee-work', '1_📅Daily', '2026', '07')
    await mkdir(nested, { recursive: true })
    await writeFile(join(nested, '2026-07-16.md'), '### 今日任务\n#### P1\n- [ ] ship\n')
    await writeFile(join(nested, '2026-07-15.md'), '- [x] yesterday\n')
    await writeFile(join(nested, 'not-a-daily-note.md'), '- [ ] ignored\n')

    const result = await loadObsidianDailyTodos(directory, undefined, TODAY)

    expect(result).toMatchObject({
      ok: true,
      snapshot: {
        date: '2026-07-16',
        fileName: '2026-07-16.md',
        dailyNotes: [{ date: '2026-07-16' }, { date: '2026-07-15' }]
      }
    })
    if (result.ok) {
      expect(result.snapshot.todos[0]).toMatchObject({ text: 'ship', priority: 'P1' })
    }
  })

  it('writes status changes back to the located daily note', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-obsidian-todos-'))
    const filePath = join(directory, '2026-07-16.md')
    await writeFile(filePath, '- [ ] ship\n')
    const loaded = await loadObsidianDailyTodos(directory, undefined, TODAY)
    if (!loaded.ok) {
      throw new Error(loaded.message)
    }
    if (!loaded.snapshot.filePath) {
      throw new Error('Expected today to be selected')
    }

    const result = await setObsidianDailyTodoStatus(
      {
        directory,
        filePath: loaded.snapshot.filePath,
        todo: loaded.snapshot.todos[0],
        status: 'in-progress'
      },
      TODAY
    )

    expect(result.ok, result.ok ? '' : result.message).toBe(true)
    await expect(readFile(filePath, 'utf8')).resolves.toBe('- [/] ship\n')
  })

  it('adds a task to the requested group and priority', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-obsidian-todos-'))
    const filePath = join(directory, '2026-07-16.md')
    await writeFile(filePath, '### 今日任务\n#### P2\n- [ ] existing\n')

    const result = await addObsidianDailyTodoToNote(
      { directory, filePath, text: 'new task', group: '今日任务', priority: 'P2' },
      TODAY
    )

    expect(result.ok, result.ok ? '' : result.message).toBe(true)
    await expect(readFile(filePath, 'utf8')).resolves.toContain('- [ ] existing\n\n- [ ] new task')
  })

  it('renames a task and its matching work record together', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-obsidian-todos-'))
    const filePath = join(directory, '2026-07-16.md')
    await writeFile(filePath, '- [ ] old title\n\n## 工作记录\n\n### old title\n\nprogress\n')
    const loaded = await loadObsidianDailyTodos(directory, filePath, TODAY)
    if (!loaded.ok) {
      throw new Error(loaded.message)
    }

    const result = await updateObsidianDailyTodoTextInNote(
      { directory, filePath, todo: loaded.snapshot.todos[0], text: 'new title' },
      TODAY
    )

    expect(result.ok, result.ok ? '' : result.message).toBe(true)
    await expect(readFile(filePath, 'utf8')).resolves.toContain(
      '- [ ] new title\n\n## 工作记录\n\n### new title'
    )
  })

  it('saves a task work record back to the daily note', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-obsidian-todos-'))
    const filePath = join(directory, '2026-07-16.md')
    await writeFile(filePath, '- [/] ship\n')
    const loaded = await loadObsidianDailyTodos(directory, filePath, TODAY)
    if (!loaded.ok) {
      throw new Error(loaded.message)
    }

    const result = await saveObsidianDailyWorkRecordToNote(
      {
        directory,
        filePath,
        todo: loaded.snapshot.todos[0],
        body: 'Implemented the parser.',
        expectedBody: null
      },
      TODAY
    )

    expect(result.ok, result.ok ? '' : result.message).toBe(true)
    if (result.ok) {
      expect(result.snapshot.workRecords).toEqual([
        { title: 'ship', body: 'Implemented the parser.' }
      ])
    }
  })

  it('loads a selected historical daily note from the discovered collection', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-obsidian-vault-'))
    const dailyDirectory = join(directory, 'notes', 'Daily')
    await mkdir(dailyDirectory, { recursive: true })
    const historicalPath = join(dailyDirectory, '2026-07-14.md')
    await writeFile(historicalPath, '- [ ] historical\n')
    const canonicalHistoricalPath = await realpath(historicalPath)

    const result = await loadObsidianDailyTodos(directory, historicalPath, TODAY)

    expect(result, result.ok ? '' : result.message).toMatchObject({
      ok: true,
      snapshot: {
        date: '2026-07-14',
        filePath: canonicalHistoricalPath,
        todos: [{ text: 'historical' }]
      }
    })
  })

  it('returns the full history even when today has no daily note', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-obsidian-vault-'))
    await writeFile(join(directory, '2026-07-15.md'), '- [x] yesterday\n')

    const result = await loadObsidianDailyTodos(directory, undefined, TODAY)

    expect(result).toMatchObject({
      ok: true,
      snapshot: {
        date: '2026-07-16',
        filePath: null,
        dailyNotes: [{ date: '2026-07-15' }]
      }
    })
  })
})
