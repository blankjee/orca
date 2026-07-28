import { CheckCircle2, LoaderCircle, ScanText, XCircle } from 'lucide-react'

import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { ObsidianDailyTodoMonitorActivity } from '../../../shared/obsidian-daily-todo-candidate'

export function ObsidianDailyTodoMonitorActivityCard({
  activity,
  listening
}: {
  activity: ObsidianDailyTodoMonitorActivity | null
  listening: boolean
}): React.JSX.Element | null {
  if (!listening && !activity) {
    return null
  }
  return (
    <div className="border-b border-border bg-muted/15 px-4 py-3" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ScanText className="size-3.5 shrink-0 text-muted-foreground" />
          <p className="truncate text-xs font-semibold">
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.latestCapture',
              'Latest captured text'
            )}
          </p>
          {activity?.app ? (
            <span className="truncate text-[11px] text-muted-foreground">{activity.app}</span>
          ) : null}
        </div>
        {activity ? <MonitorStatus status={activity.status} /> : null}
      </div>
      {activity ? (
        <>
          <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-background/75 p-2.5 font-sans text-[11px] leading-4 text-foreground">
            {activity.sourceText}
          </pre>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {new Intl.DateTimeFormat(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }).format(activity.capturedAt)}
            {activity.candidateTitles.length > 0 ? ` · ${activity.candidateTitles.join('；')}` : ''}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {translate(
            'auto.components.ObsidianDailyTodoCandidatePanel.waitingForCapture',
            'Waiting for accessible text changes in the active Mac app...'
          )}
        </p>
      )}
    </div>
  )
}

function MonitorStatus({
  status
}: {
  status: ObsidianDailyTodoMonitorActivity['status']
}): React.JSX.Element {
  const statusPresentation = {
    analyzing: {
      label: translate(
        'auto.components.ObsidianDailyTodoCandidatePanel.analyzingCapture',
        'Analyzing now'
      ),
      icon: <LoaderCircle className="size-3 animate-spin" />,
      className: 'bg-primary/10 text-primary'
    },
    todo: {
      label: translate(
        'auto.components.ObsidianDailyTodoCandidatePanel.todoDetected',
        'Todo detected'
      ),
      icon: <CheckCircle2 className="size-3" />,
      className: 'bg-success/10 text-success'
    },
    'no-todo': {
      label: translate(
        'auto.components.ObsidianDailyTodoCandidatePanel.noTodoDetected',
        'No Todo found'
      ),
      icon: <CheckCircle2 className="size-3" />,
      className: 'bg-muted text-muted-foreground'
    },
    error: {
      label: translate(
        'auto.components.ObsidianDailyTodoCandidatePanel.captureAnalysisFailed',
        'Analysis failed'
      ),
      icon: <XCircle className="size-3" />,
      className: 'bg-destructive/10 text-destructive'
    }
  } satisfies Record<
    ObsidianDailyTodoMonitorActivity['status'],
    { label: string; icon: React.JSX.Element; className: string }
  >
  const presentation = statusPresentation[status]
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium',
        presentation.className
      )}
    >
      {presentation.icon}
      {presentation.label}
    </span>
  )
}
