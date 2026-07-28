export type ObsidianWorkRecordLinkProvider = 'meego' | 'lark-doc'

export type ObsidianWorkRecordLinkTarget = {
  url: string
  provider: ObsidianWorkRecordLinkProvider
}

export type ObsidianWorkRecordResolvedLink = ObsidianWorkRecordLinkTarget & {
  title: string
}

export type ObsidianWorkRecordLinkResolveInput = {
  urls: string[]
}

export type ObsidianWorkRecordLinkResolveResult = {
  links: ObsidianWorkRecordResolvedLink[]
}

const MAX_LINKS_PER_RECORD = 12
const URL_PATTERN = /https:\/\/[^\s<>"']+/gi
const TRAILING_PUNCTUATION_PATTERN = /[),.;:!?，。；：！？、\]】》」』]+$/

export function extractObsidianWorkRecordLinkTargets(body: string): ObsidianWorkRecordLinkTarget[] {
  const targets: ObsidianWorkRecordLinkTarget[] = []
  const seen = new Set<string>()
  for (const match of body.matchAll(URL_PATTERN)) {
    const rawUrl = match[0].replace(TRAILING_PUNCTUATION_PATTERN, '')
    const target = classifyObsidianWorkRecordLink(rawUrl)
    if (!target || seen.has(target.url)) {
      continue
    }
    seen.add(target.url)
    targets.push(target)
    if (targets.length >= MAX_LINKS_PER_RECORD) {
      break
    }
  }
  return targets
}

export function classifyObsidianWorkRecordLink(
  rawUrl: string
): ObsidianWorkRecordLinkTarget | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    return null
  }

  const hostname = url.hostname.toLowerCase()
  const pathname = url.pathname.toLowerCase()
  const isLarkHost =
    isHostOrSubdomain(hostname, 'larkoffice.com') ||
    isHostOrSubdomain(hostname, 'feishu.cn') ||
    isHostOrSubdomain(hostname, 'larksuite.com')
  if (!isLarkHost) {
    return null
  }

  if (
    hostname.startsWith('meego.') ||
    hostname.startsWith('meegle.') ||
    /\/(?:story|work_item|workitem)\//.test(pathname)
  ) {
    return { url: url.href, provider: 'meego' }
  }
  if (/^\/(?:wiki|docx|docs|sheets|base)\//.test(pathname)) {
    return { url: url.href, provider: 'lark-doc' }
  }
  return null
}

function isHostOrSubdomain(hostname: string, root: string): boolean {
  return hostname === root || hostname.endsWith(`.${root}`)
}
