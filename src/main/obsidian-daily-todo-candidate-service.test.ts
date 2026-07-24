import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import { ObsidianDailyTodoCandidateService } from './obsidian-daily-todo-candidate-service'

describe('ObsidianDailyTodoCandidateService', () => {
  it('stores analyzed candidates and dismisses them', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-candidates-'))
    const filePath = join(directory, 'candidates.json')
    const service = new ObsidianDailyTodoCandidateService({
      filePath,
      analyzerConfig: () => ({
        endpoint: 'https://example.test',
        model: 'model',
        apiKey: 'key',
        confidenceThreshold: 0.75
      }),
      analyzerFactory: () => ({
        analyze: async () => ({
          ok: true,
          candidates: [
            {
              id: 'candidate-1',
              title: 'Follow up budget',
              context: 'From pasted text',
              sourceText: 'please follow up',
              confidence: 0.9,
              group: '今日任务',
              createdAt: 1,
              status: 'pending'
            }
          ]
        })
      })
    })

    await expect(
      service.analyzeText({
        directory,
        filePath: join(directory, '2026-07-16.md'),
        sourceText: 'please follow up'
      })
    ).resolves.toMatchObject({ ok: true, candidates: [{ title: 'Follow up budget' }] })
    await expect(service.dismiss({ candidateId: 'candidate-1' })).resolves.toMatchObject({
      ok: true
    })
    await expect(service.list()).resolves.toEqual({ ok: true, candidates: [] })
  })

  it('accepts a candidate into the selected daily note', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'orca-candidates-'))
    const storePath = join(directory, 'candidates.json')
    const notePath = join(directory, '2026-07-16.md')
    await writeFile(notePath, '### 今日任务\n#### P2\n- [ ] existing\n')
    await writeFile(
      storePath,
      JSON.stringify([
        {
          id: 'candidate-1',
          title: 'Follow up budget',
          context: 'From pasted text',
          sourceText: 'please follow up',
          confidence: 0.9,
          priority: 'P2',
          group: '今日任务',
          createdAt: 1,
          status: 'pending'
        }
      ])
    )
    const service = new ObsidianDailyTodoCandidateService({ filePath: storePath })

    const result = await service.accept({
      directory,
      filePath: notePath,
      candidateId: 'candidate-1'
    })

    expect(result.ok, result.ok ? '' : result.message).toBe(true)
    await expect(readFile(notePath, 'utf8')).resolves.toContain('- [ ] Follow up budget')
    await expect(service.list()).resolves.toEqual({ ok: true, candidates: [] })
  })
})
