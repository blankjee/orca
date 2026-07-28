import React, { useEffect, useMemo, useState } from 'react'
import { Check, FolderGit2, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { resolveDefaultAgentForNewTab } from '@/lib/agent-tab-shortcuts'
import { AgentIcon, getAgentCatalog } from '@/lib/agent-catalog'
import {
  detectObsidianTodoWorkspaceAgents,
  getObsidianTodoAgentDisplayName,
  launchObsidianTodoAgent,
  type ObsidianTodoAgentLaunchFailure
} from '@/lib/obsidian-todo-agent-launch'
import { useAppStore } from '@/store'
import { filterEnabledTuiAgents } from '../../../shared/tui-agent-selection'
import type {
  ObsidianDailyTodoItem,
  ObsidianDailyTodoSnapshot
} from '../../../shared/obsidian-daily-todo'
import type { Repo, TuiAgent, Worktree } from '../../../shared/types'
import { getObsidianTodoDisplayText } from './obsidian-daily-todo-presentation'

type WorkspaceOption = {
  id: string
  name: string
  path: string
  repoName: string
  active: boolean
}

type WorkspaceGroup = {
  id: string
  name: string
  options: WorkspaceOption[]
}

const EMPTY_TUI_AGENTS: readonly TuiAgent[] = []

export function ObsidianTodoAgentLaunchDialog({
  todo,
  snapshot,
  open,
  onOpenChange
}: {
  todo: ObsidianDailyTodoItem | null
  snapshot: ObsidianDailyTodoSnapshot | null
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const repos = useAppStore((state) => state.repos)
  const worktreesByRepo = useAppStore((state) => state.worktreesByRepo)
  const activeWorktreeId = useAppStore((state) => state.activeWorktreeId)
  const defaultAgent = useAppStore((state) => state.settings?.defaultTuiAgent ?? null)
  const disabledAgents =
    useAppStore((state) => state.settings?.disabledTuiAgents) ?? EMPTY_TUI_AGENTS
  const [selectedWorktreeId, setSelectedWorktreeId] = useState<string | null>(null)
  const [detectedAgentIds, setDetectedAgentIds] = useState<TuiAgent[] | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<TuiAgent | null>(null)
  const [detectingAgents, setDetectingAgents] = useState(false)
  const [launching, setLaunching] = useState(false)
  const groups = useMemo(
    () => buildWorkspaceGroups(repos, worktreesByRepo, activeWorktreeId),
    [activeWorktreeId, repos, worktreesByRepo]
  )
  const options = useMemo(() => groups.flatMap((group) => group.options), [groups])
  const optionIds = options.map((option) => option.id).join('\u0000')
  const preferredWorktreeId = options.find((option) => option.active)?.id ?? options[0]?.id ?? null
  const selectedWorkspace = options.find((option) => option.id === selectedWorktreeId) ?? null
  const availableAgents = useMemo(() => {
    const enabledIds = new Set(filterEnabledTuiAgents(detectedAgentIds ?? [], disabledAgents))
    return getAgentCatalog().filter((agent) => enabledIds.has(agent.id))
  }, [detectedAgentIds, disabledAgents])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedWorktreeId(preferredWorktreeId)
    setLaunching(false)
    // Why: reset to the active workspace for every Todo while still reacting
    // when hydration changes the available workspace ids under an open dialog.
  }, [activeWorktreeId, open, optionIds, preferredWorktreeId, todo?.id])

  useEffect(() => {
    if (!open || !selectedWorktreeId) {
      setDetectedAgentIds(null)
      setSelectedAgent(null)
      setDetectingAgents(false)
      return
    }
    let cancelled = false
    setDetectedAgentIds(null)
    setSelectedAgent(null)
    setDetectingAgents(true)
    // Why: agent PATH and availability belong to the selected workspace host,
    // so changing local/SSH/runtime targets must trigger host-scoped detection.
    void detectObsidianTodoWorkspaceAgents(selectedWorktreeId)
      .then((agents) => {
        if (cancelled) {
          return
        }
        setDetectedAgentIds(agents)
        setSelectedAgent(
          resolveDefaultAgentForNewTab({
            defaultTuiAgent: defaultAgent,
            detectedAgentIds: agents,
            disabledTuiAgents: disabledAgents
          })
        )
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to detect agents for Obsidian Todo', error)
          setDetectedAgentIds([])
          setSelectedAgent(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetectingAgents(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [defaultAgent, disabledAgents, open, selectedWorktreeId])

  const start = async (): Promise<void> => {
    if (!todo || !selectedWorktreeId || !selectedAgent || launching) {
      return
    }
    setLaunching(true)
    const result = await launchObsidianTodoAgent({
      todo,
      worktreeId: selectedWorktreeId,
      dailyNotePath: snapshot?.filePath ?? null,
      dailyNoteDate: snapshot?.date ?? null,
      agent: selectedAgent
    }).catch((error) => {
      console.error('Failed to launch Obsidian Todo agent', error)
      return { ok: false, reason: 'launch-failed' } as const
    })
    if (!result.ok) {
      toast.error(getLaunchFailureMessage(result.reason))
      setLaunching(false)
      return
    }
    toast.success(
      translate(
        'auto.components.ObsidianTodoAgentLaunchDialog.started',
        'Started {{value0}} in {{value1}}.',
        {
          value0: getObsidianTodoAgentDisplayName(result.agent),
          value1: selectedWorkspace?.name ?? selectedWorktreeId
        }
      )
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open && Boolean(todo)} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-0 gap-5 overflow-hidden sm:max-w-xl">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-obsidian-daily-compose-accent" />
            {translate(
              'auto.components.ObsidianTodoAgentLaunchDialog.title',
              'Analyze and execute Todo'
            )}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.ObsidianTodoAgentLaunchDialog.description',
              'The agent will break down the task, judge whether AI can close or assist it, and continue automatically when it can.'
            )}
          </DialogDescription>
        </DialogHeader>

        {todo ? (
          <div className="min-w-0 rounded-md border border-border bg-muted/35 px-3 py-2.5">
            <p className="break-words text-sm font-medium">
              {getObsidianTodoDisplayText(todo.text)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[todo.group, todo.priority, todo.timeText].filter(Boolean).join(' · ')}
            </p>
          </div>
        ) : null}

        <div className="min-w-0 space-y-2">
          <div className="min-w-0 space-y-1">
            <Label>
              {translate('auto.components.ObsidianTodoAgentLaunchDialog.workspace', 'Workspace')}
            </Label>
          </div>
          <Command className="h-[min(20rem,42vh)] min-w-0 rounded-lg border border-border bg-card">
            <CommandInput
              autoFocus
              placeholder={translate(
                'auto.components.ObsidianTodoAgentLaunchDialog.searchWorkspace',
                'Search workspaces…'
              )}
            />
            <CommandList className="min-w-0">
              <CommandEmpty>
                {options.length === 0
                  ? translate(
                      'auto.components.ObsidianTodoAgentLaunchDialog.noWorkspaces',
                      'No available workspaces. Add or open a workspace first.'
                    )
                  : translate(
                      'auto.components.ObsidianTodoAgentLaunchDialog.noWorkspaceMatches',
                      'No matching workspace.'
                    )}
              </CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.id} heading={group.name} className="min-w-0">
                  {group.options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={`${option.repoName} ${option.name} ${option.path}`}
                      onSelect={() => setSelectedWorktreeId(option.id)}
                      className="min-w-0 items-start py-2"
                    >
                      <FolderGit2 className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{option.name}</span>
                          {option.active ? (
                            <span className="text-[11px] text-muted-foreground">
                              {translate(
                                'auto.components.ObsidianTodoAgentLaunchDialog.current',
                                'Current'
                              )}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {option.path}
                        </p>
                      </div>
                      <Check
                        className={
                          option.id === selectedWorktreeId
                            ? 'mt-0.5 size-4 text-obsidian-daily-compose-accent'
                            : 'mt-0.5 size-4 opacity-0'
                        }
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>

        <div className="min-w-0 space-y-2">
          <Label>{translate('auto.components.ObsidianTodoAgentLaunchDialog.agent', 'Agent')}</Label>
          {detectingAgents ? (
            <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {translate(
                'auto.components.ObsidianTodoAgentLaunchDialog.detectingAgents',
                'Detecting agents on this workspace host…'
              )}
            </div>
          ) : availableAgents.length > 0 ? (
            <Select
              value={selectedAgent ?? undefined}
              onValueChange={(value) => setSelectedAgent(value as TuiAgent)}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={translate(
                    'auto.components.ObsidianTodoAgentLaunchDialog.selectAgent',
                    'Select an agent'
                  )}
                />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {availableAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <AgentIcon agent={agent.id} />
                    {agent.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
              {translate(
                'auto.components.ObsidianTodoAgentLaunchDialog.noAgents',
                'No enabled agents were detected on this workspace host.'
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.ObsidianTodoAgentLaunchDialog.agentHint',
              'Your configured default is preselected when it is available.'
            )}
          </p>
        </div>

        <DialogFooter className="min-w-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {translate('auto.components.ObsidianTodoAgentLaunchDialog.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            className="min-w-40"
            disabled={
              !todo || !selectedWorktreeId || !selectedAgent || detectingAgents || launching
            }
            onClick={() => void start()}
          >
            {launching ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {launching
              ? translate('auto.components.ObsidianTodoAgentLaunchDialog.starting', 'Starting…')
              : translate(
                  'auto.components.ObsidianTodoAgentLaunchDialog.start',
                  'Analyze & execute'
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function buildWorkspaceGroups(
  repos: readonly Repo[],
  worktreesByRepo: Record<string, Worktree[]>,
  activeWorktreeId: string | null
): WorkspaceGroup[] {
  return repos.flatMap((repo) => {
    const options = (worktreesByRepo[repo.id] ?? [])
      .filter((worktree) => !worktree.isArchived)
      .map((worktree) => ({
        id: worktree.id,
        name: worktree.displayName,
        path: worktree.path,
        repoName: repo.displayName,
        active: worktree.id === activeWorktreeId
      }))
    return options.length > 0 ? [{ id: repo.id, name: repo.displayName, options }] : []
  })
}

function getLaunchFailureMessage(reason: ObsidianTodoAgentLaunchFailure): string {
  switch (reason) {
    case 'workspace-not-found':
      return translate(
        'auto.components.ObsidianTodoAgentLaunchDialog.workspaceMissing',
        'The selected workspace is no longer available.'
      )
    case 'agent-unavailable':
      return translate(
        'auto.components.ObsidianTodoAgentLaunchDialog.agentUnavailable',
        'No enabled AI agent was detected on the selected workspace host.'
      )
    case 'activation-failed':
      return translate(
        'auto.components.ObsidianTodoAgentLaunchDialog.activationFailed',
        'Orca could not open the selected workspace.'
      )
    case 'launch-failed':
      return translate(
        'auto.components.ObsidianTodoAgentLaunchDialog.launchFailed',
        'Orca could not build the default agent launch command.'
      )
  }
}
