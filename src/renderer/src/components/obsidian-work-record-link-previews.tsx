import React, { useEffect, useMemo, useState } from 'react'
import { ClipboardList, ExternalLink, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import {
  extractObsidianWorkRecordLinkTargets,
  type ObsidianWorkRecordResolvedLink
} from '../../../shared/obsidian-work-record-link'

export function ObsidianWorkRecordLinkPreviews({
  body
}: {
  body: string
}): React.JSX.Element | null {
  const targets = useMemo(() => extractObsidianWorkRecordLinkTargets(body), [body])
  const targetKey = targets.map((target) => target.url).join('\n')
  const [links, setLinks] = useState<ObsidianWorkRecordResolvedLink[]>([])

  useEffect(() => {
    let cancelled = false
    setLinks([])
    if (!targetKey) {
      return
    }
    // Why: resolving on a short delay avoids a network request for every keystroke while pasting.
    const timeout = window.setTimeout(() => {
      void window.api.obsidianDailyTodos
        .resolveWorkRecordLinks({ urls: targetKey.split('\n') })
        .then((result) => {
          if (!cancelled) {
            setLinks(result.links)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLinks([])
          }
        })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [targetKey])

  if (links.length === 0) {
    return null
  }

  return (
    <div className="grid gap-1.5">
      {links.map((link) => (
        <Button
          key={link.url}
          type="button"
          variant="outline"
          className="h-auto min-h-10 w-full justify-start gap-2 px-3 py-2 text-left"
          onClick={() => void window.api.shell.openUrl(link.url)}
        >
          {link.provider === 'meego' ? (
            <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <FileText className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{link.title}</span>
            <span className="block truncate text-[11px] font-normal text-muted-foreground">
              {link.provider === 'meego'
                ? translate('auto.components.ObsidianWorkRecordLinkPreviews.meego', 'Meego')
                : translate(
                    'auto.components.ObsidianWorkRecordLinkPreviews.feishuDocument',
                    'Feishu document'
                  )}
            </span>
          </span>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      ))}
    </div>
  )
}
