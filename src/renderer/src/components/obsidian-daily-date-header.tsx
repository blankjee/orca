import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { i18n, translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { ObsidianDailyTodoSnapshot } from '../../../shared/obsidian-daily-todo'
import {
  findAdjacentObsidianDailyNotes,
  formatObsidianDailyDateTitle,
  formatObsidianDailyDateWeekday,
  getObsidianDailyWeekDates
} from './obsidian-daily-date-navigation'
import { ObsidianDailyNotePicker } from './obsidian-daily-note-picker'

type ObsidianDailyDateHeaderProps = {
  directory: string
  snapshot: ObsidianDailyTodoSnapshot | null
  loading: boolean
  onRefresh: () => void
  onOpen: () => void
  onSelectNote: (filePath: string) => void
}

export function ObsidianDailyDateHeader({
  directory,
  snapshot,
  loading,
  onRefresh,
  onOpen,
  onSelectNote
}: ObsidianDailyDateHeaderProps): React.JSX.Element {
  const date = snapshot?.date
  const adjacent = useMemo(
    () =>
      date && snapshot
        ? findAdjacentObsidianDailyNotes(snapshot.dailyNotes, date)
        : { older: null, newer: null },
    [date, snapshot]
  )

  return (
    <header className="shrink-0 border-b border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || !adjacent.older}
            onClick={() => adjacent.older && onSelectNote(adjacent.older.filePath)}
            aria-label={translate(
              'auto.components.ObsidianDailyTodoPanel.previousNote',
              'Previous daily note'
            )}
          >
            <ChevronLeft />
          </Button>
          <div className="min-w-0 px-1.5">
            <h2
              title={snapshot?.relativePath || directory}
              className="truncate text-sm font-semibold"
            >
              {date
                ? formatObsidianDailyDateTitle(date, i18n.language)
                : translate('auto.components.ObsidianDailyTodoPanel.title', 'Daily Todo')}
            </h2>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {date ? <span>{formatObsidianDailyDateWeekday(date, i18n.language)}</span> : null}
              {date === snapshot?.today ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{translate('auto.components.ObsidianDailyTodoPanel.today', 'Today')}</span>
                </>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={loading || !adjacent.newer}
            onClick={() => adjacent.newer && onSelectNote(adjacent.newer.filePath)}
            aria-label={translate(
              'auto.components.ObsidianDailyTodoPanel.nextNote',
              'Next daily note'
            )}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <ObsidianDailyNotePicker
            snapshot={snapshot}
            disabled={loading || !snapshot || snapshot.dailyNotes.length === 0}
            onSelect={onSelectNote}
          />
          <RefreshButton loading={loading} disabled={!directory} onRefresh={onRefresh} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onOpen}
                aria-label={translate(
                  'auto.components.ObsidianDailyTodoPanel.openObsidian',
                  'Open Obsidian'
                )}
              >
                <ExternalLink />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {translate('auto.components.ObsidianDailyTodoPanel.openObsidian', 'Open Obsidian')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      {date && snapshot ? (
        <WeekStrip snapshot={snapshot} disabled={loading} onSelectNote={onSelectNote} />
      ) : null}
    </header>
  )
}

function WeekStrip({
  snapshot,
  disabled,
  onSelectNote
}: {
  snapshot: ObsidianDailyTodoSnapshot
  disabled: boolean
  onSelectNote: (filePath: string) => void
}): React.JSX.Element {
  const notesByDate = new Map(snapshot.dailyNotes.map((note) => [note.date, note]))
  return (
    <div
      className="mt-2 grid grid-cols-7 gap-0.5"
      aria-label={translate(
        'auto.components.ObsidianDailyTodoPanel.weekNavigation',
        'Week navigation'
      )}
    >
      {getObsidianDailyWeekDates(snapshot.date).map((date) => {
        const note = notesByDate.get(date)
        const selected = date === snapshot.date
        return (
          <Button
            key={date}
            type="button"
            variant="ghost"
            disabled={disabled || !note}
            aria-current={selected ? 'date' : undefined}
            onClick={() => note && onSelectNote(note.filePath)}
            className={cn(
              'h-8 min-w-0 flex-col gap-0 border border-transparent px-0.5 text-muted-foreground hover:bg-accent',
              selected && 'border-border bg-accent text-foreground',
              !note && !selected && 'opacity-35'
            )}
          >
            <span className="text-[9px] leading-none">
              {formatObsidianDailyDateWeekday(date, i18n.language)}
            </span>
            <span className="text-xs font-semibold leading-none tabular-nums">
              {Number(date.slice(-2))}
            </span>
          </Button>
        )
      })}
    </div>
  )
}

function RefreshButton({
  loading,
  disabled,
  onRefresh
}: {
  loading: boolean
  disabled: boolean
  onRefresh: () => void
}): React.JSX.Element {
  const label = translate('auto.components.ObsidianDailyTodoPanel.refresh', 'Refresh')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={loading || disabled}
          onClick={onRefresh}
          aria-label={label}
        >
          <RefreshCw className={loading ? 'animate-spin' : undefined} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
