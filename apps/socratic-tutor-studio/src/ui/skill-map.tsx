import { levelBar, overallStats } from "@/session/map-text"
import { LEVEL_LABELS, PHASE_LABELS, type LevelUp, type Phase, type SubskillState } from "@/session/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SkillMap({
  label,
  phase,
  subskills,
  focusId,
  levelUps,
  saveBlock,
  onCopySave,
}: {
  label: "MOCK" | "LIVE"
  phase: Phase | null
  subskills: SubskillState[]
  focusId: string | null
  levelUps: LevelUp[]
  saveBlock: string | null
  onCopySave: () => void
}) {
  const overall = overallStats(subskills.map((skill) => skill.level))
  return (
    <Card data-testid="skill-map">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Skill map</CardTitle>
          <Badge data-testid="map-label">{label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="phase">
          {phase ? PHASE_LABELS[phase] : "Phase unlabeled"}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {subskills.length === 0 ? (
          <p className="text-sm">
            No skill map yet. Levels stay blank until a reply contains a clear bar and a 0–5 mark. Nothing here is filled in
            from a guess.
          </p>
        ) : (
          <>
            <div data-testid="overall">
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span>Overall</span>
                <span>
                  {overall.bar} {overall.percent}%
                </span>
              </div>
              <div className="level-bar h-2 rounded-sm bg-muted" aria-hidden="true">
                <div className="h-full rounded-sm bg-foreground transition-[width]" style={{ width: `${overall.percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Mean of the levels on this map.</p>
            </div>
            <ol className="flex flex-col">
              {subskills.map((skill) => {
                const up = levelUps.find((item) => item.subskillId === skill.id)
                const focused = skill.id === focusId
                return (
                  <li
                    key={skill.id}
                    className="flex flex-col gap-1 border-t py-2"
                    data-testid={`subskill-${skill.id}`}
                    data-level={skill.level}
                    aria-label={`${skill.name}, ${skill.level} of 5, ${LEVEL_LABELS[skill.level]}${focused ? ", current focus" : ""}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-sm">
                        {skill.level}/5 · {LEVEL_LABELS[skill.level]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="level-bar h-2 min-w-0 flex-1 rounded-sm bg-muted" aria-hidden="true">
                        <div
                          className="h-full rounded-sm bg-foreground transition-[width]"
                          style={{ width: `${(skill.level / 5) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs" aria-hidden="true">
                        {levelBar(skill.level)}
                      </span>
                    </div>
                    {focused ? <span className="text-xs font-medium">current focus</span> : null}
                    {up ? (
                      <span className="text-xs font-medium" data-testid={`level-up-${skill.id}`}>
                        Level up {up.from} → {up.to}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ol>
            <p className="text-xs text-muted-foreground">
              0 unaware · 1 heard of it · 2 can follow along · 3 can do with help · 4 can do independently · 5 can teach
              it / handle edge cases
            </p>
          </>
        )}
        {saveBlock ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Save state</h3>
              <Button type="button" variant="outline" onClick={onCopySave}>
                Copy save block
              </Button>
            </div>
            <pre
              tabIndex={0}
              role="region"
              aria-label="Save state block"
              data-testid="save-block"
              className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs"
            >
              {saveBlock}
            </pre>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
