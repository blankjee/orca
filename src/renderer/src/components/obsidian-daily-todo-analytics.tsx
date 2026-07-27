import { Activity, CalendarDays, CheckCircle2, Gauge, Timer } from 'lucide-react'

import { translate } from '@/i18n/i18n'
import type { ObsidianDailyTodoAnalytics } from '../../../shared/obsidian-daily-todo-analytics'
import {
  getObsidianTodoMonthDays,
  getObsidianTodoRecentDays,
  summarizeObsidianTodoAnalyticsPeriod
} from './obsidian-daily-todo-analytics-presentation'
import {
  ObsidianTodoMonthlyTrend,
  ObsidianTodoRecentTrend,
  ObsidianTodoYearHeatmap
} from './obsidian-daily-todo-analytics-charts'

export function ObsidianDailyTodoAnalyticsPanel({
  analytics,
  selectedDate,
  loading
}: {
  analytics: ObsidianDailyTodoAnalytics | null
  selectedDate: string
  loading: boolean
}): React.JSX.Element {
  if (loading && !analytics) {
    return <AnalyticsLoadingState />
  }
  if (!analytics) {
    return <AnalyticsEmptyState />
  }

  const month = summarizeObsidianTodoAnalyticsPeriod(
    getObsidianTodoMonthDays(analytics, selectedDate)
  )
  const year = summarizeObsidianTodoAnalyticsPeriod(analytics.days)
  const recentDays = getObsidianTodoRecentDays(analytics, selectedDate)
  const selectedDay = analytics.days.find((day) => day.date === selectedDate)
  const monthFocus = getObsidianTodoMonthDays(analytics, selectedDate).reduce(
    (total, day) => total + (day.focusMinutes ?? 0),
    0
  )
  const yearFocus = analytics.days.reduce((total, day) => total + (day.focusMinutes ?? 0), 0)
  const yearFocusSessions = analytics.days.reduce(
    (total, day) => total + (day.focusSessions ?? 0),
    0
  )

  return (
    <section className="mt-4 space-y-4" aria-labelledby="obsidian-todo-long-term-title">
      <div>
        <h2 id="obsidian-todo-long-term-title" className="text-sm font-semibold">
          {translate(
            'auto.components.ObsidianDailyTodoAnalytics.longTermProgress',
            'Long-term progress'
          )}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {translate(
            'auto.components.ObsidianDailyTodoAnalytics.sourceDescription',
            'Aggregated from Todo states in your daily Markdown notes'
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-xs">
        <span className="flex items-center gap-2 font-medium">
          <Timer className="size-4 text-muted-foreground" />
          {translate('auto.focus.focusTime', 'Focus time')}
        </span>
        <FocusTotal
          label={translate('auto.focus.today', 'Today')}
          minutes={selectedDay?.focusMinutes ?? 0}
        />
        <FocusTotal label={translate('auto.focus.thisMonth', 'This month')} minutes={monthFocus} />
        <FocusTotal label={translate('auto.focus.thisYear', 'This year')} minutes={yearFocus} />
        <span className="ml-auto text-muted-foreground">
          {translate('auto.focus.sessions', '{{value0}} sessions', {
            value0: yearFocusSessions
          })}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<CalendarDays />}
          label={translate(
            'auto.components.ObsidianDailyTodoAnalytics.monthCompletion',
            'Month {{value0}} completion',
            { value0: Number(selectedDate.slice(5, 7)) }
          )}
          value={`${month.completionPercent}%`}
          detail={translate(
            'auto.components.ObsidianDailyTodoAnalytics.completedOfTotal',
            '{{value0}} of {{value1}} completed',
            { value0: month.completed, value1: month.total }
          )}
        />
        <Metric
          icon={<CheckCircle2 />}
          label={translate(
            'auto.components.ObsidianDailyTodoAnalytics.yearCompleted',
            'Completed this year'
          )}
          value={String(year.completed)}
          detail={translate(
            'auto.components.ObsidianDailyTodoAnalytics.totalTasks',
            '{{value0}} tasks in total',
            { value0: year.total }
          )}
        />
        <Metric
          icon={<Gauge />}
          label={translate(
            'auto.components.ObsidianDailyTodoAnalytics.yearCompletion',
            'Year completion'
          )}
          value={`${year.completionPercent}%`}
          detail={translate(
            'auto.components.ObsidianDailyTodoAnalytics.inProgressTasks',
            '{{value0}} tasks in progress',
            { value0: year.inProgress }
          )}
        />
        <Metric
          icon={<Activity />}
          label={translate('auto.components.ObsidianDailyTodoAnalytics.activeDays', 'Active days')}
          value={String(year.activeDays)}
          detail={translate(
            'auto.components.ObsidianDailyTodoAnalytics.activeDaysDetail',
            'Days with Todo activity in {{value0}}',
            { value0: analytics.year }
          )}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ObsidianTodoRecentTrend days={recentDays} />
        <ObsidianTodoMonthlyTrend analytics={analytics} />
      </div>
      <ObsidianTodoYearHeatmap analytics={analytics} />
    </section>
  )
}

function FocusTotal({ label, minutes }: { label: string; minutes: number }): React.JSX.Element {
  return (
    <span className="text-muted-foreground">
      {label}{' '}
      <strong className="font-semibold text-foreground tabular-nums">
        {formatFocusMinutes(minutes)}
      </strong>
    </span>
  )
}

function formatFocusMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`
}

function Metric({
  icon,
  label,
  value,
  detail
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  )
}

function AnalyticsLoadingState(): React.JSX.Element {
  return (
    <section className="mt-4 space-y-3" aria-label="Loading long-term Todo analytics">
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg border border-border bg-muted/40"
          />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-lg border border-border bg-muted/40" />
    </section>
  )
}

function AnalyticsEmptyState(): React.JSX.Element {
  return (
    <section className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
      <p className="text-sm font-medium">
        {translate(
          'auto.components.ObsidianDailyTodoAnalytics.empty',
          'No historical Todo data for this year'
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {translate(
          'auto.components.ObsidianDailyTodoAnalytics.emptyDescription',
          'Todo history appears here as dated Markdown notes are added.'
        )}
      </p>
    </section>
  )
}
