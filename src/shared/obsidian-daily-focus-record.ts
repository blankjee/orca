export type ObsidianDailyFocusRecordInput = {
  id: string
  startedAt: Date
  finishedAt: Date
  focusedMinutes: number
  goal: string
  notes: string
}

const FOCUS_RECORD_HEADING = '#### 聚焦记录'

export function appendObsidianDailyFocusRecord(
  body: string,
  input: ObsidianDailyFocusRecordInput
): string {
  const line = formatFocusRecordLine(input)
  const trimmed = body.trim()
  if (!trimmed) {
    return `${FOCUS_RECORD_HEADING}\n\n${line}`
  }
  if (trimmed.split(/\r?\n/).some((candidate) => candidate.trim() === FOCUS_RECORD_HEADING)) {
    return `${trimmed}\n${line}`
  }
  return `${trimmed}\n\n${FOCUS_RECORD_HEADING}\n\n${line}`
}

export function parseObsidianDailyFocusRecordMinutes(markdown: string): {
  sessions: number
  minutes: number
} {
  let sessions = 0
  let minutes = 0
  for (const match of markdown.matchAll(/<!-- orca-focus:v1 minutes=(\d+) id=[^ ]+ -->/g)) {
    sessions += 1
    minutes += Number(match[1])
  }
  return { sessions, minutes }
}

function formatFocusRecordLine(input: ObsidianDailyFocusRecordInput): string {
  const goal = normalizeInlineText(input.goal)
  const notes = normalizeInlineText(input.notes)
  const details = [goal ? `目标：${goal}` : '', notes ? `记录：${notes}` : ''].filter(Boolean)
  const marker = `<!-- orca-focus:v1 minutes=${input.focusedMinutes} id=${input.id} -->`
  const suffix = details.length > 0 ? ` · ${details.join(' · ')}` : ''
  return `- ${formatLocalTime(input.startedAt)}–${formatLocalTime(input.finishedAt)} · ${input.focusedMinutes} 分钟 · 完成${suffix} ${marker}`
}

function formatLocalTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function normalizeInlineText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}
