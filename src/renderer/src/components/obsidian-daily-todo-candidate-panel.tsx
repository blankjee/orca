import React, { useState } from 'react'
import { Check, LoaderCircle, Sparkles, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { translate } from '@/i18n/i18n'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidatePriority
} from '../../../shared/obsidian-daily-todo-candidate'

type ObsidianDailyTodoCandidatePanelProps = {
  candidates: readonly ObsidianDailyTodoCandidate[]
  sourceText: string
  analyzing: boolean
  busyCandidateIds: ReadonlySet<string>
  disabled: boolean
  errorMessage: string | null
  onSourceTextChange: (value: string) => void
  onAnalyze: () => void
  onAccept: (candidate: ObsidianDailyTodoCandidate, overrides: CandidateOverrides) => void
  onDismiss: (candidate: ObsidianDailyTodoCandidate) => void
}

type CandidateOverrides = {
  title: string
  group: string
  priority: ObsidianDailyTodoCandidatePriority | null
}

export function ObsidianDailyTodoCandidatePanel({
  candidates,
  sourceText,
  analyzing,
  busyCandidateIds,
  disabled,
  errorMessage,
  onSourceTextChange,
  onAnalyze,
  onAccept,
  onDismiss
}: ObsidianDailyTodoCandidatePanelProps): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-obsidian-daily-compose-accent/25 bg-[color-mix(in_srgb,var(--obsidian-daily-compose-accent)_3%,var(--card))]">
      <div className="flex items-start justify-between gap-3 border-b border-border/50 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-obsidian-daily-compose-accent" />
            {translate('auto.components.ObsidianDailyTodoCandidatePanel.title', 'AI Capture')}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.description',
              'Paste meeting notes or chat text. Orca extracts candidate Todos for review before writing to Obsidian.'
            )}
          </p>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <textarea
          value={sourceText}
          onChange={(event) => onSourceTextChange(event.target.value)}
          placeholder={translate(
            'auto.components.ObsidianDailyTodoCandidatePanel.placeholder',
            'Paste text to extract candidate Todos...'
          )}
          className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          disabled={disabled || analyzing}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.safeHint',
              'Nothing is added until you click Add to today.'
            )}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onAnalyze}
            disabled={disabled || analyzing || !sourceText.trim()}
          >
            {analyzing ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {translate('auto.components.ObsidianDailyTodoCandidatePanel.analyze', 'Extract Todos')}
          </Button>
        </div>
        {errorMessage ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
        {candidates.length > 0 ? (
          <div className="space-y-2">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                busy={busyCandidateIds.has(candidate.id)}
                onAccept={onAccept}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border/70 bg-background/60 px-3 py-3 text-center text-xs text-muted-foreground">
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.empty',
              'No AI candidates yet. Paste text above to extract candidate Todos.'
            )}
          </p>
        )}
      </div>
    </section>
  )
}

function CandidateCard({
  candidate,
  busy,
  onAccept,
  onDismiss
}: {
  candidate: ObsidianDailyTodoCandidate
  busy: boolean
  onAccept: (candidate: ObsidianDailyTodoCandidate, overrides: CandidateOverrides) => void
  onDismiss: (candidate: ObsidianDailyTodoCandidate) => void
}): React.JSX.Element {
  const [title, setTitle] = useState(candidate.title)
  const [group, setGroup] = useState(candidate.group || '今日任务')
  const priority = candidate.priority ?? 'P2'
  return (
    <article className="rounded-lg border border-border/60 bg-card p-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              {Math.round(candidate.confidence * 100)}%
            </span>
            <span>{priority}</span>
            {candidate.dueText ? <span>{candidate.dueText}</span> : null}
          </div>
          {candidate.context ? (
            <p className="text-xs text-muted-foreground">{candidate.context}</p>
          ) : null}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">
              {translate('auto.components.ObsidianDailyTodoCandidatePanel.source', 'Original text')}
            </summary>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-2">
              {candidate.sourceText}
            </p>
          </details>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => onAccept(candidate, { title, group, priority })}
            disabled={busy || !title.trim()}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <Check />}
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.addToToday',
              'Add to today'
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onDismiss(candidate)}
            disabled={busy}
          >
            <Trash2 />
            {translate('auto.components.ObsidianDailyTodoCandidatePanel.dismiss', 'Dismiss')}
          </Button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {translate('auto.components.ObsidianDailyTodoCandidatePanel.group', 'Group')}
        </span>
        <Input
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          disabled={busy}
          className="h-8 max-w-52"
        />
      </div>
    </article>
  )
}
