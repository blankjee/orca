import { describe, expect, it, vi } from 'vitest'

import {
  extractPageTitle,
  fetchObsidianWorkRecordLinkTitle
} from './obsidian-work-record-link-title'

describe('Obsidian work record link titles', () => {
  it('prefers Open Graph titles and decodes entities', () => {
    expect(
      extractPageTitle(
        '<html><head><title>Fallback</title><meta property="og:title" content="需求 A &amp; B"></head></html>'
      )
    ).toBe('需求 A & B')
  })

  it('uses document titles and removes known product suffixes', () => {
    expect(extractPageTitle('<title>端到端开发方案 - 飞书云文档</title>')).toBe('端到端开发方案')
    expect(extractPageTitle('<title>飞书云文档</title>')).toBeNull()
  })

  it('does not follow redirects outside supported Lark hosts', async () => {
    const fetchPage = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://evil.test/collect' }
        })
    )

    expect(
      await fetchObsidianWorkRecordLinkTitle(
        'https://bytedance.larkoffice.com/wiki/document',
        fetchPage
      )
    ).toBeNull()
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})
