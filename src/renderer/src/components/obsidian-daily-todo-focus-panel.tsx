import React, { useEffect, useState } from 'react'
import { Check, CirclePause, CirclePlay, Clock3, Flag, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { translate } from '@/i18n/i18n'
import type { ObsidianDailyTodoItem } from '../../../shared/obsidian-daily-todo'
import {
  formatObsidianDailyTodoFocusClock,
  getObsidianDailyTodoFocusElapsedMs,
  getObsidianDailyTodoFocusRemainingMs,
  type ObsidianDailyTodoFocusSession
} from '../../../shared/obsidian-daily-todo-focus'

type FocusPanelProps = {
  selectedTodo: ObsidianDailyTodoItem | null
  session: ObsidianDailyTodoFocusSession | null
  now: number
  busy: boolean
  onStart: (durationMinutes: number, goal: string) => void
  onPause: () => void
  onResume: () => void
  onUpdate: (notes: string) => void
  onFinish: (notes: string) => void
  onAbandon: () => void
}

const DURATIONS = [15, 25, 45, 60] as const

export function ObsidianDailyTodoFocusPanel({
  selectedTodo,
  session,
  now,
  busy,
  onStart,
  onPause,
  onResume,
  onUpdate,
  onFinish,
  onAbandon
}: FocusPanelProps): React.JSX.Element {
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(25)
  const [goal, setGoal] = useState('')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [confirmAbandon, setConfirmAbandon] = useState(false)

  useEffect(() => setNotes(session?.notes ?? ''), [session?.id, session?.notes])

  if (!session) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-8">
        <FocusHeading
          title={selectedTodo?.text ?? translate('auto.focus.selectTask', 'Choose a Todo to focus')}
          description={translate(
            'auto.focus.description',
            'Work on one task at a time. Pauses are excluded from the recorded focus time.'
          )}
        />
        {selectedTodo ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">
              {translate('auto.focus.duration', 'Focus duration')}
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {DURATIONS.map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant={duration === minutes ? 'secondary' : 'outline'}
                  onClick={() => setDuration(minutes)}
                >
                  {minutes}
                  {translate('auto.focus.minutesShort', 'min')}
                </Button>
              ))}
            </div>
            <label className="mt-5 block text-xs font-medium text-muted-foreground">
              {translate('auto.focus.goal', 'Goal for this session')}
              <input
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder={translate(
                  'auto.focus.goalPlaceholder',
                  'What concrete result do you want?'
                )}
                className="mt-2 h-10 w-full rounded-md border border-input bg-input px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <Button
              type="button"
              className="mt-5 w-full"
              disabled={busy}
              onClick={() => onStart(duration, goal)}
            >
              <CirclePlay />
              {translate('auto.focus.start', 'Start focus')}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  const elapsed = getObsidianDailyTodoFocusElapsedMs(session, now)
  const remaining = getObsidianDailyTodoFocusRemainingMs(session, now)
  const progress = Math.min(100, (elapsed / session.durationMs) * 100)
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-8">
      <FocusHeading title={session.todo.text} description={session.goal} />
      <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center">
        <div className="font-mono text-5xl font-semibold tabular-nums tracking-tight">
          {formatObsidianDailyTodoFocusClock(remaining)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {session.status === 'elapsed'
            ? translate('auto.focus.elapsed', 'This focus session is complete')
            : session.status === 'paused'
              ? translate('auto.focus.paused', 'Paused · paused time is not counted')
              : translate('auto.focus.inProgress', 'Focusing')}
        </p>
        <Progress value={progress} className="mt-6 h-1.5" />
        <div className="mt-5 flex justify-center gap-2">
          {session.status === 'running' ? (
            <Button type="button" variant="outline" disabled={busy} onClick={onPause}>
              <CirclePause />
              {translate('auto.focus.pause', 'Pause')}
            </Button>
          ) : session.status === 'paused' ? (
            <Button type="button" variant="outline" disabled={busy} onClick={onResume}>
              <CirclePlay />
              {translate('auto.focus.resume', 'Resume')}
            </Button>
          ) : null}
          <Button type="button" disabled={busy} onClick={() => onFinish(notes)}>
            <Check />
            {translate('auto.focus.finish', 'Finish and record')}
          </Button>
        </div>
      </div>

      <label className="mt-5 block text-xs font-medium text-muted-foreground">
        {translate('auto.focus.notes', 'Session notes')}
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => {
            if (notes !== session.notes) {
              onUpdate(notes)
            }
          }}
          placeholder={translate('auto.focus.notesPlaceholder', 'Capture progress or decisions…')}
          className="mt-2 min-h-28 w-full resize-y rounded-md border border-input bg-editor-surface p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <div className="mt-auto flex justify-end pt-8">
        {confirmAbandon ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {translate('auto.focus.abandonConfirm', 'Discard this focus session?')}
            </span>
            <Button type="button" size="sm" variant="destructive" onClick={onAbandon}>
              {translate('auto.focus.abandon', 'Discard')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirmAbandon(false)}
            >
              {translate('auto.focus.keep', 'Keep')}
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmAbandon(true)}>
            <RotateCcw />
            {translate('auto.focus.abandon', 'Discard')}
          </Button>
        )}
      </div>
    </div>
  )
}

function FocusHeading({
  title,
  description
}: {
  title: string
  description: string
}): React.JSX.Element {
  return (
    <div className="border-b border-border pb-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Clock3 className="size-4" />
        {translate('auto.focus.title', 'Task focus')}
      </div>
      <h2 className="mt-2 break-words text-xl font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Flag className="size-3.5 shrink-0" />
          {description}
        </p>
      ) : null}
    </div>
  )
}
