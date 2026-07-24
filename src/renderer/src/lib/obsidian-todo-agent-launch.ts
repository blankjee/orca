import { getConnectionIdFromState } from '@/lib/connection-context'
import { focusTerminalTabSurface } from '@/lib/focus-terminal-tab-surface'
import { resolveDefaultAgentForNewTab } from '@/lib/agent-tab-shortcuts'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import { useAppStore } from '@/store'
import { TUI_AGENT_DISPLAY_NAMES } from '../../../shared/tui-agent-display-names'
import { isTuiAgentEnabled } from '../../../shared/tui-agent-selection'
import type { ObsidianDailyTodoItem } from '../../../shared/obsidian-daily-todo'
import type { TuiAgent } from '../../../shared/types'

export type ObsidianTodoAgentLaunchFailure =
  | 'workspace-not-found'
  | 'agent-unavailable'
  | 'activation-failed'
  | 'launch-failed'

export type ObsidianTodoAgentLaunchResult =
  | { ok: true; agent: TuiAgent; tabId: string | null }
  | { ok: false; reason: ObsidianTodoAgentLaunchFailure }

type ObsidianTodoAgentLaunchInput = {
  todo: ObsidianDailyTodoItem
  worktreeId: string
  dailyNotePath: string | null
  dailyNoteDate: string | null
  agent?: TuiAgent
}

export function buildObsidianTodoAgentPrompt(
  input: Pick<ObsidianTodoAgentLaunchInput, 'todo' | 'dailyNotePath' | 'dailyNoteDate'>
): string {
  const context = {
    task: input.todo.text.trim(),
    group: input.todo.group,
    priority: input.todo.priority,
    scheduledTime: input.todo.timeText,
    dailyNoteDate: input.dailyNoteDate,
    // Why: a selected SSH/runtime workspace cannot necessarily read this local path.
    sourceNotePathForReferenceOnly: input.dailyNotePath
  }

  return [
    "You are executing a Todo selected from Orca's Obsidian daily-note panel.",
    'The selected Orca workspace is already your working directory.',
    '',
    'Todo context (JSON):',
    JSON.stringify(context, null, 2),
    '',
    'Required workflow:',
    '1. Inspect the workspace and restate the concrete outcome this Todo requires.',
    '2. Break the work into actionable steps, identify dependencies, risks, and validation.',
    '3. Classify the Todo as AI-closable, AI-assisted, or human-only, and briefly explain why.',
    '4. If it is AI-closable or AI-assisted, continue immediately without waiting for confirmation. Perform every safe, in-scope step you can, validate the result, and iterate on failures.',
    '5. If it is human-only, stop before irreversible or external side effects and report the exact human input or action required.',
    '6. Keep normal safety and authorization boundaries. Do not expand the task beyond the Todo and selected workspace.',
    '7. Finish with the classification, work completed, validation performed, and any remaining human steps.',
    '',
    'Do not mark the original Obsidian checkbox complete merely because analysis started. Only report completion when the requested outcome is actually verified.'
  ].join('\n')
}

export function buildObsidianTodoAgentTabLabel(todo: ObsidianDailyTodoItem): string {
  const normalized = todo.text.replace(/\s+/g, ' ').trim()
  const clipped = normalized.length > 38 ? `${normalized.slice(0, 37)}…` : normalized
  return `AI · ${clipped}`
}

export async function launchObsidianTodoAgent(
  input: ObsidianTodoAgentLaunchInput
): Promise<ObsidianTodoAgentLaunchResult> {
  const initialStore = useAppStore.getState()
  if (!initialStore.allWorktrees().some((worktree) => worktree.id === input.worktreeId)) {
    return { ok: false, reason: 'workspace-not-found' }
  }

  const detectedAgentIds = await detectObsidianTodoWorkspaceAgents(input.worktreeId)
  const latestStore = useAppStore.getState()
  if (!latestStore.allWorktrees().some((worktree) => worktree.id === input.worktreeId)) {
    return { ok: false, reason: 'workspace-not-found' }
  }
  const agent = input.agent
    ? detectedAgentIds.includes(input.agent) &&
      isTuiAgentEnabled(input.agent, latestStore.settings?.disabledTuiAgents)
      ? input.agent
      : null
    : resolveDefaultAgentForNewTab({
        defaultTuiAgent: latestStore.settings?.defaultTuiAgent,
        detectedAgentIds,
        disabledTuiAgents: latestStore.settings?.disabledTuiAgents
      })
  if (!agent) {
    return { ok: false, reason: 'agent-unavailable' }
  }

  if (!activateAndRevealWorktree(input.worktreeId)) {
    return { ok: false, reason: 'activation-failed' }
  }

  // Why: generated Todo prompts must be submitted after readiness so multiline
  // content never passes through shell argv and the agent can continue autonomously.
  const launch = launchAgentInNewTab({
    agent,
    worktreeId: input.worktreeId,
    prompt: buildObsidianTodoAgentPrompt(input),
    promptDelivery: 'submit-after-ready',
    launchSource: 'task_page',
    quickCommandLabel: buildObsidianTodoAgentTabLabel(input.todo)
  })
  if (!launch) {
    return { ok: false, reason: 'launch-failed' }
  }
  if (launch.tabId) {
    focusTerminalTabSurface(launch.tabId)
  }
  return { ok: true, agent, tabId: launch.tabId }
}

export function getObsidianTodoAgentDisplayName(agent: TuiAgent): string {
  return TUI_AGENT_DISPLAY_NAMES[agent]
}

export async function detectObsidianTodoWorkspaceAgents(worktreeId: string): Promise<TuiAgent[]> {
  const store = useAppStore.getState()
  const runtimeEnvironmentId = getRuntimeEnvironmentIdForWorktree(store, worktreeId)
  if (runtimeEnvironmentId) {
    return await store.ensureRuntimeDetectedAgents(runtimeEnvironmentId)
  }
  const connectionId = getConnectionIdFromState(store, worktreeId)
  if (connectionId) {
    return await store.ensureRemoteDetectedAgents(connectionId)
  }
  return await store.ensureDetectedAgents()
}
