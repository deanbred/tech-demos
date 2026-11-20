import type { PublicTask } from "./types.ts";

export type TaskCase = {
  args: unknown[];
  expected: unknown;
};

export type Task = PublicTask & {
  cases: TaskCase[];
  correct: string;
  buggy: string;
};

export const TASKS: Task[] = [
  {
    id: "sum",
    split: "train",
    title: "Sum",
    signature: "export function sum(nums: number[]): number",
    prompt: "Return the sum of nums. An empty list sums to 0.",
    cases: [
      { args: [[]], expected: 0 },
      { args: [[1, 2, 3]], expected: 6 },
      { args: [[-1, 1]], expected: 0 },
    ],
    correct: `export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}`,
    buggy: `export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b);
}`,
  },
  {
    id: "mean",
    split: "train",
    title: "Mean",
    signature: "export function mean(nums: number[]): number | null",
    prompt: "Return the arithmetic mean. Return null when nums is empty.",
    cases: [
      { args: [[]], expected: null },
      { args: [[1, 2, 3]], expected: 2 },
      { args: [[2, 2]], expected: 2 },
    ],
    correct: `export function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  let total = 0;
  for (const n of nums) total += n;
  return total / nums.length;
}`,
    buggy: `export function mean(nums: number[]): number | null {
  return nums.reduce((a, b) => a + b) / nums.length;
}`,
  },
  {
    id: "median",
    split: "train",
    title: "Median",
    signature: "export function median(nums: number[]): number | null",
    prompt:
      "Return the median of a copy sorted ascending. For an even count, average the two middle values. Return null when nums is empty.",
    cases: [
      { args: [[]], expected: null },
      { args: [[3, 1, 2]], expected: 2 },
      { args: [[4, 1]], expected: 2.5 },
      { args: [[1]], expected: 1 },
    ],
    correct: `export function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}`,
    buggy: `export function median(nums: number[]): number | null {
  if (nums.length === 0) return 0;
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 1) return nums[mid]!;
  return (nums[mid - 1]! + nums[mid]!) / 2;
}`,
  },
  {
    id: "clamp",
    split: "train",
    title: "Clamp",
    signature: "export function clamp(n: number, min: number, max: number): number",
    prompt: "Limit n to the inclusive range. If min > max, swap them first.",
    cases: [
      { args: [5, 0, 10], expected: 5 },
      { args: [-1, 0, 10], expected: 0 },
      { args: [11, 0, 10], expected: 10 },
      { args: [5, 10, 0], expected: 5 },
    ],
    correct: `export function clamp(n: number, min: number, max: number): number {
  if (min > max) {
    const swap = min;
    min = max;
    max = swap;
  }
  if (n < min) return min;
  if (n > max) return max;
  return n;
}`,
    buggy: `export function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}`,
  },
  {
    id: "range",
    split: "train",
    title: "Range",
    signature: "export function range(start: number, end: number, step?: number): number[]",
    prompt:
      "Return numbers from start up to but not including end, stepping by step (default 1). Step may be negative. Return [] when step is 0.",
    cases: [
      { args: [0, 3], expected: [0, 1, 2] },
      { args: [0, 0], expected: [] },
      { args: [1, 6, 2], expected: [1, 3, 5] },
      { args: [5, 1, -2], expected: [5, 3] },
      { args: [0, 1, 0], expected: [] },
    ],
    correct: `export function range(start: number, end: number, step = 1): number[] {
  if (step === 0) return [];
  const out: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) out.push(i);
  } else {
    for (let i = start; i > end; i += step) out.push(i);
  }
  return out;
}`,
    buggy: `export function range(start: number, end: number, step = 1): number[] {
  if (step === 0) return [];
  const out: number[] = [];
  if (step > 0) {
    for (let i = start; i <= end; i += step) out.push(i);
  } else {
    for (let i = start; i >= end; i += step) out.push(i);
  }
  return out;
}`,
  },
  {
    id: "chunk",
    split: "train",
    title: "Chunk",
    signature: "export function chunk(arr: number[], size: number): number[][]",
    prompt: "Split arr into slices of length size. Keep a final shorter slice.",
    cases: [
      { args: [[1, 2, 3, 4], 2], expected: [[1, 2], [3, 4]] },
      { args: [[1, 2, 3], 2], expected: [[1, 2], [3]] },
      { args: [[], 2], expected: [] },
    ],
    correct: `export function chunk(arr: number[], size: number): number[][] {
  if (size <= 0) throw new Error("size");
  const out: number[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}`,
    buggy: `export function chunk(arr: number[], size: number): number[][] {
  if (size <= 0) throw new Error("size");
  const out: number[][] = [];
  for (let i = 0; i + size <= arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}`,
  },
  {
    id: "unique",
    split: "train",
    title: "Unique",
    signature: "export function unique(arr: number[]): number[]",
    prompt: "Drop repeated values, keeping the first-seen order.",
    cases: [
      { args: [[2, 1, 2, 3, 1]], expected: [2, 1, 3] },
      { args: [[]], expected: [] },
      { args: [[4, 4, 4]], expected: [4] },
    ],
    correct: `export function unique(arr: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const value of arr) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}`,
    buggy: `export function unique(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b).filter((value, index, all) => index === 0 || all[index - 1] !== value);
}`,
  },
  {
    id: "groupBy",
    split: "train",
    title: "Group by key",
    signature: "export function groupBy(pairs: [string, number][]): Record<string, number[]>",
    prompt: "Group values by key. Key order is first-seen order. Keep every value.",
    cases: [
      {
        args: [[["b", 1], ["a", 2], ["b", 3]]],
        expected: { b: [1, 3], a: [2] },
      },
      { args: [[]], expected: {} },
    ],
    correct: `export function groupBy(pairs: [string, number][]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [key, value] of pairs) {
    if (!out[key]) out[key] = [];
    out[key].push(value);
  }
  return out;
}`,
    buggy: `export function groupBy(pairs: [string, number][]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [key, value] of pairs) {
    if (!out[key]) out[key] = [];
    out[key].push(value);
  }
  const sorted: Record<string, number[]> = {};
  for (const key of Object.keys(out).sort()) sorted[key] = out[key]!;
  return sorted;
}`,
  },
  {
    id: "zip",
    split: "train",
    title: "Zip",
    signature: "export function zip(a: number[], b: number[]): [number, number][]",
    prompt: "Pair items from a and b, stopping at the shorter list.",
    cases: [
      { args: [[1, 2, 3], [4, 5]], expected: [[1, 4], [2, 5]] },
      { args: [[1], [4, 5]], expected: [[1, 4]] },
      { args: [[], [1]], expected: [] },
    ],
    correct: `export function zip(a: number[], b: number[]): [number, number][] {
  const n = Math.min(a.length, b.length);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) out.push([a[i]!, b[i]!]);
  return out;
}`,
    buggy: `export function zip(a: number[], b: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < a.length; i++) out.push([a[i]!, b[i] ?? 0]);
  return out;
}`,
  },
  {
    id: "flatten",
    split: "train",
    title: "Flatten one level",
    signature: "export function flatten(arr: unknown[]): unknown[]",
    prompt: "Flatten exactly one level: spread each direct child that is a list, and do not walk any deeper.",
    cases: [
      { args: [[[[1], [2, 3]]]], expected: [[1], [2, 3]] },
      { args: [[1, [2, [3]]]], expected: [1, 2, [3]] },
      { args: [[]], expected: [] },
    ],
    correct: `export function flatten(arr: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const item of arr) {
    if (Array.isArray(item)) out.push(...item);
    else out.push(item);
  }
  return out;
}`,
    buggy: `export function flatten(arr: unknown[]): unknown[] {
  const out: unknown[] = [];
  const walk = (items: unknown[]) => {
    for (const item of items) {
      if (Array.isArray(item)) walk(item);
      else out.push(item);
    }
  };
  walk(arr);
  return out;
}`,
  },
  {
    id: "sumAll",
    split: "heldout",
    title: "Sum all",
    signature: "export function sumAll(nums: number[]): number",
    prompt: "Return the sum of nums. An empty list sums to 0.",
    cases: [
      { args: [[]], expected: 0 },
      { args: [[4, -1, 2]], expected: 5 },
    ],
    correct: `export function sumAll(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}`,
    buggy: `export function sumAll(nums: number[]): number {
  return nums.reduce((a, b) => a + b);
}`,
  },
  {
    id: "average",
    split: "heldout",
    title: "Average",
    signature: "export function average(nums: number[]): number | null",
    prompt: "Return the arithmetic mean. Return null when nums is empty.",
    cases: [
      { args: [[]], expected: null },
      { args: [[1, 2]], expected: 1.5 },
    ],
    correct: `export function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  let total = 0;
  for (const n of nums) total += n;
  return total / nums.length;
}`,
    buggy: `export function average(nums: number[]): number | null {
  return nums.reduce((a, b) => a + b) / nums.length;
}`,
  },
  {
    id: "clampIndex",
    split: "heldout",
    title: "Clamp index",
    signature: "export function clampIndex(length: number, index: number): number",
    prompt: "Clamp index into the inclusive range 0 .. length-1.",
    cases: [
      { args: [5, -3], expected: 0 },
      { args: [5, 9], expected: 4 },
      { args: [5, 2], expected: 2 },
    ],
    correct: `export function clampIndex(length: number, index: number): number {
  if (length <= 0) throw new Error("empty");
  if (index < 0) return 0;
  if (index > length - 1) return length - 1;
  return index;
}`,
    buggy: `export function clampIndex(length: number, index: number): number {
  return index;
}`,
  },
  {
    id: "stepSum",
    split: "heldout",
    title: "Step sum",
    signature: "export function stepSum(start: number, end: number, step?: number): number",
    prompt:
      "Sum the half-open range from start to end with the given step (default 1). Return 0 when step is 0.",
    cases: [
      { args: [0, 4, 2], expected: 2 },
      { args: [0, 3, 1], expected: 3 },
      { args: [1, 1, 1], expected: 0 },
    ],
    correct: `export function stepSum(start: number, end: number, step = 1): number {
  if (step === 0) return 0;
  let total = 0;
  if (step > 0) {
    for (let i = start; i < end; i += step) total += i;
  } else {
    for (let i = start; i > end; i += step) total += i;
  }
  return total;
}`,
    buggy: `export function stepSum(start: number, end: number, step = 1): number {
  if (step === 0) return 0;
  let total = 0;
  if (step > 0) {
    for (let i = start; i <= end; i += step) total += i;
  } else {
    for (let i = start; i >= end; i += step) total += i;
  }
  return total;
}`,
  },
  {
    id: "movingAverage",
    split: "heldout",
    title: "Moving average",
    signature: "export function movingAverage(nums: number[], window: number): number[]",
    prompt:
      "Return the mean of every contiguous window. Return [] when nums is shorter than window. Throw when window <= 0.",
    cases: [
      { args: [[1, 2, 3, 4], 2], expected: [1.5, 2.5, 3.5] },
      { args: [[1, 2], 3], expected: [] },
    ],
    correct: `export function movingAverage(nums: number[], window: number): number[] {
  if (window <= 0) throw new Error("window");
  if (nums.length < window) return [];
  const out: number[] = [];
  for (let i = 0; i + window <= nums.length; i++) {
    let total = 0;
    for (let j = 0; j < window; j++) total += nums[i + j]!;
    out.push(total / window);
  }
  return out;
}`,
    buggy: `export function movingAverage(nums: number[], window: number): number[] {
  if (window <= 0) throw new Error("window");
  const width = Math.max(1, window - 1);
  if (nums.length < width) return [];
  const out: number[] = [];
  for (let i = 0; i + width <= nums.length; i++) {
    let total = 0;
    for (let j = 0; j < width; j++) total += nums[i + j]!;
    out.push(total / width);
  }
  return out;
}`,
  },
  {
    id: "intersection",
    split: "heldout",
    title: "Intersection",
    signature: "export function intersection(a: number[], b: number[]): number[]",
    prompt: "Values present in both lists, in the order of first appearance in a, without duplicates.",
    cases: [
      { args: [[3, 1, 2, 1], [1, 3]], expected: [3, 1] },
      { args: [[1], [2]], expected: [] },
    ],
    correct: `export function intersection(a: number[], b: number[]): number[] {
  const inB = new Set(b);
  const seen = new Set<number>();
  const out: number[] = [];
  for (const value of a) {
    if (inB.has(value) && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}`,
    buggy: `export function intersection(a: number[], b: number[]): number[] {
  const inB = new Set(b);
  const out: number[] = [];
  for (const value of a) {
    if (inB.has(value) && !out.includes(value)) out.push(value);
  }
  return out.sort((x, y) => x - y);
}`,
  },
  {
    id: "difference",
    split: "heldout",
    title: "Difference",
    signature: "export function difference(a: number[], b: number[]): number[]",
    prompt: "Values in a that are not in b, in first-seen order, without duplicates.",
    cases: [
      { args: [[3, 1, 2, 1], [1]], expected: [3, 2] },
      { args: [[1, 1], [1]], expected: [] },
    ],
    correct: `export function difference(a: number[], b: number[]): number[] {
  const inB = new Set(b);
  const seen = new Set<number>();
  const out: number[] = [];
  for (const value of a) {
    if (!inB.has(value) && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}`,
    buggy: `export function difference(a: number[], b: number[]): number[] {
  const inB = new Set(b);
  const out: number[] = [];
  for (const value of a) {
    if (!inB.has(value) && !out.includes(value)) out.push(value);
  }
  return out.sort((x, y) => x - y);
}`,
  },
  {
    id: "firstWins",
    split: "heldout",
    title: "First wins",
    signature: "export function firstWins(pairs: [string, number][]): Record<string, number>",
    prompt: "Build an object of the first value for each key. Key order is first-seen order.",
    cases: [
      { args: [[["b", 1], ["a", 2], ["b", 9]]], expected: { b: 1, a: 2 } },
      { args: [[]], expected: {} },
    ],
    correct: `export function firstWins(pairs: [string, number][]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of pairs) {
    if (!(key in out)) out[key] = value;
  }
  return out;
}`,
    buggy: `export function firstWins(pairs: [string, number][]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of pairs) out[key] = value;
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(out).sort()) sorted[key] = out[key]!;
  return sorted;
}`,
  },
  {
    id: "zipShort",
    split: "heldout",
    title: "Zip short",
    signature: "export function zipShort(a: number[], b: number[]): [number, number][]",
    prompt: "Pair items from a and b, stopping at the shorter list.",
    cases: [
      { args: [[8, 9], [1, 2, 3]], expected: [[8, 1], [9, 2]] },
      { args: [[8, 9, 10], [1]], expected: [[8, 1]] },
    ],
    correct: `export function zipShort(a: number[], b: number[]): [number, number][] {
  const n = Math.min(a.length, b.length);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) out.push([a[i]!, b[i]!]);
  return out;
}`,
    buggy: `export function zipShort(a: number[], b: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < a.length; i++) out.push([a[i]!, b[i] ?? -1]);
  return out;
}`,
  },
  {
    id: "flattenOnce",
    split: "heldout",
    title: "Flatten once",
    signature: "export function flattenOnce(arr: unknown[]): unknown[]",
    prompt: "Flatten exactly one level: spread each direct child that is a list, and do not walk any deeper.",
    cases: [
      { args: [[[[1], [2, 3]]]], expected: [[1], [2, 3]] },
      { args: [[1, [2, [3]]]], expected: [1, 2, [3]] },
    ],
    correct: `export function flattenOnce(arr: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const item of arr) {
    if (Array.isArray(item)) out.push(...item);
    else out.push(item);
  }
  return out;
}`,
    buggy: `export function flattenOnce(arr: unknown[]): unknown[] {
  const out: unknown[] = [];
  const walk = (items: unknown[]) => {
    for (const item of items) {
      if (Array.isArray(item)) walk(item);
      else out.push(item);
    }
  };
  walk(arr);
  return out;
}`,
  },
];

export function publicTasks(tasks: Task[] = TASKS): PublicTask[] {
  return tasks.map(({ id, split, title, signature, prompt }) => ({
    id,
    split,
    title,
    signature,
    prompt,
  }));
}

export function tasksBySplit(tasks: Task[], split: "train" | "heldout"): Task[] {
  return tasks.filter((task) => task.split === split);
}
