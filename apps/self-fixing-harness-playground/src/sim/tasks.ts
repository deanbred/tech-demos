import type { PublicTask, Task, TaskCase, TaskKind, TaskSplit } from "./types.ts";

function source(name: string, args: string, body: string): string {
  return `export function ${name}(${args}) {\n${body}\n}\n`;
}

function task(input: {
  id: string;
  title: string;
  split: TaskSplit;
  kind: TaskKind;
  args: string;
  buggy: string;
  wrong: string;
  correct: string;
  cases: TaskCase[];
}): Task {
  return {
    id: input.id,
    title: input.title,
    split: input.split,
    kind: input.kind,
    exportName: input.id,
    buggy: source(input.id, input.args, input.buggy),
    wrong: source(input.id, input.args, input.wrong),
    correct: source(input.id, input.args, input.correct),
    cases: input.cases,
  };
}

export const TASKS: Task[] = [
  task({
    id: "t01",
    title: "Clamp a number into a range",
    split: "train",
    kind: "easy",
    args: "n: number, lo: number, hi: number",
    buggy: "if (n < lo) return lo;\n  if (n > hi) return n;\n  return n;",
    wrong: "return lo;",
    correct: "if (n < lo) return lo;\n  if (n > hi) return hi;\n  return n;",
    cases: [
      { args: [3, 0, 5], expected: 3 },
      { args: [-1, 0, 5], expected: 0 },
      { args: [8, 0, 5], expected: 5 },
    ],
  }),
  task({
    id: "t02",
    title: "Sum every number",
    split: "train",
    kind: "easy",
    args: "nums: number[]",
    buggy: "let total = 0;\n  for (let i = 0; i < nums.length - 1; i++) total += nums[i];\n  return total;",
    wrong: "return 0;",
    correct: "let total = 0;\n  for (const n of nums) total += n;\n  return total;",
    cases: [
      { args: [[1, 2, 3]], expected: 6 },
      { args: [[]], expected: 0 },
      { args: [[4]], expected: 4 },
    ],
  }),
  task({
    id: "t03",
    title: "Count values strictly above a limit",
    split: "train",
    kind: "easy",
    args: "nums: number[], limit: number",
    buggy: "return nums.filter((n) => n >= limit).length;",
    wrong: "return nums.length;",
    correct: "return nums.filter((n) => n > limit).length;",
    cases: [
      { args: [[1, 2, 3], 2], expected: 1 },
      { args: [[2, 2], 2], expected: 0 },
      { args: [[5], 4], expected: 1 },
    ],
  }),
  task({
    id: "t04",
    title: "Largest number, including negatives",
    split: "train",
    kind: "easy",
    args: "nums: number[]",
    buggy: "let best = 0;\n  for (const n of nums) if (n > best) best = n;\n  return best;",
    wrong: "return 0;",
    correct: "let best = nums[0];\n  for (const n of nums) if (n > best) best = n;\n  return best;",
    cases: [
      { args: [[-3, -1, -2]], expected: -1 },
      { args: [[1, 4, 2]], expected: 4 },
      { args: [[0]], expected: 0 },
    ],
  }),
  task({
    id: "t05",
    title: "Case-insensitive palindrome",
    split: "train",
    kind: "guided",
    args: "text: string",
    buggy: "return text === text.split('').reverse().join('');",
    wrong: "return true;",
    correct:
      "const folded = text.toLowerCase();\n  return folded === folded.split('').reverse().join('');",
    cases: [
      { args: ["racecar"], expected: true },
      { args: ["Racecar"], expected: true },
      { args: ["nope"], expected: false },
    ],
  }),
  task({
    id: "t06",
    title: "Unique values in original order",
    split: "train",
    kind: "guided",
    args: "nums: number[]",
    buggy: "return [...new Set(nums)].sort((a, b) => a - b);",
    wrong: "return [];",
    correct:
      "const seen = new Set<number>();\n  const out: number[] = [];\n  for (const n of nums) {\n    if (seen.has(n)) continue;\n    seen.add(n);\n    out.push(n);\n  }\n  return out;",
    cases: [
      { args: [[3, 1, 3, 2]], expected: [3, 1, 2] },
      { args: [[1]], expected: [1] },
      { args: [[2, 2, 1]], expected: [2, 1] },
    ],
  }),
  task({
    id: "t07",
    title: "Title-case each word",
    split: "train",
    kind: "guided",
    args: "text: string",
    buggy: "return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();",
    wrong: "return text;",
    correct:
      "return text\n    .split(' ')\n    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())\n    .join(' ');",
    cases: [
      { args: ["hello world"], expected: "Hello World" },
      { args: ["a"], expected: "A" },
      { args: ["FOO bar"], expected: "Foo Bar" },
    ],
  }),
  task({
    id: "t08",
    title: "Arithmetic mean",
    split: "train",
    kind: "guided",
    args: "nums: number[]",
    buggy: "const total = nums.reduce((sum, n) => sum + n, 0);\n  return total / (nums.length + 1);",
    wrong: "return nums.reduce((sum, n) => sum + n, 0);",
    correct: "const total = nums.reduce((sum, n) => sum + n, 0);\n  return total / nums.length;",
    cases: [
      { args: [[2, 4]], expected: 3 },
      { args: [[1, 1, 1, 1]], expected: 1 },
      { args: [[10]], expected: 10 },
    ],
  }),
  task({
    id: "t09",
    title: "Most frequent item",
    split: "train",
    kind: "impossible",
    args: "items: string[]",
    buggy: "return items[0];",
    wrong: "return items[items.length - 1];",
    correct:
      "const counts = new Map<string, number>();\n  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);\n  let best = items[0];\n  for (const item of items) {\n    if ((counts.get(item) ?? 0) > (counts.get(best) ?? 0)) best = item;\n  }\n  return best;",
    cases: [
      { args: [["a", "b", "a"]], expected: "a" },
      { args: [["b", "b", "a"]], expected: "b" },
      { args: [["c"]], expected: "c" },
    ],
  }),
  task({
    id: "t10",
    title: "Integer range, start inclusive",
    split: "train",
    kind: "impossible",
    args: "start: number, end: number",
    buggy: "const out: number[] = [];\n  for (let i = start + 1; i < end; i++) out.push(i);\n  return out;",
    wrong: "return [];",
    correct: "const out: number[] = [];\n  for (let i = start; i < end; i++) out.push(i);\n  return out;",
    cases: [
      { args: [1, 4], expected: [1, 2, 3] },
      { args: [0, 1], expected: [0] },
      { args: [2, 2], expected: [] },
    ],
  }),
  task({
    id: "h01",
    title: "Pad a string on the left",
    split: "heldout",
    kind: "easy",
    args: "text: string, width: number, ch: string",
    buggy: "return text.length >= width ? text : text + ch.repeat(width - text.length);",
    wrong: "return text;",
    correct: "return text.length >= width ? text : ch.repeat(width - text.length) + text;",
    cases: [
      { args: ["ab", 4, "x"], expected: "xxab" },
      { args: ["abcd", 2, "x"], expected: "abcd" },
      { args: ["", 2, "z"], expected: "zz" },
    ],
  }),
  task({
    id: "h02",
    title: "Inclusive range check",
    split: "heldout",
    kind: "easy",
    args: "n: number, lo: number, hi: number",
    buggy: "return n > lo && n < hi;",
    wrong: "return true;",
    correct: "return n >= lo && n <= hi;",
    cases: [
      { args: [1, 1, 3], expected: true },
      { args: [3, 1, 3], expected: true },
      { args: [0, 1, 3], expected: false },
    ],
  }),
  task({
    id: "h03",
    title: "Dot product",
    split: "heldout",
    kind: "easy",
    args: "a: number[], b: number[]",
    buggy: "let total = 0;\n  for (let i = 0; i < a.length - 1; i++) total += a[i] * b[i];\n  return total;",
    wrong: "return 0;",
    correct: "let total = 0;\n  for (let i = 0; i < a.length; i++) total += a[i] * b[i];\n  return total;",
    cases: [
      { args: [[1, 2], [3, 4]], expected: 11 },
      { args: [[2], [5]], expected: 10 },
      { args: [[0, 0], [1, 1]], expected: 0 },
    ],
  }),
  task({
    id: "h04",
    title: "Split a list into chunks",
    split: "heldout",
    kind: "guided",
    args: "items: number[], size: number",
    buggy:
      "const out: number[][] = [];\n  for (let i = 0; i < items.length; i += size + 1) out.push(items.slice(i, i + size));\n  return out;",
    wrong: "return [items];",
    correct:
      "const out: number[][] = [];\n  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));\n  return out;",
    cases: [
      { args: [[1, 2, 3, 4], 2], expected: [[1, 2], [3, 4]] },
      { args: [[1, 2, 3], 2], expected: [[1, 2], [3]] },
      { args: [[1], 3], expected: [[1]] },
    ],
  }),
  task({
    id: "h05",
    title: "Flatten one level",
    split: "heldout",
    kind: "guided",
    args: "lists: number[][]",
    buggy: "return lists[0] ?? [];",
    wrong: "return [];",
    correct: "return lists.flat();",
    cases: [
      { args: [[[1], [2, 3]]], expected: [1, 2, 3] },
      { args: [[[]]], expected: [] },
      { args: [[[4, 5]]], expected: [4, 5] },
    ],
  }),
  task({
    id: "h06",
    title: "Parse comma-separated integers",
    split: "heldout",
    kind: "guided",
    args: "text: string",
    buggy: "return text.split(',');",
    wrong: "return [];",
    correct: "return text.split(',').map((part) => Number(part.trim()));",
    cases: [
      { args: ["1, 2"], expected: [1, 2] },
      { args: ["3"], expected: [3] },
      { args: ["4,5"], expected: [4, 5] },
    ],
  }),
  task({
    id: "h07",
    title: "Values in the first list only",
    split: "heldout",
    kind: "guided",
    args: "a: number[], b: number[]",
    buggy: "const left = new Set(a);\n  return b.filter((n) => !left.has(n));",
    wrong: "return a;",
    correct: "const right = new Set(b);\n  return a.filter((n) => !right.has(n));",
    cases: [
      { args: [[1, 2, 3], [2]], expected: [1, 3] },
      { args: [[1], [1]], expected: [] },
      { args: [[4, 5], [9]], expected: [4, 5] },
    ],
  }),
  task({
    id: "h08",
    title: "Split on whitespace",
    split: "heldout",
    kind: "guided",
    args: "text: string",
    buggy: "return text.split(',');",
    wrong: "return [text];",
    correct: "return text.split(/\\s+/).filter((word) => word.length > 0);",
    cases: [
      { args: ["a b"], expected: ["a", "b"] },
      { args: ["one"], expected: ["one"] },
      { args: ["x  y"], expected: ["x", "y"] },
    ],
  }),
  task({
    id: "h09",
    title: "Pairwise sum",
    split: "heldout",
    kind: "impossible",
    args: "a: number[], b: number[]",
    buggy: "return a;",
    wrong: "return b;",
    correct: "const out: number[] = [];\n  for (let i = 0; i < a.length && i < b.length; i++) out.push(a[i] + b[i]);\n  return out;",
    cases: [
      { args: [[1, 2], [3, 4]], expected: [4, 6] },
      { args: [[1], [2, 3]], expected: [3] },
      { args: [[0, 1], [1, 1]], expected: [1, 2] },
    ],
  }),
  task({
    id: "h10",
    title: "Shared values, in order",
    split: "heldout",
    kind: "impossible",
    args: "a: number[], b: number[]",
    buggy: "return a;",
    wrong: "return [];",
    correct:
      "const right = new Set(b);\n  const seen = new Set<number>();\n  const out: number[] = [];\n  for (const n of a) {\n    if (!right.has(n) || seen.has(n)) continue;\n    seen.add(n);\n    out.push(n);\n  }\n  return out;",
    cases: [
      { args: [[1, 2, 2], [2, 3]], expected: [2] },
      { args: [[1], [1]], expected: [1] },
      { args: [[1], [2]], expected: [] },
    ],
  }),
];

export function tasksBySplit(tasks: Task[], split: TaskSplit): Task[] {
  return tasks.filter((item) => item.split === split);
}

export function publicTasks(tasks: Task[]): PublicTask[] {
  return tasks.map((item) => ({
    id: item.id,
    title: item.title,
    split: item.split,
    kind: item.kind,
  }));
}
