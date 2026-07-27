// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObsidianDailyTodoCandidatePanel } from './obsidian-daily-todo-candidate-panel'

const originalUserAgent = navigator.userAgent

afterEach(() => {
  cleanup()
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUserAgent })
})

describe('ObsidianDailyTodoCandidatePanel', () => {
  it('prioritizes macOS monitoring and keeps manual extraction collapsed', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)'
    })
    const onListeningChange = vi.fn()

    render(
      <ObsidianDailyTodoCandidatePanel
        candidates={[]}
        sourceText=""
        sourceImage={null}
        analyzing={false}
        listening={false}
        monitorActivity={null}
        busyCandidateIds={new Set()}
        disabled={false}
        errorMessage={null}
        onSourceTextChange={vi.fn()}
        onSourceImageChange={vi.fn()}
        onListeningChange={onListeningChange}
        onAnalyze={vi.fn()}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('Allowed apps: 1')).toBeTruthy()
    fireEvent.click(screen.getByText('Monitoring scope'))
    expect(screen.getByRole('checkbox', { name: '飞书' }).getAttribute('data-state')).toBe(
      'checked'
    )
    expect(screen.getByRole('checkbox', { name: 'Slack' }).getAttribute('data-state')).toBe(
      'unchecked'
    )
    expect(screen.getByText('沟通时请保持“公开可接受”')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start monitoring' }))
    expect(onListeningChange).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByText('Analyze text or image'))
    expect(
      screen.getByPlaceholderText(
        'Paste chat text or a screenshot. AI will extract goals, context, owners, timing, and expected results.'
      )
    ).toBeTruthy()
  })

  it('accepts a pasted image as a manual analysis source', async () => {
    const onSourceImageChange = vi.fn()
    render(
      <ObsidianDailyTodoCandidatePanel
        candidates={[]}
        sourceText=""
        sourceImage={null}
        analyzing={false}
        listening={false}
        monitorActivity={null}
        busyCandidateIds={new Set()}
        disabled={false}
        errorMessage={null}
        onSourceTextChange={vi.fn()}
        onSourceImageChange={onSourceImageChange}
        onListeningChange={vi.fn()}
        onAnalyze={vi.fn()}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Analyze text or image'))
    fireEvent.paste(screen.getByRole('textbox'), {
      clipboardData: {
        items: [
          {
            kind: 'file',
            getAsFile: () => new File(['image-bytes'], 'chat.png', { type: 'image/png' })
          }
        ]
      }
    })

    await waitFor(() =>
      expect(onSourceImageChange).toHaveBeenCalledWith(
        expect.objectContaining({ mimeType: 'image/png', name: 'chat.png' })
      )
    )
  })

  it('shows the latest monitored source text and live analysis state', () => {
    render(
      <ObsidianDailyTodoCandidatePanel
        candidates={[]}
        sourceText=""
        sourceImage={null}
        analyzing={false}
        listening
        monitorActivity={{
          sourceText: '希望今天先给出订单归因。',
          app: 'Feishu',
          reason: 'content_stable',
          capturedAt: Date.now(),
          status: 'analyzing',
          candidateCount: 0,
          candidateTitles: []
        }}
        busyCandidateIds={new Set()}
        disabled={false}
        errorMessage={null}
        onSourceTextChange={vi.fn()}
        onSourceImageChange={vi.fn()}
        onListeningChange={vi.fn()}
        onAnalyze={vi.fn()}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(screen.getByText('Latest captured text')).toBeTruthy()
    expect(screen.getByText('希望今天先给出订单归因。')).toBeTruthy()
    expect(screen.getByText('Analyzing now')).toBeTruthy()
  })
})
