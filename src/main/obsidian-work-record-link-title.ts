import { session } from 'electron'

import {
  classifyObsidianWorkRecordLink,
  type ObsidianWorkRecordLinkResolveInput,
  type ObsidianWorkRecordLinkResolveResult,
  type ObsidianWorkRecordResolvedLink
} from '../shared/obsidian-work-record-link'
import { browserSessionRegistry } from './browser/browser-session-registry'

const MAX_HTML_BYTES = 1_000_000
const CACHE_DURATION_MS = 10 * 60 * 1_000
const FAILURE_CACHE_DURATION_MS = 30_000
const titleCache = new Map<
  string,
  { expiresAt: number; value: ObsidianWorkRecordResolvedLink | null }
>()

export async function resolveObsidianWorkRecordLinkTitles(
  input: ObsidianWorkRecordLinkResolveInput
): Promise<ObsidianWorkRecordLinkResolveResult> {
  const targets = [
    ...new Map(
      input.urls.flatMap((url) => {
        const target = classifyObsidianWorkRecordLink(url)
        return target ? [[target.url, target] as const] : []
      })
    ).values()
  ]
  const partitions = [
    ...new Set([
      browserSessionRegistry.resolvePartition(null),
      ...browserSessionRegistry.listProfiles().map((profile) => profile.partition)
    ])
  ]
  const links = await Promise.all(
    targets.map(async (target): Promise<ObsidianWorkRecordResolvedLink | null> => {
      const cached = titleCache.get(target.url)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value
      }
      let title: string | null = null
      for (const partition of partitions) {
        const browserSession = session.fromPartition(partition)
        title = await fetchObsidianWorkRecordLinkTitle(target.url, (url, init) =>
          browserSession.fetch(url, init)
        )
        if (title) {
          break
        }
      }
      const value = title ? { ...target, title } : null
      titleCache.set(target.url, {
        expiresAt: Date.now() + (value ? CACHE_DURATION_MS : FAILURE_CACHE_DURATION_MS),
        value
      })
      return value
    })
  )
  return { links: links.filter((link) => link !== null) }
}

export async function fetchObsidianWorkRecordLinkTitle(
  initialUrl: string,
  fetchPage: (url: string, init: RequestInit) => Promise<Response>
): Promise<string | null> {
  let currentUrl = initialUrl
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      if (!classifyObsidianWorkRecordLink(currentUrl)) {
        return null
      }
      const response = await fetchPage(currentUrl, {
        credentials: 'include',
        headers: { Accept: 'text/html,application/xhtml+xml' },
        redirect: 'manual',
        signal: controller.signal
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) {
          return null
        }
        currentUrl = new URL(location, currentUrl).href
        continue
      }
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
        return null
      }
      const declaredLength = Number(response.headers.get('content-length') ?? 0)
      if (declaredLength > MAX_HTML_BYTES) {
        return null
      }
      const html = await readBoundedHtml(response)
      return html === null ? null : extractPageTitle(html)
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export function extractPageTitle(html: string): string | null {
  const metadataTitle = (html.match(/<meta\b[^>]*>/gi) ?? []).find((tag) => {
    const key = getHtmlAttribute(tag, 'property') ?? getHtmlAttribute(tag, 'name')
    return key?.toLowerCase() === 'og:title' || key?.toLowerCase() === 'twitter:title'
  })
  const rawTitle =
    (metadataTitle ? getHtmlAttribute(metadataTitle, 'content') : null) ??
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
    ''
  const title = decodeHtmlEntities(rawTitle).replace(/\s+/g, ' ').trim()
  if (!title || /^(?:飞书|飞书云文档|飞书项目|lark|meego|登录)$/i.test(title)) {
    return null
  }
  return title.replace(/\s+(?:[-|｜])\s+(?:飞书云文档|飞书项目|Lark|Meego)$/i, '').trim()
}

function getHtmlAttribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))
  return match?.[1] ?? match?.[2] ?? null
}

async function readBoundedHtml(response: Response): Promise<string | null> {
  if (!response.body) {
    return ''
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytesRead = 0
  let html = ''
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) {
      return html + decoder.decode()
    }
    bytesRead += chunk.value.byteLength
    if (bytesRead > MAX_HTML_BYTES) {
      await reader.cancel()
      return null
    }
    html += decoder.decode(chunk.value, { stream: true })
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
}
