// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
  loadObsidianDailyTodoRailWidth,
  MAX_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
  MIN_OBSIDIAN_DAILY_TODO_RAIL_WIDTH,
  saveObsidianDailyTodoRailWidth
} from './obsidian-daily-todo-rail-width'

afterEach(() => window.localStorage.clear())

describe('Obsidian daily Todo rail width', () => {
  it('uses the wider default when no preference is stored', () => {
    expect(loadObsidianDailyTodoRailWidth()).toBe(DEFAULT_OBSIDIAN_DAILY_TODO_RAIL_WIDTH)
  })

  it('persists a resized width', () => {
    saveObsidianDailyTodoRailWidth(536)

    expect(loadObsidianDailyTodoRailWidth()).toBe(536)
  })

  it('clamps stored widths to usable bounds', () => {
    saveObsidianDailyTodoRailWidth(10)
    expect(loadObsidianDailyTodoRailWidth()).toBe(MIN_OBSIDIAN_DAILY_TODO_RAIL_WIDTH)

    saveObsidianDailyTodoRailWidth(10_000)
    expect(loadObsidianDailyTodoRailWidth()).toBe(MAX_OBSIDIAN_DAILY_TODO_RAIL_WIDTH)
  })
})
