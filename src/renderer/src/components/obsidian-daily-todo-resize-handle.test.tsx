// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ObsidianDailyTodoResizeHandle } from './obsidian-daily-todo-resize-handle'
import { DEFAULT_OBSIDIAN_DAILY_TODO_RAIL_WIDTH } from './obsidian-daily-todo-rail-width'

describe('ObsidianDailyTodoResizeHandle', () => {
  it('supports keyboard resizing and resetting', () => {
    const onWidthChange = vi.fn()
    render(
      <ObsidianDailyTodoResizeHandle
        width={440}
        resizing={false}
        onMouseDown={vi.fn()}
        onWidthChange={onWidthChange}
      />
    )
    const separator = screen.getByRole('separator', { name: 'Resize Todo list' })

    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    fireEvent.keyDown(separator, { key: 'ArrowLeft', shiftKey: true })
    fireEvent.doubleClick(separator)

    expect(onWidthChange).toHaveBeenNthCalledWith(1, 464)
    expect(onWidthChange).toHaveBeenNthCalledWith(2, 376)
    expect(onWidthChange).toHaveBeenNthCalledWith(3, DEFAULT_OBSIDIAN_DAILY_TODO_RAIL_WIDTH)
  })
})
