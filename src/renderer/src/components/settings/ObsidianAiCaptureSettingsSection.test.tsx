// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'

import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ObsidianAiCaptureSettingsSection } from './ObsidianAiCaptureSettingsSection'

afterEach(() => cleanup())

describe('ObsidianAiCaptureSettingsSection', () => {
  it('renders persisted AI Capture values without exposing the API key', () => {
    const markup = renderToStaticMarkup(
      <ObsidianAiCaptureSettingsSection
        settings={{
          enabled: true,
          endpoint: 'https://ark.example/api/v3',
          model: 'task-model',
          apiKey: 'secret-key',
          confidenceThreshold: 0.82
        }}
        onChange={vi.fn()}
      />
    )

    expect(markup).toContain('AI Capture')
    expect(markup).toContain('https://ark.example/api/v3')
    expect(markup).toContain('task-model')
    expect(markup).toContain('type="password"')
    expect(markup).toContain('value="secret-key"')
    expect(markup).toContain('value="0.82"')
    expect(markup).toContain('aria-checked="true"')
  })

  it('emits a complete persisted configuration when toggled', async () => {
    const onChange = vi.fn()
    const settings = {
      enabled: false,
      endpoint: 'https://ark.example/api/v3',
      model: 'task-model',
      apiKey: 'secret-key',
      confidenceThreshold: 0.82
    }
    render(<ObsidianAiCaptureSettingsSection settings={settings} onChange={onChange} />)

    await userEvent.click(screen.getByRole('switch', { name: 'Enable AI Capture' }))

    expect(onChange).toHaveBeenCalledWith({ ...settings, enabled: true })
  })
})
