import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import { join } from 'node:path'

import type {
  ObsidianDailyTodoFocusStartInput,
  ObsidianDailyTodoFocusUpdateInput
} from '../../shared/obsidian-daily-todo-focus'
import { ObsidianDailyTodoFocusService } from '../obsidian-daily-todo-focus-service'

export function registerObsidianDailyTodoFocusHandlers(): void {
  const service = new ObsidianDailyTodoFocusService({
    stateFilePath: join(app.getPath('userData'), 'obsidian-daily-todo-focus.json'),
    onChanged: (session) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send('obsidianDailyTodos:focus:changed', session)
      }
    },
    onElapsed: (session) => {
      if (!Notification.isSupported()) {
        return
      }
      new Notification({
        title: '聚焦时间结束',
        body: session.todo.text,
        silent: false
      }).show()
    }
  })

  ipcMain.handle('obsidianDailyTodos:focus:get', () => service.get())
  ipcMain.handle(
    'obsidianDailyTodos:focus:start',
    (_event, input: ObsidianDailyTodoFocusStartInput) => {
      if (!hasValidStartInput(input)) {
        return invalidFocusInput()
      }
      return service.start(input)
    }
  )
  ipcMain.handle('obsidianDailyTodos:focus:pause', () => service.pause())
  ipcMain.handle('obsidianDailyTodos:focus:resume', () => service.resume())
  ipcMain.handle(
    'obsidianDailyTodos:focus:update',
    (_event, input: ObsidianDailyTodoFocusUpdateInput) => {
      if (
        !input ||
        (input.goal !== undefined && typeof input.goal !== 'string') ||
        (input.notes !== undefined && typeof input.notes !== 'string')
      ) {
        return invalidFocusInput()
      }
      return service.update(input)
    }
  )
  ipcMain.handle('obsidianDailyTodos:focus:finish', () => service.finish())
  ipcMain.handle('obsidianDailyTodos:focus:abandon', () => service.abandon())
  void service.get()
}

function hasValidStartInput(input: ObsidianDailyTodoFocusStartInput): boolean {
  return Boolean(
    input &&
    typeof input.directory === 'string' &&
    typeof input.filePath === 'string' &&
    typeof input.noteDate === 'string' &&
    typeof input.durationMinutes === 'number' &&
    typeof input.goal === 'string' &&
    input.todo &&
    typeof input.todo.text === 'string' &&
    typeof input.todo.rawLine === 'string' &&
    Number.isInteger(input.todo.lineNumber)
  )
}

function invalidFocusInput(): {
  ok: false
  code: 'invalid-input'
  message: string
} {
  return { ok: false, code: 'invalid-input', message: 'Invalid focus session input.' }
}
