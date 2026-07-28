import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { translate } from '@/i18n/i18n'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoSnapshot
} from '../../../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoFocusSession,
  ObsidianDailyTodoFocusUpdateInput
} from '../../../shared/obsidian-daily-todo-focus'

export function useObsidianDailyTodoFocus({
  directory,
  snapshot,
  selectedTodo,
  onSnapshot,
  onSelectTodo,
  onRefreshAnalytics
}: {
  directory: string
  snapshot: ObsidianDailyTodoSnapshot | null
  selectedTodo: ObsidianDailyTodoItem | null
  onSnapshot: (snapshot: ObsidianDailyTodoSnapshot) => void
  onSelectTodo: (todo: ObsidianDailyTodoItem) => void
  onRefreshAnalytics: () => Promise<void>
}) {
  const [session, setSession] = useState<ObsidianDailyTodoFocusSession | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    void window.api.obsidianDailyTodos.focus.get().then((result) => {
      if (result.ok) {
        setSession(result.session)
      }
    })
    return window.api.obsidianDailyTodos.focus.onChanged(setSession)
  }, [])

  useEffect(() => {
    if (session?.status !== 'running') {
      return
    }
    setNow(Date.now())
    const interval = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [session?.id, session?.status])

  const run = useCallback(
    async <T extends { ok: boolean; session?: ObsidianDailyTodoFocusSession | null }>(
      action: () => Promise<T>
    ): Promise<T> => {
      setBusy(true)
      try {
        const result = await action()
        if (result.ok && 'session' in result) {
          setSession(result.session ?? null)
        }
        return result
      } finally {
        setBusy(false)
      }
    },
    []
  )

  const start = (durationMinutes: number, goal: string): void => {
    const filePath = snapshot?.filePath
    if (!selectedTodo || !filePath) {
      return
    }
    void run(() =>
      window.api.obsidianDailyTodos.focus.start({
        directory,
        filePath,
        noteDate: snapshot.date,
        todo: selectedTodo,
        durationMinutes,
        goal
      })
    ).then(showFocusError)
  }
  const finish = (notes: string): void => {
    void run(() => window.api.obsidianDailyTodos.focus.update({ notes }))
      .then(() =>
        run(async () => {
          const result = await window.api.obsidianDailyTodos.focus.finish()
          if (result.ok) {
            onSnapshot(result.snapshot)
          }
          return result
        })
      )
      .then((result) => {
        if (result.ok) {
          void onRefreshAnalytics()
          toast.success(
            translate('auto.focus.recorded', 'Focus session recorded in the work record')
          )
        } else {
          toast.error(result.message)
        }
      })
  }

  return {
    session,
    now,
    busy,
    selectTodo: onSelectTodo,
    start,
    pause: () => void run(() => window.api.obsidianDailyTodos.focus.pause()),
    resume: () => void run(() => window.api.obsidianDailyTodos.focus.resume()),
    update: (input: ObsidianDailyTodoFocusUpdateInput) =>
      void run(() => window.api.obsidianDailyTodos.focus.update(input)),
    abandon: () => void run(() => window.api.obsidianDailyTodos.focus.abandon()),
    finish
  }
}

function showFocusError(result: { ok: boolean; message?: string }): void {
  if (!result.ok && result.message) {
    toast.error(result.message)
  }
}
