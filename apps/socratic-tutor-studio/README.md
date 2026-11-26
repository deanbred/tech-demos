# Socratic Tutor Studio

A local, single-user studio for [Jane Street's `socratic-tutor` skill](https://github.com/janestreet/agent_skills). Pick a visual starter topic, answer one question at a time, and watch a 0–5 skill map move. The bookmark that pointed here is [injaneity's post](https://x.com/injaneity/status/2124685667821297704).

The skill turns a chat into a strict personal tutor: a diagnostic, a skill map, one question at a time, spaced review, and a final assessment. This app does not rewrite that skill. Live mode sends the vendored `SKILL.md` as the system prompt, unchanged.

Starter topics — CSS Grid placement, the browser event loop, and SVG `viewBox` coordinates — are demo exercises. They are not a Jane Street curriculum.

## License

The vendored skill and `LICENSE.md` are MIT.

Copyright (c) 2026 Jane Street Group, LLC `<opensource-contacts@janestreet.com>`

Those files live in `vendor/janestreet-agent-skills/` and are copied verbatim from the pinned commit below.

## Official install

Jane Street's README describes two ways to use the skill. Neither is a package install.

With a coding agent that supports the common `SKILL.md` format, copy the `socratic-tutor` directory into the agent's skills folder, then ask it to teach you (`teach me X`). The copy in this repo is:

```text
apps/socratic-tutor-studio/vendor/janestreet-agent-skills/socratic-tutor/
```

Upstream:

```text
https://github.com/janestreet/agent_skills/tree/469868f4489cbdbe178c775a0af05bb6bef63689/socratic-tutor
```

With a plain chatbot, paste the body of `SKILL.md` into the chat or into a custom/system prompt, then say what you want to be taught. Live mode in this app is that second path: the Bun server sends the file as the system message.

Jane Street is sharing skills they use internally. Their README says they are not looking for new skills or for pull requests that change the text of existing ones.

## Run

From this directory:

```sh
bun install
bun run dev
```

Open the Vite URL it prints (http://127.0.0.1:5173). Mock mode is the default and needs no key.

`bun test` runs the offline session test. It does not need an API key.

## Mock and live

**Mock** is a checked-in script. It never calls `fetch`, a model, or any other network endpoint. Chat bubbles, the skill map, the save-state block, and the mode chip are labeled **MOCK**. The key chip stays "Key unchecked" until you open Live, because checking the key would be a request.

**Live** calls an OpenAI-compatible Chat Completions endpoint from the Bun server. The browser sends the conversation to `/api/chat` and never receives the key. Replies are labeled **LIVE**. The map updates only when a reply contains a clear bar row (`[████░░] N/5` or the `#` / `.` form from the skill). If the map is missing or two rows disagree, the raw reply is shown and levels stay as they were. This app does not fill in a score the reply did not state. Whether a given model actually emits that map was not reconfirmed — there is no key in this environment.

Switching to Live without `LLM_API_KEY` and `LLM_MODEL` shows setup help and does not crash.

## Environment

Copy `.env.example` to `.env` in this folder. Do not commit `.env`.

| Variable | Required for live | Role |
| --- | --- | --- |
| `LLM_API_KEY` | yes | Sent only by the server. |
| `LLM_MODEL` | yes | Model id you choose. Jane Street did not name one. |
| `LLM_BASE_URL` | no | Defaults to `https://api.openai.com/v1`. |

Restart `bun run dev` after changing `.env`.

## Scripted session

Start a topic, then press **Play scripted session**. Each topic walks the same shape. CSS Grid placement, the one captured in the demo:

1. Diagnostic questions, one at a time, with no teaching yet. The script answers the track and area questions, then answers the line-span question with **2** (wrong).
2. Teaching loop. The next question counts vertical lines. It does not state the span.
3. A second check names the line you reach by counting backward. **Line placement** moves from 1/5 (heard of it) to 2/5 (can follow along). The map keeps a "Level up 1 → 2" mark.
4. A retest asks for the track count from another angle.
5. Spaced review returns to the `1fr 2fr` grid, now with a 12px gap.
6. One assessment beat asks for the end line and the span together. The pass then stops. That is not a claim that every subskill is at the 4/5 target.
7. The player emits a save-state block labeled **MOCK**. **Resume** accepts that block and restores the topic, levels, focus, and notes.

Show progress, Harder, Easier, Just tell me, and Save state stay available. Just tell me explains the current question only and does not raise a level for it.

## Pinned upstream

Vendored from `janestreet/agent_skills` commit `469868f4489cbdbe178c775a0af05bb6bef63689` (`master` on 2026-11-26, message "Update README", authored 2026-11-17 16:35:51 UTC).

`socratic-tutor/SKILL.md` itself last changed in `7c6715c29548a3b39d4a9545c698ee4fd17a7213` (2026-11-03 17:53:45 UTC, message `v0.18~preview.133.03+642`). That string is an internal export label, not a GitHub release. Reconfirmed on 2026-11-26: the repo had no releases and no tags, and `socratic-tutor/SKILL.md` was the only file in the only skill directory.

The skill text matched the protocol notes in `PLAN.md` (triggers, levels 0–5 and their labels, one question at a time, narrower questions before an explanation, the listed commands). Nothing in the official files disagreed with those notes.

## Not reconfirmed

- Live-model output shape, and whether any host model reliably prints the skill's ASCII map.
- An official Jane Street package name, CLI, or installer. The upstream README does not list one.
