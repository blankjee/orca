import React from 'react'
import { LoaderCircle, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { i18n, translate } from '@/i18n/i18n'
import type { ObsidianDailyTodoSnapshot } from '../../../shared/obsidian-daily-todo'
import { formatObsidianDailyDateShort } from './obsidian-daily-date-navigation'

export type ObsidianDailyTodoDraftPriority = 'P1' | 'P2' | 'P3'

export function ObsidianDailyTodoAddForm({
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
  priority: ObsidianDailyTodoDraftPriority
  adding: boolean
  onDraftChange: (value: string) => void
  onPriorityChange: (priority: ObsidianDailyTodoDraftPriority) => void
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
      className="flex items-center gap-1.5 rounded-md border border-input bg-background p-1"
      onSubmit={(event) => {
        event.preventDefault()
        onAdd()
      }}
    >
      <Plus className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
      <Input
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-7 min-w-0 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
      />
      <TodoDraftPrioritySelect value={priority} onChange={onPriorityChange} />
      <Button type="submit" size="xs" disabled={!snapshot?.filePath || !draft.trim() || adding}>
        {adding ? <LoaderCircle className="animate-spin" /> : <Plus />}
        {translate('auto.components.ObsidianDailyTodoPanel.add', 'Add')}
      </Button>
    </form>
  )
}

function TodoDraftPrioritySelect({
  value,
  onChange
}: {
  value: ObsidianDailyTodoDraftPriority
  onChange: (priority: ObsidianDailyTodoDraftPriority) => void
}): React.JSX.Element {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as ObsidianDailyTodoDraftPriority)}
    >
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
