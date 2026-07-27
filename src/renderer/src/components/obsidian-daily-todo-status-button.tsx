import React from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import {
  getObsidianDailyTodoStatusColor,
  ObsidianDailyTodoStatusIcon
} from './obsidian-daily-todo-status-icon'

export function ObsidianDailyTodoStatusButton({
  todo,
  status,
  busy,
  onStatusChange
}: {
  todo: ObsidianDailyTodoItem
  status: ObsidianDailyTodoStatus
  busy: boolean
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={busy}
          onClick={() => onStatusChange(todo, status)}
          aria-label={translate(
            'auto.components.ObsidianDailyTodoList.advanceStatus',
            'Advance todo status'
          )}
          className={cn('shrink-0', getObsidianDailyTodoStatusColor(todo.status))}
        >
          <ObsidianDailyTodoStatusIcon status={todo.status} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={6}>
        {translate(
          'auto.components.ObsidianDailyTodoList.statusCycleHint',
          'Pending → In progress → Completed'
        )}
      </TooltipContent>
    </Tooltip>
  )
}
