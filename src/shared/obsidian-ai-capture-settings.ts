export type ObsidianAiCaptureSettings = {
  enabled: boolean
  endpoint: string
  model: string
  apiKey: string
  confidenceThreshold: number
}

export const DEFAULT_OBSIDIAN_AI_CAPTURE_SETTINGS: ObsidianAiCaptureSettings = {
  enabled: true,
  endpoint: '',
  model: '',
  apiKey: '',
  confidenceThreshold: 0.75
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
  return {
    enabled: candidate.enabled === true,
    endpoint: typeof candidate.endpoint === 'string' ? candidate.endpoint : '',
    model: typeof candidate.model === 'string' ? candidate.model : '',
    apiKey: typeof candidate.apiKey === 'string' ? candidate.apiKey : '',
    confidenceThreshold
  }
}
