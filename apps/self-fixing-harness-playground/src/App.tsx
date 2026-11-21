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
import {
  DEFAULT_ROUNDS,
  DEFAULT_SEED,
  DEFAULT_TOKEN_BUDGET,
  MODEL_LABEL,
  type ComparisonResult,
  type Mode,
  type PublicTask,
  type RunScope,
} from "@/sim/types";
import { HarnessView } from "@/ui/HarnessView";
import { PassChart } from "@/ui/PassChart";
import { Scoreboard } from "@/ui/Scoreboard";
import { Timeline } from "@/ui/Timeline";
import { TokenChart } from "@/ui/TokenChart";

type Snapshot = {
  type: "snapshot";
  id: string;
  status: "running" | "done" | "error";
  error: string | null;
  result: ComparisonResult | null;
};

const POST_URL = "https://x.com/undefinedKi/status/2123526647152353309";
const PAPER_URL = "https://arxiv.org/abs/2611.22299";

export default function App() {
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [tokenBudget, setTokenBudget] = useState(DEFAULT_TOKEN_BUDGET);
  const [scope, setScope] = useState<RunScope>("compare");
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

  async function startRun() {
    setError(null);
    setStarting(true);
    setSnapshot(null);
    setRunId(null);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rounds, seed, tokenBudget, mode, scope }),
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

  const statusLine =
    snapshot?.status === "error"
      ? snapshot.error
      : running
        ? (result?.phase ?? "Starting")
        : result
          ? "Run finished"
          : "Idle";

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Self-fixing harness</h1>
          <Badge variant="outline">playground</Badge>
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm">
          A local replay of the one-file harness optimizer from{" "}
          <a className="text-foreground underline underline-offset-2" href={PAPER_URL}>
            Harnesses That Improve Themselves
          </a>{" "}
          (arXiv 2611.22299), the paper behind{" "}
          <a className="text-foreground underline underline-offset-2" href={POST_URL}>
            this post
          </a>
          . A fixer reads train failure logs and patches one of four harness files. The patch stays
          only when the held-out score does not drop and the average tokens stay inside the budget.
          Rewrite-all changes every file in the same round, under the same gate.
        </p>
        <ModelBanner label={resultsLabel} />
        <aside className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <p className="font-medium">Claimed in the source post</p>
          <p className="text-muted-foreground mt-1">
            The post says the setup went from 5% to 40% of tasks solved, used 2.5× fewer tokens, and
            that rewriting everything at once used about 10× the tokens. Those figures are the
            post&apos;s claims about the paper. Nothing on this page measures them.
          </p>
        </aside>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Run</CardTitle>
          <CardDescription>
            Default budget is {DEFAULT_TOKEN_BUDGET} average tokens per held-out task, over{" "}
            {DEFAULT_ROUNDS} rounds. Both modes share the seed and the budget.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <NumberField id="rounds" label="Rounds" value={rounds} min={1} max={12} onChange={setRounds} />
            <NumberField id="seed" label="Seed" value={seed} min={0} max={1000000} onChange={setSeed} />
            <NumberField
              id="token-budget"
              label="Token budget"
              value={tokenBudget}
              min={50}
              max={200000}
              onChange={setTokenBudget}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="optimizer-mode">Mode</Label>
              <Select value={scope} onValueChange={(value) => setScope(readScope(value))}>
                <SelectTrigger id="optimizer-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compare">Compare both</SelectItem>
                  <SelectItem value="one-file">One file</SelectItem>
                  <SelectItem value="rewrite-all">Rewrite all</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="model-mode">Model</Label>
              <Select value={mode} onValueChange={(value) => setMode(value === "real" ? "real" : "mock")}>
                <SelectTrigger id="model-mode" className="w-full">
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
          <p className="text-sm" role="status">
            {statusLine}
          </p>
          {mode === "real" && realReady === false ? (
            <p className="text-sm">
              Real mode needs <code>HARNESS_API_KEY</code> in <code>.env</code>. This server does not
              have one, so a real run will stop with that error.
            </p>
          ) : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {snapshot?.status === "error" && snapshot.error ? (
            <p className="text-destructive text-sm">{snapshot.error}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Held-out pass rate
              <Badge variant="outline">{resultsLabel}</Badge>
            </CardTitle>
            <CardDescription>
              Percent of held-out tasks the kept harness passes after each round. This curve is this
              run only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PassChart oneFile={result?.oneFile?.series ?? []} rewriteAll={result?.rewriteAll?.series ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Candidate tokens
              <Badge variant="outline">{resultsLabel}</Badge>
            </CardTitle>
            <CardDescription>
              Average tokens per held-out task for the patch just scored, including patches that were
              rejected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TokenChart oneFile={result?.oneFile?.rounds ?? []} rewriteAll={result?.rewriteAll?.rounds ?? []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Scoreboard
            <Badge variant="outline">{resultsLabel}</Badge>
          </CardTitle>
          <CardDescription>Final kept harness for each mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <Scoreboard oneFile={result?.oneFile ?? null} rewriteAll={result?.rewriteAll ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Round timeline</CardTitle>
          <CardDescription>Each pill is the gate&apos;s decision. Open a round to read the diff.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="one-file">
            <TabsList>
              <TabsTrigger value="one-file">One file</TabsTrigger>
              <TabsTrigger value="rewrite-all">Rewrite all</TabsTrigger>
            </TabsList>
            <TabsContent value="one-file">
              <Timeline rounds={result?.oneFile?.rounds ?? []} />
            </TabsContent>
            <TabsContent value="rewrite-all">
              <Timeline rounds={result?.rewriteAll?.rounds ?? []} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current harness</CardTitle>
          <CardDescription>The four files after the patches that were kept.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="one-file">
            <TabsList>
              <TabsTrigger value="one-file">One file</TabsTrigger>
              <TabsTrigger value="rewrite-all">Rewrite all</TabsTrigger>
            </TabsList>
            <TabsContent value="one-file">
              <HarnessView sources={result?.oneFile?.harness ?? null} />
            </TabsContent>
            <TabsContent value="rewrite-all">
              <HarnessView sources={result?.rewriteAll?.harness ?? null} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            {tasks.length === 0
              ? "Loading the task list."
              : `${tasks.filter((task) => task.split === "train").length} train tasks feed the fixer. ${tasks.filter((task) => task.split === "heldout").length} held-out tasks supply the score and the token gate only.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{task.title}</span>
                <Badge variant="outline">{task.split === "train" ? "train" : "held-out"}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}

function ModelBanner({ label }: { label: string }) {
  return (
    <p className="text-sm font-medium" data-testid="model-label">
      {label}
    </p>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : min}
        onChange={(event) => onChange(event.target.value === "" ? min : Number(event.target.value))}
      />
    </div>
  );
}

function readScope(value: string): RunScope {
  if (value === "one-file" || value === "rewrite-all") return value;
  return "compare";
}
