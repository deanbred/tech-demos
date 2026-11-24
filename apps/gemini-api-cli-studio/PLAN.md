# gemini-api-cli-studio

## Goal

A local, single-user studio that wraps the official `gemini-api` binary (https://github.com/google-gemini/gemini-api-cli): drop in a file or type a prompt, pick a tool, and see the exact shell command next to its result.

## Verify first

Read the upstream README, LICENSE, latest GitHub release, and (if the binary can be installed) `gemini-api --help` plus `gemini-api <command> --help`. Follow the live help text when it differs from this plan, and note the difference in the app README. Do not invent flags.

Facts already checked from official sources on 2026-11-24 (CLI repo `main`, README, LICENSE, and latest release; also https://aistudio.google.com/docs/cli and the official skill at https://github.com/google-gemini/gemini-skills/tree/main/skills/gemini-api-cli). Treat anything not confirmed from `--help` as documented-but-unconfirmed.

**Verified**
- Binary / command name is `gemini-api`. It is a stateless Go CLI, not the interactive coding agent `@google/gemini-cli`. Call out that name clash in the README.
- License: Apache License 2.0 (repo `LICENSE` file and README badge). Copyright 2026 Google LLC. README also licenses non-software materials under CC BY 4.0.
- Status: beta; breaking changes may occur between releases. Pin a release in install docs.
- Latest release at research time: **v0.5.0**, published 2026-11-20 00:49:52 UTC (Nov 19, 2026, 7:49 PM ET). Prebuilt archives on GitHub Releases:
  - `gemini-api_Darwin_arm64.tar.gz`, `gemini-api_Darwin_x86_64.tar.gz`
  - `gemini-api_Linux_arm64.tar.gz`, `gemini-api_Linux_x86_64.tar.gz`
  - `gemini-api_Windows_arm64.zip`, `gemini-api_Windows_x86_64.zip`
- Install (official README):
  - macOS / Linux: `curl -fsSL https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.sh | bash` (pin with `GEMINI_VERSION=<tag>`; default install dir `/usr/local/bin`, fallback `~/.local/bin`)
  - Windows: `iwr -useb https://raw.githubusercontent.com/google-gemini/gemini-api-cli/main/scripts/install.ps1 | iex`
  - Go: `go install github.com/google-gemini/gemini-api-cli/cmd/gemini-api@latest` (building `@main` requires Go 1.26.10+)
  - Or download a prebuilt archive from Releases and put `gemini-api` on `PATH`
- Auth env var, officially documented: `export GEMINI_API_KEY="YOUR_API_KEY"`. Workstation alternative: `gemini-api configure --api-key "YOUR_API_KEY"` (OS keychain) or `--no-keyring` / `GEMINI_NO_KEYRING=1` to write `~/.config/gemini-api/config.yaml`. Inspect with `gemini-api whoami`. `--dry-run` validates with no network call.
- Commands for this demo's four tabs, copied from the official CLI README (do not swap these around):
  - Video → timestamped summary uses **`analyze`**, not `video`. `gemini-api video` is video *generation*. Example: `gemini-api analyze --input interview.mp4 "List the key action items with timestamps"`. Optional captions: `gemini-api transcribe --input interview.mp4 --format srt --out interview.srt`.
  - Image/PDF → OCR / extracted text uses **`analyze`** (there is no `ocr` subcommand in the README). Examples: `gemini-api analyze --input product-brief.pdf "What should we build first, and why?"` and `gemini-api analyze --input before.png --input after.png "Summarize the visual design changes"`. Use an OCR-style prompt such as "Extract all visible text, preserving structure."
  - Text → TTS: `gemini-api tts "Welcome. Let's build something together." --out ./assets/welcome.wav`
  - Prompt → image: `gemini-api image "A friendly robot mascot, soft studio lighting" --out ./assets/mascot.jpg`
- Media commands write a file and print the path on stdout. `--input` / `-i` is repeatable. Files over ~14 MB raw / 20 MB base64 should be uploaded once with `gemini-api files upload --wait` and reused as a `files/...` URI.
- Documented default models in that README (confirm against `--help`; they can change): `analyze` → `gemini-4-hydrogen`; `image` → `gemini-nano-banana-2.1`; `tts` → `gemini-3.8-flash-tts`; `transcribe` → `gemini-3.5-transcribe`.
- Agent skill: not shipped inside the CLI repo (that repo's `docs/` is only self-hosted environments). The official skill lives at `google-gemini/gemini-skills` path `skills/gemini-api-cli`. AI Studio docs install it with `npx skills add google-gemini/gemini-skills --skill gemini-api-cli`. The CLI README itself tells agents to paste a short instruction block into `AGENTS.md` / `CLAUDE.md`. Mention both in this app's README. This demo does not need to install the skill to run.

**Unconfirmed — confirm from the binary's help, or label as unverified**
- The full flag set for each subcommand, including extras that appear in the official skill but not the CLI README (`--aspect-ratio`, `--image-size`, `--voice` / default Kore, `--language`, `--no-speakers`, `--no-timestamps`, `--resume` on `video`, and whether `analyze` has any OCR-specific flag).
- Credential resolution order. The official skill says first-match: `--api-key` / `--access-token`, then `GEMINI_API_KEY` / `GEMINI_ACCESS_TOKEN`, then the OS keychain, then `~/.config/gemini-api/config.yaml`. The CLI README documents `GEMINI_API_KEY` and `configure`, but not that full order. Prefer `GEMINI_API_KEY` for live mode in this demo.
- Whether a `gemini-api install-skill` command exists (a historical PR mentioned it; current official docs use `npx skills add ...`).
- Exact `gemini-api <command> --help` syntax. The README command-overview sentence repeats `gemini-api --help` twice; `gemini-api <command> --help` is the usual form and is what the official skill describes.
- Exit codes and output shapes for each command, if needed for the wrapper.

## Single-user MVP

**In:**
- A one-page Bun web app with four tabs:
  1. 🎞️ Video — drop a video; run `analyze` with a timestamped-summary prompt; show the text. Optionally also offer `transcribe` (`--format srt`) if help confirms it, as a secondary action, not a fifth tab.
  2. 📄 Image/PDF — drop an image or PDF; run `analyze` with an OCR / extract-text prompt; show the text.
  3. 🔊 Text → TTS — type or paste text; run `tts --out ...`; play the audio clip.
  4. 🖼️ Prompt → image — type a prompt; run `image --out ...`; show the image.
- Command preview: every run (mock or live) shows the exact shell command that would be executed, next to the result. Redact secrets. Do not interpolate the API key into the displayed or executed argv; live calls inherit `GEMINI_API_KEY` from the server environment.
- Modes:
  - **Mock (default):** no key and no binary required. Canned outputs from checked-in fixtures, visually labeled **MOCK** on the result, the command preview, and any player/image. Never shell out in mock mode.
  - **Live:** only when `GEMINI_API_KEY` is set (or you have confirmed another documented credential source is active) *and* `gemini-api` is on `PATH`. Ship `.env.example` with `GEMINI_API_KEY=`; never commit a real key.
- Missing-binary handling: if the user switches to Live and the binary is absent, do not crash. Show a clear status chip (binary found/missing, key present/absent — never the key itself) and the official install commands plus the Releases link. If the binary is present but no key is configured, show how to export `GEMINI_API_KEY` and mention `configure` / `whoami`.
- Status bar on load: detect binary (`which` / version) and whether a key env var is set.
- Sample fixtures in the repo (tiny video, image, PDF, and a short TTS string) so a first-run mock walkthrough needs no user files.
- Thin Bun server to accept the upload, write it to a temp dir, spawn `gemini-api` only in live mode, and return text or the output media. Do not vendor the Go binary into the repo.
- README: what `gemini-api` is (repo + bookmark links), Apache-2.0 attribution, not `@google/gemini-cli`, how to run, mock vs live, install instructions, the four commands, and the agent-skill install line. Record anything that could not be confirmed from `--help`.

**Out:** managed agents, music generation, `gemini-api video` generation, custom voices, files-API browsers, auth UI, multi-user, committing keys, vendoring the CLI binary, anything outside this folder except the tracking update and the conditional root-README link.

## Tasks (vertical slices)
1. Scaffold with `bunx create-vite` (react-ts, skip install), write bunfig.toml, `bun install`, init shadcn/ui.
2. Command-builder module: given tab, input path or prompt, and output path, return the exact argv. Seed it with the verified README examples; adjust only after `--help` confirms a difference.
3. Mock runner + fixtures + **MOCK** labels; missing-binary / missing-key status and install copy. App must be fully usable here.
4. Thin Bun server + live runner (spawn `gemini-api`, temp uploads, return text or media). Wire a Mock / Live toggle and the command preview.
5. UI: four tabs, drop zone, sample-file buttons, result pane (text, audio player, or image), status chips.
6. Validation: capture at least one screenshot AND one video of a mock-mode walkthrough (switch tabs, drop or pick a sample, show the command next to a MOCK result) and embed both in the PR body.

## Stack
- Bun — repo standard; runtime, package manager, and the thin spawn server
- Vite + React + shadcn/ui — one-screen utility; official scaffold, matches sibling demos
- No Gemini SDK — the point of the demo is the `gemini-api` binary, not a reimplementation

## Testing and hooks
- One focused test: the command builder emits the documented argv for each of the four tabs; mock mode never shells out; a missing binary returns install help instead of throwing.
- No git hooks.

## Deferred
- Live screenshot if the build VM has no key (mock artifacts are enough).
- Music, video generation, managed agents, files-API upload UI, and YouTube-URL analysis — useful, but outside the four-tab MVP.
- Bundling or auto-downloading the CLI — keep install as a documented prerequisite for live mode.
