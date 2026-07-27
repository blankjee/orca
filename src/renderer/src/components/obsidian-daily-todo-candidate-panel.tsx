import React, { useState } from 'react'
import { Check, ChevronDown, Inbox, LoaderCircle, Radio, Sparkles, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type {
  ObsidianDailyTodoCandidate,
  ObsidianDailyTodoCandidatePriority
} from '../../../shared/obsidian-daily-todo-candidate'

type ObsidianDailyTodoCandidatePanelProps = {
  candidates: readonly ObsidianDailyTodoCandidate[]
  sourceText: string
  analyzing: boolean
  listening: boolean
  busyCandidateIds: ReadonlySet<string>
  disabled: boolean
  errorMessage: string | null
  onSourceTextChange: (value: string) => void
  onListeningChange: (value: boolean) => void
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
  listening,
  busyCandidateIds,
  disabled,
  errorMessage,
  onSourceTextChange,
  onListeningChange,
  onAnalyze,
  onAccept,
  onDismiss
}: ObsidianDailyTodoCandidatePanelProps): React.JSX.Element {
  const [manualOpen, setManualOpen] = useState(false)
  const isMac = navigator.userAgent.includes('Mac')
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div className="flex min-w-0 gap-3">
          <div
            className={cn(
              'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground',
              listening && 'text-foreground'
            )}
          >
            <Radio className={listening ? 'size-4 animate-pulse' : 'size-4'} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              {translate(
                'auto.components.ObsidianDailyTodoCandidatePanel.monitorTitle',
                'macOS Todo monitoring'
              )}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              {isMac
                ? translate(
                    'auto.components.ObsidianDailyTodoCandidatePanel.monitorDescription',
                    'Orca watches accessible text changes while you use Feishu and other Mac apps. AI turns likely action items into candidates for your review.'
                  )
                : translate(
                    'auto.components.ObsidianDailyTodoCandidatePanel.macOnly',
                    'Automatic Todo monitoring is available on macOS.'
                  )}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {listening
                ? translate(
                    'auto.components.ObsidianDailyTodoCandidatePanel.monitorActive',
                    'Monitoring is active'
                  )
                : translate(
                    'auto.components.ObsidianDailyTodoCandidatePanel.monitorInactive',
                    'Monitoring is off'
                  )}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={listening ? 'outline' : 'default'}
          className="shrink-0"
          disabled={disabled || !isMac}
          onClick={() => onListeningChange(!listening)}
        >
          <Radio className={listening ? 'animate-pulse' : undefined} />
          {listening
            ? translate(
                'auto.components.ObsidianDailyTodoCandidatePanel.stopMonitoring',
                'Stop monitoring'
              )
            : translate(
                'auto.components.ObsidianDailyTodoCandidatePanel.startMonitoring',
                'Start monitoring'
              )}
        </Button>
      </div>

      {errorMessage ? (
        <p className="m-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold">
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.candidates',
              'Candidate Todos'
            )}
          </h3>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.candidateCount',
              '{{value0}} pending',
              { value0: candidates.length }
            )}
          </span>
        </div>
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
          <div className="flex flex-col items-center rounded-md border border-dashed border-border px-4 py-8 text-center">
            <Inbox className="mb-2 size-6 text-muted-foreground" />
            <p className="text-xs font-medium">
              {translate(
                'auto.components.ObsidianDailyTodoCandidatePanel.noPendingCandidates',
                'No pending candidates'
              )}
            </p>
            <p className="mt-1 max-w-sm text-[11px] leading-4 text-muted-foreground">
              {translate(
                'auto.components.ObsidianDailyTodoCandidatePanel.noPendingCandidatesDescription',
                'When monitoring detects a likely action item, it will appear here for confirmation.'
              )}
            </p>
          </div>
        )}
      </div>

      <Collapsible
        open={manualOpen}
        onOpenChange={setManualOpen}
        className="border-t border-border"
      >
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronDown
            className={cn('size-3.5 transition-transform', !manualOpen && '-rotate-90')}
          />
          <Sparkles className="size-3.5" />
          {translate(
            'auto.components.ObsidianDailyTodoCandidatePanel.manualCapture',
            'Analyze text manually'
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 border-t border-border p-4">
            <textarea
              value={sourceText}
              onChange={(event) => onSourceTextChange(event.target.value)}
              placeholder={translate(
                'auto.components.ObsidianDailyTodoCandidatePanel.placeholder',
                'Paste text to extract candidate Todos...'
              )}
              className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              disabled={disabled || analyzing}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                {translate(
                  'auto.components.ObsidianDailyTodoCandidatePanel.safeHint',
                  'Nothing is added until you confirm a candidate.'
                )}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onAnalyze}
                disabled={disabled || analyzing || !sourceText.trim()}
              >
                {analyzing ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                {translate(
                  'auto.components.ObsidianDailyTodoCandidatePanel.analyze',
                  'Extract Todos'
                )}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
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
    <article className="rounded-md border border-border/50 bg-background/65 p-2 shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={busy}
            className="h-8 text-xs"
          />
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
              {Math.round(candidate.confidence * 100)}%
            </span>
            <span>{priority}</span>
            {candidate.dueText ? <span>{candidate.dueText}</span> : null}
            {candidate.sourceApp ? <span>{candidate.sourceApp}</span> : null}
          </div>
          {candidate.context ? (
            <p className="text-[11px] text-muted-foreground">{candidate.context}</p>
          ) : null}
          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer">
              {translate('auto.components.ObsidianDailyTodoCandidatePanel.source', 'Original text')}
            </summary>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/35 p-2">
              {candidate.sourceText}
            </p>
          </details>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onAccept(candidate, { title, group, priority })}
            disabled={busy || !title.trim()}
          >
            {busy ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.addToToday',
              'Add to today'
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => onDismiss(candidate)}
            disabled={busy}
          >
            <Trash2 className="size-3.5" />
            {translate('auto.components.ObsidianDailyTodoCandidatePanel.dismiss', 'Dismiss')}
          </Button>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          {translate('auto.components.ObsidianDailyTodoCandidatePanel.group', 'Group')}
        </span>
        <Input
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          disabled={busy}
          className="h-7 max-w-44 text-xs"
        />
      </div>
    </article>
  )
}
