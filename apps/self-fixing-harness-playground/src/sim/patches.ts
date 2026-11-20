import type { HarnessFile, HarnessSources } from "./types.ts";

export const PATCH_IDS = [
  "stop-empty",
  "stop-tests",
  "truncate",
  "compress",
  "loop-debug",
  "window-read",
  "status-footer",
  "over-truncate",
  "tighter-notes",
  "repeat-breaker",
] as const;

export type PatchId = (typeof PATCH_IDS)[number];

const MEMORY_HEADER = `export type TurnRecord = {
  turn: number;
  action: string;
  observation: string;
};

const PREAMBLE = "Fix the exported function. Use read, edit, test, and finish.";

function countTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
`;

const MEMORY_COMPRESS = `${MEMORY_HEADER}
export function renderContext(turns: TurnRecord[]): { text: string; tokens: number } {
  const keep = 1;
  const older = turns.slice(0, Math.max(0, turns.length - keep));
  const recent = turns.slice(-keep);
  const notes = older.map((turn) => {
    const brief = turn.observation.slice(0, 48).replaceAll("\\n", " ");
    return \`note #\${turn.turn} \${turn.action}: \${brief}\`;
  });
  const lines = [
    PREAMBLE,
    ...notes,
    ...recent.flatMap((turn) => [\`#\${turn.turn} \${turn.action}\`, turn.observation]),
    \`status turns=\${turns.length}\`,
  ];
  const text = lines.join("\\n");
  return { text, tokens: countTokens(text) };
}
`;

const MEMORY_FOOTER = `${MEMORY_HEADER}
export function renderContext(turns: TurnRecord[]): { text: string; tokens: number } {
  const keep = 1;
  const older = turns.slice(0, Math.max(0, turns.length - keep));
  const recent = turns.slice(-keep);
  const edits = turns.filter((turn) => turn.action === "edit").length;
  const notes = older.map((turn) => {
    const brief = turn.observation.slice(0, 48).replaceAll("\\n", " ");
    return \`note #\${turn.turn} \${turn.action}: \${brief}\`;
  });
  const lines = [
    PREAMBLE,
    ...notes,
    ...recent.flatMap((turn) => [\`#\${turn.turn} \${turn.action}\`, turn.observation]),
    \`status turns=\${turns.length} edits=\${edits}\`,
  ];
  const text = lines.join("\\n");
  return { text, tokens: countTokens(text) };
}
`;

const MEMORY_TIGHTER = `${MEMORY_HEADER}
export function renderContext(turns: TurnRecord[]): { text: string; tokens: number } {
  const edits = turns.filter((turn) => turn.action === "edit").length;
  const notes = turns.map((turn) => {
    const brief = turn.observation.slice(0, 48).replaceAll("\\n", " ");
    return \`note #\${turn.turn} \${turn.action}: \${brief}\`;
  });
  const lines = [PREAMBLE, ...notes, \`status turns=\${turns.length} edits=\${edits}\`];
  const text = lines.join("\\n");
  return { text, tokens: countTokens(text) };
}
`;

const LOOP_PARSE = `
export type Action =
  | { tool: "read" }
  | { tool: "edit"; body: string }
  | { tool: "test" }
  | { tool: "finish" }
  | { tool: "invalid"; raw: string };

export function parseAction(raw: string): Action {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { tool: "invalid", raw };
  }
  if (typeof parsed !== "object" || parsed === null || !("tool" in parsed)) {
    return { tool: "invalid", raw };
  }
  const record = parsed as { tool?: unknown; body?: unknown };
  switch (record.tool) {
    case "read":
      return { tool: "read" };
    case "test":
      return { tool: "test" };
    case "finish":
      return { tool: "finish" };
    case "edit":
      if (typeof record.body !== "string" || record.body.trim() === "") {
        return { tool: "invalid", raw };
      }
      return { tool: "edit", body: record.body };
    default:
      return { tool: "invalid", raw };
  }
}
`;

function loopSource(maxTurns: number, overhead: string, breakRepeats: boolean): string {
  return `// Patched agent control.
export function maxTurns(): number {
  return ${maxTurns};
}

export function observationOverhead(): string {
  return ${JSON.stringify(overhead)};
}

export function breakRepeats(): boolean {
  return ${breakRepeats};
}
${LOOP_PARSE}`;
}

const DEBUG_OVERHEAD = `debug-trace ${"frame ".repeat(220)}`;

const TOOLS_SWITCH = `
export type ObsKind = "read" | "edit" | "test" | "finish" | "blocked" | "invalid";

export function presentObservation(kind: ObsKind, raw: string): string {
  const text = format(kind, raw);
  if (kind === "test" && text.length > TEST_LIMIT) return text.slice(0, TEST_LIMIT);
  if (kind === "read" && text.length > READ_LIMIT) return text.slice(0, READ_LIMIT);
  return text;
}

function format(kind: ObsKind, raw: string): string {
  switch (kind) {
    case "read":
      return \`file\\n\${raw}\`;
    case "edit":
      return \`edited\\n\${raw}\`;
    case "test":
      return \`terminal\\n\${raw}\`;
    case "finish":
      return raw;
    case "blocked":
      return \`blocked: \${raw}\`;
    case "invalid":
      return \`invalid action: \${raw}\`;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
`;

function toolsSource(testLimit: number, readLimit: number): string {
  return `const TEST_LIMIT = ${testLimit};
const READ_LIMIT = ${readLimit};
${TOOLS_SWITCH}`;
}

const STOP_EMPTY = `export type StopState = {
  edited: boolean;
  compiled: boolean;
  testsPassed: boolean;
};

export function reviewStop(state: StopState): { allow: boolean; reason: string } {
  if (!state.edited) return { allow: false, reason: "no done without a code change" };
  return { allow: true, reason: "edit recorded" };
}
`;

const STOP_TESTS = `export type StopState = {
  edited: boolean;
  compiled: boolean;
  testsPassed: boolean;
};

export function reviewStop(state: StopState): { allow: boolean; reason: string } {
  if (!state.edited) return { allow: false, reason: "no done without a code change" };
  if (!state.compiled || !state.testsPassed) {
    return { allow: false, reason: "stop only after compile and tests pass" };
  }
  return { allow: true, reason: "compile and tests passed" };
}
`;

type PatchBody = {
  file: HarnessFile;
  summary: string;
  source: string;
};

function catalog(): Record<PatchId, PatchBody> {
  return {
    "stop-empty": {
      file: "stop",
      summary: "Block finish when the agent has not changed any code.",
      source: STOP_EMPTY,
    },
    "stop-tests": {
      file: "stop",
      summary: "Block finish until the edit compiles and the tests pass.",
      source: STOP_TESTS,
    },
    truncate: {
      file: "tools",
      summary: "Truncate long terminal output.",
      source: toolsSource(180, 20_000),
    },
    compress: {
      file: "memory",
      summary: "Compress turns older than the latest one into short notes.",
      source: MEMORY_COMPRESS,
    },
    "loop-debug": {
      file: "loop",
      summary: "Raise the turn cap and attach a debug trace to every observation.",
      source: loopSource(18, DEBUG_OVERHEAD, false),
    },
    "window-read": {
      file: "tools",
      summary: "Window long file reads and keep terminal output truncated.",
      source: toolsSource(180, 100),
    },
    "status-footer": {
      file: "memory",
      summary: "Add a live turn-and-edit status line under the compacted notes.",
      source: MEMORY_FOOTER,
    },
    "over-truncate": {
      file: "tools",
      summary: "Cut terminal output down to a few characters.",
      source: toolsSource(4, 100),
    },
    "tighter-notes": {
      file: "memory",
      summary: "Compress every stored turn into a short note.",
      source: MEMORY_TIGHTER,
    },
    "repeat-breaker": {
      file: "loop",
      summary: "Break a repeated file read and keep the 6-turn cap.",
      source: loopSource(6, "", true),
    },
  };
}

export function applyPatch(
  sources: HarnessSources,
  patchId: PatchId,
): { sources: HarnessSources; file: HarnessFile; summary: string } {
  const body = catalog()[patchId];
  const next: HarnessSources = { ...sources, [body.file]: body.source };
  return { sources: next, file: body.file, summary: body.summary };
}

export function rewriteSources(seed: HarnessSources, round: number): HarnessSources {
  return {
    memory: `// rewrite-all round ${round}. History stays raw.\n${seed.memory}`,
    loop: loopSource(16 + round, DEBUG_OVERHEAD, false),
    tools: `// rewrite-all round ${round}. Tool output stays full.\n${seed.tools}`,
    stop: STOP_TESTS,
  };
}
