"use client"

import { EpisodeCheckbox } from "@/shared/components/ui/checkbox"
import type { Episode } from "@/lib/data/storage"

interface EpisodeItemProps {
  episode: Episode
  selectedSeason: number
  highlightedEpisode?: number | null
  onToggle: (episodeNumber: number, completed: boolean, seasonNumber: number) => void
  onClick: (episodeNumber: number) => void
}

export function EpisodeItem({
  episode,
  selectedSeason,
  highlightedEpisode,
  onToggle,
  onClick
}: EpisodeItemProps) {
  return (
    <EpisodeCheckbox
      key={episode.number}
      id={`episode-${episode.number}-${selectedSeason}`}
      checked={episode.completed}
      disabled={false} // 不再禁用，因为操作很快
      onCheckedChange={(checked) => {
        // 确保checked是布尔值
        const isChecked = checked === true;
        onToggle(episode.number, isChecked, selectedSeason);
      }}
      onClick={() => onClick(episode.number)}
      label={`${episode.number}`}
      className={[
        highlightedEpisode === episode.number ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
      ].join(" ").trim()}
    />
  )
}