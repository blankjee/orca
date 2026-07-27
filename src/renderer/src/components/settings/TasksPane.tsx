import { Check, FolderOpen, Github, Gitlab, NotebookPen } from 'lucide-react'
import type { GlobalSettings, TaskProvider } from '../../../../shared/types'
import {
  TASK_PROVIDERS,
  normalizeVisibleTaskProviders,
  resolveVisibleTaskProvider
} from '../../../../shared/task-providers'
import { cn } from '@/lib/utils'
import { JiraIcon } from '@/components/icons/JiraIcon'
import { LinearIcon } from '@/components/icons/LinearIcon'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { SearchableSetting } from './SearchableSetting'
import { SettingsSubsectionHeader } from './SettingsFormControls'
import { translate } from '@/i18n/i18n'
import { ObsidianAiCaptureSettingsSection } from './ObsidianAiCaptureSettingsSection'
import { normalizeObsidianAiCaptureSettings } from '../../../../shared/obsidian-ai-capture-settings'

type TasksPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

const TASK_PROVIDER_OPTIONS: readonly {
  id: TaskProvider
  label: string
  description: string
  Icon: (props: { className?: string }) => React.JSX.Element
}[] = [
  {
    id: 'github',
    get label() {
      return translate('auto.components.settings.TasksPane.e14063e727', 'GitHub')
    },
    get description() {
      return translate(
        'auto.components.settings.TasksPane.1db47236cd',
        'Show GitHub in the Tasks source picker and sidebar shortcuts.'
      )
    },
    Icon: ({ className }) => <Github className={className} />
  },
  {
    id: 'gitlab',
    get label() {
      return translate('auto.components.settings.TasksPane.7c5d7fdc20', 'GitLab')
    },
    get description() {
      return translate(
        'auto.components.settings.TasksPane.dd67a1b6e1',
        'Show GitLab in the Tasks source picker and sidebar shortcuts.'
      )
    },
    Icon: ({ className }) => <Gitlab className={className} />
  },
  {
    id: 'linear',
    get label() {
      return translate('auto.components.settings.TasksPane.09ae2d7c51', 'Linear')
    },
    get description() {
      return translate(
        'auto.components.settings.TasksPane.e4170c9615',
        'Show Linear in the Tasks source picker and sidebar shortcuts.'
      )
    },
    Icon: ({ className }) => <LinearIcon className={className} />
  },
  {
    id: 'jira',
    get label() {
      return translate('auto.components.settings.TasksPane.6b23a34f6d', 'Jira')
    },
    get description() {
      return translate(
        'auto.components.settings.TasksPane.8e1305fcc6',
        'Show Jira in the Tasks source picker and sidebar shortcuts.'
      )
    },
    Icon: ({ className }) => <JiraIcon className={className} />
  },
  {
    id: 'obsidian',
    get label() {
      return translate('auto.components.settings.TasksPane.obsidianLabel', 'Obsidian')
    },
    get description() {
      return translate(
        'auto.components.settings.TasksPane.obsidianDescription',
        'Track local Obsidian Markdown todos in the Tasks page.'
      )
    },
    Icon: ({ className }) => <NotebookPen className={className} />
  }
]

export function TasksPane({ settings, updateSettings }: TasksPaneProps): React.JSX.Element {
  const visibleProviders = normalizeVisibleTaskProviders(settings.visibleTaskProviders)

  const chooseObsidianDailyNotesDirectory = async (): Promise<void> => {
    const selected = await window.api.shell.pickDirectory({
      defaultPath: settings.obsidianDailyNotesDirectory || undefined
    })
    if (selected) {
      updateSettings({ obsidianDailyNotesDirectory: selected })
    }
  }

  const toggleProvider = (provider: TaskProvider): void => {
    const isVisible = visibleProviders.includes(provider)
    if (isVisible && visibleProviders.length === 1) {
      return
    }

    const nextProviders = isVisible
      ? visibleProviders.filter((entry) => entry !== provider)
      : TASK_PROVIDERS.filter((entry) => entry === provider || visibleProviders.includes(entry))

    updateSettings({
      visibleTaskProviders: nextProviders,
      defaultTaskSource: resolveVisibleTaskProvider(settings.defaultTaskSource, nextProviders)
    })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SettingsSubsectionHeader
          title={translate('auto.components.settings.TasksPane.93e72ef659', 'Task Sources')}
          description={translate(
            'auto.components.settings.TasksPane.71644aba56',
            'Choose which task providers appear in the Tasks page source picker and sidebar shortcuts. At least one provider must stay visible.'
          )}
        />

        <SearchableSetting
          title={translate('auto.components.settings.TasksPane.f71d8a9dd3', 'Task Providers')}
          description={translate(
            'auto.components.settings.TasksPane.3a72b9745e',
            'Choose which task providers appear in the Tasks page and sidebar shortcuts.'
          )}
          keywords={[
            'tasks',
            'provider',
            'source',
            'github',
            'gitlab',
            'linear',
            'jira',
            'atlassian',
            'obsidian',
            'daily notes',
            'vault',
            'display',
            'hide'
          ]}
          className="grid gap-2 py-2"
        >
          {TASK_PROVIDER_OPTIONS.map((option) => {
            const enabled = visibleProviders.includes(option.id)
            const isLastEnabled = enabled && visibleProviders.length === 1
            const Icon = option.Icon

            return (
              <button
                key={option.id}
                type="button"
                role="checkbox"
                aria-checked={enabled}
                aria-disabled={isLastEnabled}
                onClick={() => toggleProvider(option.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md border border-border/60 px-3 py-2.5 text-left transition-colors',
                  enabled
                    ? 'bg-accent/70 text-accent-foreground'
                    : 'bg-transparent hover:bg-muted/50',
                  isLastEnabled && 'cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-md border',
                    enabled
                      ? 'border-foreground/20 bg-background/70'
                      : 'border-border/60 bg-muted/40 text-muted-foreground'
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 space-y-0.5">
                  <Label className="cursor-inherit">{option.label}</Label>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border text-[10px]',
                    enabled
                      ? 'border-foreground/50 bg-foreground text-background'
                      : 'border-border bg-background'
                  )}
                >
                  {enabled ? <Check className="size-3" /> : null}
                </span>
              </button>
            )
          })}
        </SearchableSetting>

        <SearchableSetting
          title={translate(
            'auto.components.settings.TasksPane.obsidianDailyNotesTitle',
            'Obsidian daily notes'
          )}
          description={translate(
            'auto.components.settings.TasksPane.obsidianDailyNotesDescription',
            'Choose the local vault opened from the Obsidian task source.'
          )}
          keywords={['obsidian', 'daily notes', 'journal', 'vault', 'local']}
          className="space-y-2 py-2"
        >
          <div className="space-y-1">
            <Label htmlFor="settings-obsidian-vault">
              {translate(
                'auto.components.settings.TasksPane.obsidianVaultLabel',
                'Vault name or ID'
              )}
            </Label>
            <p className="text-xs text-muted-foreground">
              {translate(
                'auto.components.settings.TasksPane.obsidianVaultDescription',
                'Optional. Obsidian still controls the daily-note folder, date format, and template.'
              )}
            </p>
          </div>
          <Input
            id="settings-obsidian-vault"
            value={settings.obsidianVault}
            onChange={(event) => updateSettings({ obsidianVault: event.target.value })}
            placeholder={translate(
              'auto.components.settings.TasksPane.obsidianVaultPlaceholder',
              'e.g. Work Notes or a vault ID'
            )}
            autoComplete="off"
            className="max-w-md"
          />
          <div className="space-y-1 pt-2">
            <Label htmlFor="settings-obsidian-daily-notes-directory">
              {translate(
                'auto.components.settings.TasksPane.obsidianDirectoryLabel',
                'Obsidian vault root'
              )}
            </Label>
            <p className="text-xs text-muted-foreground">
              {translate(
                'auto.components.settings.TasksPane.obsidianDirectoryDescription',
                'Orca recursively finds today and all YYYY-MM-DD.md daily notes inside this folder.'
              )}
            </p>
          </div>
          <div className="flex max-w-2xl items-center gap-2">
            <Input
              id="settings-obsidian-daily-notes-directory"
              value={settings.obsidianDailyNotesDirectory}
              readOnly
              placeholder={translate(
                'auto.components.settings.TasksPane.obsidianDirectoryPlaceholder',
                'Choose the Obsidian vault root'
              )}
              className="min-w-0 flex-1 font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void chooseObsidianDailyNotesDirectory()}
            >
              <FolderOpen />
              {translate('auto.components.settings.TasksPane.chooseDirectory', 'Choose')}
            </Button>
          </div>
        </SearchableSetting>

        <SearchableSetting
          title={translate(
            'auto.components.settings.ObsidianAiCaptureSettingsSection.title',
            'AI Capture'
          )}
          description={translate(
            'auto.components.settings.ObsidianAiCaptureSettingsSection.description',
            'Extract Todo candidates from captured text using an OpenAI Responses-compatible endpoint.'
          )}
          keywords={[
            'obsidian',
            'ai capture',
            'todo extraction',
            'endpoint',
            'model',
            'api key',
            'confidence'
          ]}
          className="py-2"
        >
          <ObsidianAiCaptureSettingsSection
            settings={normalizeObsidianAiCaptureSettings(settings.obsidianAiCapture)}
            onChange={(obsidianAiCapture) => updateSettings({ obsidianAiCapture })}
          />
        </SearchableSetting>
      </section>
    </div>
  )
}
