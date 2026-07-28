import React from 'react'
import { CheckCircle2, Circle, CircleDot, ListTodo } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { ObsidianDailyTodoItem } from '../../../shared/obsidian-daily-todo'
import {
  getObsidianTodoDisplayText,
  type ObsidianDailyTodoFilter,
  type ObsidianDailyTodoOverview
} from './obsidian-daily-todo-presentation'

type ObsidianDailyTodoOverviewProps = {
  overview: ObsidianDailyTodoOverview
  filter: ObsidianDailyTodoFilter
  onFilterChange: (filter: ObsidianDailyTodoFilter) => void
  onFocusTodo: (todo: ObsidianDailyTodoItem) => void
}

export function ObsidianDailyTodoOverviewPanel({
  overview,
  filter,
  onFilterChange,
  onFocusTodo
}: ObsidianDailyTodoOverviewProps): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-obsidian-daily-overview-accent/25 bg-[color-mix(in_srgb,var(--obsidian-daily-overview-accent)_4%,var(--card))]">
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-obsidian-daily-overview-accent">
                {translate(
                  'auto.components.ObsidianDailyTodoPanel.overviewTitle',
                  'Daily overview'
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{getProgressSummary(overview)}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-2xl font-semibold text-obsidian-daily-overview-accent tabular-nums">
                {overview.completionPercent}%
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {translate(
                  'auto.components.ObsidianDailyTodoPanel.completedOfTotal',
                  '{{value0}} of {{value1}} completed',
                  { value0: overview.completed, value1: overview.total }
                )}
              </div>
            </div>
          </div>
          <Progress
            value={overview.completionPercent}
            className="mt-3 h-1.5 bg-[color-mix(in_srgb,var(--obsidian-daily-overview-accent)_16%,var(--background))] [&_[data-slot=progress-indicator]]:bg-obsidian-daily-overview-accent"
          />
          <TodoStatusFilters overview={overview} filter={filter} onFilterChange={onFilterChange} />
        </div>
        <div className="grid content-start gap-2 border-t border-border/50 pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4">
          <FocusRow
            icon={<CircleDot />}
            label={translate(
              'auto.components.ObsidianDailyTodoPanel.currentFocus',
              'Current focus'
            )}
            todo={overview.currentTodo}
            emptyLabel={translate(
              'auto.components.ObsidianDailyTodoPanel.noCurrentFocus',
              'No task is in progress'
            )}
            tone="in-progress"
            onFocusTodo={onFocusTodo}
          />
          <FocusRow
            icon={<Circle />}
            label={translate('auto.components.ObsidianDailyTodoPanel.nextUp', 'Next up')}
            todo={overview.nextTodo}
            emptyLabel={translate(
              'auto.components.ObsidianDailyTodoPanel.noNextTodo',
              'No pending tasks'
            )}
            tone="pending"
            onFocusTodo={onFocusTodo}
          />
        </div>
      </div>
    </section>
  )
}

function TodoStatusFilters({
  overview,
  filter,
  onFilterChange
}: {
  overview: ObsidianDailyTodoOverview
  filter: ObsidianDailyTodoFilter
  onFilterChange: (filter: ObsidianDailyTodoFilter) => void
}): React.JSX.Element {
  const items = [
    [
      'all',
      ListTodo,
      translate('auto.components.ObsidianDailyTodoPanel.total', 'Total'),
      overview.total,
      '[&_svg]:text-obsidian-daily-overview-accent'
    ],
    [
      'pending',
      Circle,
      translate('auto.components.ObsidianDailyTodoPanel.pending', 'Pending'),
      overview.pending,
      '[&_svg]:text-obsidian-daily-pending'
    ],
    [
      'in-progress',
      CircleDot,
      translate('auto.components.ObsidianDailyTodoPanel.inProgress', 'In progress'),
      overview.inProgress,
      '[&_svg]:text-obsidian-daily-in-progress'
    ],
    [
      'completed',
      CheckCircle2,
      translate('auto.components.ObsidianDailyTodoPanel.completed', 'Completed'),
      overview.completed,
      '[&_svg]:text-obsidian-daily-completed'
    ]
  ] as const

  return (
    <div className="mt-3 flex flex-wrap gap-1">
      {items.map(([value, Icon, label, count, iconTone]) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="xs"
          data-current={filter === value ? 'true' : undefined}
          onClick={() => onFilterChange(value)}
          className={cn(
            'gap-1.5 text-muted-foreground',
            iconTone,
            filter === value && 'bg-accent text-foreground'
          )}
        >
          <Icon className="size-3.5" />
          {label}
          <span className="tabular-nums">{count}</span>
        </Button>
      ))}
    </div>
  )
}

function FocusRow({
  icon,
  label,
  todo,
  emptyLabel,
  tone,
  onFocusTodo
}: {
  icon: React.ReactNode
  label: string
  todo: ObsidianDailyTodoItem | null
  emptyLabel: string
  tone: 'pending' | 'in-progress'
  onFocusTodo: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'border-l-2 py-1 pl-3',
        tone === 'in-progress'
          ? 'border-obsidian-daily-in-progress/55 [&_svg]:text-obsidian-daily-in-progress'
          : 'border-obsidian-daily-pending/55 [&_svg]:text-obsidian-daily-pending'
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      {todo ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onFocusTodo(todo)}
          className="mt-0.5 h-auto w-full justify-start px-2 py-1.5 text-left"
        >
          <span className="min-w-0 truncate">{getObsidianTodoDisplayText(todo.text)}</span>
        </Button>
      ) : (
        <p className="mt-1 truncate px-2 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  )
}

function getProgressSummary(overview: ObsidianDailyTodoOverview): string {
  if (overview.total === 0) {
    return translate(
      'auto.components.ObsidianDailyTodoPanel.noTasksSummary',
      'No tasks in this daily note'
    )
  }
  if (overview.completed === overview.total) {
    return translate(
      'auto.components.ObsidianDailyTodoPanel.allTasksComplete',
      'All {{value0}} tasks are complete',
      { value0: overview.total }
    )
  }
  if (overview.inProgress > 0) {
    return translate(
      'auto.components.ObsidianDailyTodoPanel.tasksInProgress',
      '{{value0}} tasks in progress',
      { value0: overview.inProgress }
    )
  }
  return translate(
    'auto.components.ObsidianDailyTodoPanel.tasksPending',
    '{{value0}} tasks pending',
    { value0: overview.pending }
  )
}
