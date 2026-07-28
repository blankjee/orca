import { useEffect, useState } from 'react'

const WIDE_WORKSPACE_QUERY = '(min-width: 768px)'

export function useIsWideObsidianDailyTodoWorkspace(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE_WORKSPACE_QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(WIDE_WORKSPACE_QUERY)
    const update = (): void => setWide(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return wide
}
