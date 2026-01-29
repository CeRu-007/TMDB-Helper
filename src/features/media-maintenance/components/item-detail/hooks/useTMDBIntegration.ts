"use client"

import { useMemo } from "react"
import { createElement } from "react"
import { Link, Terminal } from "lucide-react"
import type { TMDBItem } from "@/lib/data/storage"

export interface TMDBCommand {
  type: "platform" | "tmdb"
  title: string
  command: string
  description: string
  icon: React.ReactNode
}

interface UseTMDBIntegrationProps {
  item: TMDBItem
  customSeasonNumber: number
  selectedLanguage: string
  pythonCmd: string
}

export function useTMDBIntegration({
  item,
  customSeasonNumber,
  selectedLanguage,
  pythonCmd
}: UseTMDBIntegrationProps) {
  // Generate TMDB import commands
  const generateTmdbImportCommands = useMemo((): TMDBCommand[] => {
    const commands: TMDBCommand[] = []

    // 播出平台抓取命令
    if (item.platformUrl) {
      const platformCommand = `${pythonCmd} -m tmdb-import "${item.platformUrl}"`
      commands.push({
        type: "platform",
        title: "播出平台抓取",
        command: platformCommand,
        description: "从播出平台抓取剧集元数据",
        icon: createElement(Link, { className: "h-4 w-4" }),
      })
    }

    // TMDB抓取命令
    if (item.tmdbId) {
      if (item.mediaType === "tv") {
        const tmdbCommand = `${pythonCmd} -m tmdb-import "https://www.themoviedb.org/tv/${item.tmdbId}/season/${customSeasonNumber}?language=${selectedLanguage}"`
        commands.push({
          type: "tmdb",
          title: `上传至TMDB第${customSeasonNumber}季`,
          command: tmdbCommand,
          description: `上传数据至TMDB第${customSeasonNumber}季`,
          icon: createElement(Terminal, { className: "h-4 w-4" }),
        })
      } else if (item.mediaType === "movie") {
        const tmdbCommand = `${pythonCmd} -m tmdb-import "https://www.themoviedb.org/movie/${item.tmdbId}?language=${selectedLanguage}"`
        commands.push({
          type: "tmdb",
          title: `上传至TMDB电影`,
          command: tmdbCommand,
          description: `上传数据至TMDB电影页面`,
          icon: createElement(Terminal, { className: "h-4 w-4" }),
        })
      }
    }

    return commands
  }, [item, customSeasonNumber, selectedLanguage, pythonCmd])

  return {
    commands: generateTmdbImportCommands,
  }
}