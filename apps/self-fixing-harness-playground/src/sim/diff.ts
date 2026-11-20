import { HARNESS_FILES, type HarnessFile, type HarnessSources } from "./types.ts";

export function changedFiles(before: HarnessSources, after: HarnessSources): HarnessFile[] {
  return HARNESS_FILES.filter((file) => before[file] !== after[file]);
}

export function harnessDiff(before: HarnessSources, after: HarnessSources): string {
  return HARNESS_FILES.map((file) => unifiedDiff(`harness/${file}.ts`, before[file], after[file]))
    .filter((diff) => diff.length > 0)
    .join("\n");
}

export function unifiedDiff(filePath: string, before: string, after: string): string {
  if (before === after) return "";
  const removed = before.endsWith("\n") ? before.slice(0, -1) : before;
  const added = after.endsWith("\n") ? after.slice(0, -1) : after;
  const body = diffLines(removed.split("\n"), added.split("\n"));
  return [`--- a/${filePath}`, `+++ b/${filePath}`, ...body].join("\n");
}

function diffLines(before: string[], after: string[]): string[] {
  const rows = before.length;
  const cols = after.length;
  const scores: number[][] = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      scores[i][j] =
        before[i] === after[j]
          ? scores[i + 1][j + 1] + 1
          : Math.max(scores[i + 1][j], scores[i][j + 1]);
    }
  }
  const lines: string[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (before[i] === after[j]) {
      lines.push(` ${before[i]}`);
      i += 1;
      j += 1;
    } else if (scores[i + 1][j] >= scores[i][j + 1]) {
      lines.push(`-${before[i]}`);
      i += 1;
    } else {
      lines.push(`+${after[j]}`);
      j += 1;
    }
  }
  while (i < rows) {
    lines.push(`-${before[i]}`);
    i += 1;
  }
  while (j < cols) {
    lines.push(`+${after[j]}`);
    j += 1;
  }
  return lines;
}
