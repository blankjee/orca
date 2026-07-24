import type { ObsidianDailyTodoItem } from './obsidian-daily-todo'

export type ObsidianDailyWorkRecord = {
  title: string
  body: string
}

export type ObsidianDailyWorkRecordSaveInput = {
  directory: string
  filePath: string
  todo: ObsidianDailyTodoItem
  body: string
  expectedBody: string | null
}

const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*$/

export function parseObsidianDailyWorkRecords(markdown: string): ObsidianDailyWorkRecord[] {
  const lines = markdown.split(/\r?\n/)
  const section = findWorkRecordSection(lines)
  if (!section) {
    return []
  }

  const records: ObsidianDailyWorkRecord[] = []
  const recordLevel = Math.min(section.level + 1, 6)
  for (let index = section.start + 1; index < section.end; index += 1) {
    const heading = lines[index].trim().match(HEADING_PATTERN)
    if (!heading || heading[1].length !== recordLevel) {
      continue
    }
    const end = findHeadingEnd(lines, index + 1, section.end, recordLevel)
    records.push({
      title: heading[2].trim(),
      body: trimBlankLines(lines.slice(index + 1, end)).join('\n')
    })
    index = end - 1
  }
  return records
}

export function saveObsidianDailyWorkRecord(
  markdown: string,
  title: string,
  body: string,
  expectedBody: string | null
): string | null {
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.split(/\r?\n/)
  const section = findWorkRecordSection(lines)
  if (!section) {
    if (expectedBody !== null) {
      return null
    }
    appendWorkRecordSection(lines, title, body)
    return lines.join(newline)
  }

  const matches = findRecordHeadings(lines, section, title)
  const recordPresenceChanged =
    (expectedBody === null && matches.length > 0) || (expectedBody !== null && matches.length === 0)
  if (matches.length > 1 || recordPresenceChanged) {
    return null
  }
  if (matches.length === 0) {
    const headingLevel = '#'.repeat(Math.min(section.level + 1, 6))
    lines.splice(section.end, 0, '', `${headingLevel} ${title}`, '', ...bodyLines(body), '')
    return lines.join(newline)
  }

  const start = matches[0]
  const recordLevel = Math.min(section.level + 1, 6)
  const end = findHeadingEnd(lines, start + 1, section.end, recordLevel)
  const currentBody = trimBlankLines(lines.slice(start + 1, end)).join('\n')
  if (currentBody !== (expectedBody ?? '')) {
    return null
  }
  lines.splice(start + 1, end - start - 1, '', ...bodyLines(body), '')
  return lines.join(newline)
}

export function renameObsidianDailyWorkRecord(
  markdown: string,
  oldTitle: string,
  newTitle: string
): string | null {
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  const lines = markdown.split(/\r?\n/)
  const section = findWorkRecordSection(lines)
  if (!section) {
    return markdown
  }
  const matches = findRecordHeadings(lines, section, oldTitle)
  const renamedMatches = oldTitle === newTitle ? [] : findRecordHeadings(lines, section, newTitle)
  if (matches.length > 1 || renamedMatches.length > 0) {
    return null
  }
  if (matches.length === 1) {
    const headingLevel = '#'.repeat(Math.min(section.level + 1, 6))
    lines[matches[0]] = `${headingLevel} ${newTitle}`
  }
  return lines.join(newline)
}

function findWorkRecordSection(
  lines: readonly string[]
): { start: number; end: number; level: number } | null {
  for (const [index, line] of lines.entries()) {
    const heading = line.trim().match(HEADING_PATTERN)
    if (heading?.[2].trim() !== '工作记录') {
      continue
    }
    const level = heading[1].length
    return { start: index, end: findHeadingEnd(lines, index + 1, lines.length, level), level }
  }
  return null
}

function findRecordHeadings(
  lines: readonly string[],
  section: { start: number; end: number; level: number },
  title: string
): number[] {
  const recordLevel = Math.min(section.level + 1, 6)
  const matches: number[] = []
  for (let index = section.start + 1; index < section.end; index += 1) {
    const heading = lines[index].trim().match(HEADING_PATTERN)
    if (heading?.[1].length === recordLevel && heading[2].trim() === title) {
      matches.push(index)
    }
  }
  return matches
}

function findHeadingEnd(
  lines: readonly string[],
  start: number,
  limit: number,
  level: number
): number {
  for (let index = start; index < limit; index += 1) {
    const heading = lines[index].trim().match(HEADING_PATTERN)
    if (heading && heading[1].length <= level) {
      return index
    }
  }
  return limit
}

function appendWorkRecordSection(lines: string[], title: string, body: string): void {
  while (lines.at(-1) === '') {
    lines.pop()
  }
  lines.push('', '## 工作记录', '', `### ${title}`, '', ...bodyLines(body), '')
}

function bodyLines(body: string): string[] {
  const lines = body.trim().split(/\r?\n/)
  return lines.length === 1 && !lines[0] ? [] : lines
}

function trimBlankLines(lines: readonly string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && !lines[start].trim()) {
    start += 1
  }
  while (end > start && !lines[end - 1].trim()) {
    end -= 1
  }
  return lines.slice(start, end)
}
