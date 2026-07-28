import React from 'react'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import type {
  ObsidianDailyTodoFilter,
  ObsidianDailyTodoOverview
} from './obsidian-daily-todo-presentation'

export function ObsidianDailyTodoCompactFilters({
  overview,
  filter,
  onFilterChange
}: {
  overview: ObsidianDailyTodoOverview
  filter: ObsidianDailyTodoFilter
  onFilterChange: (filter: ObsidianDailyTodoFilter) => void
}): React.JSX.Element {
  const items = [
    {
      value: 'all',
      label: translate('auto.components.ObsidianDailyTodoPanel.total', 'All'),
      count: overview.total,
      icon: null
    },
    {
      value: 'pending',
      label: translate('auto.components.ObsidianDailyTodoPanel.pending', 'Pending'),
      count: overview.pending,
      icon: <Circle />
    },
    {
      value: 'in-progress',
      label: translate('auto.components.ObsidianDailyTodoPanel.inProgress', 'In progress'),
      count: overview.inProgress,
      icon: <CircleDot />
    },
    {
      value: 'completed',
      label: translate('auto.components.ObsidianDailyTodoPanel.completed', 'Completed'),
      count: overview.completed,
      icon: <CheckCircle2 />
    }
  ] as const

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-sleek">
      {items.map((item) => (
        <Button
          key={item.value}
          type="button"
          variant={filter === item.value ? 'secondary' : 'ghost'}
          size="xs"
          className="shrink-0 gap-1 px-2"
          onClick={() => onFilterChange(item.value)}
        >
          {item.icon}
          <span>{item.label}</span>
          <span className="tabular-nums text-muted-foreground">{item.count}</span>
        </Button>
      ))}
    </div>
  )
}
