import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ObsidianDailyTodoSnapshot } from '../../../shared/obsidian-daily-todo'
import type { ObsidianDailyTodoAnalytics } from '../../../shared/obsidian-daily-todo-analytics'
import {
  summarizeObsidianDailyTodos,
  type ObsidianDailyTodoOverview
} from './obsidian-daily-todo-presentation'

export function useObsidianDailyTodoDashboard(
  directory: string,
  snapshot: ObsidianDailyTodoSnapshot | null
): {
  overview: ObsidianDailyTodoOverview
  analytics: ObsidianDailyTodoAnalytics | null
  analyticsLoading: boolean
  refreshAnalytics: () => Promise<void>
} {
  const [analytics, setAnalytics] = useState<ObsidianDailyTodoAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const previousModifiedAt = useRef<number | null>(null)
  const requestId = useRef(0)
  const year = snapshot ? Number(snapshot.date.slice(0, 4)) : null
  const overview = useMemo(
    () => summarizeObsidianDailyTodos(snapshot?.todos ?? []),
    [snapshot?.todos]
  )

  const load = useCallback(
    async (refresh = false): Promise<void> => {
      if (!directory.trim() || !year) {
        setAnalytics(null)
        return
      }
      const currentRequest = requestId.current + 1
      requestId.current = currentRequest
      setAnalyticsLoading(true)
      try {
        const result = await window.api.obsidianDailyTodos.analytics({
          directory,
          year,
          refresh
        })
        if (result.ok && requestId.current === currentRequest) {
          setAnalytics(result.analytics)
        }
      } finally {
        if (requestId.current === currentRequest) {
          setAnalyticsLoading(false)
        }
      }
    },
    [directory, year]
  )

  useEffect(() => {
    previousModifiedAt.current = null
    setAnalytics(null)
    void load()
  }, [load])

  useEffect(() => {
    if (snapshot?.modifiedAt == null || previousModifiedAt.current === null) {
      previousModifiedAt.current = snapshot?.modifiedAt ?? null
      return
    }
    if (snapshot.modifiedAt !== previousModifiedAt.current) {
      previousModifiedAt.current = snapshot.modifiedAt
      // Why: direct Todo edits should update long-range figures immediately,
      // while the unchanged 15-second Markdown poll keeps using the cache.
      void load(true)
    }
  }, [load, snapshot?.modifiedAt])

  return {
    overview,
    analytics,
    analyticsLoading,
    refreshAnalytics: () => load(true)
  }
}
