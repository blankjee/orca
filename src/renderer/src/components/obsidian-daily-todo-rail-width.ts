const STORAGE_KEY = 'orca.obsidianDailyTodo.railWidth'

export const DEFAULT_OBSIDIAN_DAILY_TODO_RAIL_WIDTH = 440
export const MIN_OBSIDIAN_DAILY_TODO_RAIL_WIDTH = 320
export const MAX_OBSIDIAN_DAILY_TODO_RAIL_WIDTH = 720

export function clampObsidianDailyTodoRailWidth(width: number): number {
  return Math.min(
    MAX_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
    Math.max(MIN_OBSIDIAN_DAILY_TODO_RAIL_WIDTH, Math.round(width))
  )
}

export function loadObsidianDailyTodoRailWidth(): number {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(stored) && stored > 0
      ? clampObsidianDailyTodoRailWidth(stored)
      : DEFAULT_OBSIDIAN_DAILY_TODO_RAIL_WIDTH
  } catch {
    return DEFAULT_OBSIDIAN_DAILY_TODO_RAIL_WIDTH
  }
}

export function saveObsidianDailyTodoRailWidth(width: number): void {
  try {
    // Why: this is a device-specific presentation preference, so syncing it
    // through workspace settings would make unrelated machines fight over it.
    window.localStorage.setItem(STORAGE_KEY, String(clampObsidianDailyTodoRailWidth(width)))
  } catch {
    // localStorage may be disabled; resizing still works for this session.
  }
}
