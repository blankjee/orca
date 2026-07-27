import { FolderOpen, NotebookPen, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'

export function ConfigureObsidianVaultState({
  onChoose
}: {
  onChoose: () => void
}): React.JSX.Element {
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

export function ObsidianDailyTodoErrorState({
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

export function MissingObsidianDailyNoteState({
  onOpen
}: {
  onOpen: () => void
}): React.JSX.Element {
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

export function EmptyObsidianDailyTodoState(): React.JSX.Element {
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

export function FilteredObsidianDailyTodoState({
  onClear
}: {
  onClear: () => void
}): React.JSX.Element {
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
