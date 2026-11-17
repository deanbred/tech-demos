export function truncate(text: string, maxLength: number): string {
  // TODO: don't cut surrogate pairs in half (use Intl.Segmenter)
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}

export function slugify(text: string): string {
  // TODO: strip diacritics before replacing (normalize('NFD'))
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function capitalize(text: string): string {
  // TODO: handle locale-aware casing (e.g. Turkish dotless i)
  return text.charAt(0).toUpperCase() + text.slice(1)
}
