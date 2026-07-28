import { translate } from '@/i18n/i18n'
import type { ObsidianDailyTodoCandidate } from '../../../shared/obsidian-daily-todo-candidate'

export function ObsidianDailyTodoCandidateDetails({
  candidate
}: {
  candidate: ObsidianDailyTodoCandidate
}): React.JSX.Element | null {
  const fields = [
    {
      label: translate('auto.components.ObsidianDailyTodoCandidatePanel.goal', 'Goal'),
      value: candidate.goal
    },
    {
      label: translate('auto.components.ObsidianDailyTodoCandidatePanel.background', 'Background'),
      value: candidate.background || candidate.context
    },
    {
      label: translate('auto.components.ObsidianDailyTodoCandidatePanel.assignee', 'Owner'),
      value: candidate.assignee
    },
    {
      label: translate('auto.components.ObsidianDailyTodoCandidatePanel.dueTime', 'Expected time'),
      value: candidate.dueText
    },
    {
      label: translate(
        'auto.components.ObsidianDailyTodoCandidatePanel.expectedOutcome',
        'Expected result'
      ),
      value: candidate.expectedOutcome
    }
  ].filter((field): field is { label: string; value: string } => Boolean(field.value))

  if (fields.length === 0 && !candidate.keyPoints?.length && !candidate.uncertainties?.length) {
    return null
  }

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2.5">
      <p className="text-[11px] font-semibold text-foreground">
        {translate(
          'auto.components.ObsidianDailyTodoCandidatePanel.taskUnderstanding',
          'Task understanding'
        )}
      </p>
      {fields.length > 0 ? (
        <dl className="grid gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-muted-foreground">{field.label}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <CandidateDetailList
        label={translate('auto.components.ObsidianDailyTodoCandidatePanel.keyPoints', 'Key points')}
        values={candidate.keyPoints}
      />
      <CandidateDetailList
        label={translate(
          'auto.components.ObsidianDailyTodoCandidatePanel.uncertainties',
          'Needs confirmation'
        )}
        values={candidate.uncertainties}
      />
    </div>
  )
}

function CandidateDetailList({
  label,
  values
}: {
  label: string
  values?: readonly string[]
}): React.JSX.Element | null {
  if (!values?.length) {
    return null
  }
  return (
    <div className="text-[11px]">
      <p className="text-muted-foreground">{label}</p>
      <ul className="mt-1 space-y-0.5 pl-4 text-foreground">
        {values.map((value) => (
          <li key={value} className="list-disc">
            {value}
          </li>
        ))}
      </ul>
    </div>
  )
}
