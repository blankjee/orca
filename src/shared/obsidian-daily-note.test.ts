import { describe, expect, it } from 'vitest'

import { buildObsidianDailyNoteUrl, buildObsidianOpenNoteUrl } from './obsidian-daily-note'

describe('buildObsidianDailyNoteUrl', () => {
  it('uses the active Obsidian context when no vault is configured', () => {
    expect(buildObsidianDailyNoteUrl('  ')).toBe('obsidian://daily')
  })

  it('trims and encodes vault names and IDs as URI query values', () => {
    expect(buildObsidianDailyNoteUrl('  Work / 日报  ')).toBe(
      'obsidian://daily?vault=Work%20%2F%20%E6%97%A5%E6%8A%A5'
    )
  })

  it('opens a discovered historical note by its vault-relative path', () => {
    expect(buildObsidianOpenNoteUrl('Work Notes', '1_📅Daily/2026/07/2026-07-15.md')).toBe(
      'obsidian://open?vault=Work%20Notes&file=1_%F0%9F%93%85Daily%2F2026%2F07%2F2026-07-15'
    )
  })
})
