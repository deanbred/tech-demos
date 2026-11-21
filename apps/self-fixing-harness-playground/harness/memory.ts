// Context and state. The seed keeps every turn verbatim.

export type TurnRecord = {
  turn: number;
  action: string;
  observation: string;
};

const PREAMBLE = "Fix the exported function. Use read, edit, test, and finish.";

export function renderContext(turns: TurnRecord[]): { text: string; tokens: number } {
  const lines = [PREAMBLE];
  for (const turn of turns) {
    lines.push(`#${turn.turn} ${turn.action}`);
    lines.push(turn.observation);
  }
  const text = lines.join("\n");
  return { text, tokens: countTokens(text) };
}

function countTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
