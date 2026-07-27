import {
  isObsidianDailyTodoCandidateImageMimeType,
  OBSIDIAN_DAILY_TODO_CANDIDATE_IMAGE_MAX_BYTES
} from '../shared/obsidian-daily-todo-candidate'
import type { ObsidianDailyTodoItem } from '../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoCandidateAnalyzeInput,
  ObsidianDailyTodoCandidateAnalyzeResult
} from '../shared/obsidian-daily-todo-candidate'
import {
  extractResponseText,
  parseCandidateResponse
} from './obsidian-daily-todo-candidate-response'

export { parseCandidateResponse } from './obsidian-daily-todo-candidate-response'

export type ObsidianDailyTodoCandidateAnalyzerConfig = {
  endpoint: string
  model: string
  apiKey: string
  confidenceThreshold: number
}

export type ObsidianDailyTodoCandidateAnalyzerOptions = {
  fetchImpl?: typeof fetch
  now?: () => number
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 35_000
const ARK_RESPONSES_PATH = '/responses'
const MAX_SOURCE_TEXT_LENGTH = 8_000
const MAX_EXISTING_TODOS = 8
const SYSTEM_PROMPT = `你是一个严谨的工作任务分析器。阅读粘贴的聊天记录、普通文字或截图，提取真正需要执行和跟进的事项。
规则：
1. 最多输出 5 条相互独立的任务；对同一问题的多轮讨论应合并成一条。
2. title 使用清晰的“动作 + 对象”表达，不把聊天原句、账号、寒暄或纯背景当成任务。
3. 从上下文提取 goal、background、expectedOutcome、assignee、dueText、keyPoints、uncertainties。没有明确证据时留空，绝不编造。
4. dueText 保留原文中的相对或绝对时间（如“今天”“下周一 16:00”），不要自行换算日期。
5. expectedOutcome 描述可验收的结果；uncertainties 记录需要确认的缺失信息、风险或口径。
6. 截图需先理解其中的界面文字、发言人、@关系和上下文，再判断责任人和行动项。
7. “提醒我/提示我/记得/帮我记/今天/明天/下周”等明确行动信号必须生成候选任务。
只返回 JSON，不要 Markdown：{"candidates":[{"title":"...","context":"一句话任务理解","goal":"...","background":"...","expectedOutcome":"...","assignee":"...","dueText":"...","keyPoints":["..."],"uncertainties":["..."],"confidence":0.9,"priority":"P2"}]}`

export class ObsidianDailyTodoCandidateAnalyzer {
  private readonly fetchImpl: typeof fetch
  private readonly now: () => number
  private readonly timeoutMs: number

  constructor(
    private readonly config: ObsidianDailyTodoCandidateAnalyzerConfig,
    options: ObsidianDailyTodoCandidateAnalyzerOptions = {}
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.now = options.now ?? Date.now
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  get isConfigured(): boolean {
    return Boolean(
      this.config.endpoint.trim() && this.config.model.trim() && this.config.apiKey.trim()
    )
  }

  async analyze(
    input: ObsidianDailyTodoCandidateAnalyzeInput
  ): Promise<ObsidianDailyTodoCandidateAnalyzeResult> {
    const sourceText = input.sourceText.trim()
    const sourceImage = normalizeSourceImage(input.sourceImage)
    if (!input.directory.trim() || !input.filePath.trim() || (!sourceText && !sourceImage)) {
      return { ok: false, code: 'invalid-input', message: 'Invalid candidate analysis input.' }
    }
    if (!this.isConfigured) {
      return { ok: false, code: 'llm-not-configured', message: 'AI Capture is not configured.' }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchImpl(buildRequestUrl(this.config.endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: SYSTEM_PROMPT }]
            },
            {
              role: 'user',
              content: [
                { type: 'input_text', text: buildUserPrompt(input, sourceText) },
                ...(sourceImage
                  ? [{ type: 'input_image', image_url: sourceImage.dataUrl, detail: 'high' }]
                  : [])
              ]
            }
          ],
          temperature: 0.1,
          max_output_tokens: 1_200
        }),
        signal: controller.signal
      })
      if (!response.ok) {
        return {
          ok: false,
          code: 'llm-request-failed',
          message: `AI Capture request failed with HTTP ${response.status}.`
        }
      }
      const raw = extractResponseText(await response.json())
      const candidates = parseCandidateResponse(raw, {
        sourceText: sourceText || '粘贴的图片',
        sourceKind: sourceImage ? (sourceText ? 'mixed' : 'image') : 'text',
        sourceApp: input.sourceApp,
        now: this.now(),
        confidenceThreshold: this.config.confidenceThreshold
      })
      return { ok: true, candidates }
    } catch (error) {
      return {
        ok: false,
        code: 'llm-request-failed',
        message:
          error instanceof Error && error.name === 'AbortError'
            ? 'AI Capture timed out.'
            : 'AI Capture failed.'
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}

function buildRequestUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '')
  return trimmed.endsWith(ARK_RESPONSES_PATH) ? trimmed : `${trimmed}${ARK_RESPONSES_PATH}`
}

function buildUserPrompt(
  input: ObsidianDailyTodoCandidateAnalyzeInput,
  sourceText: string
): string {
  const existingTodos =
    (input.existingTodos ?? []).slice(0, MAX_EXISTING_TODOS).map(formatExistingTodo).join('\n') ||
    'none'
  const sourceDescription = input.sourceImage
    ? sourceText
      ? '下方文字和所附截图属于同一份上下文，请结合分析。'
      : '请分析所附截图中的聊天或工作内容。'
    : '请分析下方文字。'
  return `${sourceDescription}
Existing pending Todos:
${existingTodos}
Pasted text:
${sourceText.slice(0, MAX_SOURCE_TEXT_LENGTH) || '(none)'}`
}

function formatExistingTodo(todo: ObsidianDailyTodoItem): string {
  return `- ${todo.text.slice(0, 60)}`
}

function normalizeSourceImage(
  value: ObsidianDailyTodoCandidateAnalyzeInput['sourceImage']
): ObsidianDailyTodoCandidateAnalyzeInput['sourceImage'] | undefined {
  if (
    !value ||
    !isObsidianDailyTodoCandidateImageMimeType(value.mimeType) ||
    typeof value.dataUrl !== 'string'
  ) {
    return undefined
  }
  const prefix = `data:${value.mimeType};base64,`
  if (!value.dataUrl.startsWith(prefix)) {
    return undefined
  }
  const base64Length = value.dataUrl.length - prefix.length
  const estimatedBytes = Math.floor((base64Length * 3) / 4)
  if (estimatedBytes <= 0 || estimatedBytes > OBSIDIAN_DAILY_TODO_CANDIDATE_IMAGE_MAX_BYTES) {
    return undefined
  }
  return value
}
