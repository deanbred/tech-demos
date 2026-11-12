import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { Policy } from '@/sandbox/policy'

interface ListFieldProps {
  id: keyof Policy
  label: string
  hint: string
  value: string[]
  onChange: (id: keyof Policy, entries: string[]) => void
}

function ListField({ id, label, hint, value, onChange }: ListFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <Textarea
        id={id}
        value={value.join('\n')}
        rows={Math.max(2, value.length)}
        spellCheck={false}
        placeholder="(none)"
        className="min-h-0 font-mono text-xs leading-5"
        onChange={event =>
          onChange(
            id,
            event.target.value
              .split('\n')
              .map(entry => entry.trim())
              .filter(Boolean),
          )
        }
      />
      <p className="text-muted-foreground text-[11px]">{hint}</p>
    </div>
  )
}

interface PolicyEditorProps {
  policy: Policy
  onChange: (policy: Policy) => void
}

export function PolicyEditor({ policy, onChange }: PolicyEditorProps) {
  const setField = (id: keyof Policy, entries: string[]) => onChange({ ...policy, [id]: entries })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sandbox policy</CardTitle>
        <CardDescription>
          One entry per line. Reads are deny-then-allow; writes and network are allow-only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Network</p>
        <ListField
          id="allowedDomains"
          label="allowedDomains"
          hint="Only these domains are reachable. Everything else is denied."
          value={policy.allowedDomains}
          onChange={setField}
        />
        <ListField
          id="deniedDomains"
          label="deniedDomains"
          hint="Explicit denials; win over the allowlist."
          value={policy.deniedDomains}
          onChange={setField}
        />
        <Separator />
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Filesystem reads</p>
        <ListField
          id="denyRead"
          label="denyRead"
          hint="Readable everywhere by default; these paths become invisible."
          value={policy.denyRead}
          onChange={setField}
        />
        <ListField
          id="allowRead"
          label="allowRead"
          hint="Re-allow specific paths inside a denied region."
          value={policy.allowRead}
          onChange={setField}
        />
        <Separator />
        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Filesystem writes</p>
        <ListField
          id="allowWrite"
          label="allowWrite"
          hint="Writes are denied everywhere except these roots."
          value={policy.allowWrite}
          onChange={setField}
        />
        <ListField
          id="denyWrite"
          label="denyWrite"
          hint="Carve write exceptions out of the allowed roots."
          value={policy.denyWrite}
          onChange={setField}
        />
      </CardContent>
    </Card>
  )
}
