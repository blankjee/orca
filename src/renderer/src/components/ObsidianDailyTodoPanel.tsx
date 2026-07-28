import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import * as dailyNoteUrls from '../../../shared/obsidian-daily-note'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoResult,
  ObsidianDailyTodoSnapshot
} from '../../../shared/obsidian-daily-todo'
import { ObsidianDailyTodoPanelContent } from './obsidian-daily-todo-panel-content'
import * as todoResult from './obsidian-daily-todo-result'
import type { ObsidianDailyWorkspaceMode } from './obsidian-daily-todo-workspace'
import { useObsidianDailyTodoCandidates } from './use-obsidian-daily-todo-candidates'
import { useObsidianDailyTodoMutations } from './use-obsidian-daily-todo-mutations'
import { useIsWideObsidianDailyTodoWorkspace } from './use-obsidian-daily-todo-workspace-breakpoint'
import { useObsidianDailyTodoDashboard } from './use-obsidian-daily-todo-dashboard'
import { useObsidianDailyTodoFocus } from './use-obsidian-daily-todo-focus'
import {
  filterObsidianDailyTodos,
  groupObsidianDailyTodos,
  type ObsidianDailyTodoFilter
} from './obsidian-daily-todo-presentation'
import { ObsidianDailyTodoPanelOverlays } from './obsidian-daily-todo-panel-overlays'

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
  const [draft, setDraft] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('P2')
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>()
  const [filter, setFilter] = useState<ObsidianDailyTodoFilter>('all')
  const [highlightedTodoId, setHighlightedTodoId] = useState<string | null>(null)
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [selectedTodoLineNumber, setSelectedTodoLineNumber] = useState<number | null>(null)
  const [selectedTodoText, setSelectedTodoText] = useState<string | null>(null)
  const [workspaceMode, setWorkspaceMode] = useState<ObsidianDailyWorkspaceMode>('overview')
  const [agentTodo, setAgentTodo] = useState<ObsidianDailyTodoItem | null>(null)
  const [recordTodo, setRecordTodo] = useState<ObsidianDailyTodoItem | null>(null)
  const [recordSaving, setRecordSaving] = useState(false)
  const [candidateAnalyzing, setCandidateAnalyzing] = useState(false)
  const [candidateSheetOpen, setCandidateSheetOpen] = useState(false)
  const isWideWorkspace = useIsWideObsidianDailyTodoWorkspace()

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
        todoResult.applyObsidianDailyTodoResult(
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

  const { overview, analytics, analyticsLoading, refreshAnalytics } = useObsidianDailyTodoDashboard(
    directory,
    snapshot
  )
  const filteredTodos = useMemo(
    () => filterObsidianDailyTodos(snapshot?.todos ?? [], filter),
    [filter, snapshot?.todos]
  )
  const groups = useMemo(() => groupObsidianDailyTodos(filteredTodos), [filteredTodos])
  const selectedTodo = useMemo(
    () =>
      snapshot?.todos.find((todo) => todo.id === selectedTodoId) ??
      snapshot?.todos.find((todo) => todo.text === selectedTodoText) ??
      snapshot?.todos.find((todo) => todo.lineNumber === selectedTodoLineNumber) ??
      null,
    [selectedTodoId, selectedTodoLineNumber, selectedTodoText, snapshot?.todos]
  )
  const focus = useObsidianDailyTodoFocus({
    directory,
    snapshot,
    selectedTodo,
    onSnapshot: (nextSnapshot) => {
      setSnapshot(nextSnapshot)
      setError(null)
    },
    onSelectTodo: (todo) => {
      setSelectedTodoId(todo.id)
      setSelectedTodoLineNumber(todo.lineNumber)
      setSelectedTodoText(todo.text)
      setWorkspaceMode('focus')
    },
    onRefreshAnalytics: refreshAnalytics
  })

  const {
    candidateSourceText,
    candidateSourceImage,
    candidates,
    candidateError,
    busyCandidateIds,
    listeningForCandidates,
    monitorActivity,
    setCandidateSourceText,
    setCandidateSourceImage,
    setListeningForCandidates,
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
  const { busyTodoIds, updateStatus, updateText, updatePriority, deleteTodo } =
    useObsidianDailyTodoMutations({
      directory,
      filePath: snapshot?.filePath,
      onResult: (result) => {
        todoResult.applyObsidianDailyTodoResult(result, setSnapshot, setError)
        if (!result.ok) {
          toast.error(todoResult.getObsidianDailyTodoErrorMessage(result))
        }
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

  useEffect(() => {
    if (!selectedTodo || selectedTodo.id === selectedTodoId) {
      return
    }
    setSelectedTodoId(selectedTodo.id)
    setSelectedTodoLineNumber(selectedTodo.lineNumber)
    setSelectedTodoText(selectedTodo.text)
  }, [selectedTodo, selectedTodoId])

  useEffect(() => {
    if (!snapshot || !selectedTodoId || selectedTodo) {
      return
    }
    // Why: deleting or externally renaming the selected Todo must not leave
    // the right workspace in a task mode with no task to render.
    setSelectedTodoId(null)
    setSelectedTodoLineNumber(null)
    setSelectedTodoText(null)
    setWorkspaceMode('overview')
  }, [selectedTodo, selectedTodoId, snapshot])

  useEffect(() => {
    if (isWideWorkspace) {
      setCandidateSheetOpen(false)
    }
  }, [isWideWorkspace])

  const chooseDirectory = async (): Promise<void> => {
    const selected = await window.api.shell.pickDirectory({ defaultPath: directory || undefined })
    if (!selected) {
      return
    }
    setSelectedFilePath(undefined)
    setFilter('all')
    setHighlightedTodoId(null)
    setSelectedTodoId(null)
    setSelectedTodoLineNumber(null)
    setSelectedTodoText(null)
    await onSaveDirectory(selected)
  }

  const selectNote = (filePath: string): void => {
    setFilter('all')
    setHighlightedTodoId(null)
    setAgentTodo(null)
    setRecordTodo(null)
    setSelectedTodoId(null)
    setSelectedTodoLineNumber(null)
    setSelectedTodoText(null)
    setWorkspaceMode('overview')
    setSelectedFilePath(filePath)
  }

  const selectTodo = (todo: ObsidianDailyTodoItem): void => {
    setSelectedTodoId(todo.id)
    setSelectedTodoLineNumber(todo.lineNumber)
    setSelectedTodoText(todo.text)
    setWorkspaceMode('task')
  }

  const openDailyNote = (): void => {
    const url = snapshot?.relativePath
      ? dailyNoteUrls.buildObsidianOpenNoteUrl(vault.trim(), snapshot.relativePath)
      : dailyNoteUrls.buildObsidianDailyNoteUrl(vault.trim())
    void window.api.shell.openUrl(url).catch(() => {
      toast.error(
        translate(
          'auto.components.ObsidianDailyTodoPanel.openFailed',
          'Could not open Obsidian. Check that it is installed.'
        )
      )
    })
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
      todoResult.applyObsidianDailyTodoResult(result, setSnapshot, setError)
      if (result.ok) {
        setDraft('')
      } else {
        toast.error(todoResult.getObsidianDailyTodoErrorMessage(result))
      }
    } finally {
      setAdding(false)
    }
  }

  const saveWorkRecord = async (
    todo: ObsidianDailyTodoItem,
    body: string,
    expectedBody: string | null
  ): Promise<boolean> => {
    const filePath = snapshot?.filePath
    if (!filePath || recordSaving) {
      return false
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
      todoResult.applyObsidianDailyTodoResult(result, setSnapshot, setError)
      if (result.ok) {
        setRecordTodo(null)
        toast.success(
          translate('auto.components.ObsidianDailyWorkRecordSheet.saved', 'Work record saved')
        )
      } else {
        toast.error(todoResult.getObsidianDailyTodoErrorMessage(result))
      }
      return result.ok
    } finally {
      setRecordSaving(false)
    }
  }

  return (
    <>
      <ObsidianDailyTodoPanelContent
        directory={directory}
        snapshot={snapshot}
        errorMessage={error ? todoResult.getObsidianDailyTodoErrorMessage(error) : null}
        loading={loading}
        adding={adding}
        groups={groups}
        overview={overview}
        analytics={analytics}
        analyticsLoading={analyticsLoading}
        filter={filter}
        highlightedTodoId={highlightedTodoId}
        selectedTodo={selectedTodo}
        workspaceMode={workspaceMode}
        busyTodoIds={busyTodoIds}
        draft={draft}
        priority={priority}
        candidateSourceText={candidateSourceText}
        candidateSourceImage={candidateSourceImage}
        candidateAnalyzing={candidateAnalyzing}
        candidateBusyIds={busyCandidateIds}
        candidateErrorMessage={candidateError}
        candidates={candidates}
        listeningForCandidates={listeningForCandidates}
        monitorActivity={monitorActivity}
        focusSession={focus.session}
        focusNow={focus.now}
        focusBusy={focus.busy}
        onChooseDirectory={() => void chooseDirectory()}
        onRefresh={() => void Promise.all([loadTodos(true, true), refreshAnalytics()])}
        onOpen={openDailyNote}
        onSelectNote={selectNote}
        onFilterChange={(nextFilter) => {
          setFilter(nextFilter)
          setHighlightedTodoId(null)
        }}
        onSelectTodo={selectTodo}
        onStartFocus={focus.selectTodo}
        onBeginFocus={focus.start}
        onPauseFocus={focus.pause}
        onResumeFocus={focus.resume}
        onUpdateFocusNotes={(notes) => focus.update({ notes })}
        onFinishFocus={focus.finish}
        onAbandonFocus={focus.abandon}
        onWorkspaceModeChange={(mode) => {
          if (mode === 'capture' && !isWideWorkspace) {
            setCandidateSheetOpen(true)
            return
          }
          setWorkspaceMode(mode)
        }}
        onDraftChange={setDraft}
        onPriorityChange={setPriority}
        onAdd={() => void addTodo()}
        onCandidateSourceTextChange={setCandidateSourceText}
        onCandidateSourceImageChange={setCandidateSourceImage}
        onListeningForCandidatesChange={setListeningForCandidates}
        onAnalyzeCandidates={() => {
          setCandidateAnalyzing(true)
          void analyzeCandidates().finally(() => setCandidateAnalyzing(false))
        }}
        onAcceptCandidate={(candidate, overrides) => void acceptCandidate(candidate, overrides)}
        onDismissCandidate={(candidate) => void dismissCandidate(candidate)}
        onStatusChange={(todo, status) => void updateStatus(todo, status)}
        onTextChange={(todo, text) => void updateText(todo, text)}
        onTodoPriorityChange={(todo, nextPriority) => void updatePriority(todo, nextPriority)}
        onDeleteTodo={(todo) => void deleteTodo(todo)}
        onOpenWorkRecord={(todo) => {
          selectTodo(todo)
          if (!window.matchMedia('(min-width: 1024px)').matches) {
            setRecordTodo(todo)
          }
        }}
        onAiExecute={setAgentTodo}
        recordSaving={recordSaving}
        onSaveWorkRecord={saveWorkRecord}
      />
      <ObsidianDailyTodoPanelOverlays
        snapshot={snapshot}
        recordTodo={recordTodo}
        recordSaving={recordSaving}
        setRecordTodo={setRecordTodo}
        onSaveWorkRecord={saveWorkRecord}
        candidateSheetOpen={candidateSheetOpen}
        setCandidateSheetOpen={setCandidateSheetOpen}
        candidates={candidates}
        candidateSourceText={candidateSourceText}
        candidateSourceImage={candidateSourceImage}
        candidateAnalyzing={candidateAnalyzing}
        listeningForCandidates={listeningForCandidates}
        monitorActivity={monitorActivity}
        candidateBusyIds={busyCandidateIds}
        candidateError={candidateError}
        setCandidateSourceText={setCandidateSourceText}
        setCandidateSourceImage={setCandidateSourceImage}
        setListeningForCandidates={setListeningForCandidates}
        onAnalyzeCandidates={() => {
          setCandidateAnalyzing(true)
          void analyzeCandidates().finally(() => setCandidateAnalyzing(false))
        }}
        onAcceptCandidate={(candidate, overrides) => void acceptCandidate(candidate, overrides)}
        onDismissCandidate={(candidate) => void dismissCandidate(candidate)}
        agentTodo={agentTodo}
        setAgentTodo={setAgentTodo}
      />
    </>
  )
}
