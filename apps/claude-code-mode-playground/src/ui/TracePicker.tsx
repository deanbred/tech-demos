import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TracePair } from '@/trace/types'

interface TracePickerProps {
  pairs: TracePair[]
  selectedId: string
  onSelect: (id: string) => void
}

export function TracePicker({ pairs, selectedId, onSelect }: TracePickerProps) {
  const samples = pairs.filter((pair) => pair.source === 'sample')
  const live = pairs.filter((pair) => pair.source === 'live')
  return (
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger className="w-80 max-w-full">
        <SelectValue placeholder="Pick a trace pair" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Sample traces (illustrative)</SelectLabel>
          {samples.map((pair) => (
            <SelectItem key={pair.id} value={pair.id}>
              {pair.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>
            {live.length > 0 ? 'Recorded live traces' : 'No live traces yet — run `bun run record`'}
          </SelectLabel>
          {live.map((pair) => (
            <SelectItem key={pair.id} value={pair.id}>
              {pair.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
