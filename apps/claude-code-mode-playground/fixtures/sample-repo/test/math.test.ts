import { clamp, mean } from '../src/math'

// TODO: port these ad-hoc assertions to bun:test
function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
}

assertEqual(clamp(5, 0, 10), 5, 'clamp in range')
assertEqual(clamp(-5, 0, 10), 0, 'clamp below range')
assertEqual(mean([2, 4, 6]), 4, 'mean of evens')

console.log('ok')
