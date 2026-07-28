export const OBSIDIAN_DAILY_TODO_STATUSES = [
  'pending',
  'in-progress',
  'completed',
  'cancelled'
] as const

export const OBSIDIAN_DAILY_CHECK_GROUP = '每日check'

export type ObsidianDailyTodoStatus = (typeof OBSIDIAN_DAILY_TODO_STATUSES)[number]

export type ObsidianDailyTodoItem = {
  id: string
  text: string
  status: ObsidianDailyTodoStatus
  lineNumber: number
  rawLine: string
  group: string | null
  priority: 'P1' | 'P2' | 'P3' | null
  depth: number
  parentId: string | null
  timeText: string | null
}

export type ObsidianDailyNoteSummary = {
  date: string
  filePath: string
  relativePath: string
}

export type ObsidianDailyTodoSnapshot = {
  date: string
  today: string
  filePath: string | null
  fileName: string | null
  relativePath: string | null
  modifiedAt: number | null
  todos: ObsidianDailyTodoItem[]
  workRecords: ObsidianDailyWorkRecord[]
  dailyNotes: ObsidianDailyNoteSummary[]
}

export type ObsidianDailyTodoErrorCode =
  | 'invalid-directory'
  | 'directory-not-found'
  | 'note-not-found'
  | 'invalid-input'
  | 'todo-conflict'
  | 'read-failed'
  | 'write-failed'
  | 'unavailable-on-web'

export type ObsidianDailyTodoResult =
  | { ok: true; snapshot: ObsidianDailyTodoSnapshot }
  | { ok: false; code: ObsidianDailyTodoErrorCode; message: string }

export type ObsidianDailyTodoStatusUpdate = {
  directory: string
  filePath: string
  todo: ObsidianDailyTodoItem
  status: ObsidianDailyTodoStatus
}

export type ObsidianDailyTodoAddInput = {
  directory: string
  filePath: string
  text: string
  group?: string | null
  priority?: 'P1' | 'P2' | 'P3' | null
  workRecordBody?: string | null
}

const TODO_LINE_PATTERN = /^(\s*)[-*]\s+\[([ xX/-])\]\s+(.+)$/
const GROUP_PATTERN = /^###\s+(.+)$/
const PRIORITY_PATTERN = /^####\s+(P[123])\b/

export function isObsidianDailyTodoStatus(value: unknown): value is ObsidianDailyTodoStatus {
  return OBSIDIAN_DAILY_TODO_STATUSES.includes(value as ObsidianDailyTodoStatus)
}

export function parseObsidianDailyTodos(markdown: string): ObsidianDailyTodoItem[] {
  const todos: ObsidianDailyTodoItem[] = []
  const parents: { depth: number; id: string }[] = []
  let group: string | null = null
  let priority: ObsidianDailyTodoItem['priority'] = null
  let fence: '```' | '~~~' | null = null
  let workRecordHeadingLevel: number | null = null

  for (const [offset, line] of splitMarkdown(markdown).lines.entries()) {
    const trimmed = line.trim()
    const fenceMarker = trimmed.startsWith('```') ? '```' : trimmed.startsWith('~~~') ? '~~~' : null
    if (fenceMarker) {
      fence = fence === fenceMarker ? null : fence || fenceMarker
      continue
    }
    if (fence) {
      continue
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/)
    if (workRecordHeadingLevel !== null) {
      if (!heading || heading[1].length > workRecordHeadingLevel) {
        continue
      }
      workRecordHeadingLevel = null
    }
    if (heading?.[2].trim() === '工作记录') {
      workRecordHeadingLevel = heading[1].length
      group = null
      priority = null
      parents.length = 0
      continue
    }
    if (heading && heading[1].length <= 2) {
      // Why: checklist rows directly under 每日check are pinned Todos, not ungrouped leftovers.
      group = isDailyCheckHeading(heading[2]) ? OBSIDIAN_DAILY_CHECK_GROUP : null
      priority = null
      parents.length = 0
      continue
    }

    const groupMatch = trimmed.match(GROUP_PATTERN)
    if (groupMatch) {
      group = groupMatch[1].trim()
      priority = null
      parents.length = 0
      continue
    }
    const priorityMatch = trimmed.match(PRIORITY_PATTERN)
    if (priorityMatch) {
      priority = priorityMatch[1] as ObsidianDailyTodoItem['priority']
      parents.length = 0
      continue
    }
    if (trimmed.startsWith('#') || trimmed.startsWith('<!-- daily-todo:end')) {
      priority = null
      parents.length = 0
      continue
    }

    const match = line.match(TODO_LINE_PATTERN)
    if (!match) {
      continue
    }
    const text = match[3].trim()
    if (!text) {
      continue
    }
    const depth = getIndentationDepth(match[1])
    while ((parents.at(-1)?.depth ?? -1) >= depth) {
      parents.pop()
    }
    const lineNumber = offset + 1
    const id = stableTodoId(lineNumber, text)
    const todo: ObsidianDailyTodoItem = {
      id,
      text,
      status: markerToStatus(match[2]),
      lineNumber,
      rawLine: line,
      group,
      priority,
      depth,
      parentId: parents.at(-1)?.id ?? null,
      timeText: text.match(/\b\d{1,2}:\d{2}\b/)?.[0] ?? null
    }
    todos.push(todo)
    parents.push({ depth, id })
  }
  return todos
}

export function updateObsidianDailyTodoStatus(
  markdown: string,
  todo: ObsidianDailyTodoItem,
  status: ObsidianDailyTodoStatus
): string | null {
  const document = splitMarkdown(markdown)
  const originalIndex = todo.lineNumber - 1
  let targetIndex =
    document.lines[originalIndex] === todo.rawLine
      ? originalIndex
      : uniqueLineIndex(document.lines, todo.rawLine)
  if (targetIndex < 0) {
    return null
  }

  document.lines[targetIndex] = document.lines[targetIndex].replace(
    /^(\s*[-*]\s+)\[[ xX/-]\]/,
    `$1[${statusToMarker(status)}]`
  )
  return joinMarkdown(document)
}

export { addObsidianDailyTodo } from './obsidian-daily-todo-insertion'

function splitMarkdown(markdown: string): { lines: string[]; newline: '\n' | '\r\n' } {
  return {
    lines: markdown.split(/\r?\n/),
    newline: markdown.includes('\r\n') ? '\r\n' : '\n'
  }
}

function joinMarkdown(document: { lines: string[]; newline: string }): string {
  return document.lines.join(document.newline)
}

function markerToStatus(marker: string): ObsidianDailyTodoStatus {
  if (marker === 'x' || marker === 'X') {
    return 'completed'
  }
  if (marker === '/') {
    return 'in-progress'
  }
  if (marker === '-') {
    return 'cancelled'
  }
  return 'pending'
}

function statusToMarker(status: ObsidianDailyTodoStatus): string {
  if (status === 'completed') {
    return 'x'
  }
  if (status === 'in-progress') {
    return '/'
  }
  if (status === 'cancelled') {
    return '-'
  }
  return ' '
}

function getIndentationDepth(indentation: string): number {
  let columns = 0
  for (const character of indentation) {
    columns += character === '\t' ? 2 : 1
  }
  return Math.floor(columns / 2)
}

function uniqueLineIndex(lines: readonly string[], rawLine: string): number {
  const matches: number[] = []
  for (const [index, line] of lines.entries()) {
    if (line === rawLine) {
      matches.push(index)
    }
  }
  return matches.length === 1 ? matches[0] : -1
}

function stableTodoId(lineNumber: number, text: string): string {
  let hash = 2_166_136_261
  for (const character of `${lineNumber}:${text}`) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619)
  }
  return `${lineNumber}-${(hash >>> 0).toString(16)}`
}

function isDailyCheckHeading(heading: string): boolean {
  return (
    heading.replace(/\s+/g, '').toLocaleLowerCase() === OBSIDIAN_DAILY_CHECK_GROUP.toLowerCase()
  )
}
import type { ObsidianDailyWorkRecord } from './obsidian-daily-work-record'
