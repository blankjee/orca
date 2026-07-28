import { describe, expect, it } from 'vitest'

import {
  parseObsidianDailyWorkRecords,
  renameObsidianDailyWorkRecord,
  saveObsidianDailyWorkRecord
} from './obsidian-daily-work-record'

const MARKDOWN = `# Daily
## 工作记录

### First task

Initial note
- detail

### Second task

Other note
`

describe('Obsidian daily work records', () => {
  it('parses each direct child heading and its Markdown body', () => {
    expect(parseObsidianDailyWorkRecords(MARKDOWN)).toEqual([
      { title: 'First task', body: 'Initial note\n- detail' },
      { title: 'Second task', body: 'Other note' }
    ])
  })

  it('updates an existing record without changing neighboring records', () => {
    const updated = saveObsidianDailyWorkRecord(
      MARKDOWN,
      'First task',
      'Updated **note**',
      'Initial note\n- detail'
    )

    expect(updated).toContain('### First task\n\nUpdated **note**\n\n### Second task')
    expect(updated).toContain('Other note')
  })

  it('creates the section and task heading when no record exists', () => {
    const updated = saveObsidianDailyWorkRecord('# Daily\n- [ ] Ship\n', 'Ship', 'Done today', null)

    expect(updated).toContain('## 工作记录\n\n### Ship\n\nDone today')
  })

  it('rejects stale record content', () => {
    expect(saveObsidianDailyWorkRecord(MARKDOWN, 'First task', 'new', 'stale')).toBeNull()
  })

  it('rejects a record that appeared after an empty editor was opened', () => {
    expect(saveObsidianDailyWorkRecord(MARKDOWN, 'First task', 'new', null)).toBeNull()
  })

  it('renames the matching record heading with the task', () => {
    const updated = renameObsidianDailyWorkRecord(MARKDOWN, 'First task', 'Renamed task')

    expect(updated).toContain('### Renamed task')
    expect(updated).not.toContain('### First task')
  })
})
