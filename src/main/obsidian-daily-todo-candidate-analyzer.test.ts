import { describe, expect, it, vi } from 'vitest'

import {
  ObsidianDailyTodoCandidateAnalyzer,
  parseCandidateResponse
} from './obsidian-daily-todo-candidate-analyzer'

describe('parseCandidateResponse', () => {
  it('normalizes strict candidate JSON', () => {
    const candidates = parseCandidateResponse(
      JSON.stringify({
        candidates: [
          {
            title: 'Follow up approval',
            context: 'Alice asked for confirmation',
            goal: 'Identify the missing judgment records',
            background: 'Customer service completed judgment but the backend has no record',
            expectedOutcome: 'Provide a root cause for the affected orders',
            assignee: 'Alice',
            keyPoints: ['Check acceptance rules', 'Compare affected order types'],
            uncertainties: ['Whether non-reassurance orders are also affected'],
            confidence: 0.88,
            priority: 'P1',
            dueText: 'tomorrow 16:00',
            suggestedMergeTodoId: '12-abcd'
          }
        ]
      }),
      {
        sourceText: 'Alice: please confirm tomorrow',
        sourceApp: 'Feishu',
        now: 1234,
        confidenceThreshold: 0.75
      }
    )

    expect(candidates).toEqual([
      {
        id: 'candidate-1234-0',
        title: 'Follow up approval',
        context: 'Alice asked for confirmation',
        goal: 'Identify the missing judgment records',
        background: 'Customer service completed judgment but the backend has no record',
        expectedOutcome: 'Provide a root cause for the affected orders',
        assignee: 'Alice',
        keyPoints: ['Check acceptance rules', 'Compare affected order types'],
        uncertainties: ['Whether non-reassurance orders are also affected'],
        sourceText: 'Alice: please confirm tomorrow',
        sourceApp: 'Feishu',
        confidence: 0.88,
        priority: 'P1',
        dueText: 'tomorrow 16:00',
        group: '今日任务',
        createdAt: 1234,
        status: 'pending',
        suggestedMergeTodoId: '12-abcd'
      }
    ])
  })

  it('filters low confidence and invalid candidates', () => {
    const candidates = parseCandidateResponse(
      '{"candidates":[{"title":"low","confidence":0.2},{"context":"missing title","confidence":0.99}]}',
      { sourceText: 'text', now: 1, confidenceThreshold: 0.75 }
    )

    expect(candidates).toEqual([])
  })

  it('extracts JSON from fenced output', () => {
    const candidates = parseCandidateResponse(
      '```json\n[{"title":"Ship docs","confidence":0.8}]\n```',
      { sourceText: 'ship docs', now: 2, confidenceThreshold: 0.75 }
    )

    expect(candidates).toMatchObject([{ title: 'Ship docs', context: 'From pasted text' }])
  })

  it('falls back to reminder parsing when model returns no JSON', () => {
    const candidates = parseCandidateResponse('', {
      sourceText: '提示我写周报',
      sourceApp: '飞书',
      now: 3000,
      confidenceThreshold: 0.75
    })

    expect(candidates).toMatchObject([
      {
        id: 'candidate-3000-fallback',
        title: '写周报',
        context: '从提醒语句提取',
        sourceText: '提示我写周报',
        sourceApp: '飞书',
        confidence: 0.85,
        priority: 'P2',
        group: '今日任务',
        createdAt: 3000,
        status: 'pending'
      }
    ])
  })

  it('sends pasted images and text as one multimodal analysis request', async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        input: [
          { role: 'system' },
          {
            role: 'user',
            content: [
              { type: 'input_text' },
              {
                type: 'input_image',
                image_url: 'data:image/png;base64,aA==',
                detail: 'high'
              }
            ]
          }
        ]
      })
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            candidates: [{ title: '排查住宿判责记录缺失', confidence: 0.92 }]
          })
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
    const analyzer = new ObsidianDailyTodoCandidateAnalyzer(
      {
        endpoint: 'https://example.test/api/v3',
        model: 'vision-model',
        apiKey: 'key',
        confidenceThreshold: 0.75
      },
      { fetchImpl: fetchImpl as typeof fetch }
    )

    const result = await analyzer.analyze({
      directory: '/vault',
      filePath: '/vault/2026-07-27.md',
      sourceText: '希望今天先给个归因',
      sourceImage: { dataUrl: 'data:image/png;base64,aA==', mimeType: 'image/png' }
    })

    expect(result).toMatchObject({
      ok: true,
      candidates: [{ title: '排查住宿判责记录缺失', sourceKind: 'mixed' }]
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
