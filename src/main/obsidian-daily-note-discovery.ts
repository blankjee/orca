import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { readdir, realpath, stat } from 'node:fs/promises'

import type { ObsidianDailyNoteSummary } from '../shared/obsidian-daily-todo'

const DISCOVERY_CACHE_MS = 30_000
const IGNORED_DIRECTORIES = new Set(['node_modules'])
const discoveryCache = new Map<string, { expiresAt: number; notes: ObsidianDailyNoteSummary[] }>()

export class ObsidianDailyNoteDiscoveryError extends Error {
  constructor(
    readonly code: 'invalid-directory' | 'directory-not-found',
    message: string
  ) {
    super(message)
  }
}

export async function resolveObsidianVaultRoot(rawDirectory: string): Promise<string> {
  const directory = rawDirectory.trim()
  if (!directory || !isAbsolute(directory)) {
    throw new ObsidianDailyNoteDiscoveryError(
      'invalid-directory',
      'Choose an absolute local Obsidian vault directory.'
    )
  }
  try {
    const selectedDirectory = await realpath(resolve(directory))
    if (!(await stat(selectedDirectory)).isDirectory()) {
      throw new Error('not a directory')
    }
    return await findNearestObsidianVaultRoot(selectedDirectory)
  } catch {
    throw new ObsidianDailyNoteDiscoveryError(
      'directory-not-found',
      'The configured Obsidian vault directory is unavailable.'
    )
  }
}

async function findNearestObsidianVaultRoot(selectedDirectory: string): Promise<string> {
  let candidate = selectedDirectory
  while (true) {
    try {
      if ((await stat(join(candidate, '.obsidian'))).isDirectory()) {
        // Why: older builds could persist the current month folder, which
        // silently hid the rest of the vault from history and analytics.
        return candidate
      }
    } catch {
      // A missing marker is expected while walking toward the filesystem root.
    }
    const parent = dirname(candidate)
    if (parent === candidate) {
      return selectedDirectory
    }
    candidate = parent
  }
}

export async function discoverObsidianDailyNotes(
  root: string,
  force = false
): Promise<ObsidianDailyNoteSummary[]> {
  const cached = discoveryCache.get(root)
  if (!force && cached && cached.expiresAt > Date.now()) {
    return cached.notes
  }

  const notes: ObsidianDailyNoteSummary[] = []
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop()
    if (!directory) {
      continue
    }
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (directory === root) {
        throw error
      }
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !IGNORED_DIRECTORIES.has(entry.name)) {
          pending.push(join(directory, entry.name))
        }
        continue
      }
      if (!entry.isFile()) {
        continue
      }
      const date = dateFromDailyNoteFilename(entry.name)
      if (!date) {
        continue
      }
      const filePath = join(directory, entry.name)
      const pathWithinRoot = relative(root, filePath)
      if (isPathInsideRoot(pathWithinRoot)) {
        notes.push({ date, filePath, relativePath: pathWithinRoot })
      }
    }
  }

  notes.sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date)
    return dateOrder || dailyNotePathScore(right) - dailyNotePathScore(left)
  })
  discoveryCache.set(root, {
    expiresAt: Date.now() + DISCOVERY_CACHE_MS,
    notes
  })
  return notes
}

export function chooseBestObsidianDailyNote(
  notes: readonly ObsidianDailyNoteSummary[],
  date: string
): ObsidianDailyNoteSummary | undefined {
  return notes
    .filter((note) => note.date === date)
    .sort((left, right) => {
      return dailyNotePathScore(right) - dailyNotePathScore(left)
    })[0]
}

function dailyNotePathScore(note: ObsidianDailyNoteSummary): number {
  const normalized = note.relativePath.toLowerCase()
  return /(^|[\\/])[^\\/]*(daily|日报|日记)/.test(normalized) ? 10 : 0
}

function dateFromDailyNoteFilename(fileName: string): string | null {
  const match = fileName.match(/^(\d{4})-(\d{2})-(\d{2})\.md$/)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return `${match[1]}-${match[2]}-${match[3]}`
}

function isPathInsideRoot(pathWithinRoot: string): boolean {
  return (
    pathWithinRoot !== '..' && !pathWithinRoot.startsWith(`..${sep}`) && !isAbsolute(pathWithinRoot)
  )
}
