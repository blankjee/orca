import React from 'react'
import { ExternalLink, FolderOpen, LoaderCircle, NotebookPen, Plus, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoSnapshot,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import { ObsidianDailyNotePicker } from './obsidian-daily-note-picker'
import { ObsidianDailyTodoList } from './obsidian-daily-todo-list'
import type { ObsidianDailyTodoGroup } from './obsidian-daily-todo-presentation'

export type ObsidianDailyTodoCounts = {
  total: number
  pending: number
  inProgress: number
  completed: number
}

type TodoPriority = 'P1' | 'P2' | 'P3'

type ObsidianDailyTodoPanelContentProps = {
  directory: string
  snapshot: ObsidianDailyTodoSnapshot | null
  errorMessage: string | null
  loading: boolean
  adding: boolean
  groups: readonly ObsidianDailyTodoGroup[]
  counts: ObsidianDailyTodoCounts
  busyTodoIds: ReadonlySet<string>
  draft: string
  priority: TodoPriority
  onChooseDirectory: () => void
  onRefresh: () => void
  onOpen: () => void
  onSelectNote: (filePath: string) => void
  onDraftChange: (value: string) => void
  onPriorityChange: (priority: TodoPriority) => void
  onAdd: () => void
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
}

export function ObsidianDailyTodoPanelContent({
  directory,
  snapshot,
  errorMessage,
  loading,
  adding,
  groups,
  counts,
  busyTodoIds,
  draft,
  priority,
  onChooseDirectory,
  onRefresh,
  onOpen,
  onSelectNote,
  onDraftChange,
  onPriorityChange,
  onAdd,
  onStatusChange
}: ObsidianDailyTodoPanelContentProps): React.JSX.Element {
  return (
    <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-background shadow-xs">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border/60 px-3">
        <span className="flex size-7 items-center justify-center rounded-md border border-border bg-muted/40">
          <NotebookPen className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">
            {translate('auto.components.ObsidianDailyTodoPanel.title', 'Daily Todo')}
          </h2>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {snapshot?.filePath ||
              directory ||
              translate('auto.components.ObsidianDailyTodoPanel.notConfigured', 'Not configured')}
          </p>
        </div>
        <ObsidianDailyNotePicker
          snapshot={snapshot}
          disabled={loading || !snapshot || snapshot.dailyNotes.length === 0}
          onSelect={onSelectNote}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={loading || !directory}
              onClick={onRefresh}
              aria-label={translate('auto.components.ObsidianDailyTodoPanel.refresh', 'Refresh')}
            >
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {translate('auto.components.ObsidianDailyTodoPanel.refresh', 'Refresh')}
          </TooltipContent>
        </Tooltip>
        <Button type="button" variant="outline" size="sm" onClick={onOpen}>
          <ExternalLink />
          {translate('auto.components.ObsidianDailyTodoPanel.openObsidian', 'Open Obsidian')}
        </Button>
      </header>

      {!directory.trim() ? (
        <ConfigureVaultState onChoose={onChooseDirectory} />
      ) : loading && !snapshot ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
        </div>
      ) : errorMessage && !snapshot ? (
        <ErrorState message={errorMessage} onChoose={onChooseDirectory} onRetry={onRefresh} />
      ) : snapshot && !snapshot.filePath ? (
        <MissingTodayState />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
            <TodoCounts counts={counts} />
            <form
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5"
              onSubmit={(event) => {
                event.preventDefault()
                onAdd()
              }}
            >
              <Plus className="ml-1 size-4 shrink-0 text-muted-foreground" />
              <Input
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={translate(
                  'auto.components.ObsidianDailyTodoPanel.addPlaceholder',
                  'Add a task to this daily note'
                )}
                aria-label={translate(
                  'auto.components.ObsidianDailyTodoPanel.addPlaceholder',
                  'Add a task to this daily note'
                )}
                className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <PrioritySelect value={priority} onChange={onPriorityChange} />
              <Button
                type="submit"
                size="sm"
                disabled={!snapshot?.filePath || !draft.trim() || adding}
              >
                {adding ? <LoaderCircle className="animate-spin" /> : <Plus />}
                {translate('auto.components.ObsidianDailyTodoPanel.add', 'Add')}
              </Button>
            </form>

            {errorMessage ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </p>
            ) : null}

            {groups.length > 0 ? (
              <ObsidianDailyTodoList
                groups={groups}
                busyTodoIds={busyTodoIds}
                onStatusChange={onStatusChange}
              />
            ) : (
              <EmptyTodoState />
            )}
          </div>
        </ScrollArea>
      )}
    </section>
  )
}

function PrioritySelect({
  value,
  onChange
}: {
  value: TodoPriority
  onChange: (priority: TodoPriority) => void
}): React.JSX.Element {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as TodoPriority)}>
      <SelectTrigger
        size="sm"
        aria-label={translate('auto.components.ObsidianDailyTodoPanel.priority', 'Priority')}
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
  )
}

function ConfigureVaultState({ onChoose }: { onChoose: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <FolderOpen className="mb-4 size-9 text-muted-foreground" />
      <h3 className="text-sm font-semibold">
        {translate(
          'auto.components.ObsidianDailyTodoPanel.chooseTitle',
          'Choose your Obsidian vault root'
        )}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {translate(
          'auto.components.ObsidianDailyTodoPanel.chooseDescription',
          'Orca automatically finds today and every YYYY-MM-DD.md daily note anywhere inside the vault.'
        )}
      </p>
      <Button type="button" className="mt-5" onClick={onChoose}>
        <FolderOpen />
        {translate('auto.components.ObsidianDailyTodoPanel.chooseFolder', 'Choose folder')}
      </Button>
    </div>
  )
}

function ErrorState({
  message,
  onChoose,
  onRetry
}: {
  message: string
  onChoose: () => void
  onRetry: () => void
}): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <NotebookPen className="mb-4 size-9 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{message}</h3>
      <div className="mt-5 flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw />
          {translate('auto.components.ObsidianDailyTodoPanel.retry', 'Retry')}
        </Button>
        <Button type="button" onClick={onChoose}>
          <FolderOpen />
          {translate('auto.components.ObsidianDailyTodoPanel.chooseFolder', 'Choose folder')}
        </Button>
      </div>
    </div>
  )
}

function MissingTodayState(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <NotebookPen className="mb-4 size-9 text-muted-foreground" />
      <h3 className="text-sm font-semibold">
        {translate(
          'auto.components.ObsidianDailyTodoPanel.todayNotFound',
          'Today’s daily note was not found in this vault.'
        )}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {translate(
          'auto.components.ObsidianDailyTodoPanel.historyAvailable',
          'Choose any discovered daily note from the date menu above.'
        )}
      </p>
    </div>
  )
}

function TodoCounts({ counts }: { counts: ObsidianDailyTodoCounts }): React.JSX.Element {
  const items = [
    [translate('auto.components.ObsidianDailyTodoPanel.total', 'Total'), counts.total],
    [translate('auto.components.ObsidianDailyTodoPanel.pending', 'Pending'), counts.pending],
    [
      translate('auto.components.ObsidianDailyTodoPanel.inProgress', 'In progress'),
      counts.inProgress
    ],
    [translate('auto.components.ObsidianDailyTodoPanel.completed', 'Completed'), counts.completed]
  ] as const
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border/60 bg-muted/20 sm:grid-cols-4">
      {items.map(([label, value], index) => (
        <div
          key={label}
          className={index === 0 ? 'px-3 py-2.5' : 'border-l border-border/50 px-3 py-2.5'}
        >
          <div className="text-lg font-semibold tabular-nums">{value}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  )
}

function EmptyTodoState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <NotebookPen className="mb-3 size-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        {translate(
          'auto.components.ObsidianDailyTodoPanel.emptyTitle',
          'No Markdown todos in this daily note'
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {translate(
          'auto.components.ObsidianDailyTodoPanel.emptyDescription',
          'Add one above or use a checklist like “- [ ] Task” in Obsidian.'
        )}
      </p>
    </div>
  )
}
