import { useCallback, useState, type MouseEvent, type RefObject } from 'react'

import { useSidebarResize } from '@/hooks/useSidebarResize'
import {
  clampObsidianDailyTodoRailWidth,
  loadObsidianDailyTodoRailWidth,
  MAX_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
  MIN_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
  saveObsidianDailyTodoRailWidth
} from './obsidian-daily-todo-rail-width'

export function useObsidianDailyTodoRailResize(): {
  todoRailRef: RefObject<HTMLElement | null>
  todoRailWidth: number
  isTodoRailResizing: boolean
  onTodoRailResizeStart: (event: MouseEvent) => void
  updateTodoRailWidth: (width: number) => void
} {
  const [todoRailWidth, setTodoRailWidth] = useState(loadObsidianDailyTodoRailWidth)
  const updateTodoRailWidth = useCallback((width: number) => {
    const nextWidth = clampObsidianDailyTodoRailWidth(width)
    setTodoRailWidth(nextWidth)
    saveObsidianDailyTodoRailWidth(nextWidth)
  }, [])
  const {
    containerRef: todoRailRef,
    isResizing: isTodoRailResizing,
    onResizeStart: onTodoRailResizeStart
  } = useSidebarResize<HTMLElement>({
    isOpen: true,
    width: todoRailWidth,
    minWidth: MIN_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
    maxWidth: MAX_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
    deltaSign: 1,
    setWidth: updateTodoRailWidth
  })

  return {
    todoRailRef,
    todoRailWidth,
    isTodoRailResizing,
    onTodoRailResizeStart,
    updateTodoRailWidth
  }
}
