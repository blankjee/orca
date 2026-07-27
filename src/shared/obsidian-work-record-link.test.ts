import { describe, expect, it } from 'vitest'

import {
  classifyObsidianWorkRecordLink,
  extractObsidianWorkRecordLinkTargets
} from './obsidian-work-record-link'

describe('Obsidian work record links', () => {
  it('extracts and classifies Meego and Lark document links', () => {
    expect(
      extractObsidianWorkRecordLinkTargets(
        [
          '(https://meego.larkoffice.com/local_services/story/detail/7356458144?from=parent)',
          'https://bytedance.larkoffice.com/wiki/DMzuwgqF5iMi4UkzWNAcgS3QnYf',
          'https://example.com/wiki/not-supported'
        ].join('\n')
      )
    ).toEqual([
      {
        url: 'https://meego.larkoffice.com/local_services/story/detail/7356458144?from=parent',
        provider: 'meego'
      },
      {
        url: 'https://bytedance.larkoffice.com/wiki/DMzuwgqF5iMi4UkzWNAcgS3QnYf',
        provider: 'lark-doc'
      }
    ])
  })

  it('deduplicates normalized links and rejects unsafe lookalike hosts', () => {
    expect(
      extractObsidianWorkRecordLinkTargets(
        'https://bytedance.larkoffice.com/docx/a https://bytedance.larkoffice.com/docx/a'
      )
    ).toHaveLength(1)
    expect(classifyObsidianWorkRecordLink('https://larkoffice.com.evil.test/wiki/a')).toBeNull()
    expect(classifyObsidianWorkRecordLink('http://bytedance.larkoffice.com/wiki/a')).toBeNull()
  })
})
