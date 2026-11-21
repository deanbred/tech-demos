import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HARNESS_FILES, type HarnessSources } from "@/sim/types";

export function HarnessView({ sources }: { sources: HarnessSources | null }) {
  if (!sources) {
    return (
      <p className="text-muted-foreground text-sm">
        The four files show up here once a run has a kept harness. Before that, they are the seed on disk.
      </p>
    );
  }
  return (
    <Tabs defaultValue="memory">
      <TabsList>
        {HARNESS_FILES.map((file) => (
          <TabsTrigger key={file} value={file}>
            {file}.ts
          </TabsTrigger>
        ))}
      </TabsList>
      {HARNESS_FILES.map((file) => (
        <TabsContent key={file} value={file}>
          <pre
            aria-label={`${file}.ts`}
            className="max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-5"
          >
            {sources[file]}
          </pre>
        </TabsContent>
      ))}
    </Tabs>
  );
}
