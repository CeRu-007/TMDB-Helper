"use client"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { CheckCircle2, PlayCircle, Clapperboard } from "lucide-react"
import type { TMDBItem } from "@/lib/data/storage"

interface EpisodeStatusCardProps {
  item: TMDBItem
  onToggle: (completed: boolean) => void
}

export function EpisodeStatusCard({
  item,
  onToggle
}: EpisodeStatusCardProps) {
  if (item.mediaType !== "movie") {
    return null
  }

  return (
    <Card variant="frosted">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          <Clapperboard className="h-4 w-4 mr-2" />
          观看状态
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          variant={item.completed ? "default" : "outline"}
          className="w-full"
          onClick={() => onToggle(!item.completed)}
        >
          {item.completed ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              已观看
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              标记为已观看
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}