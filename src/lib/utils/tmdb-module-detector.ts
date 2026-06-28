import fs from 'fs'
import path from 'path'

export function detectTmdbModuleName(tmdbImportPath: string): string {
  if (fs.existsSync(path.join(tmdbImportPath, 'tmdb_import'))) {
    return 'tmdb_import'
  }
  return 'tmdb-import'
}
