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
import { ObsidianDailyTodoPanelContent } from './obsidian-daily-todo-panel-content'
import { ObsidianDailyWorkRecordSheet } from './obsidian-daily-work-record-sheet'
import { ObsidianTodoAgentLaunchDialog } from './ObsidianTodoAgentLaunchDialog'
import { useObsidianDailyTodoCandidates } from './use-obsidian-daily-todo-candidates'
import {
  filterObsidianDailyTodos,
  groupObsidianDailyTodos,
  summarizeObsidianDailyTodos,
  type ObsidianDailyTodoFilter
} from './obsidian-daily-todo-presentation'

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
  const [filter, setFilter] = useState<ObsidianDailyTodoFilter>('all')
  const [highlightedTodoId, setHighlightedTodoId] = useState<string | null>(null)
  const [agentTodo, setAgentTodo] = useState<ObsidianDailyTodoItem | null>(null)
  const [recordTodo, setRecordTodo] = useState<ObsidianDailyTodoItem | null>(null)
  const [recordSaving, setRecordSaving] = useState(false)
  const [candidateAnalyzing, setCandidateAnalyzing] = useState(false)

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

  const overview = useMemo(
    () => summarizeObsidianDailyTodos(snapshot?.todos ?? []),
    [snapshot?.todos]
  )
  const filteredTodos = useMemo(
    () => filterObsidianDailyTodos(snapshot?.todos ?? [], filter),
    [filter, snapshot?.todos]
  )
  const groups = useMemo(() => groupObsidianDailyTodos(filteredTodos), [filteredTodos])

  const {
    candidateSourceText,
    candidates,
    candidateError,
    busyCandidateIds,
    setCandidateSourceText,
    analyzeCandidates,
    acceptCandidate,
    dismissCandidate
  } = useObsidianDailyTodoCandidates({
    directory,
    snapshot,
    candidateAnalyzing,
    onSnapshot: (nextSnapshot) => {
      setSnapshot(nextSnapshot)
      setError(null)
    }
  })

  useEffect(() => {
    if (!highlightedTodoId) {
      return
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`obsidian-todo-${highlightedTodoId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const timeout = window.setTimeout(() => setHighlightedTodoId(null), 1_600)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [groups, highlightedTodoId])

  const chooseDirectory = async (): Promise<void> => {
    const selected = await window.api.shell.pickDirectory({ defaultPath: directory || undefined })
    if (!selected) {
      return
    }
    setSelectedFilePath(undefined)
    setFilter('all')
    setHighlightedTodoId(null)
    await onSaveDirectory(selected)
  }

  const selectNote = (filePath: string): void => {
    setFilter('all')
    setHighlightedTodoId(null)
    setAgentTodo(null)
    setRecordTodo(null)
    setSelectedFilePath(filePath)
  }

  const focusTodo = (todo: ObsidianDailyTodoItem): void => {
    setFilter(todo.status === 'cancelled' ? 'all' : todo.status)
    setHighlightedTodoId(todo.id)
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

  const updateText = async (todo: ObsidianDailyTodoItem, text: string): Promise<void> => {
    const filePath = snapshot?.filePath
    if (!filePath || text.trim() === todo.text) {
      return
    }
    setBusyTodoIds((current) => new Set(current).add(todo.id))
    try {
      const result = await window.api.obsidianDailyTodos.updateText({
        directory,
        filePath,
        todo,
        text
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

  const saveWorkRecord = async (
    todo: ObsidianDailyTodoItem,
    body: string,
    expectedBody: string | null
  ): Promise<void> => {
    const filePath = snapshot?.filePath
    if (!filePath || recordSaving) {
      return
    }
    setRecordSaving(true)
    try {
      const result = await window.api.obsidianDailyTodos.saveWorkRecord({
        directory,
        filePath,
        todo,
        body,
        expectedBody
      })
      applyResult(result, setSnapshot, setError)
      if (result.ok) {
        setRecordTodo(null)
        toast.success(
          translate('auto.components.ObsidianDailyWorkRecordSheet.saved', 'Work record saved')
        )
      } else {
        toast.error(getErrorMessage(result))
      }
    } finally {
      setRecordSaving(false)
    }
  }

  return (
    <>
      <ObsidianDailyTodoPanelContent
        directory={directory}
        snapshot={snapshot}
        errorMessage={error ? getErrorMessage(error) : null}
        loading={loading}
        adding={adding}
        groups={groups}
        overview={overview}
        filter={filter}
        highlightedTodoId={highlightedTodoId}
        busyTodoIds={busyTodoIds}
        draft={draft}
        priority={priority}
        candidateSourceText={candidateSourceText}
        candidateAnalyzing={candidateAnalyzing}
        candidateBusyIds={busyCandidateIds}
        candidateErrorMessage={candidateError}
        candidates={candidates}
        onChooseDirectory={() => void chooseDirectory()}
        onRefresh={() => void loadTodos(true, true)}
        onOpen={openDailyNote}
        onSelectNote={selectNote}
        onFilterChange={(nextFilter) => {
          setFilter(nextFilter)
          setHighlightedTodoId(null)
        }}
        onFocusTodo={focusTodo}
        onDraftChange={setDraft}
        onPriorityChange={setPriority}
        onAdd={() => void addTodo()}
        onCandidateSourceTextChange={setCandidateSourceText}
        onAnalyzeCandidates={() => {
          setCandidateAnalyzing(true)
          void analyzeCandidates().finally(() => setCandidateAnalyzing(false))
        }}
        onAcceptCandidate={(candidate, overrides) => void acceptCandidate(candidate, overrides)}
        onDismissCandidate={(candidate) => void dismissCandidate(candidate)}
        onStatusChange={(todo, status) => void updateStatus(todo, status)}
        onTextChange={(todo, text) => void updateText(todo, text)}
        onOpenWorkRecord={setRecordTodo}
        onAiExecute={setAgentTodo}
      />
      <ObsidianDailyWorkRecordSheet
        key={recordTodo?.id ?? 'closed'}
        todo={recordTodo}
        record={
          recordTodo
            ? (snapshot?.workRecords.find((record) => record.title === recordTodo.text) ?? null)
            : null
        }
        open={recordTodo !== null}
        saving={recordSaving}
        onOpenChange={(open) => {
          if (!open && !recordSaving) {
            setRecordTodo(null)
          }
        }}
        onSave={(body, expectedBody) => {
          if (recordTodo) {
            void saveWorkRecord(recordTodo, body, expectedBody)
          }
        }}
      />
      <ObsidianTodoAgentLaunchDialog
        todo={agentTodo}
        snapshot={snapshot}
        open={agentTodo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAgentTodo(null)
          }
        }}
      />
    </>
  )
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
