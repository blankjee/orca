import type { ObsidianDailyTodoItem } from './obsidian-daily-todo'

export type ObsidianDailyTodoTextUpdate = {
  directory: string
  filePath: string
  todo: ObsidianDailyTodoItem
  text: string
}

export function updateObsidianDailyTodoText(
  markdown: string,
  todo: ObsidianDailyTodoItem,
  text: string
): string | null {
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.split(/\r?\n/)
  const originalIndex = todo.lineNumber - 1
  const targetIndex =
    lines[originalIndex] === todo.rawLine ? originalIndex : uniqueLineIndex(lines, todo.rawLine)
  if (targetIndex < 0) {
    return null
  }
  const match = lines[targetIndex].match(/^(\s*[-*]\s+\[[ xX/-]\]\s+)(.+)$/)
  if (!match) {
    return null
  }
  lines[targetIndex] = `${match[1]}${text.trim()}`
  return lines.join(newline)
}

function uniqueLineIndex(lines: readonly string[], rawLine: string): number {
  const matches = lines.flatMap((line, index) => (line === rawLine ? [index] : []))
  return matches.length === 1 ? matches[0] : -1
}
