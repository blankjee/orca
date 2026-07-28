import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import type { ObsidianDailyTodoPriority } from '../../../shared/obsidian-daily-todo-mutation'
import {
  getNextObsidianDailyTodoStatus,
  getObsidianTodoDisplayText,
  isObsidianDailyTodoTerminal,
  type ObsidianDailyTodoFilter,
  type ObsidianDailyTodoGroup
} from './obsidian-daily-todo-presentation'
import { ObsidianDailyTodoStatusButton } from './obsidian-daily-todo-status-button'
import { ObsidianDailyTodoRowTools } from './obsidian-daily-todo-row-tools'

const NOOP_START_FOCUS = (): void => {}

export function ObsidianDailyTodoList({
  groups,
  filter,
  highlightedTodoId,
  selectedTodoId,
  collapsed = false,
  busyTodoIds,
  workRecordTitles,
  onSelectTodo,
  onStatusChange,
  onTextChange,
  onPriorityChange,
  onDelete,
  onOpenWorkRecord,
  onStartFocus = NOOP_START_FOCUS,
  onAiExecute
}: {
  groups: readonly ObsidianDailyTodoGroup[]
  filter: ObsidianDailyTodoFilter
  highlightedTodoId: string | null
  selectedTodoId: string | null
  collapsed?: boolean
  busyTodoIds: ReadonlySet<string>
  workRecordTitles: ReadonlySet<string>
  onSelectTodo: (todo: ObsidianDailyTodoItem) => void
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onPriorityChange: (todo: ObsidianDailyTodoItem, priority: ObsidianDailyTodoPriority) => void
  onDelete: (todo: ObsidianDailyTodoItem) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onStartFocus?: (todo: ObsidianDailyTodoItem) => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card">
      {groups.map((group) => (
        <ObsidianDailyTodoGroupSection
          key={group.name}
          group={group}
          filter={filter}
          highlightedTodoId={highlightedTodoId}
          selectedTodoId={selectedTodoId}
          collapsed={collapsed}
          busyTodoIds={busyTodoIds}
          workRecordTitles={workRecordTitles}
          onSelectTodo={onSelectTodo}
          onStatusChange={onStatusChange}
          onTextChange={onTextChange}
          onPriorityChange={onPriorityChange}
          onDelete={onDelete}
          onOpenWorkRecord={onOpenWorkRecord}
          onStartFocus={onStartFocus}
          onAiExecute={onAiExecute}
        />
      ))}
    </div>
  )
}

function ObsidianDailyTodoGroupSection({
  group,
  filter,
  highlightedTodoId,
  selectedTodoId,
  collapsed,
  busyTodoIds,
  workRecordTitles,
  onSelectTodo,
  onStatusChange,
  onTextChange,
  onPriorityChange,
  onDelete,
  onOpenWorkRecord,
  onStartFocus,
  onAiExecute
}: {
  group: ObsidianDailyTodoGroup
  filter: ObsidianDailyTodoFilter
  highlightedTodoId: string | null
  selectedTodoId: string | null
  collapsed: boolean
  busyTodoIds: ReadonlySet<string>
  workRecordTitles: ReadonlySet<string>
  onSelectTodo: (todo: ObsidianDailyTodoItem) => void
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onPriorityChange: (todo: ObsidianDailyTodoItem, priority: ObsidianDailyTodoPriority) => void
  onDelete: (todo: ObsidianDailyTodoItem) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onStartFocus: (todo: ObsidianDailyTodoItem) => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(true)
  const todos = group.priorities.flatMap((priorityGroup) => priorityGroup.todos)
  const activeTodos = todos.filter((todo) => !isObsidianDailyTodoTerminal(todo.status))
  const terminalTodos = todos.filter((todo) => isObsidianDailyTodoTerminal(todo.status))
  const remaining = activeTodos.length
  const displayedOpen = !collapsed && open
  return (
    <Collapsible
      open={displayedOpen}
      onOpenChange={(nextOpen) => {
        if (!collapsed) {
          setOpen(nextOpen)
        }
      }}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 bg-muted/35 px-3 py-2 text-left hover:bg-accent">
        <ChevronDown
          className={cn('size-3.5 transition-transform', !displayedOpen && '-rotate-90')}
        />
        <span className="text-sm font-semibold">{group.name}</span>
        <span className="text-xs text-muted-foreground">
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
              selected={todo.id === selectedTodoId}
              busy={busyTodoIds.has(todo.id)}
              hasWorkRecord={workRecordTitles.has(todo.text)}
              onSelect={onSelectTodo}
              onStatusChange={onStatusChange}
              onTextChange={onTextChange}
              onPriorityChange={onPriorityChange}
              onDelete={onDelete}
              onOpenWorkRecord={onOpenWorkRecord}
              onStartFocus={onStartFocus}
              onAiExecute={onAiExecute}
            />
          ))}
          {filter === 'all' && terminalTodos.length > 0 ? (
            <CompletedTodoSection
              todos={terminalTodos}
              highlightedTodoId={highlightedTodoId}
              selectedTodoId={selectedTodoId}
              busyTodoIds={busyTodoIds}
              workRecordTitles={workRecordTitles}
              onSelectTodo={onSelectTodo}
              onStatusChange={onStatusChange}
              onTextChange={onTextChange}
              onPriorityChange={onPriorityChange}
              onDelete={onDelete}
              onOpenWorkRecord={onOpenWorkRecord}
              onStartFocus={onStartFocus}
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
  selectedTodoId,
  busyTodoIds,
  workRecordTitles,
  onSelectTodo,
  onStatusChange,
  onTextChange,
  onPriorityChange,
  onDelete,
  onOpenWorkRecord,
  onStartFocus,
  onAiExecute
}: {
  todos: readonly ObsidianDailyTodoItem[]
  highlightedTodoId: string | null
  selectedTodoId: string | null
  busyTodoIds: ReadonlySet<string>
  workRecordTitles: ReadonlySet<string>
  onSelectTodo: (todo: ObsidianDailyTodoItem) => void
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onPriorityChange: (todo: ObsidianDailyTodoItem, priority: ObsidianDailyTodoPriority) => void
  onDelete: (todo: ObsidianDailyTodoItem) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onStartFocus: (todo: ObsidianDailyTodoItem) => void
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
            selected={todo.id === selectedTodoId}
            busy={busyTodoIds.has(todo.id)}
            hasWorkRecord={workRecordTitles.has(todo.text)}
            onSelect={onSelectTodo}
            onStatusChange={onStatusChange}
            onTextChange={onTextChange}
            onPriorityChange={onPriorityChange}
            onDelete={onDelete}
            onOpenWorkRecord={onOpenWorkRecord}
            onStartFocus={onStartFocus}
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
  selected,
  hasWorkRecord,
  onSelect,
  onStatusChange,
  onTextChange,
  onPriorityChange,
  onDelete,
  onOpenWorkRecord,
  onStartFocus,
  onAiExecute
}: {
  todo: ObsidianDailyTodoItem
  busy: boolean
  highlighted: boolean
  selected: boolean
  hasWorkRecord: boolean
  onSelect: (todo: ObsidianDailyTodoItem) => void
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onPriorityChange: (todo: ObsidianDailyTodoItem, priority: ObsidianDailyTodoPriority) => void
  onDelete: (todo: ObsidianDailyTodoItem) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onStartFocus: (todo: ObsidianDailyTodoItem) => void
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
      data-current={selected ? 'true' : undefined}
      className={cn(
        'group flex min-h-9 items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-accent',
        selected && 'bg-accent',
        highlighted && 'bg-accent ring-1 ring-border'
      )}
      style={{ marginLeft: `${Math.min(todo.depth, 5) * 18}px` }}
    >
      <ObsidianDailyTodoStatusButton
        todo={todo}
        status={nextStatus}
        busy={busy}
        onStatusChange={onStatusChange}
      />
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
        <button
          type="button"
          title={translate(
            'auto.components.ObsidianDailyTodoList.doubleClickToEdit',
            'Double-click to edit: {{value0}}',
            { value0: todo.text }
          )}
          onClick={() => onSelect(todo)}
          onDoubleClick={() => {
            if (!busy) {
              setDraft(todo.text)
              setEditing(true)
            }
          }}
          className={cn(
            'line-clamp-2 min-w-0 flex-1 cursor-text break-words rounded-sm py-0.5 text-left text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isObsidianDailyTodoTerminal(todo.status) && 'text-muted-foreground line-through'
          )}
        >
          {getObsidianTodoDisplayText(todo.text)}
        </button>
      )}
      {todo.timeText ? (
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {todo.timeText}
        </span>
      ) : null}
      <ObsidianDailyTodoRowTools
        todo={todo}
        busy={busy}
        selected={selected}
        hasWorkRecord={hasWorkRecord}
        onPriorityChange={onPriorityChange}
        onDelete={onDelete}
        onStartFocus={onStartFocus}
        onOpenWorkRecord={onOpenWorkRecord}
        onAiExecute={onAiExecute}
      />
    </div>
  )
}
