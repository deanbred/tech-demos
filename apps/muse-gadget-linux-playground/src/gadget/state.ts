import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export type GadgetState = {
  lightOn: boolean
}

export function defaultStateFile(appRoot: string): string {
  return path.join(appRoot, '.cache', 'gadget-state.json')
}

export function stateFilePath(appRoot: string): string {
  const override = process.env.GADGET_STATE_PATH?.trim()
  return override ? override : defaultStateFile(appRoot)
}

export function readLight(file: string): boolean {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as { lightOn?: unknown }
    return data.lightOn === true
  } catch {
    return false
  }
}

export function writeLight(file: string, lightOn: boolean): void {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify({ lightOn }))
}
