import React from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { translate } from '@/i18n/i18n'
import { ObsidianDailyTodoCandidatePanel } from './obsidian-daily-todo-candidate-panel'

type ObsidianDailyTodoCandidateSheetProps = React.ComponentProps<
  typeof ObsidianDailyTodoCandidatePanel
> & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ObsidianDailyTodoCandidateSheet({
  open,
  onOpenChange,
  ...candidatePanelProps
}: ObsidianDailyTodoCandidateSheetProps): React.JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(640px,94vw)] md:hidden">
        <SheetHeader className="border-b border-border pr-12">
          <SheetTitle>
            {translate('auto.components.ObsidianDailyTodoWorkspace.capture', 'Todo capture')}
          </SheetTitle>
          <SheetDescription>
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.sheetDescription',
              'Monitor Mac apps for possible action items and review candidates before adding them.'
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-sleek">
          <ObsidianDailyTodoCandidatePanel {...candidatePanelProps} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
