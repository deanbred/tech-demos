import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Dev-server middleware exposing recorded live traces to the UI:
 *   GET /api/traces            -> ["live-....json", ...]
 *   GET /api/traces/<file>     -> trace pair JSON
 * Sample traces are bundled with the app, so only top-level traces/*.json
 * (the gitignored live recordings) are served here.
 */
export function tracesApiPlugin(tracesDir: string): Plugin {
  return {
    name: 'traces-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (!url.startsWith('/api/traces')) return next()
        res.setHeader('Content-Type', 'application/json')

        const rest = url.slice('/api/traces'.length).replace(/^\//, '')
        if (rest === '') {
          const files = fs.existsSync(tracesDir)
            ? fs
                .readdirSync(tracesDir)
                .filter((f) => f.endsWith('.json'))
                .sort()
                .reverse()
            : []
          res.end(JSON.stringify(files))
          return
        }

        const name = path.basename(rest)
        const file = path.join(tracesDir, name)
        if (name.endsWith('.json') && fs.existsSync(file)) {
          res.end(fs.readFileSync(file, 'utf8'))
        } else {
          res.statusCode = 404
          res.end(JSON.stringify({ error: 'trace not found' }))
        }
      })
    },
  }
}
