import { TOPICS } from "@/session/topics"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TopicVisual } from "@/ui/visuals"

export function TopicPicker({ onPick }: { onPick: (topicId: string) => void }) {
  return (
    <div className="@container/picker">
      <h2 className="mb-3 text-base font-medium">Pick a starter topic</h2>
      <div className="grid gap-3 @min-[48rem]/picker:grid-cols-3">
        {TOPICS.map((topic) => (
          <Card key={topic.id} className="h-full">
            <CardHeader>
              <CardTitle>{topic.title}</CardTitle>
              <CardDescription>{topic.summary}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div aria-hidden="true">
                <TopicVisual topicId={topic.id} />
              </div>
              <Button type="button" data-testid={`topic-${topic.id}`} onClick={() => onPick(topic.id)}>
                Start {topic.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
