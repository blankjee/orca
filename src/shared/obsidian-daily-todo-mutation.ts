import type { ObsidianDailyTodoItem } from './obsidian-daily-todo'
import { insertObsidianDailyTodoLines } from './obsidian-daily-todo-insertion'

export type ObsidianDailyTodoDeleteInput = {
  directory: string
  filePath: string
  todo: ObsidianDailyTodoItem
}

export type ObsidianDailyTodoPriority = Exclude<ObsidianDailyTodoItem['priority'], null>

export type ObsidianDailyTodoPriorityUpdate = ObsidianDailyTodoDeleteInput & {
  priority: ObsidianDailyTodoPriority
}

export function deleteObsidianDailyTodo(
  markdown: string,
  todo: ObsidianDailyTodoItem
): string | null {
  const document = splitMarkdown(markdown)
  const targetIndex = findTodoIndex(document.lines, todo)
  if (targetIndex < 0) {
    return null
  }
  document.lines.splice(
    targetIndex,
    findTodoBlockEnd(document.lines, targetIndex, todo.depth) - targetIndex
  )
  return document.lines.join(document.newline)
}

export function updateObsidianDailyTodoPriority(
  markdown: string,
  todo: ObsidianDailyTodoItem,
  priority: ObsidianDailyTodoPriority
): string | null {
  if (todo.depth > 0) {
    return null
  }
  if (todo.priority === priority) {
    return markdown
  }
  const document = splitMarkdown(markdown)
  const targetIndex = findTodoIndex(document.lines, todo)
  if (targetIndex < 0) {
    return null
  }
  const blockEnd = findTodoBlockEnd(document.lines, targetIndex, todo.depth)
  const todoLines = document.lines.splice(targetIndex, blockEnd - targetIndex)
  return insertObsidianDailyTodoLines(
    document.lines.join(document.newline),
    todo.group,
    priority,
    todoLines
  )
}

function findTodoBlockEnd(lines: readonly string[], targetIndex: number, depth: number): number {
  let index = targetIndex + 1
  for (; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)[-*]\s+\[[ xX/-]\]\s+.+$/)
    if (!match || getIndentationDepth(match[1]) <= depth) {
      break
    }
  }
  return index
}

function findTodoIndex(lines: readonly string[], todo: ObsidianDailyTodoItem): number {
  const originalIndex = todo.lineNumber - 1
  if (lines[originalIndex] === todo.rawLine) {
    return originalIndex
  }
  const matches = lines.flatMap((line, index) => (line === todo.rawLine ? [index] : []))
  return matches.length === 1 ? matches[0] : -1
}

function getIndentationDepth(indentation: string): number {
  let columns = 0
  for (const character of indentation) {
    columns += character === '\t' ? 2 : 1
  }
  return Math.floor(columns / 2)
}

function splitMarkdown(markdown: string): { lines: string[]; newline: '\n' | '\r\n' } {
  return {
    lines: markdown.split(/\r?\n/),
    newline: markdown.includes('\r\n') ? '\r\n' : '\n'
  }
}
