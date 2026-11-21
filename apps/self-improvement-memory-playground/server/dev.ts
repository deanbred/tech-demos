import path from "node:path";

import { loadEnvFile, startServer } from "./index.ts";

await loadEnvFile();
const server = startServer();
console.log(`SIM API http://127.0.0.1:${server.port}`);

const appRoot = path.resolve(import.meta.dirname, "..");
const vite = Bun.spawn({
  cmd: ["bun", "run", "vite", "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
  cwd: appRoot,
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

const shutdown = () => {
  server.stop();
  vite.kill();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const code = await vite.exited;
server.stop();
process.exit(code ?? 0);
