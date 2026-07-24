import React from 'react'
import { FolderOpen, LoaderCircle, NotebookPen, Plus, RefreshCw } from 'lucide-react'

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
import { i18n, translate } from '@/i18n/i18n'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoSnapshot,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import { ObsidianDailyDateHeader } from './obsidian-daily-date-header'
import { formatObsidianDailyDateShort } from './obsidian-daily-date-navigation'
import { ObsidianDailyTodoList } from './obsidian-daily-todo-list'
import { ObsidianDailyTodoOverviewPanel } from './obsidian-daily-todo-overview'
import type {
  ObsidianDailyTodoFilter,
  ObsidianDailyTodoGroup,
  ObsidianDailyTodoOverview
} from './obsidian-daily-todo-presentation'

type TodoPriority = 'P1' | 'P2' | 'P3'

type ObsidianDailyTodoPanelContentProps = {
  directory: string
  snapshot: ObsidianDailyTodoSnapshot | null
  errorMessage: string | null
  loading: boolean
  adding: boolean
  groups: readonly ObsidianDailyTodoGroup[]
  overview: ObsidianDailyTodoOverview
  filter: ObsidianDailyTodoFilter
  highlightedTodoId: string | null
  busyTodoIds: ReadonlySet<string>
  draft: string
  priority: TodoPriority
  onChooseDirectory: () => void
  onRefresh: () => void
  onOpen: () => void
  onSelectNote: (filePath: string) => void
  onFilterChange: (filter: ObsidianDailyTodoFilter) => void
  onFocusTodo: (todo: ObsidianDailyTodoItem) => void
  onDraftChange: (value: string) => void
  onPriorityChange: (priority: TodoPriority) => void
  onAdd: () => void
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
}

export function ObsidianDailyTodoPanelContent({
  directory,
  snapshot,
  errorMessage,
  loading,
  adding,
  groups,
  overview,
  filter,
  highlightedTodoId,
  busyTodoIds,
  draft,
  priority,
  onChooseDirectory,
  onRefresh,
  onOpen,
  onSelectNote,
  onFilterChange,
  onFocusTodo,
  onDraftChange,
  onPriorityChange,
  onAdd,
  onStatusChange,
  onTextChange,
  onOpenWorkRecord,
  onAiExecute
}: ObsidianDailyTodoPanelContentProps): React.JSX.Element {
  return (
    <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-background shadow-xs">
      <ObsidianDailyDateHeader
        directory={directory}
        snapshot={snapshot}
        loading={loading}
        onRefresh={onRefresh}
        onOpen={onOpen}
        onSelectNote={onSelectNote}
      />

      {!directory.trim() ? (
        <ConfigureVaultState onChoose={onChooseDirectory} />
      ) : loading && !snapshot ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
        </div>
      ) : errorMessage && !snapshot ? (
        <ErrorState message={errorMessage} onChoose={onChooseDirectory} onRetry={onRefresh} />
      ) : snapshot && !snapshot.filePath ? (
        <MissingTodayState onOpen={onOpen} />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
            {overview.total > 0 ? (
              <ObsidianDailyTodoOverviewPanel
                overview={overview}
                filter={filter}
                onFilterChange={onFilterChange}
                onFocusTodo={onFocusTodo}
              />
            ) : null}
            <AddTodoForm
              snapshot={snapshot}
              draft={draft}
              priority={priority}
              adding={adding}
              onDraftChange={onDraftChange}
              onPriorityChange={onPriorityChange}
              onAdd={onAdd}
            />

            {errorMessage ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </p>
            ) : null}

            {groups.length > 0 ? (
              <ObsidianDailyTodoList
                groups={groups}
                filter={filter}
                highlightedTodoId={highlightedTodoId}
                busyTodoIds={busyTodoIds}
                workRecordTitles={new Set(snapshot?.workRecords.map((record) => record.title))}
                onStatusChange={onStatusChange}
                onTextChange={onTextChange}
                onOpenWorkRecord={onOpenWorkRecord}
                onAiExecute={onAiExecute}
              />
            ) : overview.total > 0 ? (
              <FilteredTodoState onClear={() => onFilterChange('all')} />
            ) : (
              <EmptyTodoState />
            )}
          </div>
        </ScrollArea>
      )}
    </section>
  )
}

function AddTodoForm({
  snapshot,
  draft,
  priority,
  adding,
  onDraftChange,
  onPriorityChange,
  onAdd
}: {
  snapshot: ObsidianDailyTodoSnapshot | null
  draft: string
  priority: TodoPriority
  adding: boolean
  onDraftChange: (value: string) => void
  onPriorityChange: (priority: TodoPriority) => void
  onAdd: () => void
}): React.JSX.Element {
  const placeholder = snapshot?.date
    ? translate('auto.components.ObsidianDailyTodoPanel.addPlaceholderDate', 'Add to {{value0}}', {
        value0: formatObsidianDailyDateShort(snapshot.date, i18n.language)
      })
    : translate(
        'auto.components.ObsidianDailyTodoPanel.addPlaceholder',
        'Add a task to this daily note'
      )
  return (
    <form
      className="flex items-center gap-2 rounded-lg border border-obsidian-daily-compose-accent/25 border-l-[3px] border-l-obsidian-daily-compose-accent bg-[color-mix(in_srgb,var(--obsidian-daily-compose-accent)_4%,var(--card))] p-2.5"
      onSubmit={(event) => {
        event.preventDefault()
        onAdd()
      }}
    >
      <Plus className="ml-1 size-4 shrink-0 text-obsidian-daily-compose-accent" />
      <Input
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <PrioritySelect value={priority} onChange={onPriorityChange} />
      <Button type="submit" size="sm" disabled={!snapshot?.filePath || !draft.trim() || adding}>
        {adding ? <LoaderCircle className="animate-spin" /> : <Plus />}
        {translate('auto.components.ObsidianDailyTodoPanel.add', 'Add')}
      </Button>
    </form>
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

function MissingTodayState({ onOpen }: { onOpen: () => void }): React.JSX.Element {
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
      <Button type="button" className="mt-5" onClick={onOpen}>
        {translate(
          'auto.components.ObsidianDailyTodoPanel.createTodayInObsidian',
          'Create today’s note in Obsidian'
        )}
      </Button>
    </div>
  )
}

function EmptyTodoState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <NotebookPen className="mb-3 size-7 text-muted-foreground" />
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

function FilteredTodoState({ onClear }: { onClear: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <p className="text-sm text-muted-foreground">
        {translate(
          'auto.components.ObsidianDailyTodoPanel.noFilteredTasks',
          'No tasks match this filter.'
        )}
      </p>
      <Button type="button" variant="link" size="sm" onClick={onClear}>
        {translate('auto.components.ObsidianDailyTodoPanel.clearFilter', 'Show all tasks')}
      </Button>
    </div>
  )
}
