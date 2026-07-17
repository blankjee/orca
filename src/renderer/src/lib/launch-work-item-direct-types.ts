import type { LinkedWorkItemContext } from '@/lib/linked-work-item-context'
import type { TuiAgent, WorkspaceCreateTelemetrySource } from '../../../shared/types'
import type { LaunchSource } from '../../../shared/telemetry-events'
import type { WorkspaceIntentWorkItem } from '../../../shared/workspace-name'

export type LaunchableWorkItem = {
  // Why: local shortcut sources such as Obsidian do not represent work items
  // and must never enter workspace-creation flows.
  provider?: WorkspaceIntentWorkItem['provider']
  title: string
  url: string
  type: 'issue' | 'pr' | 'mr'
  number: number | null
  repoId?: string
  branchName?: string
  baseRefName?: string
  isCrossRepository?: boolean
  pasteContent?: string
  linearIdentifier?: string
  linearWorkspaceId?: string
  linearOrganizationUrlKey?: string
  linkedContext?: LinkedWorkItemContext
}

export type LaunchWorkItemDirectArgs = {
  item: LaunchableWorkItem
  repoId: string
  openModalFallback: () => void
  baseBranch?: string
  launchSource: LaunchSource
  telemetrySource?: WorkspaceCreateTelemetrySource
  agentOverride?: TuiAgent
  agentArgs?: string | null
  promptDelivery?: 'draft' | 'submit-after-ready'
  launchPlatform?: NodeJS.Platform
}
