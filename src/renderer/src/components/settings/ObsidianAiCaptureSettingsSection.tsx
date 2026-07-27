import type { ObsidianAiCaptureSettings } from '../../../../shared/obsidian-ai-capture-settings'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SettingsBadge, SettingsSubsectionHeader, SettingsSwitchRow } from './SettingsFormControls'
import { translate } from '@/i18n/i18n'

type ObsidianAiCaptureSettingsSectionProps = {
  settings: ObsidianAiCaptureSettings
  onChange: (settings: ObsidianAiCaptureSettings) => void
}

export function ObsidianAiCaptureSettingsSection({
  settings,
  onChange
}: ObsidianAiCaptureSettingsSectionProps): React.JSX.Element {
  const update = (patch: Partial<ObsidianAiCaptureSettings>): void => {
    onChange({ ...settings, ...patch })
  }
  const configured = Boolean(
    settings.enabled && settings.endpoint.trim() && settings.model.trim() && settings.apiKey.trim()
  )

  return (
    <section className="space-y-3 border-t border-border/60 pt-5">
      <SettingsSubsectionHeader
        title={
          <span className="flex items-center gap-2">
            {translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.title',
              'AI Capture'
            )}
            <SettingsBadge tone={configured ? 'accent' : 'muted'}>
              {configured
                ? translate(
                    'auto.components.settings.ObsidianAiCaptureSettingsSection.configured',
                    'Configured'
                  )
                : translate(
                    'auto.components.settings.ObsidianAiCaptureSettingsSection.notConfigured',
                    'Not configured'
                  )}
            </SettingsBadge>
          </span>
        }
        description={translate(
          'auto.components.settings.ObsidianAiCaptureSettingsSection.description',
          'Extract Todo candidates from captured text using an OpenAI Responses-compatible endpoint.'
        )}
      />

      <SettingsSwitchRow
        label={translate(
          'auto.components.settings.ObsidianAiCaptureSettingsSection.enableLabel',
          'Enable AI Capture'
        )}
        description={translate(
          'auto.components.settings.ObsidianAiCaptureSettingsSection.enableDescription',
          'Use the saved provider configuration for Obsidian Todo extraction.'
        )}
        checked={settings.enabled}
        onChange={() => update({ enabled: !settings.enabled })}
      />

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="settings-obsidian-ai-capture-endpoint">
            {translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.endpointLabel',
              'Endpoint'
            )}
          </Label>
          <Input
            id="settings-obsidian-ai-capture-endpoint"
            type="url"
            value={settings.endpoint}
            disabled={!settings.enabled}
            onChange={(event) => update({ endpoint: event.target.value })}
            placeholder={translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.endpointPlaceholder',
              'https://ark.cn-beijing.volces.com/api/v3'
            )}
            autoComplete="url"
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-obsidian-ai-capture-model">
            {translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.modelLabel',
              'Model'
            )}
          </Label>
          <Input
            id="settings-obsidian-ai-capture-model"
            value={settings.model}
            disabled={!settings.enabled}
            onChange={(event) => update({ model: event.target.value })}
            placeholder={translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.modelPlaceholder',
              'Model or endpoint ID'
            )}
            autoComplete="off"
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-obsidian-ai-capture-confidence">
            {translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.confidenceLabel',
              'Confidence threshold'
            )}
          </Label>
          <Input
            id="settings-obsidian-ai-capture-confidence"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={settings.confidenceThreshold}
            disabled={!settings.enabled}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value)) {
                update({ confidenceThreshold: Math.min(1, Math.max(0, value)) })
              }
            }}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="settings-obsidian-ai-capture-api-key">
            {translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.apiKeyLabel',
              'API key'
            )}
          </Label>
          <Input
            id="settings-obsidian-ai-capture-api-key"
            type="password"
            value={settings.apiKey}
            disabled={!settings.enabled}
            onChange={(event) => update({ apiKey: event.target.value })}
            placeholder="••••••••"
            autoComplete="new-password"
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.apiKeyDescription',
              'Protected with the operating system credential service when available.'
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
