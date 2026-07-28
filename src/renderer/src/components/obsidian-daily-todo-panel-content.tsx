import React from 'react'
import { LoaderCircle, Radio, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoSnapshot,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidateSourceImage,
  ObsidianDailyTodoMonitorActivity
} from '../../../shared/obsidian-daily-todo-candidate'
import type { ObsidianDailyTodoAnalytics } from '../../../shared/obsidian-daily-todo-analytics'
import type { ObsidianDailyTodoPriority } from '../../../shared/obsidian-daily-todo-mutation'
import type { ObsidianDailyTodoFocusSession } from '../../../shared/obsidian-daily-todo-focus'
import {
  ObsidianDailyTodoAddForm,
  type ObsidianDailyTodoDraftPriority
} from './obsidian-daily-todo-add-form'
import { ObsidianDailyTodoCompactFilters } from './obsidian-daily-todo-compact-filters'
import { ObsidianDailyDateHeader } from './obsidian-daily-date-header'
import { ObsidianDailyTodoList } from './obsidian-daily-todo-list'
import { ObsidianDailyTodoResizeHandle } from './obsidian-daily-todo-resize-handle'
import {
  ObsidianDailyTodoWorkspace,
  type ObsidianDailyWorkspaceMode
} from './obsidian-daily-todo-workspace'
import type {
  ObsidianDailyTodoFilter,
  ObsidianDailyTodoGroup,
  ObsidianDailyTodoOverview
} from './obsidian-daily-todo-presentation'
import { useObsidianDailyTodoRailResize } from './use-obsidian-daily-todo-rail-resize'
import {
  ConfigureObsidianVaultState,
  EmptyObsidianDailyTodoState,
  FilteredObsidianDailyTodoState,
  MissingObsidianDailyNoteState,
  ObsidianDailyTodoErrorState
} from './obsidian-daily-todo-panel-states'

type ObsidianDailyTodoPanelContentProps = {
  directory: string
  snapshot: ObsidianDailyTodoSnapshot | null
  errorMessage: string | null
  loading: boolean
  adding: boolean
  groups: readonly ObsidianDailyTodoGroup[]
  overview: ObsidianDailyTodoOverview
  analytics: ObsidianDailyTodoAnalytics | null
  analyticsLoading: boolean
  filter: ObsidianDailyTodoFilter
  highlightedTodoId: string | null
  selectedTodo: ObsidianDailyTodoItem | null
  workspaceMode: ObsidianDailyWorkspaceMode
  busyTodoIds: ReadonlySet<string>
  draft: string
  priority: ObsidianDailyTodoDraftPriority
  candidateSourceText: string
  candidateSourceImage: ObsidianDailyTodoCandidateSourceImage | null
  candidateAnalyzing: boolean
  candidateBusyIds: ReadonlySet<string>
  candidateErrorMessage: string | null
  candidates: readonly ObsidianDailyTodoCandidate[]
  listeningForCandidates: boolean
  monitorActivity: ObsidianDailyTodoMonitorActivity | null
  focusSession: ObsidianDailyTodoFocusSession | null
  focusNow: number
  focusBusy: boolean
  onChooseDirectory: () => void
  onRefresh: () => void
  onOpen: () => void
  onSelectNote: (filePath: string) => void
  onFilterChange: (filter: ObsidianDailyTodoFilter) => void
  onSelectTodo: (todo: ObsidianDailyTodoItem) => void
  onWorkspaceModeChange: (mode: ObsidianDailyWorkspaceMode) => void
  onDraftChange: (value: string) => void
  onPriorityChange: (priority: ObsidianDailyTodoDraftPriority) => void
  onAdd: () => void
  onCandidateSourceTextChange: (value: string) => void
  onCandidateSourceImageChange: (value: ObsidianDailyTodoCandidateSourceImage | null) => void
  onListeningForCandidatesChange: (value: boolean) => void
  onAnalyzeCandidates: () => void
  onAcceptCandidate: (
    candidate: ObsidianDailyTodoCandidate,
    overrides: { title: string; group: string; priority: ObsidianDailyTodoDraftPriority | null }
  ) => void
  onDismissCandidate: (candidate: ObsidianDailyTodoCandidate) => void
  onStatusChange: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => void
  onTextChange: (todo: ObsidianDailyTodoItem, text: string) => void
  onTodoPriorityChange: (todo: ObsidianDailyTodoItem, priority: ObsidianDailyTodoPriority) => void
  onDeleteTodo: (todo: ObsidianDailyTodoItem) => void
  onOpenWorkRecord: (todo: ObsidianDailyTodoItem) => void
  onStartFocus: (todo: ObsidianDailyTodoItem) => void
  onBeginFocus: (durationMinutes: number, goal: string) => void
  onPauseFocus: () => void
  onResumeFocus: () => void
  onUpdateFocusNotes: (notes: string) => void
  onFinishFocus: (notes: string) => void
  onAbandonFocus: () => void
  onAiExecute: (todo: ObsidianDailyTodoItem) => void
  recordSaving: boolean
  onSaveWorkRecord: (
    todo: ObsidianDailyTodoItem,
    body: string,
    expectedBody: string | null
  ) => Promise<boolean>
}

export function ObsidianDailyTodoPanelContent({
  directory,
  snapshot,
  errorMessage,
  loading,
  adding,
  groups,
  overview,
  analytics,
  analyticsLoading,
  filter,
  highlightedTodoId,
  selectedTodo,
  workspaceMode,
  busyTodoIds,
  draft,
  priority,
  candidateSourceText,
  candidateSourceImage,
  candidateAnalyzing,
  candidateBusyIds,
  candidateErrorMessage,
  candidates,
  listeningForCandidates,
  monitorActivity,
  focusSession,
  focusNow,
  focusBusy,
  onChooseDirectory,
  onRefresh,
  onOpen,
  onSelectNote,
  onFilterChange,
  onSelectTodo,
  onWorkspaceModeChange,
  onDraftChange,
  onPriorityChange,
  onAdd,
  onCandidateSourceTextChange,
  onCandidateSourceImageChange,
  onListeningForCandidatesChange,
  onAnalyzeCandidates,
  onAcceptCandidate,
  onDismissCandidate,
  onStatusChange,
  onTextChange,
  onTodoPriorityChange,
  onDeleteTodo,
  onOpenWorkRecord,
  onStartFocus,
  onBeginFocus,
  onPauseFocus,
  onResumeFocus,
  onUpdateFocusNotes,
  onFinishFocus,
  onAbandonFocus,
  onAiExecute,
  recordSaving,
  onSaveWorkRecord
}: ObsidianDailyTodoPanelContentProps): React.JSX.Element {
  const {
    todoRailRef,
    todoRailWidth,
    isTodoRailResizing,
    onTodoRailResizeStart,
    updateTodoRailWidth
  } = useObsidianDailyTodoRailResize()

  return (
    <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-background shadow-xs">
      {!directory.trim() ? (
        <ConfigureObsidianVaultState onChoose={onChooseDirectory} />
      ) : loading && !snapshot ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
        </div>
      ) : errorMessage && !snapshot ? (
        <ObsidianDailyTodoErrorState
          message={errorMessage}
          onChoose={onChooseDirectory}
          onRetry={onRefresh}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside
            ref={todoRailRef}
            // Why: the CSS variable gives first paint and Fast Refresh a
            // deterministic width; the resize hook still owns live drag width.
            style={
              {
                '--obsidian-daily-todo-rail-width': `${todoRailWidth}px`
              } as React.CSSProperties
            }
            className="flex w-[var(--obsidian-daily-todo-rail-width)] min-h-0 min-w-0 flex-col max-md:!w-full"
          >
            <ObsidianDailyDateHeader
              directory={directory}
              snapshot={snapshot}
              loading={loading}
              onRefresh={onRefresh}
              onOpen={onOpen}
              onSelectNote={onSelectNote}
            />
            {!snapshot?.filePath ? (
              <MissingObsidianDailyNoteState onOpen={onOpen} />
            ) : (
              <>
                <div className="shrink-0 space-y-2 border-b border-border p-3">
                  <ObsidianDailyTodoCompactFilters
                    overview={overview}
                    filter={filter}
                    onFilterChange={onFilterChange}
                  />
                  <ObsidianDailyTodoAddForm
                    snapshot={snapshot}
                    draft={draft}
                    priority={priority}
                    adding={adding}
                    onDraftChange={onDraftChange}
                    onPriorityChange={onPriorityChange}
                    onAdd={onAdd}
                  />
                  <Button
                    type="button"
                    variant={workspaceMode === 'capture' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() =>
                      onWorkspaceModeChange(workspaceMode === 'capture' ? 'overview' : 'capture')
                    }
                  >
                    {listeningForCandidates ? <Radio className="animate-pulse" /> : <Sparkles />}
                    {translate(
                      'auto.components.ObsidianDailyTodoWorkspace.capture',
                      'Todo capture'
                    )}
                    {candidates.length > 0 ? (
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {candidates.length}
                      </span>
                    ) : listeningForCandidates ? (
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {translate(
                          'auto.components.ObsidianDailyTodoCandidatePanel.monitorActive',
                          'Monitoring'
                        )}
                      </span>
                    ) : null}
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-sleek">
                  <div>
                    {errorMessage ? (
                      <p className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        {errorMessage}
                      </p>
                    ) : null}
                    {groups.length > 0 ? (
                      <ObsidianDailyTodoList
                        groups={groups}
                        filter={filter}
                        highlightedTodoId={highlightedTodoId}
                        selectedTodoId={selectedTodo?.id ?? null}
                        collapsed={workspaceMode === 'capture'}
                        busyTodoIds={busyTodoIds}
                        workRecordTitles={
                          new Set(snapshot?.workRecords.map((record) => record.title))
                        }
                        onSelectTodo={onSelectTodo}
                        onStatusChange={onStatusChange}
                        onTextChange={onTextChange}
                        onPriorityChange={onTodoPriorityChange}
                        onDelete={onDeleteTodo}
                        onOpenWorkRecord={onOpenWorkRecord}
                        onStartFocus={onStartFocus}
                        onAiExecute={onAiExecute}
                      />
                    ) : overview.total > 0 ? (
                      <FilteredObsidianDailyTodoState onClear={() => onFilterChange('all')} />
                    ) : (
                      <EmptyObsidianDailyTodoState />
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>

          <ObsidianDailyTodoResizeHandle
            width={todoRailWidth}
            resizing={isTodoRailResizing}
            onMouseDown={onTodoRailResizeStart}
            onWidthChange={updateTodoRailWidth}
          />

          <ObsidianDailyTodoWorkspace
            mode={workspaceMode}
            selectedTodo={selectedTodo}
            snapshot={snapshot}
            overview={overview}
            analytics={analytics}
            analyticsLoading={analyticsLoading}
            filter={filter}
            saving={recordSaving}
            candidateSourceText={candidateSourceText}
            candidateSourceImage={candidateSourceImage}
            candidateAnalyzing={candidateAnalyzing}
            candidateBusyIds={candidateBusyIds}
            candidateErrorMessage={candidateErrorMessage}
            candidates={candidates}
            listeningForCandidates={listeningForCandidates}
            monitorActivity={monitorActivity}
            focusSession={focusSession}
            focusNow={focusNow}
            focusBusy={focusBusy}
            onModeChange={onWorkspaceModeChange}
            onFilterChange={onFilterChange}
            onSelectTodo={onSelectTodo}
            onSaveWorkRecord={onSaveWorkRecord}
            onAiExecute={onAiExecute}
            onCandidateSourceTextChange={onCandidateSourceTextChange}
            onCandidateSourceImageChange={onCandidateSourceImageChange}
            onListeningForCandidatesChange={onListeningForCandidatesChange}
            onAnalyzeCandidates={onAnalyzeCandidates}
            onAcceptCandidate={onAcceptCandidate}
            onDismissCandidate={onDismissCandidate}
            onStartFocus={onBeginFocus}
            onPauseFocus={onPauseFocus}
            onResumeFocus={onResumeFocus}
            onUpdateFocusNotes={onUpdateFocusNotes}
            onFinishFocus={onFinishFocus}
            onAbandonFocus={onAbandonFocus}
          />
        </div>
      )}
    </section>
  )
}
