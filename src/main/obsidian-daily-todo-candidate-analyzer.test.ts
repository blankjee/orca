import { describe, expect, it } from 'vitest'

import { parseCandidateResponse } from './obsidian-daily-todo-candidate-analyzer'

describe('parseCandidateResponse', () => {
  it('normalizes strict candidate JSON', () => {
    const candidates = parseCandidateResponse(
      JSON.stringify({
        candidates: [
          {
            title: 'Follow up approval',
            context: 'Alice asked for confirmation',
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
})
