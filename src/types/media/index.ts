import { BaseEntity, FileInfo, Status } from '../common'

// Media base types
export interface MediaItem extends BaseEntity {
  title: string
  originalTitle?: string
  overview?: string
  releaseDate?: string
  status: Status
  mediaType: MediaType
  genres: string[]
  posterPath?: string
  backdropPath?: string
  voteAverage?: number
  voteCount?: number
  popularity?: number
  runtime?: number
  language?: string
  originalLanguage?: string
  adult?: boolean
  budget?: number
  revenue?: number
  homepage?: string
  imdbId?: string
  tmdbId?: number
}

export enum MediaType {
  MOVIE = 'movie',
  TV_SHOW = 'tv_show',
  SEASON = 'season',
  EPISODE = 'episode',
  PERSON = 'person',
  COLLECTION = 'collection'
}

// TV Show specific types
export interface TvShow extends MediaItem {
  mediaType: MediaType.TV_SHOW
  numberOfSeasons?: number
  numberOfEpisodes?: number
  seasons?: Season[]
  episodeRunTime?: number[]
  firstAirDate?: string
  lastAirDate?: string
  inProduction?: boolean
  networks?: Network[]
  productionCompanies?: ProductionCompany[]
  creators?: Creator[]
}

export interface Season extends BaseEntity {
  seasonNumber: number
  title?: string
  overview?: string
  airDate?: string
  episodeCount?: number
  posterPath?: string
  episodes?: Episode[]
}

export interface Episode extends BaseEntity {
  episodeNumber: number
  seasonNumber: number
  title?: string
  overview?: string
  airDate?: string
  stillPath?: string
  runtime?: number
  voteAverage?: number
  voteCount?: number
  productionCode?: string
  showId?: string
  seasonId?: string
  guestStars?: Person[]
  crew?: CrewMember[]
}

// Movie specific types
export interface Movie extends MediaItem {
  mediaType: MediaType.MOVIE
  belongsToCollection?: Collection
  budget?: number
  genres?: Genre[]
  productionCompanies?: ProductionCompany[]
  productionCountries?: ProductionCountry[]
  spokenLanguages?: SpokenLanguage[]
  keywords?: Keyword[]
}

// Person types
export interface Person extends BaseEntity {
  name: string
  alsoKnownAs?: string[]
  biography?: string
  birthday?: string
  deathday?: string
  placeOfBirth?: string
  profilePath?: string
  adult?: boolean
  imdbId?: string
  popularity?: number
  knownForDepartment?: string
  gender?: number
  homepage?: string
}

export interface CrewMember {
  id: string
  name: string
  department: string
  job: string
  profilePath?: string
}

export interface CastMember {
  id: string
  name: string
  character: string
  order: number
  profilePath?: string
}

// Supporting types
export interface Genre {
  id: number
  name: string
}

export interface Network {
  id: number
  name: string
  logoPath?: string
  originCountry?: string
}

export interface ProductionCompany {
  id: number
  name: string
  logoPath?: string
  originCountry?: string
}

export interface ProductionCountry {
  iso31661: string
  name: string
}

export interface SpokenLanguage {
  iso6391: string
  name: string
  englishName: string
}

export interface Collection extends BaseEntity {
  name: string
  overview?: string
  posterPath?: string
  backdropPath?: string
  parts?: Movie[]
}

export interface Creator {
  id: string
  name: string
  profilePath?: string
  creditId?: string
}

export interface Keyword {
  id: number
  name: string
}

// Video and image types
export interface Video {
  id: string
  iso6391?: string
  iso31661?: string
  name: string
  key: string
  site: string
  size: number
  type: VideoType
  official: boolean
  publishedAt?: string
}

export enum VideoType {
  TRAILER = 'Trailer',
  TEASER = 'Teaser',
  CLIP = 'Clip',
  FEATURETTE = 'Featurette',
  BEHIND_THE_SCENES = 'Behind the Scenes',
  BLOOPERS = 'Bloopers'
}

export interface Image {
  filePath: string
  width: number
  height: number
  aspectRatio: number
  voteAverage: number
  voteCount: number
  iso6391?: string
}

export enum ImageType {
  POSTER = 'poster',
  BACKDROP = 'backdrop',
  LOGO = 'logo',
  STILL = 'still',
  PROFILE = 'profile'
}

// File and storage types
export interface MediaFile extends FileInfo {
  mediaId?: string
  mediaType?: MediaType
  seasonNumber?: number
  episodeNumber?: number
  quality: VideoQuality
  format: VideoFormat
  codec?: string
  bitrate?: number
  duration?: number
  resolution: {
    width: number
    height: number
  }
  subtitles?: SubtitleFile[]
  audioTracks?: AudioTrack[]
}

export enum VideoQuality {
  CAM = 'CAM',
  TS = 'TS',
  TC = 'TC',
  SCR = 'SCR',
  DVDSCR = 'DVDSCR',
  DVDRIP = 'DVDRIP',
  HDTV = 'HDTV',
  WEBRIP = 'WEBRIP',
  WEBDL = 'WEBDL',
  BLURAY = 'BLURAY',
  BDRIP = 'BDRIP',
  REMUX = 'REMUX',
  UHD = 'UHD'
}

export enum VideoFormat {
  MP4 = 'mp4',
  MKV = 'mkv',
  AVI = 'avi',
  MOV = 'mov',
  WMV = 'wmv',
  FLV = 'flv',
  WEBM = 'webm',
  M4V = 'm4v'
}

export interface SubtitleFile {
  language: string
  format: SubtitleFormat
  path: string
  isDefault?: boolean
  isForced?: boolean
  isExternal?: boolean
}

export enum SubtitleFormat {
  SRT = 'srt',
  ASS = 'ass',
  SSA = 'ssa',
  VTT = 'vtt',
  PGS = 'pgs',
  SUB = 'sub'
}

export interface AudioTrack {
  language: string
  codec: string
  channels: number
  bitrate?: number
  isDefault?: boolean
  isForced?: boolean
}

// Metadata types
export interface MediaMetadata {
  basic: MediaItem
  files: MediaFile[]
  images: Record<ImageType, Image[]>
  videos: Video[]
  credits: {
    cast: CastMember[]
    crew: CrewMember[]
  }
  recommendations: MediaItem[]
  similar: MediaItem[]
  watchProviders?: WatchProvider[]
}

export interface WatchProvider {
  id: number
  providerName: string
  logoPath?: string
  displayPriority: number
  countries: Record<string, ProviderOptions>
}

export interface ProviderOptions {
  flatrate?: Provider[]
  buy?: Provider[]
  rent?: Provider[]
}

export interface Provider {
  id: number
  name: string
  logoPath?: string
  displayPriority: number
}

// Search and filtering types
export interface MediaSearchParams {
  query?: string
  mediaType?: MediaType
  genre?: string[]
  language?: string
  year?: number
  yearRange?: {
    from: number
    to: number
  }
  ratingRange?: {
    from: number
    to: number
  }
  includeAdult?: boolean
  page?: number
}

export interface MediaSearchResult {
  results: MediaItem[]
  page: number
  totalPages: number
  totalResults: number
}