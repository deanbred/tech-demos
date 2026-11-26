# socratic-tutor-studio

## Goal

A local, single-user visual studio for Jane Street's official `socratic-tutor` skill (https://github.com/janestreet/agent_skills): pick a topic, watch a 0–5 skill map update in real time, and learn through one question at a time — diagnostic, teaching loop, spaced review, and a final assessment.

## Verify first

Re-fetch the upstream README, `LICENSE.md`, and `socratic-tutor/SKILL.md` at build time. Vendor the exact files from a pinned commit and record that SHA in this app's README. If the official skill text differs from the notes below, follow the official file and note the difference. Do not rewrite the skill. Do not present `npx skills add` (or any third-party installer) as an official Jane Street command.

Facts already checked from official sources on 2026-11-26 (GitHub API + raw files on `janestreet/agent_skills` `master`). Reconfirm before vendoring.

**Verified**
- Repo: https://github.com/janestreet/agent_skills — “Agent skills from Jane Street.” One skill directory, `socratic-tutor/`, containing a single `SKILL.md`.
- License: MIT, in `LICENSE.md`. Copyright (c) 2026 Jane Street Group, LLC `<opensource-contacts@janestreet.com>`. Keep that notice next to the vendored skill and in the app README.
- Official how-to-use (README, not a third-party catalog): with a coding agent that supports the common `SKILL.md` format, copy the skill directory into the agent's skills folder and ask it to use it (“teach me X”). With a plain chatbot, paste the body of `SKILL.md` into the chat or a custom/system prompt. This demo uses the second path for live mode.
- Jane Street is sharing what they use internally and is “not looking for new skills or for pull requests that change the text of existing ones.” Vendor verbatim. Do not edit the skill to “improve” it, and do not open a PR against Jane Street.
- No GitHub Releases or tags at research time. The repo is not a packaged library and has no programmatic API.
- `master` at research time: commit `469868f4489cbdbe178c775a0af05bb6bef63689` (“Update README”, 2026-11-17 16:35:51 UTC / Nov 17, 2026, 11:35 AM ET). The skill file itself last changed in `7c6715c29548a3b39d4a9545c698ee4fd17a7213` (`v0.18~preview.133.03+642`, 2026-11-03 17:53:45 UTC / Nov 3, 2026, 12:53 PM ET). That version string is an internal export label, not a GitHub release. Pin whichever commit you actually vendor; reconfirm HEAD.
- Created 2026-11-03 16:50:21 UTC (Nov 3, 2026, 11:50 AM ET). Do not put GitHub star or fork counts in the app UI; they go stale.
- Official skill protocol, copied from `socratic-tutor/SKILL.md` (do not invent extra commands or level names):
  - Triggers: “teach me”, “tutor me”, “quiz me”, “drill me”, “help me master”. Not for one-off “explain X” / “what is X”.
  - If intent is ambiguous, ask one short confirm question before the diagnostic.
  - Break the topic into 4–10 concrete subskills (fewer when narrow). Diagnostic: 3–5 probing questions, one at a time, no teaching until it is done. Then show the skill map and let the user override the starting focus.
  - Levels 0–5: 0 unaware, 1 heard of it, 2 can follow along, 3 can do with help, 4 can do independently, 5 can teach it / handle edge cases.
  - Render the map after every level change and when the user asks for progress. Official example uses ASCII bars; when rendering, use solid/light block characters (U+2588 / U+2591).
  - Teaching loop: ask ONE question and stop. On a wrong answer, do not give the answer; ask a narrower question. Explain directly only after 2–3 failed attempts, then re-test from a different angle. On a right answer, occasionally play devil's advocate.
  - Levels are earned across 2+ independent checks, including at least one unprompted recall. Interleave spaced review; a failed review lowers the level. Default target is 4/5 (5/5 if the user asked for full mastery). Then a final mixed assessment (one question per subskill plus one integrative problem).
  - User commands: “show progress”, “harder” / “easier”, “just tell me” (this question only), “save state” (emit a compact block: topic, skill map with levels, notes on misconceptions and what has been covered), “resume from:” plus a saved block.

**Unconfirmed — do not invent**
- Live-model output shape and whether a given host model will reliably emit the official ASCII map. In live mode, parse the map when it is clearly present; if it is missing or ambiguous, show the raw reply and do not invent levels or percentages.
- Any official Jane Street package name, CLI, or `npx` installer. There isn't one in the README.

## Single-user MVP

**In:**
- A one-page Bun web app with two visible panes:
  1. **Skill map** — every bundled subskill at levels 0–5, a current-focus marker, official level labels, and an overall bar. This is the visual payoff. Update it after every level change.
  2. **Tutor chat** — one question at a time, with an answer box. The session walks diagnostic → teaching loop → at least one spaced-review beat → a final-assessment beat (the scripted mock must hit these; live sessions follow the skill and may be shorter if the user stops).
- Command buttons, always available, that perform the official commands: Show progress, Harder, Easier, Just tell me, Save state, Resume. Save state shows the compact block described in the skill. Resume accepts a pasted block and restores the map and topic.
- Topic picker with a few bundled **visual** starter topics (not a trading desk). Ship at least three, each with a small in-UI visual (layout preview, diagram, or similarly concrete exercise). Suggested set, unless a topic file would be misleading: CSS Grid placement, the browser event loop (call stack / task queue), and SVG `viewBox` coordinates. These are demo starters, not Jane Street curricula.
- Modes:
  - **Mock (default):** no API key, no network. A checked-in scripted session, visually labeled **MOCK** on the chat, the map, the save-state block, and the mode chip. Mock mode must never call `fetch`, an LLM, or any other network endpoint. The script must include: a wrong answer, a narrower follow-up that does not reveal the answer, a later visible level-up on the map, and a save-state block. A “Play scripted session” control should run that walkthrough so a screenshot and video are easy to capture.
  - **Live:** only when an LLM key is configured. The official `SKILL.md` is the system prompt, sent verbatim (do not paraphrase it). A thin Bun server holds the key and calls an OpenAI-compatible Chat Completions API; the browser never receives the key. Ship `.env.example` with `LLM_API_KEY=`, `LLM_MODEL=`, and an optional `LLM_BASE_URL=` (if unset, the official OpenAI Chat Completions base URL `https://api.openai.com/v1` is fine to document as the default). Do not bake in a trendy model name as “the official model”; Jane Street did not specify one. Label live output **LIVE**. If the user switches to Live without a key or model, show clear setup help and do not crash.
- Vendor the official skill and license into the app (for example `vendor/janestreet-agent-skills/LICENSE.md` and `vendor/janestreet-agent-skills/socratic-tutor/SKILL.md`) from the pinned commit, untouched.
- Status chips: Mock/Live, key present/absent (never the key itself), and the vendored commit SHA.
- README: what the Jane Street skill is (repo + bookmark links), MIT attribution, official copy-or-paste install (not `npx skills add`), how to run, mock vs live, env vars, the scripted-session steps, and the pinned commit. Record anything that could not be reconfirmed.

**Out:** multi-user or accounts, rewriting the official skill, presenting third-party skill installers as official, a trading or quant desk, committing keys, calling any network endpoint in mock mode, presenting invented scores or GitHub stats as live facts, installing the skill into Claude Code / Codex as a required step, anything outside this folder except the tracking update and the conditional root-README link.

## Tasks (vertical slices)

1. Scaffold with `bunx create-vite` (react-ts, skip install), write `bunfig.toml` with `[install] minimumReleaseAge = 259200`, then `bun install`. Initialize shadcn/ui with a minimalist preset and add components on demand.
2. Vendor `LICENSE.md` and `socratic-tutor/SKILL.md` verbatim from a pinned upstream commit. Add a session-state module (topic, subskills, levels 0–5, focus, phase, save-state block) that matches the official skill.
3. Mock runner + labeled fixtures + “Play scripted session”: wrong answer, narrower follow-up, level-up, save-state block, zero network calls. The app must be fully usable here.
4. UI: topic picker, skill map, one-question chat, command buttons, Mock/Live toggle, status chips. Resume must restore a pasted mock save-state block.
5. Thin Bun server + live runner (OpenAI-compatible Chat Completions, official skill as system prompt, key only on the server). Wire the toggle and the missing-key help. Parse an official map when present; never invent levels.
6. Validation: capture at least one screenshot AND one video of a mock-mode walkthrough (play the scripted session: wrong answer, narrower follow-up, visible level-up, save-state block, all labeled MOCK) and embed both in the PR body.

## Stack

- Bun — repo standard; runtime, package manager, and the thin live-mode server
- Vite + React + shadcn/ui — one-screen utility; official scaffold, matches sibling demos
- Official Jane Street `socratic-tutor` SKILL.md — vendored verbatim as the tutor contract and the live system prompt; MIT
- OpenAI-compatible Chat Completions — live mode only; one boring, well-documented API, key stays on the server

## Layout

```
apps/socratic-tutor-studio/
  PLAN.md
  bunfig.toml
  README.md
  .env.example
  vendor/janestreet-agent-skills/
    LICENSE.md
    socratic-tutor/SKILL.md
  src/
    session/    # skill-map state, save/resume, mock script
    server/     # Bun API for live completions only
    ui/         # map, chat, commands, topic picker, mode toggle
```

## Testing and hooks

- One focused test: mock mode never makes a network call; the scripted session applies a wrong-answer turn, a narrower follow-up, a level-up on the map, and a save-state block that resume can restore; the vendored `SKILL.md` still contains the official name `socratic-tutor` and the documented command phrases. Do not require an API key to run tests.
- No git hooks.

## Deferred

- A live screenshot if the build VM has no LLM key (mock artifacts are enough).
- Persistence beyond the official pasteable save-state block, multi-user accounts, and hosting a real class.
- Wiring this skill into Claude Code, Codex, or any other agent as an install step.
- Extra Jane Street skills, if they ever add more — this demo is only `socratic-tutor`.
