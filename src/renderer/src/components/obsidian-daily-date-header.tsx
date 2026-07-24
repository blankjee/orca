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
    <header className="shrink-0 border-b border-border/60 bg-[color-mix(in_srgb,var(--obsidian-daily-date-accent)_3%,var(--background))] px-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-1">
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
            className="mt-0.5"
          >
            <ChevronLeft />
          </Button>
          <div className="min-w-0 border-l-2 border-obsidian-daily-date-accent/55 px-3">
            <h2 className="truncate text-2xl font-semibold leading-none">
              {date
                ? formatObsidianDailyDateTitle(date, i18n.language)
                : translate('auto.components.ObsidianDailyTodoPanel.title', 'Daily Todo')}
            </h2>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {date ? <span>{formatObsidianDailyDateWeekday(date, i18n.language)}</span> : null}
              {date === snapshot?.today ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{translate('auto.components.ObsidianDailyTodoPanel.today', 'Today')}</span>
                </>
              ) : null}
            </div>
            <p
              title={snapshot?.filePath || directory}
              className="mt-1 max-w-2xl truncate font-mono text-[11px] text-muted-foreground"
            >
              {snapshot?.relativePath ||
                directory ||
                translate('auto.components.ObsidianDailyTodoPanel.notConfigured', 'Not configured')}
            </p>
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
            className="mt-0.5"
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ObsidianDailyNotePicker
            snapshot={snapshot}
            disabled={loading || !snapshot || snapshot.dailyNotes.length === 0}
            onSelect={onSelectNote}
          />
          <RefreshButton loading={loading} disabled={!directory} onRefresh={onRefresh} />
          <Button type="button" variant="outline" size="sm" onClick={onOpen}>
            <ExternalLink />
            <span className="hidden sm:inline">
              {translate('auto.components.ObsidianDailyTodoPanel.openObsidian', 'Open Obsidian')}
            </span>
          </Button>
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
      className="mt-4 grid max-w-2xl grid-cols-7 gap-1"
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
              'h-12 min-w-0 flex-col gap-0.5 border border-transparent px-1 text-muted-foreground hover:bg-[color-mix(in_srgb,var(--obsidian-daily-date-accent)_8%,var(--background))]',
              selected &&
                'border-obsidian-daily-date-accent/30 bg-[color-mix(in_srgb,var(--obsidian-daily-date-accent)_16%,var(--background))] text-foreground shadow-xs',
              !note && !selected && 'opacity-35'
            )}
          >
            <span className="text-[10px]">
              {formatObsidianDailyDateWeekday(date, i18n.language)}
            </span>
            <span className="text-sm font-semibold tabular-nums">{Number(date.slice(-2))}</span>
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
