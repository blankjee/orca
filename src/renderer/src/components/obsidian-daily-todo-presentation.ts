import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'
import { OBSIDIAN_DAILY_CHECK_GROUP } from '../../../shared/obsidian-daily-todo'

export type ObsidianDailyTodoPriorityGroup = {
  priority: ObsidianDailyTodoItem['priority']
  todos: ObsidianDailyTodoItem[]
}

export type ObsidianDailyTodoGroup = {
  name: string
  total: number
  completed: number
  priorities: ObsidianDailyTodoPriorityGroup[]
}

export type ObsidianDailyTodoFilter = 'all' | 'pending' | 'in-progress' | 'completed'

export type ObsidianDailyTodoOverview = {
  total: number
  pending: number
  inProgress: number
  completed: number
  completionPercent: number
  currentTodo: ObsidianDailyTodoItem | null
  nextTodo: ObsidianDailyTodoItem | null
}

// Why: recurring checks are the user's pinned context and must precede every task group.
const PREFERRED_GROUP_ORDER = [OBSIDIAN_DAILY_CHECK_GROUP, '今日任务', '跟进任务']
const PRIORITY_ORDER: ObsidianDailyTodoItem['priority'][] = ['P1', 'P2', 'P3', null]

export function groupObsidianDailyTodos(
  todos: readonly ObsidianDailyTodoItem[]
): ObsidianDailyTodoGroup[] {
  const grouped = new Map<string, ObsidianDailyTodoItem[]>()
  for (const todo of todos) {
    const group = todo.group?.trim() || '其他'
    grouped.set(group, [...(grouped.get(group) ?? []), todo])
  }

  return [...grouped]
    .sort(([left], [right]) => compareGroups(left, right))
    .map(([name, items]) => ({
      name,
      total: items.length,
      completed: items.filter((item) => item.status === 'completed').length,
      priorities: PRIORITY_ORDER.flatMap((priority) => {
        const matches = items.filter((item) => item.priority === priority)
        return matches.length > 0 ? [{ priority, todos: matches }] : []
      })
    }))
}

export function getNextObsidianDailyTodoStatus(
  status: ObsidianDailyTodoStatus
): ObsidianDailyTodoStatus {
  switch (status) {
    case 'pending':
      return 'in-progress'
    case 'in-progress':
      return 'completed'
    case 'completed':
    case 'cancelled':
      return 'pending'
  }
}

export function isObsidianDailyTodoTerminal(status: ObsidianDailyTodoStatus): boolean {
  return status === 'completed' || status === 'cancelled'
}

export function getObsidianTodoDisplayText(text: string): string {
  return text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1')
}

export function filterObsidianDailyTodos(
  todos: readonly ObsidianDailyTodoItem[],
  filter: ObsidianDailyTodoFilter
): ObsidianDailyTodoItem[] {
  return filter === 'all' ? [...todos] : todos.filter((todo) => todo.status === filter)
}

export function summarizeObsidianDailyTodos(
  todos: readonly ObsidianDailyTodoItem[]
): ObsidianDailyTodoOverview {
  const pending = todos.filter((todo) => todo.status === 'pending')
  const inProgress = todos.filter((todo) => todo.status === 'in-progress')
  const completed = todos.filter((todo) => todo.status === 'completed')
  return {
    total: todos.length,
    pending: pending.length,
    inProgress: inProgress.length,
    completed: completed.length,
    completionPercent: todos.length === 0 ? 0 : Math.round((completed.length / todos.length) * 100),
    currentTodo: inProgress[0] ?? null,
    nextTodo: pending[0] ?? null
  }
}

function compareGroups(left: string, right: string): number {
  const leftIndex = PREFERRED_GROUP_ORDER.indexOf(left)
  const rightIndex = PREFERRED_GROUP_ORDER.indexOf(right)
  if (leftIndex >= 0 || rightIndex >= 0) {
    return (
      (leftIndex >= 0 ? leftIndex : PREFERRED_GROUP_ORDER.length) -
      (rightIndex >= 0 ? rightIndex : PREFERRED_GROUP_ORDER.length)
    )
  }
  if (left === '其他') {
    return 1
  }
  if (right === '其他') {
    return -1
  }
  return left.localeCompare(right)
}
