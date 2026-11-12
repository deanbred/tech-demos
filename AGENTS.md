# Tech Demos monorepo

Sticky playground for small, public-tech demos. One demo per `apps/<slug>/`. Never create a new GitHub repository for a demo.

## Layout

- `AGENTS.md` — this file; cloud-agent rules
- `skills/project-planning/` — vendored planning skill; use it before writing a new app
- `apps/<slug>/` — one self-contained app per pick
- `tracking/seen-bookmarks.json` — candidates already proposed, built, or skipped

## Rules for cloud agents

1. Only add or update files under `apps/<kebab-slug>/` for the demo you were asked to build. Do not change this file, `skills/`, repo-root config, or `tracking/` unless the task explicitly says so.
2. Before writing code, follow `skills/project-planning/SKILL.md` and write `apps/<kebab-slug>/PLAN.md`.
3. Each app is self-contained: `bun install && bun run dev` from `apps/<slug>/` must work with no repo-root setup. Use Bun as the runtime, package manager, and script runner.
4. Every Bun app must include a `bunfig.toml` with `[install] minimumReleaseAge = 259200` before any `bun install` or `bun add`. Start from an official scaffold via `bunx create-*`. Prefer scaffold flags that skip the initial install, then run `bun install`.
5. For UI, initialize shadcn/ui with a minimalist preset and add components on demand. Prefer prebuilt solutions over custom complexity.
6. Open exactly one pull request against this repository. Never create a new GitHub repository.
7. Validation is required, not optional: the PR must attach **both** at least one screenshot **and** at least one video of the running app.
8. Cloudflare preview deploys use one Pages project for the whole monorepo, with a path per `apps/<slug>/`. Do not create a new Pages project per app. Preview deploys need GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` on this repo.
