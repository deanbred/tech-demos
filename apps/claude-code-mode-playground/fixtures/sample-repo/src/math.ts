export function clamp(value: number, min: number, max: number): number {
  // TODO: throw a RangeError when min > max instead of silently swapping
  return Math.min(Math.max(value, min), max)
}

export function mean(values: number[]): number {
  // TODO: return NaN (or throw) for an empty array instead of dividing by zero
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function roundTo(value: number, decimals: number): number {
  // TODO: guard against negative `decimals`
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
