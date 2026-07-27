import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

import { translate } from '@/i18n/i18n'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

type MonitorAppPreset = {
  name: string
  bundleId: string
}

const MONITOR_APP_PRESETS: readonly MonitorAppPreset[] = [
  { name: '飞书', bundleId: 'com.bytedance.ee.lark' },
  { name: 'Lark', bundleId: 'com.larksuite.suite' },
  { name: '微信', bundleId: 'com.tencent.xinWeChat' },
  { name: 'Slack', bundleId: 'com.tinyspeck.slackmacgap' },
  { name: '钉钉', bundleId: 'com.alibaba.DingTalkMac' },
  { name: 'Microsoft Teams', bundleId: 'com.microsoft.teams2' }
]

export function ObsidianAiCaptureMonitorRules({
  bundleIds,
  ignoredPhrases,
  disabled,
  onBundleIdsChange,
  onIgnoredPhrasesChange
}: {
  bundleIds: readonly string[]
  ignoredPhrases: readonly string[]
  disabled: boolean
  onBundleIdsChange: (bundleIds: string[]) => void
  onIgnoredPhrasesChange: (phrases: string[]) => void
}): React.JSX.Element {
  const [customBundleId, setCustomBundleId] = useState('')
  const [ignoredPhrase, setIgnoredPhrase] = useState('')
  const selected = useMemo(() => new Set(bundleIds), [bundleIds])
  const presetIds = useMemo(() => new Set(MONITOR_APP_PRESETS.map((preset) => preset.bundleId)), [])
  const customIds = bundleIds.filter((bundleId) => !presetIds.has(bundleId))

  const togglePreset = (bundleId: string): void => {
    onBundleIdsChange(
      selected.has(bundleId)
        ? bundleIds.filter((item) => item !== bundleId)
        : [...bundleIds, bundleId]
    )
  }
  const addCustomBundleId = (): void => {
    const value = customBundleId.trim()
    if (!/^[A-Za-z0-9.-]{3,160}$/.test(value) || selected.has(value)) {
      return
    }
    onBundleIdsChange([...bundleIds, value])
    setCustomBundleId('')
  }
  const addIgnoredPhrase = (): void => {
    const value = ignoredPhrase.trim()
    if (!value || value.length > 240 || ignoredPhrases.includes(value)) {
      return
    }
    onIgnoredPhrasesChange([...ignoredPhrases, value])
    setIgnoredPhrase('')
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
      <div className="space-y-1">
        <Label>
          {translate(
            'auto.components.settings.ObsidianAiCaptureSettingsSection.appAllowlistLabel',
            'Monitored app allowlist'
          )}
        </Label>
        <p className="text-xs text-muted-foreground">
          {translate(
            'auto.components.settings.ObsidianAiCaptureSettingsSection.appAllowlistDescription',
            'Orca reads and analyzes text only from selected apps. Feishu is selected by default.'
          )}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {MONITOR_APP_PRESETS.map((preset) => (
          <label
            key={preset.bundleId}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-accent"
          >
            <Checkbox
              checked={selected.has(preset.bundleId)}
              disabled={disabled}
              onCheckedChange={() => togglePreset(preset.bundleId)}
              aria-label={preset.name}
            />
            <span className="min-w-0">
              <span className="block font-medium text-foreground">{preset.name}</span>
              <span className="block truncate font-mono text-[10px] text-muted-foreground">
                {preset.bundleId}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={customBundleId}
          disabled={disabled}
          onChange={(event) => setCustomBundleId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addCustomBundleId()
            }
          }}
          placeholder={translate(
            'auto.components.settings.ObsidianAiCaptureSettingsSection.customBundlePlaceholder',
            'Custom bundle ID, e.g. com.example.app'
          )}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            disabled ||
            !/^[A-Za-z0-9.-]{3,160}$/.test(customBundleId.trim()) ||
            selected.has(customBundleId.trim())
          }
          onClick={addCustomBundleId}
        >
          {translate('auto.components.settings.ObsidianAiCaptureSettingsSection.addApp', 'Add')}
        </Button>
      </div>

      {customIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {customIds.map((bundleId) => (
            <Badge key={bundleId} variant="outline" className="gap-1 font-mono text-[10px]">
              {bundleId}
              <button
                type="button"
                disabled={disabled}
                aria-label={translate(
                  'auto.components.settings.ObsidianAiCaptureSettingsSection.removeApp',
                  'Remove {{value0}}',
                  { value0: bundleId }
                )}
                className="rounded-full text-muted-foreground hover:text-foreground disabled:opacity-50"
                onClick={() => onBundleIdsChange(bundleIds.filter((item) => item !== bundleId))}
              >
                <X />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {bundleIds.length === 0 ? (
        <p className="text-xs text-destructive">
          {translate(
            'auto.components.settings.ObsidianAiCaptureSettingsSection.emptyAllowlist',
            'No apps are selected. Automatic monitoring will remain idle.'
          )}
        </p>
      ) : null}

      <div className="border-t border-border/60 pt-3">
        <div className="space-y-1">
          <Label>
            {translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.phraseBlocklistLabel',
              'Ignored phrases'
            )}
          </Label>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.phraseBlocklistDescription',
              'Matching complete lines are removed before they are displayed or sent to AI.'
            )}
          </p>
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={ignoredPhrase}
            disabled={disabled}
            onChange={(event) => setIgnoredPhrase(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addIgnoredPhrase()
              }
            }}
            placeholder={translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.phraseBlocklistPlaceholder',
              'Add a fixed prompt or boilerplate sentence'
            )}
            className="text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              disabled ||
              !ignoredPhrase.trim() ||
              ignoredPhrase.trim().length > 240 ||
              ignoredPhrases.includes(ignoredPhrase.trim())
            }
            onClick={addIgnoredPhrase}
          >
            {translate(
              'auto.components.settings.ObsidianAiCaptureSettingsSection.addPhrase',
              'Add phrase'
            )}
          </Button>
        </div>
        {ignoredPhrases.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ignoredPhrases.map((phrase) => (
              <Badge key={phrase} variant="outline" className="max-w-full gap-1 text-[10px]">
                <span className="truncate">{phrase}</span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={translate(
                    'auto.components.settings.ObsidianAiCaptureSettingsSection.removePhrase',
                    'Remove ignored phrase {{value0}}',
                    { value0: phrase }
                  )}
                  className="rounded-full text-muted-foreground hover:text-foreground disabled:opacity-50"
                  onClick={() =>
                    onIgnoredPhrasesChange(ignoredPhrases.filter((item) => item !== phrase))
                  }
                >
                  <X />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
