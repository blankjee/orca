// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ObsidianWorkRecordLinkPreviews } from './obsidian-work-record-link-previews'

const resolveWorkRecordLinks = vi.fn()
const openUrl = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  resolveWorkRecordLinks.mockResolvedValue({
    links: [
      {
        url: 'https://bytedance.larkoffice.com/wiki/document',
        provider: 'lark-doc',
        title: '端到端开发方案'
      }
    ]
  })
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      obsidianDailyTodos: { resolveWorkRecordLinks },
      shell: { openUrl }
    }
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('ObsidianWorkRecordLinkPreviews', () => {
  it('shows a resolved document name and opens its original URL', async () => {
    render(<ObsidianWorkRecordLinkPreviews body="https://bytedance.larkoffice.com/wiki/document" />)

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(screen.getByText('端到端开发方案')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /端到端开发方案/ }))
    expect(openUrl).toHaveBeenCalledWith('https://bytedance.larkoffice.com/wiki/document')
  })
})
