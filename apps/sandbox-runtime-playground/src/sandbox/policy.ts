import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime'

/**
 * The playground's editable policy. Mirrors the parts of
 * SandboxRuntimeConfig the UI exposes:
 * - reads are deny-then-allow (allowRead re-allows inside denyRead)
 * - writes are allow-only (denyWrite carves exceptions out of allowWrite)
 * - network is allow-only (deniedDomains takes precedence)
 */
export interface Policy {
  allowedDomains: string[]
  deniedDomains: string[]
  denyRead: string[]
  allowRead: string[]
  allowWrite: string[]
  denyWrite: string[]
}

export const DEFAULT_POLICY: Policy = {
  allowedDomains: ['api.github.com'],
  deniedDomains: [],
  denyRead: ['~/.ssh', './fixtures/secrets'],
  allowRead: [],
  allowWrite: ['.'],
  denyWrite: [],
}

export function toRuntimeConfig(policy: Policy): SandboxRuntimeConfig {
  return {
    network: {
      allowedDomains: policy.allowedDomains,
      deniedDomains: policy.deniedDomains,
    },
    filesystem: {
      denyRead: policy.denyRead,
      allowRead: policy.allowRead,
      allowWrite: policy.allowWrite,
      denyWrite: policy.denyWrite,
    },
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

/** Coerce an untrusted request body into a Policy. */
export function parsePolicy(value: unknown): Policy {
  const raw = (value ?? {}) as Record<string, unknown>
  return {
    allowedDomains: asStringArray(raw.allowedDomains),
    deniedDomains: asStringArray(raw.deniedDomains),
    denyRead: asStringArray(raw.denyRead),
    allowRead: asStringArray(raw.allowRead),
    allowWrite: asStringArray(raw.allowWrite),
    denyWrite: asStringArray(raw.denyWrite),
  }
}
