import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockActivateAndRevealWorktree = vi.fn()
const mockFocusTerminalTabSurface = vi.fn()
const mockLaunchAgentInNewTab = vi.fn()
const mockGetConnectionIdFromState = vi.fn()
const mockGetRuntimeEnvironmentIdForWorktree = vi.fn()
const mockEnsureDetectedAgents = vi.fn()
const mockEnsureRemoteDetectedAgents = vi.fn()
const mockEnsureRuntimeDetectedAgents = vi.fn()

const todo = {
  id: 'todo-1',
  text: 'Ship the retry fix',
  status: 'pending' as const,
  lineNumber: 12,
  rawLine: '- [ ] Ship the retry fix',
  group: 'Follow up',
  priority: 'P1' as const,
  depth: 0,
  parentId: null,
  timeText: '15:00'
}

const worktree = {
  id: 'repo-1::/worktree',
  repoId: 'repo-1',
  displayName: 'retry-fix',
  path: '/worktree'
}

const store = {
  settings: {
    defaultTuiAgent: 'codex' as const,
    disabledTuiAgents: []
  },
  allWorktrees: vi.fn(() => [worktree]),
  ensureDetectedAgents: mockEnsureDetectedAgents,
  ensureRemoteDetectedAgents: mockEnsureRemoteDetectedAgents,
  ensureRuntimeDetectedAgents: mockEnsureRuntimeDetectedAgents
}

vi.mock('@/store', () => ({
  useAppStore: { getState: () => store }
}))

vi.mock('@/lib/worktree-activation', () => ({
  activateAndRevealWorktree: mockActivateAndRevealWorktree
}))

vi.mock('@/lib/focus-terminal-tab-surface', () => ({
  focusTerminalTabSurface: mockFocusTerminalTabSurface
}))

vi.mock('@/lib/launch-agent-in-new-tab', () => ({
  launchAgentInNewTab: mockLaunchAgentInNewTab
}))

vi.mock('@/lib/connection-context', () => ({
  getConnectionIdFromState: mockGetConnectionIdFromState
}))

vi.mock('@/lib/worktree-runtime-owner', () => ({
  getRuntimeEnvironmentIdForWorktree: mockGetRuntimeEnvironmentIdForWorktree
}))

describe('Obsidian Todo agent launch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.settings.defaultTuiAgent = 'codex'
    store.settings.disabledTuiAgents = []
    store.allWorktrees.mockReturnValue([worktree])
    mockGetConnectionIdFromState.mockReturnValue(null)
    mockGetRuntimeEnvironmentIdForWorktree.mockReturnValue(null)
    mockEnsureDetectedAgents.mockResolvedValue(['claude', 'codex'])
    mockEnsureRemoteDetectedAgents.mockResolvedValue([])
    mockEnsureRuntimeDetectedAgents.mockResolvedValue([])
    mockActivateAndRevealWorktree.mockReturnValue({ primaryTabId: null })
    mockLaunchAgentInNewTab.mockReturnValue({ tabId: 'tab-ai' })
  })

  it('builds an autonomous analysis and execution prompt with Todo context', async () => {
    const { buildObsidianTodoAgentPrompt } = await import('./obsidian-todo-agent-launch')

    const prompt = buildObsidianTodoAgentPrompt({
      todo,
      dailyNotePath: '/notes/2026-07-20.md',
      dailyNoteDate: '2026-07-20'
    })

    expect(prompt).toContain('"task": "Ship the retry fix"')
    expect(prompt).toContain('"group": "Follow up"')
    expect(prompt).toContain('AI-closable, AI-assisted, or human-only')
    expect(prompt).toContain('continue immediately without waiting for confirmation')
    expect(prompt).toContain(
      'Only report completion when the requested outcome is actually verified'
    )
  })

  it('launches the configured default agent in a new tab and submits the prompt', async () => {
    const { launchObsidianTodoAgent } = await import('./obsidian-todo-agent-launch')

    const result = await launchObsidianTodoAgent({
      todo,
      worktreeId: worktree.id,
      dailyNotePath: '/notes/2026-07-20.md',
      dailyNoteDate: '2026-07-20'
    })

    expect(result).toEqual({ ok: true, agent: 'codex', tabId: 'tab-ai' })
    expect(mockEnsureDetectedAgents).toHaveBeenCalledOnce()
    expect(mockActivateAndRevealWorktree).toHaveBeenCalledWith(worktree.id)
    expect(mockLaunchAgentInNewTab).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'codex',
        worktreeId: worktree.id,
        promptDelivery: 'submit-after-ready',
        launchSource: 'task_page',
        quickCommandLabel: 'AI · Ship the retry fix'
      })
    )
    expect(mockFocusTerminalTabSurface).toHaveBeenCalledWith('tab-ai')
  })

  it('launches the agent explicitly selected on the Todo start page', async () => {
    const { launchObsidianTodoAgent } = await import('./obsidian-todo-agent-launch')

    const result = await launchObsidianTodoAgent({
      todo,
      worktreeId: worktree.id,
      dailyNotePath: null,
      dailyNoteDate: null,
      agent: 'claude'
    })

    expect(result).toEqual({ ok: true, agent: 'claude', tabId: 'tab-ai' })
    expect(mockLaunchAgentInNewTab).toHaveBeenCalledWith(
      expect.objectContaining({ agent: 'claude' })
    )
  })

  it('refuses to replace an unavailable explicit agent with a silent fallback', async () => {
    mockEnsureDetectedAgents.mockResolvedValue(['codex'])
    const { launchObsidianTodoAgent } = await import('./obsidian-todo-agent-launch')

    const result = await launchObsidianTodoAgent({
      todo,
      worktreeId: worktree.id,
      dailyNotePath: null,
      dailyNoteDate: null,
      agent: 'claude'
    })

    expect(result).toEqual({ ok: false, reason: 'agent-unavailable' })
    expect(mockActivateAndRevealWorktree).not.toHaveBeenCalled()
    expect(mockLaunchAgentInNewTab).not.toHaveBeenCalled()
  })

  it('detects agents on the SSH host and falls back when the preferred agent is absent', async () => {
    mockGetConnectionIdFromState.mockReturnValue('ssh-1')
    mockEnsureRemoteDetectedAgents.mockResolvedValue(['claude'])
    const { launchObsidianTodoAgent } = await import('./obsidian-todo-agent-launch')

    const result = await launchObsidianTodoAgent({
      todo,
      worktreeId: worktree.id,
      dailyNotePath: null,
      dailyNoteDate: null
    })

    expect(result).toEqual({ ok: true, agent: 'claude', tabId: 'tab-ai' })
    expect(mockEnsureRemoteDetectedAgents).toHaveBeenCalledWith('ssh-1')
    expect(mockEnsureDetectedAgents).not.toHaveBeenCalled()
  })

  it('does not switch workspaces when no enabled agent is available', async () => {
    mockEnsureDetectedAgents.mockResolvedValue([])
    const { launchObsidianTodoAgent } = await import('./obsidian-todo-agent-launch')

    const result = await launchObsidianTodoAgent({
      todo,
      worktreeId: worktree.id,
      dailyNotePath: null,
      dailyNoteDate: null
    })

    expect(result).toEqual({ ok: false, reason: 'agent-unavailable' })
    expect(mockActivateAndRevealWorktree).not.toHaveBeenCalled()
    expect(mockLaunchAgentInNewTab).not.toHaveBeenCalled()
  })
})
