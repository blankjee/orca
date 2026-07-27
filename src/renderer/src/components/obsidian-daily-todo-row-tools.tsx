import { NotebookPen, Sparkles, Timer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { ObsidianDailyTodoItem } from '../../../shared/obsidian-daily-todo'
import type { ObsidianDailyTodoPriority } from '../../../shared/obsidian-daily-todo-mutation'
import { ObsidianDailyTodoRowActions } from './obsidian-daily-todo-row-actions'
import { isObsidianDailyTodoTerminal } from './obsidian-daily-todo-presentation'

export function ObsidianDailyTodoRowTools({
  todo,
  busy,
  selected,
  hasWorkRecord,
  onPriorityChange,
  onDelete,
  onStartFocus,
  onOpenWorkRecord,
  onAiExecute
}: {
  todo: ObsidianDailyTodoItem
  busy: boolean
  selected: boolean
  hasWorkRecord: boolean
  onPriorityChange: (todo: ObsidianDailyTodoItem, priority: ObsidianDailyTodoPriority) => void
  onDelete: (todo: ObsidianDailyTodoItem) => void
  onStartFocus: (todo: ObsidianDailyTodoItem) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  return (
    <>
      <ObsidianDailyTodoRowActions
        todo={todo}
        busy={busy}
        onPriorityChange={onPriorityChange}
        onDelete={onDelete}
      />
      {!isObsidianDailyTodoTerminal(todo.status) ? (
        <RowTool
          label={translate('auto.focus.start', 'Start focus')}
          selected={selected}
          onClick={() => onStartFocus(todo)}
        >
          <Timer className="size-3.5" />
        </RowTool>
      ) : null}
      <RowTool
        label={translate('auto.components.ObsidianDailyTodoList.workRecord', 'Work record')}
        selected={selected}
        active={hasWorkRecord}
        onClick={() => onOpenWorkRecord(todo)}
      >
        <NotebookPen className="size-3.5" />
      </RowTool>
      <RowTool
        label={translate(
          'auto.components.ObsidianDailyTodoList.runWithAi',
          'Run this Todo with AI'
        )}
        selected={selected}
        onClick={() => onAiExecute(todo)}
      >
        <Sparkles className="size-3.5" />
      </RowTool>
    </>
  )
}

function RowTool({
  label,
  selected,
  active = false,
  onClick,
  children
}: {
  label: string
  selected: boolean
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClick}
          aria-label={label}
          className={cn(
            'shrink-0 text-muted-foreground opacity-100 transition-opacity hover:text-foreground focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
            selected && 'lg:opacity-100',
            active && 'text-obsidian-daily-compose-accent'
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
