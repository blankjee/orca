import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isIntentionalAppRestartInProgress,
  registerAppRestartBeforeUnloadBypass
} from './app-restart-beforeunload'
import {
  ORCA_APP_RESTART_ABORTED_EVENT,
  ORCA_APP_RESTART_STARTED_EVENT
} from '../../../shared/app-restart-events'

type WindowEventStub = Pick<Window, 'addEventListener' | 'removeEventListener' | 'dispatchEvent'>

beforeEach(() => {
  const eventTarget = new EventTarget()
  vi.stubGlobal('window', {
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget)
  } satisfies WindowEventStub)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('registerAppRestartBeforeUnloadBypass', () => {
  it('tracks app restart lifecycle events', () => {
    const cleanup = registerAppRestartBeforeUnloadBypass()

    window.dispatchEvent(new Event(ORCA_APP_RESTART_STARTED_EVENT))
    expect(isIntentionalAppRestartInProgress()).toBe(true)

    window.dispatchEvent(new Event(ORCA_APP_RESTART_ABORTED_EVENT))
    expect(isIntentionalAppRestartInProgress()).toBe(false)

    cleanup()
  })

  it('resets the bypass flag during cleanup', () => {
    const cleanup = registerAppRestartBeforeUnloadBypass()

    window.dispatchEvent(new Event(ORCA_APP_RESTART_STARTED_EVENT))
    cleanup()

    expect(isIntentionalAppRestartInProgress()).toBe(false)
  })
})
