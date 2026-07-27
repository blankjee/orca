import type {
  ObsidianDailyTodoAnalyticsDay,
  ObsidianDailyTodoAnalytics
} from '../../../shared/obsidian-daily-todo-analytics'
import { translate } from '@/i18n/i18n'
import {
  getObsidianTodoYearCalendar,
  summarizeObsidianTodoAnalyticsPeriod
} from './obsidian-daily-todo-analytics-presentation'

const HEAT_INTENSITY_CLASS = [
  'border-border/60 bg-muted/35',
  'border-obsidian-daily-completed/20 bg-obsidian-daily-completed/20',
  'border-obsidian-daily-completed/30 bg-obsidian-daily-completed/35',
  'border-obsidian-daily-completed/40 bg-obsidian-daily-completed/55',
  'border-obsidian-daily-completed/50 bg-obsidian-daily-completed/80'
] as const

export function ObsidianTodoRecentTrend({
  days
}: {
  days: readonly ObsidianDailyTodoAnalyticsDay[]
}): React.JSX.Element {
  const maxTotal = Math.max(1, ...days.map((day) => day.total))
  return (
    <AnalyticsCard
      title={translate('auto.components.ObsidianDailyTodoAnalytics.recentTrend', 'Last 30 days')}
      description={translate(
        'auto.components.ObsidianDailyTodoAnalytics.recentTrendDescription',
        'Daily task volume and completed work'
      )}
    >
      <div
        className="flex h-36 items-end gap-1"
        aria-label={translate(
          'auto.components.ObsidianDailyTodoAnalytics.recentTrend',
          'Last 30 days'
        )}
      >
        {days.map((day) => (
          <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className="relative min-h-px w-full rounded-t-[2px] bg-muted-foreground/20"
              style={{ height: day.total > 0 ? `${(day.total / maxTotal) * 100}%` : 0 }}
              aria-label={`${day.date}: ${translate(
                'auto.components.ObsidianDailyTodoAnalytics.completedOfTotal',
                '{{value0}} of {{value1}} completed',
                { value0: day.completed, value1: day.total }
              )}`}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-obsidian-daily-completed/75"
                style={{
                  height: `${day.total > 0 ? (day.completed / day.total) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground tabular-nums">
        {[1, 8, 15, 22, 29].map((index) => (
          <span key={days[index]?.date}>{days[index]?.date.slice(5)}</span>
        ))}
      </div>
      <ChartLegend />
    </AnalyticsCard>
  )
}

export function ObsidianTodoMonthlyTrend({
  analytics
}: {
  analytics: ObsidianDailyTodoAnalytics
}): React.JSX.Element {
  const months = Array.from({ length: 12 }, (_, index) => {
    const prefix = `${analytics.year}-${String(index + 1).padStart(2, '0')}`
    const summary = summarizeObsidianTodoAnalyticsPeriod(
      analytics.days.filter((day) => day.date.startsWith(prefix))
    )
    return { month: index + 1, ...summary }
  })
  return (
    <AnalyticsCard
      title={translate(
        'auto.components.ObsidianDailyTodoAnalytics.monthlyTrend',
        '{{value0}} monthly trend',
        { value0: analytics.year }
      )}
      description={translate(
        'auto.components.ObsidianDailyTodoAnalytics.monthlyTrendDescription',
        'Completion rate by month'
      )}
    >
      <div
        className="flex h-36 items-end gap-2"
        aria-label={translate(
          'auto.components.ObsidianDailyTodoAnalytics.monthlyTrend',
          '{{value0}} monthly trend',
          { value0: analytics.year }
        )}
      >
        {months.map((month) => (
          <div
            key={month.month}
            className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"
            aria-label={`${month.month}: ${month.completionPercent}%`}
          >
            <div className="flex h-24 items-end rounded-sm bg-muted/50">
              <div
                className="w-full rounded-sm bg-obsidian-daily-overview-accent/65"
                style={{ height: `${month.completionPercent}%` }}
              />
            </div>
            <span className="mt-1 text-[10px] text-muted-foreground">{month.month}</span>
          </div>
        ))}
      </div>
    </AnalyticsCard>
  )
}

export function ObsidianTodoYearHeatmap({
  analytics
}: {
  analytics: ObsidianDailyTodoAnalytics
}): React.JSX.Element {
  const days = getObsidianTodoYearCalendar(analytics, analytics.year)
  const mondayOffset = (new Date(analytics.year, 0, 1, 12).getDay() + 6) % 7
  return (
    <AnalyticsCard
      title={translate(
        'auto.components.ObsidianDailyTodoAnalytics.yearHeatmap',
        '{{value0}} completion heatmap',
        { value0: analytics.year }
      )}
      description={translate(
        'auto.components.ObsidianDailyTodoAnalytics.yearHeatmapDescription',
        'Darker cells represent more completed tasks'
      )}
    >
      <div className="overflow-x-auto pb-1 scrollbar-sleek">
        <div className="w-[740px] max-w-full">
          <div className="mb-1 flex justify-between pl-1 text-[10px] text-muted-foreground">
            {['01', '03', '05', '07', '09', '11'].map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
          <div
            className="grid auto-cols-[10px] grid-flow-col grid-rows-7 gap-1"
            aria-label={translate(
              'auto.components.ObsidianDailyTodoAnalytics.yearHeatmap',
              '{{value0}} completion heatmap',
              { value0: analytics.year }
            )}
          >
            {Array.from({ length: mondayOffset }, (_, index) => (
              <span key={`offset-${index}`} className="size-2.5" aria-hidden="true" />
            ))}
            {days.map((day) => (
              <span
                key={day.date}
                className={`size-2.5 rounded-[2px] border ${HEAT_INTENSITY_CLASS[day.intensity]}`}
                aria-label={`${day.date}: ${translate(
                  'auto.components.ObsidianDailyTodoAnalytics.completedOfTotal',
                  '{{value0}} of {{value1}} completed',
                  { value0: day.completed, value1: day.total }
                )}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>{translate('auto.components.ObsidianDailyTodoAnalytics.less', 'Less')}</span>
        {HEAT_INTENSITY_CLASS.map((className, intensity) => (
          <span
            key={intensity}
            className={`size-2.5 rounded-[2px] border ${className}`}
            aria-hidden="true"
          />
        ))}
        <span>{translate('auto.components.ObsidianDailyTodoAnalytics.more', 'More')}</span>
      </div>
    </AnalyticsCard>
  )
}

function AnalyticsCard({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="rounded-lg border border-border/60 bg-card/40 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ChartLegend(): React.JSX.Element {
  return (
    <div className="mt-2 flex items-center justify-end gap-3 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-sm bg-muted-foreground/20" />
        {translate('auto.components.ObsidianDailyTodoAnalytics.created', 'All tasks')}
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-sm bg-obsidian-daily-completed/75" />
        {translate('auto.components.ObsidianDailyTodoPanel.completed', 'Completed')}
      </span>
    </div>
  )
}
