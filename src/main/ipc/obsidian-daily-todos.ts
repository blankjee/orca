import { ipcMain } from 'electron'

import {
  addObsidianDailyTodoToNote,
  loadObsidianDailyTodos,
  saveObsidianDailyWorkRecordToNote,
  setObsidianDailyTodoStatus,
  updateObsidianDailyTodoTextInNote
} from '../obsidian-daily-todo-service'
import {
  isObsidianDailyTodoStatus,
  type ObsidianDailyTodoAddInput,
  type ObsidianDailyTodoStatusUpdate
} from '../../shared/obsidian-daily-todo'
import type { ObsidianDailyTodoTextUpdate } from '../../shared/obsidian-daily-todo-text'
import type { ObsidianDailyWorkRecordSaveInput } from '../../shared/obsidian-daily-work-record'
import { ObsidianDailyTodoCandidateService } from '../obsidian-daily-todo-candidate-service'
import type {
  ObsidianDailyTodoCandidateAcceptInput,
  ObsidianDailyTodoCandidateAnalyzeInput,
  ObsidianDailyTodoCandidateDismissInput,
  ObsidianDailyTodoCandidateUpdateInput
} from '../../shared/obsidian-daily-todo-candidate'

const candidateService = new ObsidianDailyTodoCandidateService()

export function registerObsidianDailyTodoHandlers(): void {
  ipcMain.handle(
    'obsidianDailyTodos:load',
    (_event, args: { directory?: unknown; filePath?: unknown; refresh?: unknown }) =>
      loadObsidianDailyTodos(
        typeof args?.directory === 'string' ? args.directory : '',
        typeof args?.filePath === 'string' ? args.filePath : undefined,
        new Date(),
        args?.refresh === true
      )
  )
  ipcMain.handle('obsidianDailyTodos:setStatus', (_event, args: ObsidianDailyTodoStatusUpdate) => {
    if (
      !args ||
      typeof args.directory !== 'string' ||
      typeof args.filePath !== 'string' ||
      !args.todo ||
      typeof args.todo.rawLine !== 'string' ||
      !Number.isInteger(args.todo.lineNumber) ||
      !isObsidianDailyTodoStatus(args.status)
    ) {
      return Promise.resolve({
        ok: false as const,
        code: 'invalid-input' as const,
        message: 'Invalid todo update.'
      })
    }
    return setObsidianDailyTodoStatus(args)
  })
  ipcMain.handle('obsidianDailyTodos:add', (_event, args: ObsidianDailyTodoAddInput) => {
    if (
      !args ||
      typeof args.directory !== 'string' ||
      typeof args.filePath !== 'string' ||
      typeof args.text !== 'string'
    ) {
      return Promise.resolve({
        ok: false as const,
        code: 'invalid-input' as const,
        message: 'Invalid todo input.'
      })
    }
    return addObsidianDailyTodoToNote(args)
  })
  ipcMain.handle('obsidianDailyTodos:updateText', (_event, args: ObsidianDailyTodoTextUpdate) => {
    if (!hasValidTodoTarget(args) || typeof args.text !== 'string') {
      return invalidInput('Invalid todo text update.')
    }
    return updateObsidianDailyTodoTextInNote(args)
  })
  ipcMain.handle(
    'obsidianDailyTodos:saveWorkRecord',
    (_event, args: ObsidianDailyWorkRecordSaveInput) => {
      if (
        !hasValidTodoTarget(args) ||
        typeof args.body !== 'string' ||
        (args.expectedBody !== null && typeof args.expectedBody !== 'string')
      ) {
        return invalidInput('Invalid work record update.')
      }
      return saveObsidianDailyWorkRecordToNote(args)
    }
  )

  ipcMain.handle('obsidianDailyTodos:candidates:list', () => candidateService.list())
  ipcMain.handle(
    'obsidianDailyTodos:candidates:analyzeText',
    (_event, args: ObsidianDailyTodoCandidateAnalyzeInput) => {
      if (
        !args ||
        typeof args.directory !== 'string' ||
        typeof args.filePath !== 'string' ||
        typeof args.sourceText !== 'string'
      ) {
        return candidateInvalidInput('Invalid candidate analysis input.')
      }
      return candidateService.analyzeText(args)
    }
  )
  ipcMain.handle(
    'obsidianDailyTodos:candidates:update',
    (_event, args: ObsidianDailyTodoCandidateUpdateInput) => {
      if (!args || typeof args.candidateId !== 'string') {
        return candidateInvalidInput('Invalid candidate update input.')
      }
      return candidateService.update(args)
    }
  )
  ipcMain.handle(
    'obsidianDailyTodos:candidates:accept',
    (_event, args: ObsidianDailyTodoCandidateAcceptInput) => {
      if (
        !args ||
        typeof args.directory !== 'string' ||
        typeof args.filePath !== 'string' ||
        typeof args.candidateId !== 'string'
      ) {
        return candidateInvalidInput('Invalid candidate accept input.')
      }
      return candidateService.accept(args)
    }
  )
  ipcMain.handle(
    'obsidianDailyTodos:candidates:dismiss',
    (_event, args: ObsidianDailyTodoCandidateDismissInput) => {
      if (!args || typeof args.candidateId !== 'string') {
        return candidateInvalidInput('Invalid candidate dismiss input.')
      }
      return candidateService.dismiss(args)
    }
  )
}

function hasValidTodoTarget(
  args: ObsidianDailyTodoTextUpdate | ObsidianDailyWorkRecordSaveInput
): boolean {
  return Boolean(
    args &&
    typeof args.directory === 'string' &&
    typeof args.filePath === 'string' &&
    args.todo &&
    typeof args.todo.rawLine === 'string' &&
    Number.isInteger(args.todo.lineNumber)
  )
}

function invalidInput(message: string): Promise<{
  ok: false
  code: 'invalid-input'
  message: string
}> {
  return Promise.resolve({ ok: false, code: 'invalid-input', message })
}

function candidateInvalidInput(message: string): Promise<{
  ok: false
  code: 'invalid-input'
  message: string
}> {
  return Promise.resolve({ ok: false, code: 'invalid-input', message })
}
