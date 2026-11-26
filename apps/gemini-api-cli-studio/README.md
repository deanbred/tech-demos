# Gemini API CLI Studio

A local, single-user studio for the official [`gemini-api`](https://github.com/google-gemini/gemini-api-cli) binary. Drop a file or type a prompt, pick a tool, and read the exact shell command next to its result.

This is the stateless Go CLI from [google-gemini/gemini-api-cli](https://github.com/google-gemini/gemini-api-cli) (Apache-2.0, Copyright 2026 Google LLC; non-software materials in that repo are CC BY 4.0). It is not the interactive coding agent [`@google/gemini-cli`](https://github.com/google-gemini/gemini-cli).

Bookmark: [Gemini API CLI](https://x.com/LyalinDotCom/status/2124593932038254981).

The CLI is in beta. Pin a release. This studio was checked against **v0.5.0** (published 2026-11-20 00:49:52 UTC).

## Run

```sh
bun install
bun run dev
```

Vite serves the UI on <http://localhost:5173>. A thin Bun server on `127.0.0.1:8787` accepts uploads and, in live mode only, spawns `gemini-api`. `bun run dev` starts both.

```sh
bun run test
```

## Mock and live

**Mock is the default.** It needs no API key and no binary. Results, the command preview, the audio player, and the image are labeled **MOCK**. Mock mode never starts `gemini-api`. The picture and the tone are checked-in fixtures, not model output.

**Live** runs only when `gemini-api` is on `PATH` and a credential is configured. Prefer:

```sh
export GEMINI_API_KEY="YOUR_API_KEY"
```

Copy `.env.example` to `.env` if you want Bun to load it. Never commit a real key. The server inherits the variable. It does not put the key in the displayed or executed argv.

The status chips show whether the binary was found and whether a key is present. They never show the key. Switching to Live with the binary or the key missing shows the install or export help instead of crashing.

## Install the CLI

Checked from the v0.5.0 README, `scripts/install.sh`, `scripts/install.ps1`, and the release assets.

macOS / Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.sh | bash
```

Pin v0.5.0. `GEMINI_VERSION` has to be set for the shell that runs the script:

```sh
curl -fsSL https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.sh | GEMINI_VERSION=v0.5.0 bash
```

Default directory is `/usr/local/bin`, then `~/.local/bin`.

Windows (PowerShell):

```powershell
iwr -useb https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.ps1 | iex
$env:GEMINI_VERSION='v0.5.0'; iwr -useb https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.ps1 | iex
```

Default directory is `%LOCALAPPDATA%\Programs\gemini-api`.

Go:

```sh
go install github.com/google-gemini/gemini-api-cli/cmd/gemini-api@latest
```

Building `@main` requires Go 1.26.10+.

Or download a prebuilt archive from [the v0.5.0 release](https://github.com/google-gemini/gemini-api-cli/releases/tag/v0.5.0) and put `gemini-api` on `PATH`.

Workstation alternative to the env var:

```sh
gemini-api configure --api-key "YOUR_API_KEY"
gemini-api whoami
```

`gemini-api configure --help` states the priority: CLI flags, then environment variables, then the OS keychain, then `~/.config/gemini-api/config.yaml`. `--no-keyring` / `GEMINI_NO_KEYRING=1` writes the secret to the config file instead of the keychain. `--api-key` reads `GEMINI_API_KEY`. `--access-token` reads `GEMINI_ACCESS_TOKEN`.

## Commands this studio runs

Working directory is a temp folder. Sample inputs are copied there under the README filenames. Confirmed from `gemini-api` 0.5.0 `--help` and each command's `--help`.

| Tab | Command |
|---|---|
| Video, timestamped summary | `gemini-api analyze --input interview.mp4 "List the key action items with timestamps"` |
| Video, secondary SRT action | `gemini-api transcribe --input interview.mp4 --format srt --out interview.srt` |
| Image/PDF | `gemini-api analyze --input product-brief.pdf "Extract all visible text, preserving structure."` (the sample image uses `brief.png`) |
| Text → TTS | `gemini-api tts "Welcome. Let's build something together." --out ./assets/welcome.wav` |
| Prompt → image | `gemini-api image "A friendly robot mascot, soft studio lighting" --out ./assets/mascot.jpg` |

`analyze` has no OCR-specific flag. `gemini-api video` generates video and is not used here. Files over about 14 MB raw / 20 MB base64 need `gemini-api files upload --wait`; this studio does not upload them.

Default models from that help text: `analyze` → `gemini-4-hydrogen`; `image` → `gemini-nano-banana-2.1`; `tts` → `gemini-3.8-flash-tts` (voice default Kore); `transcribe` → `gemini-3.5-transcribe` (help also says video transcription uses `gemini-4-hydrogen`). This studio does not pass `--model`, `--voice`, `--aspect-ratio`, or `--image-size`.

Help also confirms flags this studio does not send: `image --aspect-ratio` and `--image-size`; `tts --voice`, `--language`, `--style`, `--voice-prompt`, `--multi-speaker`; `transcribe --no-speakers` and `--no-timestamps`; `video --resume`. Exit codes printed by `--help`: 0 ok, 1 runtime, 2 usage, 3 authentication.

## Agent skill

The skill is not in the CLI repo. Install it with:

```sh
npx skills add google-gemini/gemini-skills --skill gemini-api-cli
```

The CLI README also tells agents to paste a short instruction block into `AGENTS.md` / `CLAUDE.md`. v0.5.0 has no `gemini-api install-skill` command. An unknown command prints the root help.

## What `--help` did not prove

No API key was configured here, so a successful live `analyze`, `tts`, or `image` call was not run. Output handling follows the help text: `analyze` prints the answer on stdout; `tts`, `image`, and `transcribe` write a file and print its path. Those success shapes were not observed from the API.

## Layout

```
PLAN.md
public/fixtures/   sample clip, image, PDF, TTS line, and MOCK media
src/commands/      argv builder
src/runner/        mock runner, install help, tests
src/server/        Bun API
src/ui/            result pane
```
