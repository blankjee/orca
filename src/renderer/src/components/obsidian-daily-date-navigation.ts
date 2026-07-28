import type { ObsidianDailyNoteSummary } from '../../../shared/obsidian-daily-todo'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatObsidianDailyDateTitle(date: string, locale?: string): string {
  return formatDate(date, locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatObsidianDailyDateWeekday(date: string, locale?: string): string {
  return formatDate(date, locale, { weekday: 'short' })
}

export function formatObsidianDailyDateShort(date: string, locale?: string): string {
  return formatDate(date, locale, { month: 'short', day: 'numeric' })
}

export function getObsidianDailyWeekDates(date: string): string[] {
  const selected = parseDate(date)
  const mondayOffset = (selected.getDay() + 6) % 7
  selected.setDate(selected.getDate() - mondayOffset)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(selected)
    day.setDate(selected.getDate() + index)
    return serializeDate(day)
  })
}

export function findAdjacentObsidianDailyNotes(
  notes: readonly ObsidianDailyNoteSummary[],
  selectedDate: string
): { older: ObsidianDailyNoteSummary | null; newer: ObsidianDailyNoteSummary | null } {
  const sorted = [...notes].sort((left, right) => right.date.localeCompare(left.date))
  return {
    older: sorted.find((note) => note.date < selectedDate) ?? null,
    newer: sorted.toReversed().find((note) => note.date > selectedDate) ?? null
  }
}

function formatDate(
  date: string,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, options).format(parseDate(date))
}

function parseDate(value: string): Date {
  const match = value.match(DATE_PATTERN)
  if (!match) {
    return new Date(Number.NaN)
  }
  // Why: noon avoids DST transitions near midnight changing the displayed calendar day.
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
}

function serializeDate(date: Date): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
