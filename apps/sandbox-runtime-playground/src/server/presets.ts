export interface Preset {
  id: string
  name: string
  description: string
  command: string
  expectation: 'blocked' | 'allowed'
}

/**
 * Preset attacks (and one allowed control) evaluated against the policy in
 * the editor. With the default policy: ~/.ssh and ./fixtures/secrets are
 * denied reads, only "." is writable, and only api.github.com is reachable.
 */
export const PRESETS: Preset[] = [
  {
    id: 'steal-ssh-keys',
    name: 'Read ~/.ssh keys',
    description: 'Dump any private keys in the SSH directory.',
    command: 'cat ~/.ssh/id_*',
    expectation: 'blocked',
  },
  {
    id: 'read-env-secrets',
    name: 'Read .env secrets',
    description: 'Exfiltrate API keys from a project .env file (a fake one ships in fixtures/secrets/).',
    command: 'cat fixtures/secrets/.env',
    expectation: 'blocked',
  },
  {
    id: 'curl-blocked-domain',
    name: 'curl a blocked domain',
    description: 'Phone home to a domain that is not on the network allowlist.',
    command: 'curl -sS --max-time 8 https://example.com',
    expectation: 'blocked',
  },
  {
    id: 'write-outside-project',
    name: 'Write outside the project',
    description: 'Drop a file in /tmp, outside the allowWrite roots.',
    command: 'echo pwned > /tmp/srt-playground-escape.txt && cat /tmp/srt-playground-escape.txt',
    expectation: 'blocked',
  },
  {
    id: 'allowed-fetch',
    name: 'Allowed: fetch api.github.com',
    description: 'A request to a domain on the allowlist goes straight through.',
    command: 'curl -sS --max-time 8 https://api.github.com/zen && echo',
    expectation: 'allowed',
  },
  {
    id: 'allowed-write',
    name: 'Allowed: write in the project',
    description: 'Writing inside the allowWrite roots works normally.',
    command: 'echo "hello from the sandbox" > scratch.txt && cat scratch.txt && rm scratch.txt',
    expectation: 'allowed',
  },
]
