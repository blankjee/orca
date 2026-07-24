import React, { useState } from 'react'
import { CalendarDays, Check, ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
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
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={translate(
            'auto.components.ObsidianDailyNotePicker.label',
            'Select a daily note'
          )}
          aria-expanded={open}
          className="justify-between gap-2"
        >
          <CalendarDays />
          <span className="hidden sm:inline">
            {translate('auto.components.ObsidianDailyNotePicker.allNotes', 'All daily notes')}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {snapshot?.dailyNotes.length ?? 0}
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] max-w-[85vw] p-0">
        <Command>
          <CommandInput
            placeholder={translate(
              'auto.components.ObsidianDailyNotePicker.searchPlaceholder',
              'Search date or path'
            )}
          />
          <CommandList className="max-h-[360px]">
            <CommandEmpty>
              {translate(
                'auto.components.ObsidianDailyNotePicker.noResults',
                'No matching daily notes'
              )}
            </CommandEmpty>
            {snapshot?.dailyNotes.map((note) => (
              <CommandItem
                key={note.filePath}
                value={`${note.date} ${note.relativePath}`}
                onSelect={() => {
                  onSelect(note.filePath)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'size-3.5',
                    note.filePath === snapshot.filePath ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="w-24 shrink-0 font-mono text-xs">{note.date}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {note.relativePath}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
