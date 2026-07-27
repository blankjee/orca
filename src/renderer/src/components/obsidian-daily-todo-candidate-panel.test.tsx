// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObsidianDailyTodoCandidatePanel } from './obsidian-daily-todo-candidate-panel'

const originalUserAgent = navigator.userAgent

afterEach(() => {
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
        analyzing={false}
        listening={false}
        busyCandidateIds={new Set()}
        disabled={false}
        errorMessage={null}
        onSourceTextChange={vi.fn()}
        onListeningChange={onListeningChange}
        onAnalyze={vi.fn()}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    expect(screen.queryByRole('textbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Start monitoring' }))
    expect(onListeningChange).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByText('Analyze text manually'))
    expect(screen.getByRole('textbox')).toBeTruthy()
  })
})
