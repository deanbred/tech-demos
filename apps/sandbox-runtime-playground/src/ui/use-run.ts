import { useCallback, useState } from 'react'
import type { Policy } from '@/sandbox/policy'
import { EMPTY_LANE, type Lane, type LaneState, type RunEvent } from './types'

function reduceLane(lane: LaneState, event: RunEvent): LaneState {
  switch (event.type) {
    case 'start':
      return { ...EMPTY_LANE, status: 'running' }
    case 'stdout':
      return { ...lane, chunks: [...lane.chunks, { kind: 'stdout', text: event.data }] }
    case 'stderr':
      return { ...lane, chunks: [...lane.chunks, { kind: 'stderr', text: event.data }] }
    case 'violation':
      return { ...lane, chunks: [...lane.chunks, { kind: 'violation', text: event.line }] }
    case 'error':
      return { ...lane, status: 'exited', chunks: [...lane.chunks, { kind: 'error', text: event.message }] }
    case 'exit':
      return {
        ...lane,
        status: 'exited',
        exitCode: event.code,
        violations: event.violations,
        durationMs: event.durationMs,
      }
    case 'done':
      return lane
    default: {
      const exhaustive: never = event
      return exhaustive
    }
  }
}

export function useRun() {
  const [lanes, setLanes] = useState<Record<Lane, LaneState>>({
    unsandboxed: EMPTY_LANE,
    sandboxed: EMPTY_LANE,
  })
  const [running, setRunning] = useState(false)

  const run = useCallback(async (command: string, policy: Policy) => {
    setRunning(true)
    setLanes({ unsandboxed: EMPTY_LANE, sandboxed: EMPTY_LANE })
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, policy, mode: 'both' }),
      })
      if (!response.ok || !response.body) {
        const message = await response.text()
        setLanes(prev => ({
          ...prev,
          sandboxed: reduceLane(prev.sandboxed, { type: 'error', lane: 'sandboxed', message }),
        }))
        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as RunEvent
          if (event.type === 'done') continue
          setLanes(prev => ({ ...prev, [event.lane]: reduceLane(prev[event.lane], event) }))
        }
      }
    } finally {
      setRunning(false)
    }
  }, [])

  return { lanes, running, run }
}
