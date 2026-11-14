# Muse Linux gadget playground

A local page that runs a virtual [Muse](https://gadgets.muse.ai) Linux gadget on this machine. It registers three custom commands in the [Linux Device SDK](https://github.com/facebookincubator/muse-gadget-sdk/blob/main/linux/README.md) JSON schema, then shows every call and what came back.

Mock mode is the default. Nothing here installs `musegadget`, talks to Bluetooth, or needs sudo.

## Run

From this directory:

```sh
bun install
bun run dev
```

Open the URL Vite prints (http://127.0.0.1:5173). The gadget API listens on http://127.0.0.1:8787.

`Run Muse session` calls `host.stats`, `light.toggle`, and `chore.disk` in order. The lamp on the page is the gadget's fake light.

## Mock mode

No `MUSE_SDK_TOKEN` is required. The page is the caller: each button, and the scripted session, posts JSON parameters to a command whose descriptor lives in `commands/*.json`. The runtime starts the `exec` program with that JSON on stdin and reads a JSON object (or a non-zero exit) back. That is the drop-in contract from `/etc/musegadget/commands.d/`.

| Command | What it does |
| --- | --- |
| `host.stats` | Uptime, load average, and memory from `/proc`. Read-only. |
| `light.toggle` | Flips a boolean in `.cache/gadget-state.json`. The lamp follows it. |
| `chore.disk` | Runs `df -h` on this app directory only. The path is fixed in the handler. |

Built-in SDK commands (`system.run`, `file.read`, `file.write`, `device.health`) are listed on the page and are not wired to the host. There is no open shell.

## Live mode

Copy `.env.example` to `.env` and set `MUSE_SDK_TOKEN` to a token from [gadgets.muse.ai](https://gadgets.muse.ai/settings/sdk-tokens). Startup still succeeds when the variable is missing.

When the token is set, the server tries to reach `https://api.muse.ai` and looks for a local pairing store. It does not send the token. An SDK token is what the official installer uses while pairing; the Noise session needs a device credential from the Muse app, which this process does not have.

A real pairing also needs:

- The Muse app, with **Settings > Devices > Developer mode** on
- Bluetooth LE on the computer
- The official Linux client (`install.sh`, systemd, `/opt/musegadget`)

This app does not install or start that client. If pairing is impossible here, the page says why and mock mode keeps working.

## Test

```sh
bun test
```

The test loads each command from its JSON descriptor and checks the result shape. It also checks that mock mode is the startup mode when no token is set.
