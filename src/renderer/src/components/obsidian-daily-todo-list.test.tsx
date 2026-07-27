// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import type { ObsidianDailyTodoItem } from '../../../shared/obsidian-daily-todo'
import { ObsidianDailyTodoList } from './obsidian-daily-todo-list'
import { groupObsidianDailyTodos } from './obsidian-daily-todo-presentation'

const todo: ObsidianDailyTodoItem = {
  id: 'todo-1',
  text: 'Investigate flaky retry',
  status: 'pending',
  lineNumber: 3,
  rawLine: '- [ ] Investigate flaky retry',
  group: 'Today',
  priority: 'P1',
  depth: 0,
  parentId: null,
  timeText: null
}

afterEach(cleanup)

describe('ObsidianDailyTodoList AI action', () => {
  it('temporarily collapses every group without losing its prior open state', () => {
    const props = {
      groups: groupObsidianDailyTodos([todo]),
      filter: 'all' as const,
      highlightedTodoId: null,
      selectedTodoId: null,
      busyTodoIds: new Set<string>(),
      workRecordTitles: new Set<string>(),
      onSelectTodo: vi.fn(),
      onStatusChange: vi.fn(),
      onTextChange: vi.fn(),
      onPriorityChange: vi.fn(),
      onDelete: vi.fn(),
      onOpenWorkRecord: vi.fn(),
      onAiExecute: vi.fn()
    }
    const { rerender } = render(
      <TooltipProvider>
        <ObsidianDailyTodoList {...props} collapsed />
      </TooltipProvider>
    )

    expect(screen.queryByRole('button', { name: todo.text })).toBeNull()

    rerender(
      <TooltipProvider>
        <ObsidianDailyTodoList {...props} collapsed={false} />
      </TooltipProvider>
    )

    expect(screen.getByRole('button', { name: todo.text })).toBeTruthy()
  })

  it('selects a task from its title', () => {
    const onSelectTodo = vi.fn()
    render(
      <TooltipProvider>
        <ObsidianDailyTodoList
          groups={groupObsidianDailyTodos([todo])}
          filter="all"
          highlightedTodoId={null}
          selectedTodoId={null}
          busyTodoIds={new Set()}
          workRecordTitles={new Set()}
          onSelectTodo={onSelectTodo}
          onStatusChange={vi.fn()}
          onTextChange={vi.fn()}
          onPriorityChange={vi.fn()}
          onDelete={vi.fn()}
          onOpenWorkRecord={vi.fn()}
          onAiExecute={vi.fn()}
        />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: todo.text }))

    expect(onSelectTodo).toHaveBeenCalledWith(todo)
  })

  it('routes the row Todo through the AI execute button', () => {
    const onAiExecute = vi.fn()

    render(
      <TooltipProvider>
        <ObsidianDailyTodoList
          groups={groupObsidianDailyTodos([todo])}
          filter="all"
          highlightedTodoId={null}
          selectedTodoId={null}
          busyTodoIds={new Set()}
          workRecordTitles={new Set()}
          onSelectTodo={vi.fn()}
          onStatusChange={vi.fn()}
          onTextChange={vi.fn()}
          onPriorityChange={vi.fn()}
          onDelete={vi.fn()}
          onOpenWorkRecord={vi.fn()}
          onAiExecute={onAiExecute}
        />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Run this Todo with AI' }))

    expect(onAiExecute).toHaveBeenCalledWith(todo)
  })

  it('edits a task after double-clicking its title', () => {
    const onTextChange = vi.fn()
    render(
      <TooltipProvider>
        <ObsidianDailyTodoList
          groups={groupObsidianDailyTodos([todo])}
          filter="all"
          highlightedTodoId={null}
          selectedTodoId={null}
          busyTodoIds={new Set()}
          workRecordTitles={new Set()}
          onSelectTodo={vi.fn()}
          onStatusChange={vi.fn()}
          onTextChange={onTextChange}
          onPriorityChange={vi.fn()}
          onDelete={vi.fn()}
          onOpenWorkRecord={vi.fn()}
          onAiExecute={vi.fn()}
        />
      </TooltipProvider>
    )

    fireEvent.doubleClick(screen.getByText(todo.text))
    const input = screen.getByRole('textbox', { name: 'Edit task' })
    fireEvent.change(input, { target: { value: 'Updated task' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onTextChange).toHaveBeenCalledWith(todo, 'Updated task')
  })

  it('opens the selected task work record', () => {
    const onOpenWorkRecord = vi.fn()
    render(
      <TooltipProvider>
        <ObsidianDailyTodoList
          groups={groupObsidianDailyTodos([todo])}
          filter="all"
          highlightedTodoId={null}
          selectedTodoId={null}
          busyTodoIds={new Set()}
          workRecordTitles={new Set([todo.text])}
          onSelectTodo={vi.fn()}
          onStatusChange={vi.fn()}
          onTextChange={vi.fn()}
          onPriorityChange={vi.fn()}
          onDelete={vi.fn()}
          onOpenWorkRecord={onOpenWorkRecord}
          onAiExecute={vi.fn()}
        />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Work record' }))
    expect(onOpenWorkRecord).toHaveBeenCalledWith(todo)
  })

  it('offers priority editing and confirms task deletion', () => {
    const onDelete = vi.fn()
    render(
      <TooltipProvider>
        <ObsidianDailyTodoList
          groups={groupObsidianDailyTodos([todo])}
          filter="all"
          highlightedTodoId={null}
          selectedTodoId={null}
          busyTodoIds={new Set()}
          workRecordTitles={new Set()}
          onSelectTodo={vi.fn()}
          onStatusChange={vi.fn()}
          onTextChange={vi.fn()}
          onPriorityChange={vi.fn()}
          onDelete={onDelete}
          onOpenWorkRecord={vi.fn()}
          onAiExecute={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(screen.getByRole('combobox', { name: `Change priority for ${todo.text}` })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith(todo)
  })
})
