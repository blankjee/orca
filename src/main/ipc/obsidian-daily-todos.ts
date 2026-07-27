import { ipcMain, systemPreferences } from 'electron'

import {
  addObsidianDailyTodoToNote,
  deleteObsidianDailyTodoFromNote,
  loadObsidianDailyTodos,
  saveObsidianDailyWorkRecordToNote,
  setObsidianDailyTodoStatus,
  updateObsidianDailyTodoPriorityInNote,
  updateObsidianDailyTodoTextInNote
} from '../obsidian-daily-todo-service'
import {
  isObsidianDailyTodoStatus,
  type ObsidianDailyTodoAddInput,
  type ObsidianDailyTodoStatusUpdate
} from '../../shared/obsidian-daily-todo'
import type { ObsidianDailyTodoTextUpdate } from '../../shared/obsidian-daily-todo-text'
import type {
  ObsidianDailyTodoDeleteInput,
  ObsidianDailyTodoPriorityUpdate
} from '../../shared/obsidian-daily-todo-mutation'
import type { ObsidianDailyWorkRecordSaveInput } from '../../shared/obsidian-daily-work-record'
import type { ObsidianWorkRecordLinkResolveInput } from '../../shared/obsidian-work-record-link'
import {
  ObsidianDailyTodoCandidateService,
  readCandidateAnalyzerConfig
} from '../obsidian-daily-todo-candidate-service'
import { ObsidianDailyTodoCandidateMonitorController } from '../obsidian-daily-todo-candidate-monitor'
import { resolveObsidianWorkRecordLinkTitles } from '../obsidian-work-record-link-title'
import type { Store } from '../persistence'
import { loadObsidianDailyTodoAnalytics } from '../obsidian-daily-todo-analytics-service'
import type {
  ObsidianDailyTodoCandidateAcceptInput,
  ObsidianDailyTodoCandidateAnalyzeInput,
  ObsidianDailyTodoCandidateDismissInput,
  ObsidianDailyTodoCandidateMonitorStartInput,
  ObsidianDailyTodoCandidateUpdateInput
} from '../../shared/obsidian-daily-todo-candidate'
import { registerObsidianDailyTodoFocusHandlers } from './obsidian-daily-todo-focus'
import { normalizeObsidianAiCaptureSettings } from '../../shared/obsidian-ai-capture-settings'

export function registerObsidianDailyTodoHandlers(store: Pick<Store, 'getSettings'>): void {
  registerObsidianDailyTodoFocusHandlers()
  const candidateService = new ObsidianDailyTodoCandidateService({
    // Why: read on every analysis so saving Settings takes effect without an app restart.
    analyzerConfig: () => readCandidateAnalyzerConfig(store.getSettings().obsidianAiCapture)
  })
  const candidateMonitor = new ObsidianDailyTodoCandidateMonitorController(candidateService, {
    // Why: the reader consults persisted settings on every poll so whitelist
    // changes take effect immediately without restarting an active monitor.
    allowedBundleIds: () =>
      normalizeObsidianAiCaptureSettings(store.getSettings().obsidianAiCapture)
        .monitorAllowedBundleIds,
    ignoredPhrases: () =>
      normalizeObsidianAiCaptureSettings(store.getSettings().obsidianAiCapture)
        .monitorIgnoredPhrases
  })
  ipcMain.handle(
    'obsidianDailyTodos:analytics',
    (_event, args: { directory?: unknown; year?: unknown; refresh?: unknown }) => {
      if (
        typeof args?.directory !== 'string' ||
        !Number.isInteger(args?.year) ||
        Number(args.year) < 1970 ||
        Number(args.year) > 9999
      ) {
        return invalidInput('Invalid Todo analytics input.')
      }
      return loadObsidianDailyTodoAnalytics(
        args.directory,
        Number(args.year),
        args.refresh === true
      )
    }
  )
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
    'obsidianDailyTodos:updatePriority',
    (_event, args: ObsidianDailyTodoPriorityUpdate) => {
      if (!hasValidTodoTarget(args) || !['P1', 'P2', 'P3'].includes(args.priority)) {
        return invalidInput('Invalid todo priority update.')
      }
      return updateObsidianDailyTodoPriorityInNote(args)
    }
  )
  ipcMain.handle('obsidianDailyTodos:delete', (_event, args: ObsidianDailyTodoDeleteInput) => {
    if (!hasValidTodoTarget(args)) {
      return invalidInput('Invalid todo deletion.')
    }
    return deleteObsidianDailyTodoFromNote(args)
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
  ipcMain.handle(
    'obsidianDailyTodos:resolveWorkRecordLinks',
    (_event, args: ObsidianWorkRecordLinkResolveInput) => {
      if (
        !args ||
        !Array.isArray(args.urls) ||
        args.urls.length > 12 ||
        args.urls.some((url) => typeof url !== 'string' || url.length > 2_048)
      ) {
        return Promise.resolve({ links: [] })
      }
      return resolveObsidianWorkRecordLinkTitles(args)
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
    'obsidianDailyTodos:candidates:monitor:start',
    (event, args: ObsidianDailyTodoCandidateMonitorStartInput) => {
      if (!args || typeof args.directory !== 'string' || typeof args.filePath !== 'string') {
        return {
          ok: false as const,
          code: 'invalid-input' as const,
          message: 'Invalid monitor input.'
        }
      }
      if (process.platform === 'darwin' && !systemPreferences.isTrustedAccessibilityClient(false)) {
        return {
          ok: false as const,
          code: 'accessibility-permission-required' as const,
          message:
            'Todo 监听需要 macOS 辅助功能权限。请在“系统设置 → 隐私与安全性 → 辅助功能”中允许 Orca，然后重新开启监听。'
        }
      }
      return candidateMonitor.start(args, event.sender)
    }
  )
  ipcMain.handle('obsidianDailyTodos:candidates:monitor:stop', () => candidateMonitor.stop())
  ipcMain.handle('obsidianDailyTodos:candidates:monitor:status', () => candidateMonitor.status())
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
  args:
    | ObsidianDailyTodoTextUpdate
    | ObsidianDailyWorkRecordSaveInput
    | ObsidianDailyTodoDeleteInput
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
