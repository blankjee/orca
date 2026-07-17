import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { translate } from '@/i18n/i18n'
import {
  buildObsidianDailyNoteUrl,
  buildObsidianOpenNoteUrl
} from '../../../shared/obsidian-daily-note'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoResult,
  ObsidianDailyTodoSnapshot,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import {
  ObsidianDailyTodoPanelContent,
  type ObsidianDailyTodoCounts
} from './obsidian-daily-todo-panel-content'
import { groupObsidianDailyTodos } from './obsidian-daily-todo-presentation'

type ObsidianDailyTodoPanelProps = {
  directory: string
  vault: string
  onSaveDirectory: (directory: string) => Promise<void>
}

type TodoPriority = 'P1' | 'P2' | 'P3'

export function ObsidianDailyTodoPanel({
  directory,
  vault,
  onSaveDirectory
}: ObsidianDailyTodoPanelProps): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<ObsidianDailyTodoSnapshot | null>(null)
  const [error, setError] = useState<Exclude<ObsidianDailyTodoResult, { ok: true }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [busyTodoIds, setBusyTodoIds] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('P2')
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>()

  const loadTodos = useCallback(
    async (showLoading = true, refresh = false): Promise<void> => {
      if (!directory.trim()) {
        setSnapshot(null)
        setError(null)
        return
      }
      if (showLoading) {
        setLoading(true)
      }
      try {
        applyResult(
          await window.api.obsidianDailyTodos.load({
            directory,
            filePath: selectedFilePath,
            refresh
          }),
          setSnapshot,
          setError
        )
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [directory, selectedFilePath]
  )

  useEffect(() => {
    void loadTodos()
    // Why: Obsidian and toodo may edit the selected Markdown file while Orca stays open.
    const poll = window.setInterval(() => void loadTodos(false), 15_000)
    return () => window.clearInterval(poll)
  }, [loadTodos])

  const groups = useMemo(() => groupObsidianDailyTodos(snapshot?.todos ?? []), [snapshot?.todos])
  const counts = useMemo(() => countTodos(snapshot?.todos ?? []), [snapshot?.todos])

  const chooseDirectory = async (): Promise<void> => {
    const selected = await window.api.shell.pickDirectory({ defaultPath: directory || undefined })
    if (!selected) {
      return
    }
    setSelectedFilePath(undefined)
    await onSaveDirectory(selected)
  }

  const openDailyNote = (): void => {
    const url = snapshot?.relativePath
      ? buildObsidianOpenNoteUrl(vault.trim(), snapshot.relativePath)
      : buildObsidianDailyNoteUrl(vault.trim())
    void window.api.shell.openUrl(url).catch(() => {
      toast.error(
        translate(
          'auto.components.ObsidianDailyTodoPanel.openFailed',
          'Could not open Obsidian. Check that it is installed.'
        )
      )
    })
  }

  const updateStatus = async (
    todo: ObsidianDailyTodoItem,
    status: ObsidianDailyTodoStatus
  ): Promise<void> => {
    const filePath = snapshot?.filePath
    if (!filePath) {
      return
    }
    setBusyTodoIds((current) => new Set(current).add(todo.id))
    try {
      const result = await window.api.obsidianDailyTodos.setStatus({
        directory,
        filePath,
        todo,
        status
      })
      applyResult(result, setSnapshot, setError)
      if (!result.ok) {
        toast.error(getErrorMessage(result))
      }
    } finally {
      setBusyTodoIds((current) => {
        const next = new Set(current)
        next.delete(todo.id)
        return next
      })
    }
  }

  const addTodo = async (): Promise<void> => {
    const text = draft.trim()
    const filePath = snapshot?.filePath
    if (!text || !filePath || adding) {
      return
    }
    setAdding(true)
    try {
      const result = await window.api.obsidianDailyTodos.add({
        directory,
        filePath,
        text,
        group: '今日任务',
        priority
      })
      applyResult(result, setSnapshot, setError)
      if (result.ok) {
        setDraft('')
      } else {
        toast.error(getErrorMessage(result))
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <ObsidianDailyTodoPanelContent
      directory={directory}
      snapshot={snapshot}
      errorMessage={error ? getErrorMessage(error) : null}
      loading={loading}
      adding={adding}
      groups={groups}
      counts={counts}
      busyTodoIds={busyTodoIds}
      draft={draft}
      priority={priority}
      onChooseDirectory={() => void chooseDirectory()}
      onRefresh={() => void loadTodos(true, true)}
      onOpen={openDailyNote}
      onSelectNote={setSelectedFilePath}
      onDraftChange={setDraft}
      onPriorityChange={setPriority}
      onAdd={() => void addTodo()}
      onStatusChange={(todo, status) => void updateStatus(todo, status)}
    />
  )
}

function countTodos(todos: readonly ObsidianDailyTodoItem[]): ObsidianDailyTodoCounts {
  return {
    total: todos.length,
    pending: todos.filter((todo) => todo.status === 'pending').length,
    inProgress: todos.filter((todo) => todo.status === 'in-progress').length,
    completed: todos.filter((todo) => todo.status === 'completed').length
  }
}

function applyResult(
  result: ObsidianDailyTodoResult,
  setSnapshot: React.Dispatch<React.SetStateAction<ObsidianDailyTodoSnapshot | null>>,
  setError: React.Dispatch<
    React.SetStateAction<Exclude<ObsidianDailyTodoResult, { ok: true }> | null>
  >
): void {
  if (result.ok) {
    setSnapshot(result.snapshot)
    setError(null)
  } else {
    setError(result)
  }
}

function getErrorMessage(error: Exclude<ObsidianDailyTodoResult, { ok: true }>): string {
  if (error.code === 'note-not-found') {
    return translate(
      'auto.components.ObsidianDailyTodoPanel.noteNotFound',
      'The selected daily note was not found in this vault.'
    )
  }
  if (error.code === 'directory-not-found' || error.code === 'invalid-directory') {
    return translate(
      'auto.components.ObsidianDailyTodoPanel.directoryUnavailable',
      'The Obsidian vault root is unavailable.'
    )
  }
  if (error.code === 'todo-conflict') {
    return translate(
      'auto.components.ObsidianDailyTodoPanel.todoConflict',
      'This todo changed in another app. Refresh and try again.'
    )
  }
  return translate(
    'auto.components.ObsidianDailyTodoPanel.accessFailed',
    'Orca could not read or update the selected daily note.'
  )
}
