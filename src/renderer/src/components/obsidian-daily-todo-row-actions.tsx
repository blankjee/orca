import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { ObsidianDailyTodoItem } from '../../../shared/obsidian-daily-todo'
import type { ObsidianDailyTodoPriority } from '../../../shared/obsidian-daily-todo-mutation'

export function ObsidianDailyTodoRowActions({
  todo,
  busy,
  onPriorityChange,
  onDelete
}: {
  todo: ObsidianDailyTodoItem
  busy: boolean
  onPriorityChange: (todo: ObsidianDailyTodoItem, priority: ObsidianDailyTodoPriority) => void
  onDelete: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const priorityLabel = translate(
    'auto.components.ObsidianDailyTodoList.changePriority',
    'Change priority for {{value0}}',
    { value0: todo.text }
  )

  return (
    <>
      {todo.priority ? (
        todo.depth === 0 ? (
          <Select
            value={todo.priority}
            disabled={busy}
            onValueChange={(priority) =>
              onPriorityChange(todo, priority as ObsidianDailyTodoPriority)
            }
          >
            <SelectTrigger
              size="sm"
              aria-label={priorityLabel}
              className={cn(
                'h-6 w-12 shrink-0 gap-0 border-0 bg-transparent px-1 text-[10px] font-semibold shadow-none',
                getPriorityColor(todo.priority)
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['P1', 'P2', 'P3'] as const).map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span
            className={cn(
              'w-6 shrink-0 text-right text-[10px] font-semibold',
              getPriorityColor(todo.priority)
            )}
          >
            {todo.priority}
          </span>
        )
      ) : null}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={busy}
              onClick={() => setDeleteDialogOpen(true)}
              aria-label={translate(
                'auto.components.ObsidianDailyTodoList.deleteTask',
                'Delete task'
              )}
              className="shrink-0 text-muted-foreground opacity-60 transition-opacity hover:text-destructive hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={6}>
            {translate('auto.components.ObsidianDailyTodoList.deleteTask', 'Delete task')}
          </TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {translate(
                'auto.components.ObsidianDailyTodoList.deleteTaskTitle',
                'Delete this task?'
              )}
            </DialogTitle>
            <DialogDescription>
              {translate(
                'auto.components.ObsidianDailyTodoList.deleteTaskDescription',
                '“{{value0}}” will be removed from the daily note. Nested tasks are removed with it.',
                { value0: todo.text }
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {translate('auto.components.ObsidianDailyTodoList.cancel', 'Cancel')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false)
                onDelete(todo)
              }}
            >
              {translate('auto.components.ObsidianDailyTodoList.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function getPriorityColor(priority: NonNullable<ObsidianDailyTodoItem['priority']>): string {
  if (priority === 'P1') {
    return 'text-obsidian-daily-priority'
  }
  return priority === 'P2' ? 'text-obsidian-daily-pending' : 'text-muted-foreground'
}
