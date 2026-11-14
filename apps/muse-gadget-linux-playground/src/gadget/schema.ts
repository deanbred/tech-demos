import { PARAM_TYPES, type CommandSummary, type ParamSpec, type ParamType } from '../shared/api'

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_TIMEOUT_MS = 600_000
const MAX_NAME_LEN = 64
const NAME_RE = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/
const RESERVED_PREFIXES = ['system.', 'file.', 'device.', 'link.'] as const
const FILE_KEYS = new Set(['description', 'exec', 'required', 'optional', 'timeout_ms'])

export class InvalidCommand extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidCommand'
  }
}

type CommandFile = {
  description?: unknown
  exec?: unknown
  required?: unknown
  optional?: unknown
  timeout_ms?: unknown
}

export function parseCommand(name: string, data: unknown): Omit<CommandSummary, 'argv'> {
  if (name.length > MAX_NAME_LEN || !NAME_RE.test(name)) {
    throw new InvalidCommand(
      'the file name must be the command name, like sensors.read.json (lowercase words joined by dots)',
    )
  }
  if (RESERVED_PREFIXES.some(prefix => name.startsWith(prefix))) {
    throw new InvalidCommand(`names starting with ${RESERVED_PREFIXES.join(', ')} are reserved`)
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new InvalidCommand('the file must hold a JSON object')
  }
  const record = data as CommandFile & Record<string, unknown>
  const unknown = Object.keys(record).filter(key => !FILE_KEYS.has(key))
  if (unknown.length > 0) {
    throw new InvalidCommand(`unknown keys: ${unknown.sort().join(', ')}`)
  }
  const description = record.description
  if (typeof description !== 'string' || description.trim() === '') {
    throw new InvalidCommand('description is required')
  }
  const exec = record.exec
  if (!Array.isArray(exec) || exec.length === 0 || exec.some(arg => typeof arg !== 'string' || arg === '')) {
    throw new InvalidCommand('exec must be a list of strings: the program and its arguments')
  }
  const required = parseParams(record.required ?? {}, 'required')
  const optional = parseParams(record.optional ?? {}, 'optional')
  const overlap = Object.keys(required).filter(key => key in optional)
  if (overlap.length > 0) {
    throw new InvalidCommand(`both required and optional: ${overlap.sort().join(', ')}`)
  }
  const timeoutMs = record.timeout_ms ?? DEFAULT_TIMEOUT_MS
  if (typeof timeoutMs !== 'number' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new InvalidCommand(`timeout_ms must be an integer from 1 to ${MAX_TIMEOUT_MS}`)
  }
  return {
    name,
    description,
    exec,
    required,
    optional,
    timeoutMs,
  }
}

function parseParams(value: unknown, key: string): Record<string, ParamSpec> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidCommand(`${key} must be an object of parameters`)
  }
  const record = value as Record<string, unknown>
  const params: Record<string, ParamSpec> = {}
  for (const [name, spec] of Object.entries(record)) {
    if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
      throw new InvalidCommand(paramSpecMessage(key, name))
    }
    const fields = spec as Record<string, unknown>
    const keys = Object.keys(fields)
    const type = fields.type
    const description = fields.description
    if (
      keys.length !== 2 ||
      !keys.includes('type') ||
      !keys.includes('description') ||
      typeof type !== 'string' ||
      !isParamType(type) ||
      typeof description !== 'string'
    ) {
      throw new InvalidCommand(paramSpecMessage(key, name))
    }
    params[name] = { type, description }
  }
  return params
}

function paramSpecMessage(key: string, name: string): string {
  return `${key}.${name} must be {"type": ..., "description": ...} with type one of ${PARAM_TYPES.join(', ')}`
}

function isParamType(value: string): value is ParamType {
  return (PARAM_TYPES as readonly string[]).includes(value)
}

export function checkParams(command: Pick<CommandSummary, 'name' | 'required' | 'optional'>, params: unknown): Record<string, unknown> {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    throw new InvalidCommand('parameters must be a JSON object')
  }
  const record = params as Record<string, unknown>
  for (const name of Object.keys(command.required)) {
    if (!(name in record)) throw new InvalidCommand(`${name} is required`)
  }
  const checked: Record<string, unknown> = {}
  const specs = { ...command.required, ...command.optional }
  for (const [name, spec] of Object.entries(specs)) {
    if (!(name in record)) continue
    const value = record[name]
    if (!valueMatches(spec.type, value)) {
      const article = 'aeiou'.includes(spec.type[0] ?? '') ? 'an' : 'a'
      throw new InvalidCommand(`${name} must be ${article} ${spec.type}`)
    }
    checked[name] = value
  }
  return checked
}

function valueMatches(type: ParamType, value: unknown): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    case 'array':
      return Array.isArray(value)
    default: {
      const unreachable: never = type
      return unreachable
    }
  }
}
