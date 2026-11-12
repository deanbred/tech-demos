import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Preset } from './types'

interface PresetsPanelProps {
  presets: Preset[]
  selectedId: string | null
  onSelect: (preset: Preset) => void
}

export function PresetsPanel({ presets, selectedId, onSelect }: PresetsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preset attacks</CardTitle>
        <CardDescription>Click one to load it into the command box, then run it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {presets.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset)}
            className={cn(
              'hover:bg-accent w-full rounded-md border p-2.5 text-left transition-colors',
              selectedId === preset.id && 'border-primary bg-accent',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{preset.name}</span>
              <Badge
                variant={preset.expectation === 'blocked' ? 'destructive' : 'secondary'}
                className="text-[10px]"
              >
                {preset.expectation === 'blocked' ? 'should block' : 'should pass'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">{preset.description}</p>
            <code className="text-muted-foreground mt-1 block truncate font-mono text-[10px]">
              $ {preset.command}
            </code>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
