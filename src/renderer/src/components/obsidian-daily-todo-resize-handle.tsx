import React from 'react'

import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import {
  DEFAULT_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
  MAX_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
  MIN_OBSIDIAN_DAILY_TODO_RAIL_WIDTH
} from './obsidian-daily-todo-rail-width'

export function ObsidianDailyTodoResizeHandle({
  width,
  resizing,
  onMouseDown,
  onWidthChange
}: {
  width: number
  resizing: boolean
  onMouseDown: (event: React.MouseEvent) => void
  onWidthChange: (width: number) => void
}): React.JSX.Element {
  const label = translate(
    'auto.components.ObsidianDailyTodoWorkspace.resizeTodoList',
    'Resize Todo list'
  )
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={MIN_OBSIDIAN_DAILY_TODO_RAIL_WIDTH}
      aria-valuemax={MAX_OBSIDIAN_DAILY_TODO_RAIL_WIDTH}
      aria-valuenow={width}
      title={translate(
        'auto.components.ObsidianDailyTodoWorkspace.resizeTodoListHint',
        'Drag to resize · Double-click to reset'
      )}
      className={cn(
        'group hidden w-2 shrink-0 cursor-col-resize items-stretch justify-center outline-none md:flex',
        resizing && 'bg-ring/10'
      )}
      onMouseDown={onMouseDown}
      onDoubleClick={() => onWidthChange(DEFAULT_OBSIDIAN_DAILY_TODO_RAIL_WIDTH)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 64 : 24
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          onWidthChange(width - step)
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          onWidthChange(width + step)
        } else if (event.key === 'Home') {
          event.preventDefault()
          onWidthChange(MIN_OBSIDIAN_DAILY_TODO_RAIL_WIDTH)
        } else if (event.key === 'End') {
          event.preventDefault()
          onWidthChange(MAX_OBSIDIAN_DAILY_TODO_RAIL_WIDTH)
        }
      }}
    >
      <div
        className={cn(
          'h-full w-px bg-border transition-colors group-hover:bg-ring/50 group-focus-visible:bg-ring',
          resizing && 'bg-ring'
        )}
      />
    </div>
  )
}
