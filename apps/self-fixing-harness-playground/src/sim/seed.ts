import path from "node:path";

import { HARNESS_FILES, type HarnessSources } from "./types.ts";

export async function readSeed(): Promise<HarnessSources> {
  const dir = path.resolve(import.meta.dirname, "../../harness");
  const entries = await Promise.all(
    HARNESS_FILES.map(async (file) => {
      const text = await Bun.file(path.join(dir, `${file}.ts`)).text();
      return [file, text] as const;
    }),
  );
  return Object.fromEntries(entries) as HarnessSources;
}
