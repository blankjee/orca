import React, { useState } from 'react'
import { Ban, CheckCircle2, ChevronDown, Circle, CircleDot } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import {
  getNextObsidianDailyTodoStatus,
  getObsidianTodoDisplayText,
  type ObsidianDailyTodoGroup
} from './obsidian-daily-todo-presentation'

export function ObsidianDailyTodoList({
  groups,
  busyTodoIds,
  onStatusChange
}: {
  groups: readonly ObsidianDailyTodoGroup[]
  busyTodoIds: ReadonlySet<string>
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <ObsidianDailyTodoGroupSection
          key={group.name}
          group={group}
          busyTodoIds={busyTodoIds}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}

function ObsidianDailyTodoGroupSection({
  group,
  busyTodoIds,
  onStatusChange
}: {
  group: ObsidianDailyTodoGroup
  busyTodoIds: ReadonlySet<string>
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(true)
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-lg border border-border/60 bg-background"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2.5 text-left hover:bg-muted/50">
        <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
        <span className="text-sm font-semibold">{group.name}</span>
        <span className="text-xs text-muted-foreground">
          {group.completed}/{group.total}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="divide-y divide-border/40">
          {group.priorities.map((priorityGroup) => (
            <div key={priorityGroup.priority ?? 'none'} className="px-3 py-2">
              <div
                className={cn(
                  'mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
                  priorityGroup.priority === 'P1' ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {priorityGroup.priority ??
                  translate('auto.components.ObsidianDailyTodoList.noPriority', 'No priority')}
              </div>
              <div className="space-y-0.5">
                {priorityGroup.todos.map((todo) => (
                  <ObsidianDailyTodoRow
                    key={todo.id}
                    todo={todo}
                    busy={busyTodoIds.has(todo.id)}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ObsidianDailyTodoRow({
  todo,
  busy,
  onStatusChange
}: {
  todo: ObsidianDailyTodoItem
  busy: boolean
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
}): React.JSX.Element {
  const nextStatus = getNextObsidianDailyTodoStatus(todo.status)
  return (
    <div
      className="group flex min-h-8 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent/60"
      style={{ marginLeft: `${Math.min(todo.depth, 5) * 18}px` }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={busy}
            onClick={() => onStatusChange(todo, nextStatus)}
            aria-label={translate(
              'auto.components.ObsidianDailyTodoList.advanceStatus',
              'Advance todo status'
            )}
            className={cn(
              'shrink-0',
              todo.status === 'completed' && 'text-foreground',
              todo.status === 'in-progress' && 'text-muted-foreground',
              todo.status === 'cancelled' && 'text-muted-foreground'
            )}
          >
            <TodoStatusIcon status={todo.status} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={6}>
          {translate(
            'auto.components.ObsidianDailyTodoList.statusCycleHint',
            'Pending → In progress → Completed'
          )}
        </TooltipContent>
      </Tooltip>
      <span
        title={todo.text}
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          todo.status === 'completed' && 'text-muted-foreground line-through',
          todo.status === 'cancelled' && 'text-muted-foreground line-through'
        )}
      >
        {getObsidianTodoDisplayText(todo.text)}
      </span>
      {todo.timeText ? (
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {todo.timeText}
        </span>
      ) : null}
    </div>
  )
}

function TodoStatusIcon({ status }: { status: ObsidianDailyTodoStatus }): React.JSX.Element {
  switch (status) {
    case 'pending':
      return <Circle className="size-4" />
    case 'in-progress':
      return <CircleDot className="size-4" />
    case 'completed':
      return <CheckCircle2 className="size-4" />
    case 'cancelled':
      return <Ban className="size-4" />
  }
}
