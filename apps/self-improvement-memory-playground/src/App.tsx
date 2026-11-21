import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODEL_LABEL, type ComparisonResult, type Mode, type PublicTask } from "@/sim/types";
import { LedgerTable } from "@/ui/LedgerTable";
import { ScoreChart } from "@/ui/ScoreChart";

type Snapshot = {
  type: "snapshot";
  id: string;
  status: "running" | "done" | "error";
  error: string | null;
  result: ComparisonResult | null;
};

const PAPER_URL = "https://arxiv.org/abs/2611.18856";

export default function App() {
  const [rounds, setRounds] = useState(10);
  const [candidates, setCandidates] = useState(5);
  const [seed, setSeed] = useState(1);
  const [mode, setMode] = useState<Mode>("mock");
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [realReady, setRealReady] = useState<boolean | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void fetch("/api/tasks")
      .then((response) => response.json())
      .then((body: { tasks: PublicTask[] }) => setTasks(body.tasks))
      .catch(() => setTasks([]));
    void fetch("/api/health")
      .then((response) => response.json())
      .then((body: { realModelConfigured: boolean }) => setRealReady(body.realModelConfigured))
      .catch(() => setRealReady(false));
  }, []);

  useEffect(() => {
    if (!runId) return;
    const source = new EventSource(`/api/runs/${runId}/events`);
    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as Snapshot;
      setSnapshot(next);
      if (next.status !== "running") source.close();
    };
    return () => source.close();
  }, [runId]);

  const result = snapshot?.result ?? null;
  const running = snapshot?.status === "running" || starting;
  const resultsLabel = result ? result.modelLabel : MODEL_LABEL[mode];
  const simLast = result?.sim.series.at(-1);
  const baseLast = result?.baseline.series.at(-1);
  const heldoutGap =
    simLast && baseLast ? simLast.heldoutPassed - baseLast.heldoutPassed : null;

  async function startRun() {
    setError(null);
    setStarting(true);
    setSnapshot(null);
    setRunId(null);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rounds, candidates, seed, mode }),
      });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) {
        setError(body.error ?? "Could not start the run.");
        return;
      }
      setRunId(body.id);
      setSnapshot({
        type: "snapshot",
        id: body.id,
        status: "running",
        error: null,
        result: null,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the run.");
    } finally {
      setStarting(false);
    }
  }

  const simRound = result?.sim.series.at(-1)?.round ?? 0;
  const baseRound = result?.baseline.series.at(-1)?.round ?? 0;
  const statusLine =
    snapshot?.status === "error"
      ? snapshot.error
      : running
        ? `Scoring · SIM round ${simRound} · no-ledger round ${baseRound}`
        : result
          ? "Run finished"
          : "Idle";

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Self-Improvement Memory</h1>
          <Badge variant="outline">playground</Badge>
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm">
          A local replay of the editor loop in{" "}
          <a className="text-foreground underline underline-offset-2" href={PAPER_URL}>
            Self-Improvement Memory (arXiv 2611.18856)
          </a>
          . An editor proposes changes to a solver&apos;s prompt and tools. SIM keeps a ledger of
          every edit. The no-ledger baseline sees only the latest train scores. Held-out tasks are
          scored for the chart and never shown to the editor.
        </p>
        <ModelBanner label={resultsLabel} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Run</CardTitle>
          <CardDescription>
            Defaults match the paper&apos;s budget: 10 rounds, 5 candidates. Both conditions share
            the seed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <NumberField label="Rounds" value={rounds} min={1} max={20} onChange={setRounds} />
            <NumberField
              label="Candidates"
              value={candidates}
              min={1}
              max={8}
              onChange={setCandidates}
            />
            <NumberField label="Seed" value={seed} min={0} max={1000000} onChange={setSeed} />
            <div className="flex flex-col gap-2">
              <Label>Model</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock (no key)</SelectItem>
                  <SelectItem value="real">Real model</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={running} onClick={() => void startRun()}>
                {running ? "Running" : "Run rounds"}
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">{statusLine}</p>
          {mode === "real" && realReady === false ? (
            <p className="text-sm">
              Real mode needs <code>SIM_API_KEY</code> in <code>.env</code>. This server does not
              have one, so a real run will stop with that error.
            </p>
          ) : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {snapshot?.status === "error" && snapshot.error ? (
            <p className="text-destructive text-sm">{snapshot.error}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Held-out score
              <Badge variant="outline">{resultsLabel}</Badge>
            </CardTitle>
            <CardDescription>
              Tasks the editor never sees, scored after each round. This is this run&apos;s curve,
              not a figure from the paper.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreChart sim={result?.sim.series ?? []} baseline={result?.baseline.series ?? []} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Scoreboard
              <Badge variant="outline">{resultsLabel}</Badge>
            </CardTitle>
            <CardDescription>Final counts for this run.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <ScoreLine
              name="SIM"
              train={simLast}
              accepted={result?.sim.ledger.problems.reduce((sum, problem) => sum + problem.attempts.length, 0)}
            />
            <ScoreLine
              name="No ledger"
              train={baseLast}
              accepted={result?.baseline.ledger.problems.reduce(
                (sum, problem) => sum + problem.attempts.length,
                0,
              )}
            />
            <p>
              Held-out gap on this run (SIM minus no ledger):{" "}
              <span className="font-medium tabular-nums">
                {heldoutGap === null ? "—" : `${heldoutGap >= 0 ? "+" : ""}${heldoutGap}`}
              </span>
            </p>
            <p className="text-muted-foreground">
              The paper reports that paired continuations with SIM improved final scores by an
              average of +2.36 points over harness-only continuation (p = 0.003) on a coding
              benchmark. That number is the paper&apos;s claim. It is not a result of this demo.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Ledger
            <Badge variant="outline">{resultsLabel}</Badge>
          </CardTitle>
          <CardDescription>
            Rows where a predicted task was missed are highlighted. The problem list in{" "}
            <code>sim-ledger.json</code> keeps accepted attempts only, matching Figure 8. Rejected
            candidates stay in the round log so SIM can refuse to retry a direction that already
            missed, unless a new train task is failing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sim">
            <TabsList>
              <TabsTrigger value="sim">SIM</TabsTrigger>
              <TabsTrigger value="baseline">No ledger</TabsTrigger>
            </TabsList>
            <TabsContent value="sim" className="pt-3">
              {result ? (
                <LedgerTable ledger={result.sim.ledger} />
              ) : (
                <p className="text-muted-foreground text-sm">Start a run to fill the ledger.</p>
              )}
            </TabsContent>
            <TabsContent value="baseline" className="pt-3">
              {result ? (
                <LedgerTable ledger={result.baseline.ledger} />
              ) : (
                <p className="text-muted-foreground text-sm">Start a run to fill the ledger.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task suite</CardTitle>
          <CardDescription>
            {tasks.filter((task) => task.split === "train").length} train tasks are the only scores
            the editor sees. {tasks.filter((task) => task.split === "heldout").length} held-out
            tasks are scored afterward.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{task.title}</span>
                <Badge variant="outline">{task.split === "train" ? "train" : "held-out"}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">{task.prompt}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function ModelBanner({ label }: { label: string }) {
  const mock = label === MODEL_LABEL.mock;
  return (
    <div
      className={
        mock
          ? "rounded-lg border border-amber-500/60 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          : "rounded-lg border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
      }
    >
      {label}
      {mock
        ? " — solver and editor are a seeded simulator. No model was called."
        : " — solver and editor calls went to the configured API."}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </div>
  );
}

function ScoreLine({
  name,
  train,
  accepted,
}: {
  name: string;
  train: { trainPassed: number; trainTotal: number; heldoutPassed: number; heldoutTotal: number } | undefined;
  accepted: number | undefined;
}) {
  if (!train) {
    return (
      <p>
        <span className="font-medium">{name}.</span>{" "}
        <span className="text-muted-foreground">waiting for scores</span>
      </p>
    );
  }
  return (
    <p>
      <span className="font-medium">{name}.</span> Train {train.trainPassed}/{train.trainTotal}.
      Held-out {train.heldoutPassed}/{train.heldoutTotal}. Accepted edits {accepted ?? 0}.
    </p>
  );
}
