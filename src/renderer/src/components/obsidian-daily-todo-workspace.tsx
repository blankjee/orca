import React, { useState } from 'react'
import * as Icons from 'lucide-react'

import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoSnapshot
} from '../../../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidateSourceImage,
  ObsidianDailyTodoMonitorActivity
} from '../../../shared/obsidian-daily-todo-candidate'
import type { ObsidianDailyTodoAnalytics } from '../../../shared/obsidian-daily-todo-analytics'
import {
  formatObsidianDailyTodoFocusClock,
  getObsidianDailyTodoFocusRemainingMs,
  type ObsidianDailyTodoFocusSession
} from '../../../shared/obsidian-daily-todo-focus'
import type { ObsidianDailyWorkRecord } from '../../../shared/obsidian-daily-work-record'
import { ObsidianDailyTodoCandidatePanel } from './obsidian-daily-todo-candidate-panel'
import { ObsidianDailyTodoOverviewPanel } from './obsidian-daily-todo-overview'
import { ObsidianDailyTodoAnalyticsPanel } from './obsidian-daily-todo-analytics'
import type {
  ObsidianDailyTodoFilter,
  ObsidianDailyTodoOverview
} from './obsidian-daily-todo-presentation'
import { ObsidianWorkRecordLinkPreviews } from './obsidian-work-record-link-previews'
import { ObsidianDailyTodoFocusPanel } from './obsidian-daily-todo-focus-panel'

type TodoPriority = 'P1' | 'P2' | 'P3'

export type ObsidianDailyWorkspaceMode = 'overview' | 'task' | 'capture' | 'focus'

const NOOP_FOCUS = (): void => {}
const NOOP_START_FOCUS = (_durationMinutes: number, _goal: string): void => {}
const NOOP_UPDATE_FOCUS = (_notes: string): void => {}

type ObsidianDailyTodoWorkspaceProps = {
  mode: ObsidianDailyWorkspaceMode
  selectedTodo: ObsidianDailyTodoItem | null
  snapshot: ObsidianDailyTodoSnapshot | null
  overview: ObsidianDailyTodoOverview
  analytics: ObsidianDailyTodoAnalytics | null
  analyticsLoading: boolean
  filter: ObsidianDailyTodoFilter
  saving: boolean
  candidateSourceText: string
  candidateSourceImage: ObsidianDailyTodoCandidateSourceImage | null
  candidateAnalyzing: boolean
  candidateBusyIds: ReadonlySet<string>
  candidateErrorMessage: string | null
  candidates: readonly ObsidianDailyTodoCandidate[]
  listeningForCandidates: boolean
  monitorActivity: ObsidianDailyTodoMonitorActivity | null
  focusSession?: ObsidianDailyTodoFocusSession | null
  focusNow?: number
  focusBusy?: boolean
  onModeChange: (mode: ObsidianDailyWorkspaceMode) => void
  onFilterChange: (filter: ObsidianDailyTodoFilter) => void
  onSelectTodo: (todo: ObsidianDailyTodoItem) => void
  onSaveWorkRecord: (
    todo: ObsidianDailyTodoItem,
    body: string,
    expectedBody: string | null
  ) => Promise<boolean>
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
  onCandidateSourceTextChange: (value: string) => void
  onCandidateSourceImageChange: (value: ObsidianDailyTodoCandidateSourceImage | null) => void
  onListeningForCandidatesChange: (value: boolean) => void
  onAnalyzeCandidates: () => void
  onAcceptCandidate: (
    candidate: ObsidianDailyTodoCandidate,
    overrides: { title: string; group: string; priority: TodoPriority | null }
  ) => void
  onDismissCandidate: (candidate: ObsidianDailyTodoCandidate) => void
  onStartFocus?: (durationMinutes: number, goal: string) => void
  onPauseFocus?: () => void
  onResumeFocus?: () => void
  onUpdateFocusNotes?: (notes: string) => void
  onFinishFocus?: (notes: string) => void
  onAbandonFocus?: () => void
}

export function ObsidianDailyTodoWorkspace({
  mode,
  selectedTodo,
  snapshot,
  overview,
  analytics,
  analyticsLoading,
  filter,
  saving,
  candidateSourceText,
  candidateSourceImage,
  candidateAnalyzing,
  candidateBusyIds,
  candidateErrorMessage,
  candidates,
  listeningForCandidates,
  monitorActivity,
  focusSession = null,
  focusNow = Date.now(),
  focusBusy = false,
  onModeChange,
  onFilterChange,
  onSelectTodo,
  onSaveWorkRecord,
  onAiExecute,
  onCandidateSourceTextChange,
  onCandidateSourceImageChange,
  onListeningForCandidatesChange,
  onAnalyzeCandidates,
  onAcceptCandidate,
  onDismissCandidate,
  onStartFocus = NOOP_START_FOCUS,
  onPauseFocus = NOOP_FOCUS,
  onResumeFocus = NOOP_FOCUS,
  onUpdateFocusNotes = NOOP_UPDATE_FOCUS,
  onFinishFocus = NOOP_UPDATE_FOCUS,
  onAbandonFocus = NOOP_FOCUS
}: ObsidianDailyTodoWorkspaceProps): React.JSX.Element {
  const [recordDrafts, setRecordDrafts] = useState<
    Record<string, { body: string; expectedBody: string | null }>
  >({})
  const record = selectedTodo
    ? (snapshot?.workRecords.find((item) => item.title === selectedTodo.text) ?? null)
    : null
  const recordDraft = selectedTodo ? recordDrafts[selectedTodo.text] : undefined
  const recordBody = recordDraft?.body ?? record?.body ?? ''
  const expectedRecordBody = recordDraft?.expectedBody ?? record?.body ?? null

  return (
    <section className="hidden min-h-0 min-w-0 flex-col bg-background md:flex md:flex-1">
      <WorkspaceModeBar
        mode={mode}
        hasSelectedTodo={selectedTodo !== null}
        candidateCount={candidates.length}
        focusSession={focusSession}
        focusNow={focusNow}
        onModeChange={onModeChange}
      />
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek">
        {mode === 'overview' ? (
          <div className="mx-auto w-full max-w-5xl p-5">
            <ObsidianDailyTodoOverviewPanel
              overview={overview}
              filter={filter}
              onFilterChange={onFilterChange}
              onFocusTodo={onSelectTodo}
            />
            <ObsidianDailyTodoAnalyticsPanel
              analytics={analytics}
              selectedDate={snapshot?.date ?? new Date().toISOString().slice(0, 10)}
              loading={analyticsLoading}
            />
          </div>
        ) : mode === 'capture' ? (
          <div className="mx-auto w-full max-w-3xl p-5">
            <ObsidianDailyTodoCandidatePanel
              candidates={candidates}
              sourceText={candidateSourceText}
              sourceImage={candidateSourceImage}
              analyzing={candidateAnalyzing}
              busyCandidateIds={candidateBusyIds}
              disabled={!snapshot?.filePath}
              errorMessage={candidateErrorMessage}
              onSourceTextChange={onCandidateSourceTextChange}
              onSourceImageChange={onCandidateSourceImageChange}
              listening={listeningForCandidates}
              monitorActivity={monitorActivity}
              onListeningChange={onListeningForCandidatesChange}
              onAnalyze={onAnalyzeCandidates}
              onAccept={onAcceptCandidate}
              onDismiss={onDismissCandidate}
            />
          </div>
        ) : mode === 'focus' ? (
          <ObsidianDailyTodoFocusPanel
            selectedTodo={selectedTodo}
            session={focusSession}
            now={focusNow}
            busy={focusBusy}
            onStart={onStartFocus}
            onPause={onPauseFocus}
            onResume={onResumeFocus}
            onUpdate={onUpdateFocusNotes}
            onFinish={onFinishFocus}
            onAbandon={onAbandonFocus}
          />
        ) : selectedTodo ? (
          <ObsidianDailyWorkRecordEditor
            todo={selectedTodo}
            record={record}
            body={recordBody}
            saving={saving}
            onBodyChange={(body) => {
              setRecordDrafts((current) => ({
                ...current,
                [selectedTodo.text]: { body, expectedBody: expectedRecordBody }
              }))
            }}
            onSave={() => {
              void onSaveWorkRecord(selectedTodo, recordBody, expectedRecordBody).then((saved) => {
                if (saved) {
                  setRecordDrafts((current) => ({
                    ...current,
                    [selectedTodo.text]: { body: recordBody, expectedBody: recordBody }
                  }))
                }
              })
            }}
            onAiExecute={onAiExecute}
          />
        ) : (
          <WorkspaceEmptyState />
        )}
      </div>
    </section>
  )
}

function WorkspaceModeBar({
  mode,
  hasSelectedTodo,
  candidateCount,
  focusSession,
  focusNow,
  onModeChange
}: {
  mode: ObsidianDailyWorkspaceMode
  hasSelectedTodo: boolean
  candidateCount: number
  focusSession: ObsidianDailyTodoFocusSession | null
  focusNow: number
  onModeChange: (mode: ObsidianDailyWorkspaceMode) => void
}): React.JSX.Element {
  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-3">
      <Button
        type="button"
        size="sm"
        variant={mode === 'overview' ? 'secondary' : 'ghost'}
        onClick={() => onModeChange('overview')}
      >
        <Icons.LayoutDashboard />
        {translate('auto.components.ObsidianDailyTodoPanel.overviewTitle', 'Daily overview')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'focus' ? 'secondary' : 'ghost'}
        disabled={!hasSelectedTodo && !focusSession}
        onClick={() => onModeChange('focus')}
        className="min-w-0"
      >
        <Icons.Timer />
        <span className="truncate">
          {focusSession
            ? `${formatObsidianDailyTodoFocusClock(
                getObsidianDailyTodoFocusRemainingMs(focusSession, focusNow)
              )} · ${focusSession.todo.text}`
            : translate('auto.focus.title', 'Task focus')}
        </span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'task' ? 'secondary' : 'ghost'}
        disabled={!hasSelectedTodo}
        onClick={() => onModeChange('task')}
      >
        <Icons.NotebookPen />
        {translate('auto.components.ObsidianDailyTodoList.workRecord', 'Work record')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'capture' ? 'secondary' : 'ghost'}
        onClick={() => onModeChange('capture')}
      >
        <Icons.Sparkles />
        {translate('auto.components.ObsidianDailyTodoWorkspace.capture', 'Todo capture')}
        {candidateCount > 0 ? (
          <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
            {candidateCount}
          </span>
        ) : null}
      </Button>
    </div>
  )
}

function ObsidianDailyWorkRecordEditor({
  todo,
  record,
  body,
  saving,
  onBodyChange,
  onSave,
  onAiExecute
}: {
  todo: ObsidianDailyTodoItem
  record: ObsidianDailyWorkRecord | null
  body: string
  saving: boolean
  onBodyChange: (body: string) => void
  onSave: () => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
}): React.JSX.Element {
  // Why: the workspace owns per-task drafts so switching tasks cannot discard unsaved notes.
  const dirty = body !== (record?.body ?? '')

  return (
    <form
      className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-6 py-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold">{todo.text}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {todo.group || translate('auto.components.ObsidianDailyTodoWorkspace.other', 'Other')}
            </span>
            <span aria-hidden="true">·</span>
            <span>{getStatusLabel(todo.status)}</span>
            {todo.priority ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{todo.priority}</span>
              </>
            ) : null}
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => onAiExecute(todo)}>
          <Icons.Sparkles />
          {translate('auto.components.ObsidianDailyTodoWorkspace.runWithAi', 'Run with AI')}
        </Button>
      </div>

      <div className="mt-5 flex min-h-72 flex-1 flex-col gap-2">
        <label className="flex min-h-64 flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">
          {translate('auto.components.ObsidianDailyWorkRecordSheet.content', 'Work record')}
          <textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={translate(
              'auto.components.ObsidianDailyWorkRecordSheet.placeholder',
              'Record progress, decisions, links, and follow-ups in Markdown…'
            )}
            className="min-h-64 flex-1 resize-none rounded-md border border-input bg-editor-surface p-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <ObsidianWorkRecordLinkPreviews body={body} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <span
          className={cn(
            'flex items-center gap-1.5 text-xs text-muted-foreground',
            !dirty && 'invisible'
          )}
        >
          <Icons.Circle className="size-2 fill-current" />
          {translate('auto.components.ObsidianDailyTodoWorkspace.unsaved', 'Unsaved changes')}
        </span>
        <Button type="submit" disabled={saving || !dirty}>
          {saving ? <Icons.LoaderCircle className="animate-spin" /> : <Icons.Save />}
          {translate('auto.components.ObsidianDailyWorkRecordSheet.save', 'Save')}
        </Button>
      </div>
    </form>
  )
}

function WorkspaceEmptyState(): React.JSX.Element {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center px-6 text-center">
      <Icons.NotebookPen className="mb-3 size-7 text-muted-foreground" />
      <p className="text-sm font-medium">
        {translate('auto.components.ObsidianDailyTodoWorkspace.selectTask', 'Select a task')}
      </p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {translate(
          'auto.components.ObsidianDailyTodoWorkspace.selectTaskDescription',
          'Choose a task from the Todo list to view and update its work record.'
        )}
      </p>
    </div>
  )
}

function getStatusLabel(status: ObsidianDailyTodoItem['status']): string {
  switch (status) {
    case 'pending':
      return translate('auto.components.ObsidianDailyTodoPanel.pending', 'Pending')
    case 'in-progress':
      return translate('auto.components.ObsidianDailyTodoPanel.inProgress', 'In progress')
    case 'completed':
      return translate('auto.components.ObsidianDailyTodoPanel.completed', 'Completed')
    case 'cancelled':
      return translate('auto.components.ObsidianDailyTodoWorkspace.cancelled', 'Cancelled')
  }
}
