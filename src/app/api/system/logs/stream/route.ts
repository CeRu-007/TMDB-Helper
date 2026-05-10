import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'
import { logBus } from '@/lib/utils/file-transport'

const dataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data')
const LOG_DIR = path.join(dataDir, 'logs')

function readTail(filename: string, lines: number = 50): string[] {
  const resolvedPath = path.resolve(LOG_DIR, filename)
  if (!resolvedPath.startsWith(path.resolve(LOG_DIR))) return []
  if (!fs.existsSync(resolvedPath)) return []

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8')
    const allLines = content.split('\n').filter(l => l.length > 0)
    return allLines.slice(-lines)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const file = searchParams.get('file') || 'app.log'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      const tail = readTail(file, 50)
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'init', lines: tail })}\n\n`))

      const onLog = (data: { level: number; message: string; timestamp: string; filename: string }) => {
        if (data.filename === file || data.filename === file) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', ...data })}\n\n`))
          } catch {}
        }
      }

      logBus.on('log', onLog)

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepAlive)
        }
      }, 15000)

      request.signal.addEventListener('abort', () => {
        logBus.off('log', onLog)
        clearInterval(keepAlive)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
