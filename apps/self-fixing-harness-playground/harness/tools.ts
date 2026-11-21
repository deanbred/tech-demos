// Action interface. The seed returns tool output in full.

export type ObsKind = "read" | "edit" | "test" | "finish" | "blocked" | "invalid";

export function presentObservation(kind: ObsKind, raw: string): string {
  switch (kind) {
    case "read":
      return `file\n${raw}`;
    case "edit":
      return `edited\n${raw}`;
    case "test":
      return `terminal\n${raw}`;
    case "finish":
      return raw;
    case "blocked":
      return `blocked: ${raw}`;
    case "invalid":
      return `invalid action: ${raw}`;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
