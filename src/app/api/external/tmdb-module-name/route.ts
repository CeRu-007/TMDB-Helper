import { NextRequest, NextResponse } from 'next/server'
import { detectTmdbModuleName } from '@/lib/utils/tmdb-module-detector'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tmdbPath = searchParams.get('path')

  if (!tmdbPath || tmdbPath.trim() === '') {
    return NextResponse.json({ moduleName: 'tmdb_import' })
  }

  try {
    const moduleName = detectTmdbModuleName(tmdbPath)
    return NextResponse.json({ moduleName })
  } catch {
    return NextResponse.json({ moduleName: 'tmdb_import' })
  }
}
