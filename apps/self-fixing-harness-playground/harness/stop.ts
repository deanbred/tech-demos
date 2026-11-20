// Verification. The seed lets the agent stop on any finish call.

export type StopState = {
  edited: boolean;
  compiled: boolean;
  testsPassed: boolean;
};

export function reviewStop(_state: StopState): { allow: boolean; reason: string } {
  return { allow: true, reason: "pass-through stop hook" };
}
