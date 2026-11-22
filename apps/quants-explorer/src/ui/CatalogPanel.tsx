import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { assetClasses, type CatalogEntry, type StrategyKind } from "../catalog/snapshot.ts"
import { kindLabel, publishedCell } from "./format.ts"

type KindFilter = StrategyKind | "all"
type AssetFilter = (typeof assetClasses)[number] | "all"

const kindFilters: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weight", label: "Weights" },
  { id: "order", label: "Orders" },
  { id: "walk-forward", label: "Walk-forward" },
]

function publishedLine(entry: CatalogEntry): string {
  const note = entry.published.note
  if (note) return note
  return `CAGR ${publishedCell(entry.published.cagr)} · Sharpe ${publishedCell(entry.published.sharpe)} · max DD ${publishedCell(entry.published.maxDrawdown)}`
}

export function CatalogPanel(props: {
  libraryUrl: string
  snapshotDate: string
  query: string
  kind: KindFilter
  asset: AssetFilter
  selected: readonly string[]
  onQuery: (value: string) => void
  onKind: (value: KindFilter) => void
  onAsset: (value: AssetFilter) => void
  onToggle: (id: string) => void
  entries: readonly CatalogEntry[]
}) {
  const visible = props.entries.filter((entry) => {
    if (props.kind !== "all" && entry.type !== props.kind) return false
    if (props.asset !== "all" && entry.assetClass !== props.asset) return false
    const haystack = [
      entry.code,
      entry.name,
      entry.idea,
      entry.assetClass,
      entry.bars,
      ...entry.styles,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(props.query.trim().toLowerCase())
  })

  return (
    <aside className="flex max-h-[34rem] flex-col gap-3 lg:sticky lg:top-4 lg:h-[calc(100vh-5.5rem)] lg:max-h-none">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Catalog</h2>
          <p className="text-xs text-muted-foreground">
            Snapshot {props.snapshotDate}
          </p>
        </div>
        <Input
          value={props.query}
          onChange={(event) => props.onQuery(event.target.value)}
          placeholder="Search name or idea"
          aria-label="Search strategies"
        />
        <div className="flex flex-wrap gap-1">
          {kindFilters.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={props.kind === filter.id ? "default" : "outline"}
              onClick={() => props.onKind(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <Select
          value={props.asset}
          onValueChange={(value) => props.onAsset(value as AssetFilter)}
        >
          <SelectTrigger className="w-full" aria-label="Asset class">
            <SelectValue placeholder="Asset class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All asset classes</SelectItem>
            {assetClasses.map((asset) => (
              <SelectItem key={asset} value={asset}>
                {asset}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Showing {visible.length} of {props.entries.length}. Runnable rules can
          be selected, up to three.
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1 rounded-lg border">
        <div className="flex flex-col gap-2 p-2">
          {visible.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              No strategies match these filters.
            </p>
          ) : (
            visible.map((entry) => {
              const selected = props.selected.includes(entry.id)
              return (
                <article
                  key={entry.id}
                  className={
                    selected
                      ? "rounded-lg border border-foreground bg-muted/40 p-3"
                      : "rounded-lg border p-3"
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">{entry.code}</Badge>
                      <Badge variant="secondary">{kindLabel(entry.type)}</Badge>
                      {entry.ported ? <Badge>Runnable</Badge> : null}
                    </div>
                    {entry.ported ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        aria-pressed={selected}
                        onClick={() => props.onToggle(entry.id)}
                      >
                        {selected ? "Selected" : "Select"}
                      </Button>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-sm font-medium">{entry.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {entry.idea}
                  </p>
                  <p className="mt-2 text-xs">
                    {entry.assetClass} · {entry.bars}
                    {entry.styles.length > 0 ? ` · ${entry.styles.join(", ")}` : ""}
                  </p>
                  <p className="mt-2 rounded-md bg-muted px-2 py-1.5 text-xs leading-relaxed">
                    <span className="font-medium">As published by quants.md: </span>
                    {publishedLine(entry)}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-3 text-xs">
                    <a
                      className="underline underline-offset-2"
                      href={props.libraryUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      quants.md
                    </a>
                    <a
                      className="underline underline-offset-2"
                      href={entry.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Dashboard
                    </a>
                    <a
                      className="underline underline-offset-2"
                      href={entry.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source
                    </a>
                  </p>
                </article>
              )
            })
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
