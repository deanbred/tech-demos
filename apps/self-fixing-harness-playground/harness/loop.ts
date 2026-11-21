// Agent control. The seed parses one JSON action and stops after 6 turns.

export type Action =
  | { tool: "read" }
  | { tool: "edit"; body: string }
  | { tool: "test" }
  | { tool: "finish" }
  | { tool: "invalid"; raw: string };

export function maxTurns(): number {
  return 6;
}

export function observationOverhead(): string {
  return "";
}

export function breakRepeats(): boolean {
  return false;
}

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
