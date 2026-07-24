import React, { useState } from 'react'
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  NotebookPen,
  Sparkles
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import {
  getNextObsidianDailyTodoStatus,
  getObsidianTodoDisplayText,
  type ObsidianDailyTodoFilter,
  type ObsidianDailyTodoGroup
} from './obsidian-daily-todo-presentation'

export function ObsidianDailyTodoList({
  groups,
  filter,
  highlightedTodoId,
  busyTodoIds,
  workRecordTitles,
  onStatusChange,
  onTextChange,
  onOpenWorkRecord,
  onAiExecute
}: {
  groups: readonly ObsidianDailyTodoGroup[]
  filter: ObsidianDailyTodoFilter
  highlightedTodoId: string | null
  busyTodoIds: ReadonlySet<string>
  workRecordTitles: ReadonlySet<string>
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card">
      {groups.map((group, index) => (
        <ObsidianDailyTodoGroupSection
          key={group.name}
          group={group}
          accent={OBSIDIAN_DAILY_GROUP_ACCENTS[index % OBSIDIAN_DAILY_GROUP_ACCENTS.length]}
          filter={filter}
          highlightedTodoId={highlightedTodoId}
          busyTodoIds={busyTodoIds}
          workRecordTitles={workRecordTitles}
          onStatusChange={onStatusChange}
          onTextChange={onTextChange}
          onOpenWorkRecord={onOpenWorkRecord}
          onAiExecute={onAiExecute}
        />
      ))}
    </div>
  )
}

function ObsidianDailyTodoGroupSection({
  group,
  accent,
  filter,
  highlightedTodoId,
  busyTodoIds,
  workRecordTitles,
  onStatusChange,
  onTextChange,
  onOpenWorkRecord,
  onAiExecute
}: {
  group: ObsidianDailyTodoGroup
  accent: string
  filter: ObsidianDailyTodoFilter
  highlightedTodoId: string | null
  busyTodoIds: ReadonlySet<string>
  workRecordTitles: ReadonlySet<string>
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(true)
  const todos = group.priorities.flatMap((priorityGroup) => priorityGroup.todos)
  const activeTodos = todos.filter((todo) => !isTerminal(todo.status))
  const terminalTodos = todos.filter((todo) => isTerminal(todo.status))
  const remaining = activeTodos.length
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      style={{ '--obsidian-daily-group-accent': accent } as React.CSSProperties}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 border-l-[3px] border-l-[var(--obsidian-daily-group-accent)] bg-[color-mix(in_srgb,var(--obsidian-daily-group-accent)_5%,var(--card))] px-3 py-2.5 text-left hover:bg-[color-mix(in_srgb,var(--obsidian-daily-group-accent)_9%,var(--card))]">
        <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
        <span className="text-sm font-semibold">{group.name}</span>
        <span className="text-xs text-[var(--obsidian-daily-group-accent)]">
          {filter === 'all'
            ? translate(
                'auto.components.ObsidianDailyTodoList.remainingCount',
                '{{value0}} remaining',
                { value0: remaining }
              )
            : translate('auto.components.ObsidianDailyTodoList.taskCount', '{{value0}} tasks', {
                value0: group.total
              })}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border/50 px-2 py-1.5">
          {(filter === 'completed' ? terminalTodos : activeTodos).map((todo) => (
            <ObsidianDailyTodoRow
              key={todo.id}
              todo={todo}
              highlighted={todo.id === highlightedTodoId}
              busy={busyTodoIds.has(todo.id)}
              hasWorkRecord={workRecordTitles.has(todo.text)}
              onStatusChange={onStatusChange}
              onTextChange={onTextChange}
              onOpenWorkRecord={onOpenWorkRecord}
              onAiExecute={onAiExecute}
            />
          ))}
          {filter === 'all' && terminalTodos.length > 0 ? (
            <CompletedTodoSection
              todos={terminalTodos}
              highlightedTodoId={highlightedTodoId}
              busyTodoIds={busyTodoIds}
              workRecordTitles={workRecordTitles}
              onStatusChange={onStatusChange}
              onTextChange={onTextChange}
              onOpenWorkRecord={onOpenWorkRecord}
              onAiExecute={onAiExecute}
            />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function CompletedTodoSection({
  todos,
  highlightedTodoId,
  busyTodoIds,
  workRecordTitles,
  onStatusChange,
  onTextChange,
  onOpenWorkRecord,
  onAiExecute
}: {
  todos: readonly ObsidianDailyTodoItem[]
  highlightedTodoId: string | null
  busyTodoIds: ReadonlySet<string>
  workRecordTitles: ReadonlySet<string>
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-1">
      <CollapsibleTrigger className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent">
        <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
        {translate('auto.components.ObsidianDailyTodoList.finishedCount', 'Finished {{value0}}', {
          value0: todos.length
        })}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {todos.map((todo) => (
          <ObsidianDailyTodoRow
            key={todo.id}
            todo={todo}
            highlighted={todo.id === highlightedTodoId}
            busy={busyTodoIds.has(todo.id)}
            hasWorkRecord={workRecordTitles.has(todo.text)}
            onStatusChange={onStatusChange}
            onTextChange={onTextChange}
            onOpenWorkRecord={onOpenWorkRecord}
            onAiExecute={onAiExecute}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function ObsidianDailyTodoRow({
  todo,
  busy,
  highlighted,
  hasWorkRecord,
  onStatusChange,
  onTextChange,
  onOpenWorkRecord,
  onAiExecute
}: {
  todo: ObsidianDailyTodoItem
  busy: boolean
  highlighted: boolean
  hasWorkRecord: boolean
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  const nextStatus = getNextObsidianDailyTodoStatus(todo.status)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.text)
  const commitEdit = (): void => {
    const text = draft.trim()
    setEditing(false)
    if (text && text !== todo.text) {
      onTextChange(todo, text)
    } else {
      setDraft(todo.text)
    }
  }
  return (
    <div
      id={`obsidian-todo-${todo.id}`}
      className={cn(
        'group flex min-h-9 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent',
        todo.status === 'in-progress' &&
          'bg-[color-mix(in_srgb,var(--obsidian-daily-in-progress)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--obsidian-daily-in-progress)_9%,transparent)]',
        highlighted && 'bg-accent ring-1 ring-border'
      )}
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
            className={cn('shrink-0', getTodoStatusColor(todo.status))}
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
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitEdit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitEdit()
            }
            if (event.key === 'Escape') {
              setDraft(todo.text)
              setEditing(false)
            }
          }}
          aria-label={translate('auto.components.ObsidianDailyTodoList.editTask', 'Edit task')}
          className="h-7 min-w-0 flex-1 rounded-md border border-input bg-input px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <span
          title={translate(
            'auto.components.ObsidianDailyTodoList.doubleClickToEdit',
            'Double-click to edit: {{value0}}',
            { value0: todo.text }
          )}
          onDoubleClick={() => {
            if (!busy) {
              setDraft(todo.text)
              setEditing(true)
            }
          }}
          className={cn(
            'min-w-0 flex-1 cursor-text truncate text-sm',
            isTerminal(todo.status) && 'text-muted-foreground line-through'
          )}
        >
          {getObsidianTodoDisplayText(todo.text)}
        </span>
      )}
      {todo.timeText ? (
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {todo.timeText}
        </span>
      ) : null}
      {todo.priority ? (
        <span
          className={cn(
            'w-6 shrink-0 text-right text-[10px] font-semibold',
            todo.priority === 'P1'
              ? 'text-obsidian-daily-priority'
              : todo.priority === 'P2'
                ? 'text-obsidian-daily-pending'
                : 'text-muted-foreground'
          )}
        >
          {todo.priority}
        </span>
      ) : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onOpenWorkRecord(todo)}
            aria-label={translate(
              'auto.components.ObsidianDailyTodoList.workRecord',
              'Work record'
            )}
            className={cn(
              'shrink-0 text-muted-foreground transition-colors hover:text-foreground',
              hasWorkRecord && 'text-obsidian-daily-compose-accent'
            )}
          >
            <NotebookPen className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={6}>
          {translate('auto.components.ObsidianDailyTodoList.workRecord', 'Work record')}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onAiExecute(todo)}
            aria-label={translate(
              'auto.components.ObsidianDailyTodoList.runWithAi',
              'Run this Todo with AI'
            )}
            className="shrink-0 text-muted-foreground opacity-60 transition-opacity hover:text-obsidian-daily-compose-accent hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Sparkles className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={6}>
          {translate('auto.components.ObsidianDailyTodoList.runWithAi', 'Run this Todo with AI')}
        </TooltipContent>
      </Tooltip>
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

function isTerminal(status: ObsidianDailyTodoStatus): boolean {
  return status === 'completed' || status === 'cancelled'
}

function getTodoStatusColor(status: ObsidianDailyTodoStatus): string {
  switch (status) {
    case 'pending':
      return 'text-obsidian-daily-pending'
    case 'in-progress':
      return 'text-obsidian-daily-in-progress'
    case 'completed':
      return 'text-obsidian-daily-completed'
    case 'cancelled':
      return 'text-muted-foreground'
  }
}

const OBSIDIAN_DAILY_GROUP_ACCENTS = [
  'var(--obsidian-daily-date-accent)',
  'var(--obsidian-daily-overview-accent)',
  'var(--obsidian-daily-compose-accent)',
  'var(--obsidian-daily-pending)'
] as const
