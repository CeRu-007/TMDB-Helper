import { NextResponse } from "next/server"
import { fixTMDBImportBug } from "@/scripts/fix-tmdb-import-bug"

export async function POST(request: Request) {
  try {
    const { tmdbImportPath } = await request.json()

    if (!tmdbImportPath) {
      return NextResponse.json({ success: false, message: "请提供TMDB-Import工具路径" }, { status: 400 })
    }

    const result = await fixTMDBImportBug(tmdbImportPath)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `处理请求时出错: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
