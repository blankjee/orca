import type { ObsidianDailyTodoAddInput, ObsidianDailyTodoItem } from './obsidian-daily-todo'

const GROUP_PATTERN = /^###\s+(.+)$/
const PRIORITY_PATTERN = /^####\s+(P[123])\b/

export function addObsidianDailyTodo(
  markdown: string,
  input: Pick<ObsidianDailyTodoAddInput, 'text' | 'group' | 'priority'>
): string {
  return insertObsidianDailyTodoLines(markdown, input.group ?? null, input.priority ?? null, [
    `- [ ] ${input.text.trim()}`
  ])
}

export function insertObsidianDailyTodoLines(
  markdown: string,
  group: string | null,
  priority: ObsidianDailyTodoItem['priority'],
  todoLines: readonly string[]
): string {
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.split(/\r?\n/)
  const insertion = findTodoInsertion(lines, group, priority)
  lines.splice(insertion.index, 0, ...insertion.prefix, ...todoLines)
  return lines.join(newline)
}

function findTodoInsertion(
  lines: readonly string[],
  targetGroup: string | null,
  targetPriority: ObsidianDailyTodoItem['priority']
): { index: number; prefix: string[] } {
  let group: string | null = null
  let priority: ObsidianDailyTodoItem['priority'] = null
  let inTargetGroup = targetGroup === null
  let inTargetPriority = inTargetGroup && targetPriority === null
  let foundGroup = inTargetGroup
  let foundPriority = inTargetPriority
  let targetGroupEnd = lines.length
  let targetPriorityEnd = lines.length
  let fence: '```' | '~~~' | null = null

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim()
    const fenceMarker = trimmed.startsWith('```') ? '```' : trimmed.startsWith('~~~') ? '~~~' : null
    if (fenceMarker) {
      fence = fence === fenceMarker ? null : fence || fenceMarker
      continue
    }
    if (fence) {
      continue
    }
    const groupMatch = trimmed.match(GROUP_PATTERN)
    if (groupMatch) {
      if (inTargetPriority) {
        targetPriorityEnd = index
      }
      if (inTargetGroup) {
        targetGroupEnd = index
      }
      group = groupMatch[1].trim()
      priority = null
      inTargetGroup = group === targetGroup
      inTargetPriority = inTargetGroup && targetPriority === null
      foundGroup ||= inTargetGroup
      foundPriority ||= inTargetPriority
      continue
    }
    const priorityMatch = trimmed.match(PRIORITY_PATTERN)
    if (priorityMatch) {
      if (inTargetPriority) {
        targetPriorityEnd = index
      }
      priority = priorityMatch[1] as ObsidianDailyTodoItem['priority']
      inTargetPriority = inTargetGroup && priority === targetPriority
      foundPriority ||= inTargetPriority
      continue
    }
    if (trimmed.startsWith('#') || trimmed.startsWith('<!-- daily-todo:end')) {
      const headingLevel = trimmed.match(/^(#{1,6})\s/)?.[1].length ?? 0
      if (inTargetPriority && (headingLevel <= 4 || trimmed.startsWith('<!--'))) {
        targetPriorityEnd = index
        inTargetPriority = false
      }
      if (inTargetGroup && (headingLevel <= 3 || trimmed.startsWith('<!--'))) {
        targetGroupEnd = index
        inTargetGroup = false
      }
      priority = null
    }
  }

  if (foundPriority) {
    return { index: targetPriorityEnd, prefix: [] }
  }
  if (foundGroup) {
    return { index: targetGroupEnd, prefix: targetPriority ? [`#### ${targetPriority}`] : [] }
  }
  return {
    index: lines.length,
    prefix: [
      ...(targetGroup ? [`### ${targetGroup}`] : []),
      ...(targetPriority ? [`#### ${targetPriority}`] : [])
    ]
  }
}
