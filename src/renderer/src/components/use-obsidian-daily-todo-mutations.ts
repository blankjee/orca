import { useState } from 'react'

import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoResult,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import type { ObsidianDailyTodoPriority } from '../../../shared/obsidian-daily-todo-mutation'

type TodoMutationApi = {
  busyTodoIds: ReadonlySet<string>
  updateStatus: (todo: ObsidianDailyTodoItem, status: ObsidianDailyTodoStatus) => Promise<void>
  updateText: (todo: ObsidianDailyTodoItem, text: string) => Promise<void>
  updatePriority: (
    todo: ObsidianDailyTodoItem,
    priority: ObsidianDailyTodoPriority
  ) => Promise<void>
  deleteTodo: (todo: ObsidianDailyTodoItem) => Promise<void>
}

export function useObsidianDailyTodoMutations({
  directory,
  filePath,
  onResult
}: {
  directory: string
  filePath: string | null | undefined
  onResult: (result: ObsidianDailyTodoResult) => void
}): TodoMutationApi {
  const [busyTodoIds, setBusyTodoIds] = useState<Set<string>>(new Set())

  const runMutation = async (
    todo: ObsidianDailyTodoItem,
    mutate: (filePath: string) => Promise<ObsidianDailyTodoResult>
  ): Promise<void> => {
    if (!filePath) {
      return
    }
    setBusyTodoIds((current) => new Set(current).add(todo.id))
    try {
      onResult(await mutate(filePath))
    } finally {
      setBusyTodoIds((current) => {
        const next = new Set(current)
        next.delete(todo.id)
        return next
      })
    }
  }

  return {
    busyTodoIds,
    updateStatus: (todo, status) =>
      runMutation(todo, (target) =>
        window.api.obsidianDailyTodos.setStatus({ directory, filePath: target, todo, status })
      ),
    updateText: (todo, text) =>
      text.trim() === todo.text
        ? Promise.resolve()
        : runMutation(todo, (target) =>
            window.api.obsidianDailyTodos.updateText({
              directory,
              filePath: target,
              todo,
              text
            })
          ),
    updatePriority: (todo, priority) =>
      priority === todo.priority
        ? Promise.resolve()
        : runMutation(todo, (target) =>
            window.api.obsidianDailyTodos.updatePriority({
              directory,
              filePath: target,
              todo,
              priority
            })
          ),
    deleteTodo: (todo) =>
      runMutation(todo, (target) =>
        window.api.obsidianDailyTodos.delete({ directory, filePath: target, todo })
      )
  }
}
