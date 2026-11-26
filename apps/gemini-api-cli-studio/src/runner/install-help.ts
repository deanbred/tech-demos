export const RELEASE_TAG = 'v0.5.0'
export const RELEASES_URL = `https://github.com/google-gemini/gemini-api-cli/releases/tag/${RELEASE_TAG}`

const UNIX_INSTALL =
  'curl -fsSL https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.sh | bash'
const UNIX_PINNED =
  'curl -fsSL https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.sh | GEMINI_VERSION=v0.5.0 bash'
const WINDOWS_INSTALL =
  'iwr -useb https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.ps1 | iex'
const WINDOWS_PINNED =
  "$env:GEMINI_VERSION='v0.5.0'; iwr -useb https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.ps1 | iex"
const GO_INSTALL = 'go install github.com/google-gemini/gemini-api-cli/cmd/gemini-api@latest'

export function missingBinaryHelp(): string {
  return [
    'gemini-api is not on PATH. Mock mode does not need it.',
    '',
    'macOS / Linux (official installer):',
    UNIX_INSTALL,
    '',
    'Pin v0.5.0. GEMINI_VERSION has to be set on the shell that runs the script:',
    UNIX_PINNED,
    'Default directory is /usr/local/bin, then ~/.local/bin.',
    '',
    'Windows (PowerShell):',
    WINDOWS_INSTALL,
    WINDOWS_PINNED,
    'Default directory is %LOCALAPPDATA%\\Programs\\gemini-api.',
    '',
    'Go:',
    GO_INSTALL,
    'Building @main requires Go 1.26.10+.',
    '',
    'Prebuilt archives:',
    RELEASES_URL,
    '',
    'Then set the key and restart this server:',
    'export GEMINI_API_KEY="YOUR_API_KEY"',
  ].join('\n')
}

export function missingKeyHelp(): string {
  return [
    'gemini-api is on PATH, but this server has no API key.',
    '',
    'export GEMINI_API_KEY="YOUR_API_KEY"',
    '',
    'Or store one for the workstation:',
    'gemini-api configure --api-key "YOUR_API_KEY"',
    'gemini-api whoami',
    '',
    'Priority from `gemini-api configure --help`: CLI flags > environment variables > OS keychain > ~/.config/gemini-api/config.yaml.',
    'Pass --no-keyring or set GEMINI_NO_KEYRING=1 to write the secret to the config file instead of the OS keychain.',
    '',
    'Live runs inherit GEMINI_API_KEY from the server environment. The key is not placed on the command line.',
  ].join('\n')
}
