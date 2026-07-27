import React, { useState } from 'react'
import { LoaderCircle, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { translate } from '@/i18n/i18n'
import type { ObsidianDailyTodoItem } from '../../../shared/obsidian-daily-todo'
import type { ObsidianDailyWorkRecord } from '../../../shared/obsidian-daily-work-record'
import { ObsidianWorkRecordLinkPreviews } from './obsidian-work-record-link-previews'

export function ObsidianDailyWorkRecordSheet({
  todo,
  record,
  open,
  saving,
  onOpenChange,
  onSave
}: {
  todo: ObsidianDailyTodoItem | null
  record: ObsidianDailyWorkRecord | null
  open: boolean
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (body: string, expectedBody: string | null) => void
}): React.JSX.Element {
  // Why: the parent keys this sheet by Todo so background polling cannot replace an in-progress draft.
  const [body, setBody] = useState(record?.body ?? '')
  const [expectedBody] = useState<string | null>(record?.body ?? null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[min(560px,88vw)]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader className="border-b border-border pr-12">
          <SheetDescription>
            {translate('auto.components.ObsidianDailyWorkRecordSheet.eyebrow', 'Work record')}
          </SheetDescription>
          <SheetTitle className="break-words">{todo?.text ?? ''}</SheetTitle>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            onSave(body, expectedBody)
          }}
        >
          <div className="min-h-0 flex-1 p-4">
            <div className="flex h-full min-h-64 flex-col gap-2">
              <label className="flex min-h-0 flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">
                {translate('auto.components.ObsidianDailyWorkRecordSheet.content', 'Content')}
                <textarea
                  autoFocus
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={translate(
                    'auto.components.ObsidianDailyWorkRecordSheet.placeholder',
                    'Record progress, decisions, links, and follow-ups in Markdown…'
                  )}
                  className="min-h-0 flex-1 resize-none rounded-md border border-input bg-editor-surface p-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <ObsidianWorkRecordLinkPreviews body={body} />
            </div>
          </div>
          <SheetFooter className="flex-row justify-end border-t border-border">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {translate('auto.components.ObsidianDailyWorkRecordSheet.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!todo || saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
              {translate('auto.components.ObsidianDailyWorkRecordSheet.save', 'Save')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
