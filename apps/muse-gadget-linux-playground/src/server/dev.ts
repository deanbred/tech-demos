import path from 'node:path'

const appRoot = path.resolve(import.meta.dir, '../..')

const api = Bun.spawn(['bun', '--watch', 'run', 'src/server/index.ts'], {
  cwd: appRoot,
  stdout: 'inherit',
  stderr: 'inherit',
})

const vite = Bun.spawn(['bunx', '--bun', 'vite', '--host', '127.0.0.1', '--port', '5173'], {
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
