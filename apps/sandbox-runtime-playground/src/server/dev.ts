/**
 * `bun run dev` entrypoint: runs the sandbox API (Bun) and the Vite dev
 * server together, and tears both down when either exits.
 */
const appRoot = new URL('../..', import.meta.url).pathname

const api = Bun.spawn(['bun', '--watch', 'run', 'src/server/index.ts'], {
  cwd: appRoot,
  stdout: 'inherit',
  stderr: 'inherit',
})

const vite = Bun.spawn(['bunx', '--bun', 'vite'], {
  cwd: appRoot,
  stdout: 'inherit',
  stderr: 'inherit',
})

function shutdown() {
  api.kill()
  vite.kill()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const code = await Promise.race([api.exited, vite.exited])
shutdown()
process.exit(code)
