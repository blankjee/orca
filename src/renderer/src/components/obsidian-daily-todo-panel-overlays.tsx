import type { Dispatch, SetStateAction } from 'react'

import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoSnapshot
} from '../../../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidateSourceImage
} from '../../../shared/obsidian-daily-todo-candidate'
import type { ObsidianDailyTodoDraftPriority } from './obsidian-daily-todo-add-form'
import { ObsidianDailyTodoCandidateSheet } from './obsidian-daily-todo-candidate-sheet'
import { ObsidianDailyWorkRecordSheet } from './obsidian-daily-work-record-sheet'
import { ObsidianTodoAgentLaunchDialog } from './ObsidianTodoAgentLaunchDialog'

export function ObsidianDailyTodoPanelOverlays({
  snapshot,
  recordTodo,
  recordSaving,
  setRecordTodo,
  onSaveWorkRecord,
  candidateSheetOpen,
  setCandidateSheetOpen,
  candidates,
  candidateSourceText,
  candidateSourceImage,
  candidateAnalyzing,
  listeningForCandidates,
  candidateBusyIds,
  candidateError,
  setCandidateSourceText,
  setCandidateSourceImage,
  setListeningForCandidates,
  onAnalyzeCandidates,
  onAcceptCandidate,
  onDismissCandidate,
  agentTodo,
  setAgentTodo
}: {
  snapshot: ObsidianDailyTodoSnapshot | null
  recordTodo: ObsidianDailyTodoItem | null
  recordSaving: boolean
  setRecordTodo: Dispatch<SetStateAction<ObsidianDailyTodoItem | null>>
  onSaveWorkRecord: (
    todo: ObsidianDailyTodoItem,
    body: string,
    expectedBody: string | null
  ) => Promise<boolean>
  candidateSheetOpen: boolean
  setCandidateSheetOpen: Dispatch<SetStateAction<boolean>>
  candidates: readonly ObsidianDailyTodoCandidate[]
  candidateSourceText: string
  candidateSourceImage: ObsidianDailyTodoCandidateSourceImage | null
  candidateAnalyzing: boolean
  listeningForCandidates: boolean
  candidateBusyIds: ReadonlySet<string>
  candidateError: string | null
  setCandidateSourceText: (value: string) => void
  setCandidateSourceImage: (value: ObsidianDailyTodoCandidateSourceImage | null) => void
  setListeningForCandidates: (value: boolean) => void
  onAnalyzeCandidates: () => void
  onAcceptCandidate: (
    candidate: ObsidianDailyTodoCandidate,
    overrides: {
      title: string
      group: string
      priority: ObsidianDailyTodoDraftPriority | null
    }
  ) => void
  onDismissCandidate: (candidate: ObsidianDailyTodoCandidate) => void
  agentTodo: ObsidianDailyTodoItem | null
  setAgentTodo: Dispatch<SetStateAction<ObsidianDailyTodoItem | null>>
}): React.JSX.Element {
  return (
    <>
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
            void onSaveWorkRecord(recordTodo, body, expectedBody)
          }
        }}
      />
      <ObsidianDailyTodoCandidateSheet
        open={candidateSheetOpen}
        onOpenChange={setCandidateSheetOpen}
        candidates={candidates}
        sourceText={candidateSourceText}
        sourceImage={candidateSourceImage}
        analyzing={candidateAnalyzing}
        listening={listeningForCandidates}
        busyCandidateIds={candidateBusyIds}
        disabled={!snapshot?.filePath}
        errorMessage={candidateError}
        onSourceTextChange={setCandidateSourceText}
        onSourceImageChange={setCandidateSourceImage}
        onListeningChange={setListeningForCandidates}
        onAnalyze={onAnalyzeCandidates}
        onAccept={onAcceptCandidate}
        onDismiss={onDismissCandidate}
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
