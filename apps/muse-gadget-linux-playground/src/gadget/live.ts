import { existsSync } from 'node:fs'
import type { LiveStatus } from '../shared/api'

const REQUIREMENTS = [
  'An SDK token from https://gadgets.muse.ai/settings/sdk-tokens (Account > SDK tokens).',
  'The Muse app, with Settings > Devices > Developer mode turned on, to pair the gadget.',
  'Bluetooth LE on the machine. Pairing is what turns the SDK token into a device session.',
  'This playground does not run install.sh, start the musegadget systemd service, or use sudo.',
]

const TOKEN_RE = /^mgst_[A-Za-z0-9_-]{8,}$/

export type LiveFacts = {
  token: string | null
  apiReachable: boolean | null
  pairingStorePresent: boolean
  serviceInstalled: boolean
}

export function readSdkToken(): string | null {
  const token = process.env.MUSE_SDK_TOKEN?.trim()
  return token ? token : null
}

export function describeLive(facts: LiveFacts): LiveStatus {
  if (!facts.token) {
    return {
      mode: 'mock',
      connected: false,
      tokenPresent: false,
      attempted: false,
      apiHost: 'api.muse.ai',
      apiReachable: null,
      pairingStorePresent: false,
      serviceInstalled: false,
      message: 'Mock mode. No MUSE_SDK_TOKEN is set, so this page calls the gadget the way Muse would.',
      requirements: REQUIREMENTS,
    }
  }

  const reasons: string[] = []
  if (!TOKEN_RE.test(facts.token)) {
    reasons.push('MUSE_SDK_TOKEN is set, but it does not look like an mgst_… SDK token.')
  }
  if (facts.apiReachable === false) {
    reasons.push('Could not reach https://api.muse.ai.')
  }
  if (!facts.pairingStorePresent) {
    reasons.push(
      'No pairing store at /var/lib/musegadget/pairing.json. An SDK token is not a device bearer, so it cannot open a Noise session on its own.',
    )
  }
  if (!facts.serviceInstalled) {
    reasons.push('The musegadget client is not installed here, and this app will not install it.')
  }
  if (reasons.length === 0) {
    reasons.push(
      'A pairing store is present, but this playground does not attach to the official client or complete a Noise handshake.',
    )
  }

  return {
    mode: 'mock',
    connected: false,
    tokenPresent: true,
    attempted: true,
    apiHost: 'api.muse.ai',
    apiReachable: facts.apiReachable,
    pairingStorePresent: facts.pairingStorePresent,
    serviceInstalled: facts.serviceInstalled,
    message: `Live mode failed. ${reasons.join(' ')} Mock mode is still calling commands.`,
    requirements: REQUIREMENTS,
  }
}

export async function probeLive(token: string | null): Promise<LiveStatus> {
  if (!token) return describeLive({ token: null, apiReachable: null, pairingStorePresent: false, serviceInstalled: false })
  const [apiReachable, pairingStorePresent, serviceInstalled] = await Promise.all([
    probeApi(),
    Promise.resolve(existsSync('/var/lib/musegadget/pairing.json')),
    Promise.resolve(servicePresent()),
  ])
  return describeLive({ token, apiReachable, pairingStorePresent, serviceInstalled })
}

function servicePresent(): boolean {
  return existsSync('/opt/musegadget') || Bun.which('musegadget') !== null
}

async function probeApi(): Promise<boolean> {
  try {
    await fetch('https://api.muse.ai/', {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(4000),
    })
    return true
  } catch {
    return false
  }
}
