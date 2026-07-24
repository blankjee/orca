import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { translate } from '@/i18n/i18n'
import type { ObsidianDailyTodoSnapshot } from '../../../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidateAnalyzeResult,
  ObsidianDailyTodoCandidateMutationResult
} from '../../../shared/obsidian-daily-todo-candidate'

type TodoPriority = 'P1' | 'P2' | 'P3'

type UseObsidianDailyTodoCandidatesArgs = {
  directory: string
  snapshot: ObsidianDailyTodoSnapshot | null
  candidateAnalyzing: boolean
  onSnapshot: (snapshot: ObsidianDailyTodoSnapshot) => void
}

export function useObsidianDailyTodoCandidates({
  directory,
  snapshot,
  candidateAnalyzing,
  onSnapshot
}: UseObsidianDailyTodoCandidatesArgs): {
  candidateSourceText: string
  candidates: ObsidianDailyTodoCandidate[]
  candidateError: string | null
  busyCandidateIds: Set<string>
  setCandidateSourceText: (value: string) => void
  analyzeCandidates: () => Promise<void>
  acceptCandidate: (
    candidate: ObsidianDailyTodoCandidate,
    overrides: { title: string; group: string; priority: TodoPriority | null }
  ) => Promise<void>
  dismissCandidate: (candidate: ObsidianDailyTodoCandidate) => Promise<void>
} {
  const [candidateSourceText, setCandidateSourceText] = useState('')
  const [candidates, setCandidates] = useState<ObsidianDailyTodoCandidate[]>([])
  const [candidateError, setCandidateError] = useState<string | null>(null)
  const [busyCandidateIds, setBusyCandidateIds] = useState<Set<string>>(new Set())

  const loadCandidates = useCallback(async (): Promise<void> => {
    const result = await window.api.obsidianDailyTodos.candidates.list()
    if (result.ok) {
      setCandidates(result.candidates)
      setCandidateError(null)
    } else {
      setCandidateError(result.message)
    }
  }, [])

  useEffect(() => {
    void loadCandidates()
  }, [loadCandidates])

  const analyzeCandidates = async (): Promise<void> => {
    const filePath = snapshot?.filePath
    const sourceText = candidateSourceText.trim()
    if (!filePath || !sourceText || candidateAnalyzing) {
      return
    }
    setCandidateError(null)
    const result = await window.api.obsidianDailyTodos.candidates.analyzeText({
      directory,
      filePath,
      sourceText,
      existingTodos: snapshot?.todos ?? []
    })
    applyCandidateAnalyzeResult(result, setCandidates, setCandidateError)
    if (result.ok) {
      setCandidateSourceText('')
    } else {
      toast.error(result.message)
    }
  }

  const acceptCandidate = async (
    candidate: ObsidianDailyTodoCandidate,
    overrides: { title: string; group: string; priority: TodoPriority | null }
  ): Promise<void> => {
    const filePath = snapshot?.filePath
    if (!filePath) {
      return
    }
    setBusyCandidateIds((current) => new Set(current).add(candidate.id))
    try {
      const result = await window.api.obsidianDailyTodos.candidates.accept({
        directory,
        filePath,
        candidateId: candidate.id,
        title: overrides.title,
        group: overrides.group,
        priority: overrides.priority
      })
      if (result.ok) {
        if (result.todoResult.ok) {
          onSnapshot(result.todoResult.snapshot)
        }
        setCandidates((current) => current.filter((item) => item.id !== candidate.id))
        toast.success(
          translate('auto.components.ObsidianDailyTodoPanel.candidateAdded', 'Todo added')
        )
      } else {
        setCandidateError(result.message)
        toast.error(result.message)
      }
    } finally {
      setBusyCandidateIds((current) => {
        const next = new Set(current)
        next.delete(candidate.id)
        return next
      })
    }
  }

  const dismissCandidate = async (candidate: ObsidianDailyTodoCandidate): Promise<void> => {
    setBusyCandidateIds((current) => new Set(current).add(candidate.id))
    try {
      const result = await window.api.obsidianDailyTodos.candidates.dismiss({
        candidateId: candidate.id
      })
      applyCandidateMutationResult(result, setCandidates, setCandidateError)
      if (!result.ok) {
        toast.error(result.message)
      }
    } finally {
      setBusyCandidateIds((current) => {
        const next = new Set(current)
        next.delete(candidate.id)
        return next
      })
    }
  }

  return {
    candidateSourceText,
    candidates,
    candidateError,
    busyCandidateIds,
    setCandidateSourceText,
    analyzeCandidates,
    acceptCandidate,
    dismissCandidate
  }
}

function applyCandidateAnalyzeResult(
  result: ObsidianDailyTodoCandidateAnalyzeResult,
  setCandidates: React.Dispatch<React.SetStateAction<ObsidianDailyTodoCandidate[]>>,
  setCandidateError: React.Dispatch<React.SetStateAction<string | null>>
): void {
  if (result.ok) {
    setCandidates(result.candidates)
    setCandidateError(null)
  } else {
    setCandidateError(result.message)
  }
}

function applyCandidateMutationResult(
  result: ObsidianDailyTodoCandidateMutationResult,
  setCandidates: React.Dispatch<React.SetStateAction<ObsidianDailyTodoCandidate[]>>,
  setCandidateError: React.Dispatch<React.SetStateAction<string | null>>
): void {
  if (result.ok) {
    setCandidates((current) => current.filter((candidate) => candidate.id !== result.candidate.id))
    setCandidateError(null)
  } else {
    setCandidateError(result.message)
  }
}
