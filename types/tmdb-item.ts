export interface TMDBItem {
  id: string
  title: string
  originalTitle?: string
  year?: number
  tmdbId?: string
  imdbId?: string
  mediaType: "movie" | "tv"
  posterUrl?: string
  posterPath?: string
  backdropPath?: string
  backdropUrl?: string
  overview?: string
  platformUrl?: string
  genres?: string[]
  releaseDate?: string
  runtime?: number
  voteAverage?: number
  status?: string | "ongoing" | "completed"
  completed?: boolean
  totalEpisodes?: number
  manuallySetEpisodes?: boolean
  episodes?: Episode[]
  seasons?: Season[]
  createdAt: string
  updatedAt: string
  weekday: number
  secondWeekday?: number
  airTime?: string
  category?: string
  tmdbUrl?: string
  notes?: string
  isDailyUpdate?: boolean
  blurIntensity?: 'light' | 'medium' | 'heavy'
}

export interface Episode {
  number: number
  completed: boolean
  seasonNumber?: number
}

export interface Season {
  seasonNumber: number
  name?: string
  totalEpisodes: number
  episodes: Episode[]
} 