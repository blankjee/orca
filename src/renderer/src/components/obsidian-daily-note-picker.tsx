import React from 'react'
import { CalendarDays } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import type { ObsidianDailyTodoSnapshot } from '../../../shared/obsidian-daily-todo'

export function ObsidianDailyNotePicker({
  snapshot,
  disabled,
  onSelect
}: {
  snapshot: ObsidianDailyTodoSnapshot | null
  disabled: boolean
  onSelect: (filePath: string) => void
}): React.JSX.Element {
  const selected = snapshot?.dailyNotes.find((note) => note.filePath === snapshot.filePath)
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Select value={selected?.filePath} disabled={disabled} onValueChange={onSelect}>
        <SelectTrigger
          size="sm"
          className="w-[190px]"
          aria-label={translate(
            'auto.components.ObsidianDailyNotePicker.label',
            'Select a daily note'
          )}
        >
          <CalendarDays className="size-3.5" />
          <SelectValue
            placeholder={translate(
              'auto.components.ObsidianDailyNotePicker.todayMissing',
              'Today · not found'
            )}
          />
        </SelectTrigger>
        <SelectContent position="popper" align="end" className="w-[360px] max-w-[80vw]">
          {snapshot?.dailyNotes.map((note) => (
            <SelectItem key={note.filePath} value={note.filePath}>
              <span className="min-w-24 font-mono text-xs">{note.date}</span>
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                {note.relativePath}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
        {translate('auto.components.ObsidianDailyNotePicker.count', '{{value0}} notes', {
          value0: snapshot?.dailyNotes.length ?? 0
        })}
      </span>
    </div>
  )
}
