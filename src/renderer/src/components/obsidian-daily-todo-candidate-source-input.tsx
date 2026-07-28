import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Sparkles, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import {
  isObsidianDailyTodoCandidateImageMimeType,
  OBSIDIAN_DAILY_TODO_CANDIDATE_IMAGE_MAX_BYTES,
  type ObsidianDailyTodoCandidateSourceImage
} from '../../../shared/obsidian-daily-todo-candidate'

type CandidateSourceInputProps = {
  sourceText: string
  sourceImage: ObsidianDailyTodoCandidateSourceImage | null
  analyzing: boolean
  disabled: boolean
  onSourceTextChange: (value: string) => void
  onSourceImageChange: (value: ObsidianDailyTodoCandidateSourceImage | null) => void
  onAnalyze: () => void
}

export function ObsidianDailyTodoCandidateSourceInput({
  sourceText,
  sourceImage,
  analyzing,
  disabled,
  onSourceTextChange,
  onSourceImageChange,
  onAnalyze
}: CandidateSourceInputProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const attachImage = async (file: File): Promise<void> => {
    setImageError(null)
    if (
      !isObsidianDailyTodoCandidateImageMimeType(file.type) ||
      file.size <= 0 ||
      file.size > OBSIDIAN_DAILY_TODO_CANDIDATE_IMAGE_MAX_BYTES
    ) {
      setImageError(
        translate(
          'auto.components.ObsidianDailyTodoCandidatePanel.imageInvalid',
          'Use a PNG, JPEG, WebP, or GIF image up to 8 MB.'
        )
      )
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      onSourceImageChange({ dataUrl, mimeType: file.type, name: file.name || undefined })
    } catch {
      setImageError(
        translate(
          'auto.components.ObsidianDailyTodoCandidatePanel.imageReadFailed',
          'Could not read this image.'
        )
      )
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    const image = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .find((file): file is File => Boolean(file?.type.startsWith('image/')))
    if (image) {
      // Why: keep any accompanying plain text paste while attaching the image
      // as a second source, which is common for copied chat snippets.
      void attachImage(image)
    }
  }

  return (
    <div className="space-y-2 border-t border-border p-4">
      <textarea
        value={sourceText}
        onChange={(event) => onSourceTextChange(event.target.value)}
        onPaste={handlePaste}
        placeholder={translate(
          'auto.components.ObsidianDailyTodoCandidatePanel.placeholder',
          'Paste chat text or a screenshot. AI will extract goals, context, owners, timing, and expected results.'
        )}
        className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        disabled={disabled || analyzing}
      />

      {sourceImage ? (
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-2">
          <img
            src={sourceImage.dataUrl}
            alt={translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.imagePreview',
              'Pasted image preview'
            )}
            className="h-20 w-28 rounded-md border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {sourceImage.name ||
                translate(
                  'auto.components.ObsidianDailyTodoCandidatePanel.pastedImage',
                  'Pasted screenshot'
                )}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {translate(
                'auto.components.ObsidianDailyTodoCandidatePanel.imageReady',
                'The image and any pasted text will be analyzed together.'
              )}
            </p>
          </div>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.removeImage',
              'Remove image'
            )}
            onClick={() => onSourceImageChange(null)}
            disabled={analyzing}
          >
            <X />
          </Button>
        </div>
      ) : null}

      {imageError ? <p className="text-[11px] text-destructive">{imageError}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void attachImage(file)
              }
              event.target.value = ''
            }}
          />
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || analyzing}
          >
            <ImagePlus />
            {translate('auto.components.ObsidianDailyTodoCandidatePanel.addImage', 'Add image')}
          </Button>
          <span className="truncate text-[11px] text-muted-foreground">
            {translate(
              'auto.components.ObsidianDailyTodoCandidatePanel.pasteImageHint',
              'You can paste a screenshot directly.'
            )}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onAnalyze}
          disabled={disabled || analyzing || (!sourceText.trim() && !sourceImage)}
        >
          {analyzing ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          {translate('auto.components.ObsidianDailyTodoCandidatePanel.analyze', 'Analyze content')}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {translate(
          'auto.components.ObsidianDailyTodoCandidatePanel.safeHint',
          'Nothing is added until you confirm a candidate.'
        )}
      </p>
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Image did not produce a data URL'))
      }
    })
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Image read failed')))
    reader.readAsDataURL(file)
  })
}
