// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoSnapshot
} from '../../../shared/obsidian-daily-todo'
import {
  ObsidianDailyTodoWorkspace,
  type ObsidianDailyWorkspaceMode
} from './obsidian-daily-todo-workspace'
import { summarizeObsidianDailyTodos } from './obsidian-daily-todo-presentation'

const todo: ObsidianDailyTodoItem = {
  id: 'todo-1',
  text: 'Prepare architecture review',
  status: 'in-progress',
  lineNumber: 4,
  rawLine: '- [/] Prepare architecture review',
  group: '今日任务',
  priority: 'P1',
  depth: 0,
  parentId: null,
  timeText: null
}

const snapshot: ObsidianDailyTodoSnapshot = {
  date: '2026-07-27',
  today: '2026-07-27',
  filePath: '/vault/2026-07-27.md',
  fileName: '2026-07-27.md',
  relativePath: '2026-07-27.md',
  modifiedAt: 1,
  todos: [todo],
  workRecords: [],
  dailyNotes: []
}

function WorkspaceHarness(): React.JSX.Element {
  const [mode, setMode] = useState<ObsidianDailyWorkspaceMode>('overview')
  const [selectedTodo, setSelectedTodo] = useState<ObsidianDailyTodoItem | null>(null)
  return (
    <ObsidianDailyTodoWorkspace
      mode={mode}
      selectedTodo={selectedTodo}
      snapshot={snapshot}
      overview={summarizeObsidianDailyTodos(snapshot.todos)}
      analytics={null}
      analyticsLoading={false}
      filter="all"
      saving={false}
      candidateSourceText=""
      candidateAnalyzing={false}
      candidateBusyIds={new Set()}
      candidateErrorMessage={null}
      candidates={[]}
      listeningForCandidates={false}
      onModeChange={setMode}
      onFilterChange={vi.fn()}
      onSelectTodo={(nextTodo) => {
        setSelectedTodo(nextTodo)
        setMode('task')
      }}
      onSaveWorkRecord={async () => true}
      onAiExecute={vi.fn()}
      onCandidateSourceTextChange={vi.fn()}
      onListeningForCandidatesChange={vi.fn()}
      onAnalyzeCandidates={vi.fn()}
      onAcceptCandidate={vi.fn()}
      onDismissCandidate={vi.fn()}
    />
  )
}

describe('ObsidianDailyTodoWorkspace', () => {
  it('starts with the overview and switches content when a Todo is selected', () => {
    render(<WorkspaceHarness />)

    expect(screen.getByRole('button', { name: 'Daily overview' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: todo.text }))

    expect(screen.getByRole('heading', { name: todo.text })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Content' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Todo capture' }))

    expect(screen.getByText('macOS Todo monitoring')).toBeTruthy()
  })
})
