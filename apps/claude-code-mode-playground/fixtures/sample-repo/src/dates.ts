export function daysBetween(a: Date, b: Date): number {
  // TODO: this breaks across DST transitions; compare UTC midnights instead
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.floor(ms / 86_400_000)
}

export function formatISODate(date: Date): string {
  // TODO: validate that `date` is not an Invalid Date before formatting
  return date.toISOString().slice(0, 10)
}

export function addDays(date: Date, days: number): Date {
  // TODO: document that this mutates nothing but still returns local time
  const copy = new Date(date.getTime())
  copy.setDate(copy.getDate() + days)
  return copy
}
