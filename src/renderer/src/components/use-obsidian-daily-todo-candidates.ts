import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { translate } from '@/i18n/i18n'
import type { ObsidianDailyTodoSnapshot } from '../../../shared/obsidian-daily-todo'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidateAnalyzeResult,
  ObsidianDailyTodoCandidateChangedEvent,
  ObsidianDailyTodoCandidateMutationResult,
  ObsidianDailyTodoCandidateSourceImage,
  ObsidianDailyTodoMonitorActivity
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
  candidateSourceImage: ObsidianDailyTodoCandidateSourceImage | null
  candidates: ObsidianDailyTodoCandidate[]
  candidateError: string | null
  busyCandidateIds: Set<string>
  listeningForCandidates: boolean
  monitorActivity: ObsidianDailyTodoMonitorActivity | null
  setCandidateSourceText: (value: string) => void
  setCandidateSourceImage: (value: ObsidianDailyTodoCandidateSourceImage | null) => void
  setListeningForCandidates: (value: boolean) => void
  analyzeCandidates: () => Promise<void>
  acceptCandidate: (
    candidate: ObsidianDailyTodoCandidate,
    overrides: { title: string; group: string; priority: TodoPriority | null }
  ) => Promise<void>
  dismissCandidate: (candidate: ObsidianDailyTodoCandidate) => Promise<void>
} {
  const [candidateSourceText, setCandidateSourceText] = useState('')
  const [candidateSourceImage, setCandidateSourceImage] =
    useState<ObsidianDailyTodoCandidateSourceImage | null>(null)
  const [candidates, setCandidates] = useState<ObsidianDailyTodoCandidate[]>([])
  const [candidateError, setCandidateError] = useState<string | null>(null)
  const [busyCandidateIds, setBusyCandidateIds] = useState<Set<string>>(new Set())
  const [listeningForCandidates, setListeningForCandidatesState] = useState(false)
  const [monitorActivity, setMonitorActivity] = useState<ObsidianDailyTodoMonitorActivity | null>(
    null
  )

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

  useEffect(() => {
    return window.api.obsidianDailyTodos.candidates.onChanged(
      (event?: ObsidianDailyTodoCandidateChangedEvent) => {
        void loadCandidates()
        const sourceText = event?.sourceText
        const capturedAt = event?.capturedAt
        if (
          (event?.source === 'monitor-captured' || event?.source === 'monitor-analyzed') &&
          sourceText &&
          capturedAt
        ) {
          setMonitorActivity((current) => {
            if (current && current.capturedAt > capturedAt) {
              return current
            }
            return {
              sourceText,
              app: event.app || 'Unknown',
              reason: event.reason || '',
              capturedAt,
              status: event.analysisStatus || 'analyzing',
              candidateCount: event.candidateCount ?? 0,
              candidateTitles: event.candidateTitles ?? []
            }
          })
        }
        if (event?.source === 'monitor-captured') {
          return
        }
        if (event?.source === 'monitor-analyzed' && event.analysisStatus === 'todo') {
          toast.success(
            translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.todoDetected',
              'Todo candidate detected'
            )
          )
        }
      }
    )
  }, [loadCandidates])

  useEffect(() => {
    return window.api.obsidianDailyTodos.candidates.onMonitorError((message, fatal) => {
      setCandidateError(message)
      if (fatal) {
        setListeningForCandidatesState(false)
      }
      setMonitorActivity((current) => (current ? { ...current, status: 'error' } : current))
    })
  }, [])

  useEffect(() => {
    void window.api.obsidianDailyTodos.candidates.monitorStatus().then((result) => {
      if (result.ok) {
        setListeningForCandidatesState(result.running)
      }
    })
  }, [])

  useEffect(() => {
    if (!snapshot?.filePath && listeningForCandidates) {
      void stopMonitor()
    }
  }, [listeningForCandidates, snapshot?.filePath])

  const analyzeCandidates = async (): Promise<void> => {
    const filePath = snapshot?.filePath
    const sourceText = candidateSourceText.trim()
    if (!filePath || (!sourceText && !candidateSourceImage) || candidateAnalyzing) {
      return
    }
    setCandidateError(null)
    const result = await window.api.obsidianDailyTodos.candidates.analyzeText({
      directory,
      filePath,
      sourceText,
      sourceImage: candidateSourceImage ?? undefined,
      existingTodos: snapshot?.todos ?? []
    })
    applyCandidateAnalyzeResult(result, setCandidates, setCandidateError)
    if (result.ok && result.candidates.length > 0) {
      setCandidateSourceText('')
      setCandidateSourceImage(null)
    } else if (result.ok) {
      setCandidateError(
        translate(
          'auto.components.ObsidianDailyTodoCandidatePanel.noCandidatesFound',
          'No Todo candidates found. Try a more explicit reminder or task sentence.'
        )
      )
    } else {
      toast.error(result.message)
    }
  }

  const startMonitor = async (): Promise<void> => {
    const filePath = snapshot?.filePath
    if (!filePath) {
      return
    }
    const result = await window.api.obsidianDailyTodos.candidates.startMonitor({
      directory,
      filePath
    })
    if (result.ok) {
      setListeningForCandidatesState(result.running)
    } else {
      setCandidateError(result.message)
      toast.error(result.message)
    }
  }

  const stopMonitor = async (): Promise<void> => {
    const result = await window.api.obsidianDailyTodos.candidates.stopMonitor()
    if (result.ok) {
      setListeningForCandidatesState(result.running)
    }
  }

  const setListeningForCandidates = (value: boolean): void => {
    if (value) {
      void startMonitor()
    } else {
      void stopMonitor()
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
    candidateSourceImage,
    candidates,
    candidateError,
    busyCandidateIds,
    listeningForCandidates,
    monitorActivity,
    setCandidateSourceText,
    setCandidateSourceImage,
    setListeningForCandidates,
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
