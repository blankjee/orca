import React from 'react'
import { Ban, CheckCircle2, Circle, CircleDot } from 'lucide-react'

import type { ObsidianDailyTodoStatus } from '../../../shared/obsidian-daily-todo'

export function ObsidianDailyTodoStatusIcon({
  status
}: {
  status: ObsidianDailyTodoStatus
}): React.JSX.Element {
  switch (status) {
    case 'pending':
      return <Circle className="size-4" />
    case 'in-progress':
      return <CircleDot className="size-4" />
    case 'completed':
      return <CheckCircle2 className="size-4" />
    case 'cancelled':
      return <Ban className="size-4" />
  }
}

export function getObsidianDailyTodoStatusColor(status: ObsidianDailyTodoStatus): string {
  switch (status) {
    case 'pending':
      return 'text-obsidian-daily-pending'
    case 'in-progress':
      return 'text-obsidian-daily-in-progress'
    case 'completed':
      return 'text-obsidian-daily-completed'
    case 'cancelled':
      return 'text-muted-foreground'
  }
}
