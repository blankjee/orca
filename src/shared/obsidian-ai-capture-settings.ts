export type ObsidianAiCaptureSettings = {
  enabled: boolean
  endpoint: string
  model: string
  apiKey: string
  confidenceThreshold: number
  monitorAllowedBundleIds: string[]
  monitorIgnoredPhrases: string[]
}

export const DEFAULT_OBSIDIAN_AI_CAPTURE_MONITOR_BUNDLE_IDS = ['com.bytedance.ee.lark']
export const DEFAULT_OBSIDIAN_AI_CAPTURE_IGNORED_PHRASES = ['沟通时请保持“公开可接受”']

export const DEFAULT_OBSIDIAN_AI_CAPTURE_SETTINGS: ObsidianAiCaptureSettings = {
  enabled: true,
  endpoint: '',
  model: '',
  apiKey: '',
  confidenceThreshold: 0.75,
  monitorAllowedBundleIds: [...DEFAULT_OBSIDIAN_AI_CAPTURE_MONITOR_BUNDLE_IDS],
  monitorIgnoredPhrases: [...DEFAULT_OBSIDIAN_AI_CAPTURE_IGNORED_PHRASES]
}

export function normalizeObsidianAiCaptureSettings(value: unknown): ObsidianAiCaptureSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_OBSIDIAN_AI_CAPTURE_SETTINGS }
  }
  const candidate = value as Partial<Record<keyof ObsidianAiCaptureSettings, unknown>>
  const confidenceThreshold =
    typeof candidate.confidenceThreshold === 'number' &&
    Number.isFinite(candidate.confidenceThreshold) &&
    candidate.confidenceThreshold >= 0 &&
    candidate.confidenceThreshold <= 1
      ? candidate.confidenceThreshold
      : DEFAULT_OBSIDIAN_AI_CAPTURE_SETTINGS.confidenceThreshold
  const monitorAllowedBundleIds = Array.isArray(candidate.monitorAllowedBundleIds)
    ? [
        ...new Set(
          candidate.monitorAllowedBundleIds
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => /^[A-Za-z0-9.-]{3,160}$/.test(item))
        )
      ].slice(0, 32)
    : [...DEFAULT_OBSIDIAN_AI_CAPTURE_MONITOR_BUNDLE_IDS]
  const monitorIgnoredPhrases = Array.isArray(candidate.monitorIgnoredPhrases)
    ? [
        ...new Set(
          candidate.monitorIgnoredPhrases
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0 && item.length <= 240)
        )
      ].slice(0, 64)
    : [...DEFAULT_OBSIDIAN_AI_CAPTURE_IGNORED_PHRASES]
  return {
    enabled: candidate.enabled === true,
    endpoint: typeof candidate.endpoint === 'string' ? candidate.endpoint : '',
    model: typeof candidate.model === 'string' ? candidate.model : '',
    apiKey: typeof candidate.apiKey === 'string' ? candidate.apiKey : '',
    confidenceThreshold,
    monitorAllowedBundleIds,
    monitorIgnoredPhrases
  }
}
