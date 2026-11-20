import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command: string, args: string[]): ChildProcess {
  return spawn(command, args, { cwd: root, stdio: "inherit" });
}

const sync = run("uv", ["sync", "--directory", "backtest"]);
const syncCode = await new Promise<number>((resolveExit) => {
  sync.on("error", (error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(
        "uv is not installed. Install it from https://docs.astral.sh/uv/ and re-run bun run dev.",
      );
    } else {
      console.error(error);
    }
    resolveExit(1);
  });
  sync.on("exit", (code) => resolveExit(code ?? 1));
});

if (syncCode !== 0) {
  process.exit(syncCode);
}

const api = run(process.execPath, ["run", resolve(root, "server/index.ts")]);
const web = run(resolve(root, "node_modules/.bin/vite"), [
  "--host",
  "127.0.0.1",
  "--port",
  "5173",
  "--strictPort",
]);

let stopped = false;
function shutdown() {
  if (stopped) return;
  stopped = true;
  api.kill("SIGTERM");
  web.kill("SIGTERM");
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

const first = await Promise.race([
  new Promise<number>((resolveExit) => api.on("exit", (code) => resolveExit(code ?? 1))),
  new Promise<number>((resolveExit) => web.on("exit", (code) => resolveExit(code ?? 1))),
]);
shutdown();
process.exit(first);
