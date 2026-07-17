export function buildObsidianDailyNoteUrl(vault: string | null | undefined): string {
  const normalizedVault = vault?.trim()
  if (!normalizedVault) {
    return 'obsidian://daily'
  }

  // Why: Obsidian requires reserved characters (including slashes) to be
  // percent-encoded or the custom URI can target the wrong vault or action.
  return `obsidian://daily?vault=${encodeURIComponent(normalizedVault)}`
}

export function buildObsidianOpenNoteUrl(
  vault: string | null | undefined,
  relativePath: string
): string {
  const normalizedVault = vault?.trim()
  const normalizedPath = relativePath.replace(/\\/g, '/').replace(/\.md$/i, '')
  const vaultParameter = normalizedVault ? `vault=${encodeURIComponent(normalizedVault)}&` : ''
  return `obsidian://open?${vaultParameter}file=${encodeURIComponent(normalizedPath)}`
}
