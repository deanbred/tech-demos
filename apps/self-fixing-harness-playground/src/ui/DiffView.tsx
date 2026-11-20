export function DiffView({ diff }: { diff: string }) {
  if (!diff.trim()) {
    return <p className="text-muted-foreground text-sm">This round did not change a file.</p>;
  }
  return (
    <pre
      aria-label="Unified diff"
      className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-5"
    >
      {diff.split("\n").map((line, index) => (
        <div key={`${index}-${line}`} className={lineClass(line)}>
          {line || " "}
        </div>
      ))}
    </pre>
  );
}

function lineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "text-muted-foreground";
  if (line.startsWith("+")) return "text-green-700 dark:text-green-400";
  if (line.startsWith("-")) return "text-red-700 dark:text-red-400";
  return "";
}
