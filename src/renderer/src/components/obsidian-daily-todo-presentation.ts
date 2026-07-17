import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoStatus
} from '../../../shared/obsidian-daily-todo'

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

const PREFERRED_GROUP_ORDER = ['今日任务', '跟进任务']
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

export function getObsidianTodoDisplayText(text: string): string {
  return text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1')
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
