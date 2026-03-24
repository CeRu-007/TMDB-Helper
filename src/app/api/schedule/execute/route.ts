import { type NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { scheduleRepository } from '@/lib/data/schedule-repository'
import { scheduleLogRepository } from '@/lib/data/schedule-log-repository'
import { itemsRepository } from '@/lib/database/repositories/items.repository'
import { getDatabase } from '@/lib/database/connection'
import { logger } from '@/lib/utils/logger'
import { cleanCSV, extractEpisodeCount } from '@/lib/scheduler/csv-cleaner'
import { notifier } from '@/lib/scheduler/notifier'

interface ExecuteResult {
  success: boolean
  message: string
  episodeCount?: number
  details?: string
}

interface LogEntry {
  type: 'stdout' | 'stderr' | 'info'
  message: string
}

export async function POST(request: NextRequest) {
  const logs: LogEntry[] = []

  try {
    logger.info('[Schedule Execute] === POST 开始 ===')
    const body = await request.json()
    const { itemId } = body
    logger.info(`[Schedule Execute] 收到请求: itemId=${itemId}`)

    if (!itemId) {
      return NextResponse.json({ error: '缺少 itemId 参数' }, { status: 400 })
    }

    const task = scheduleRepository.findByItemId(itemId)
    if (!task) {
      return NextResponse.json({ error: '该词条没有配置定时任务' }, { status: 404 })
    }

    const item = itemsRepository.findByIdWithRelations(itemId)
    if (!item) {
      return NextResponse.json({ error: '词条不存在' }, { status: 404 })
    }

    const startAt = new Date().toISOString()
    const logResult = scheduleLogRepository.create({
      taskId: task.id,
      status: 'running',
      startAt,
      endAt: null,
      message: '任务开始执行',
      details: null,
    })

    if (!logResult.success || !logResult.data) {
      return NextResponse.json({ error: '创建执行日志失败' }, { status: 500 })
    }

    const logId = logResult.data.id

    try {
      let result: ExecuteResult
      try {
        result = await executeScheduleTask(item, task, logs)
      } catch (execError) {
        logger.error(`[Schedule Execute] executeScheduleTask抛出异常:`, execError)
        throw execError
      }

      const endAt = new Date().toISOString()

      if (result.success) {
        scheduleLogRepository.updateStatus(logId, 'success', result.message, result.details || null)
        scheduleRepository.updateLastRunAt(task.id, endAt, '')

        notifier.sendSuccessNotification(item.title, result.episodeCount || 0)

        return NextResponse.json({
          success: true,
          message: result.message,
          data: { logId, episodeCount: result.episodeCount },
          logs,
        })
      } else {
        scheduleLogRepository.updateStatus(logId, 'failed', result.message)
        notifier.sendErrorNotification(item.title, result.message)
        return NextResponse.json({ success: false, error: result.message, logs }, { status: 500 })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      scheduleLogRepository.updateStatus(logId, 'failed', errorMessage)
      notifier.sendErrorNotification(item.title, errorMessage)
      logger.error(`[Schedule Execute API] 执行失败: ${task.id}`, error)
      return NextResponse.json({ success: false, error: errorMessage, logs }, { status: 500 })
    }
  } catch (error) {
    console.error('[Schedule Execute API] POST 错误:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误', logs }, { status: 500 })
  }
}

async function executeScheduleTask(
  item: NonNullable<ReturnType<typeof itemsRepository.findByIdWithRelations>>,
  task: NonNullable<ReturnType<typeof scheduleRepository.findById>>,
  logs: LogEntry[]
): Promise<ExecuteResult> {
  try {
    const addLog = (type: 'stdout' | 'stderr' | 'info', message: string) => {
      logs.push({ type, message })
    }

    logger.info(`[Schedule Execute] 开始获取配置`)
    addLog('info', '开始获取配置')
    const tmdbImportPath = await getServerConfigValue('tmdb_import_path')
    logger.info(`[Schedule Execute] 获取到TMDB路径: ${tmdbImportPath}`)
    addLog('info', `获取到TMDB路径: ${tmdbImportPath}`)

    if (!tmdbImportPath) {
      return { success: false, message: '请先在设置中配置TMDB-Import工具路径' }
    }

    if (!item.platformUrl) {
      return { success: false, message: '词条没有配置播出平台URL' }
    }

    const headlessFlag = task.headless ? '--headless' : ''
    const platformCommand = `python -m tmdb-import ${headlessFlag} "${item.platformUrl}"`
    logger.info(`[Schedule Execute] 执行播出平台抓取: ${platformCommand}`)
    addLog('info', `执行播出平台抓取: ${platformCommand}`)

    const scrapeResult = await executeExternalCommand(platformCommand, tmdbImportPath, addLog)
    logger.info(`[Schedule Execute] 抓取完成: success=${scrapeResult.success}`)
    addLog('info', `抓取完成: success=${scrapeResult.success}`)

    if (!scrapeResult.success) {
      return { success: false, message: `播出平台抓取失败: ${scrapeResult.error}` }
    }

    const csvPath = path.join(tmdbImportPath, 'import.csv')
    logger.info(`[Schedule Execute] 读取CSV文件: ${csvPath}`)
    addLog('info', `读取CSV文件: ${csvPath}`)

    if (!fs.existsSync(csvPath)) {
      return { success: false, message: '抓取结果文件不存在' }
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    logger.info(`[Schedule Execute] CSV文件大小: ${csvContent.length}`)
    logger.info(`[Schedule Execute] CSV前500字符: ${csvContent.substring(0, 500).replace(/\n/g, '\\n')}`)
    addLog('info', `CSV文件大小: ${csvContent.length}`)

    if (!csvContent || csvContent.length < 10) {
      return { success: false, message: '抓取结果为空' }
    }

    const currentMaxEpisode = item.seasons?.reduce(
      (max, season) => Math.max(max, season.currentEpisode || 0),
      0
    ) || 0

    const runMode = task.headless ? '后台' : '前台'
    const updateMode = task.incremental ? '增量更新' : '全量更新'
    logger.info(`[Schedule Execute] ${runMode}模式, ${updateMode}, currentMaxEpisode=${currentMaxEpisode}`)
    addLog('info', `${runMode}模式, ${updateMode}, 当前最大集数: ${currentMaxEpisode}`)

    const cleanedCSV = cleanCSV(csvContent, task.fieldCleanup, currentMaxEpisode, task.incremental)
    const episodeCount = extractEpisodeCount(cleanedCSV)

    if (task.incremental) {
      logger.info(`[Schedule Execute] 清理后剩余${episodeCount}集，当前词条维护至第${currentMaxEpisode}集`)
      addLog('info', `清理后剩余${episodeCount}集，当前词条维护至第${currentMaxEpisode}集`)
    } else {
      logger.info(`[Schedule Execute] 清理后共${episodeCount}集`)
      addLog('info', `清理后共${episodeCount}集`)
    }

    fs.writeFileSync(csvPath, cleanedCSV, 'utf-8')
    logger.info(`[Schedule Execute] CSV已保存`)
    addLog('info', 'CSV已保存')

    logger.info(`[Schedule Execute] 检查自动导入: autoImport=${task.autoImport}, tmdbId=${item.tmdbId}`)
    if (task.autoImport && item.tmdbId) {
      const tmdbSeason = task.tmdbSeason || 1
      const tmdbLanguage = task.tmdbLanguage || 'zh-CN'
      const tmdbAutoResponse = task.tmdbAutoResponse || 'w'
      logger.info(`[Schedule Execute] 执行TMDB导入: tmdbId=${item.tmdbId}, season=${tmdbSeason}, language=${tmdbLanguage}, autoResponse=${tmdbAutoResponse}`)
      addLog('info', `执行TMDB导入: 第${tmdbSeason}季, 语言=${tmdbLanguage}`)

      const tmdbUrl = `https://www.themoviedb.org/tv/${item.tmdbId}/season/${tmdbSeason}?language=${tmdbLanguage}`
      const tmdbCommand = `python -m tmdb-import ${headlessFlag} "${tmdbUrl}"`
      logger.info(`[Schedule Execute] TMDB命令: ${tmdbCommand}`)

      const tmdbResult = await executeInteractiveCommand(tmdbCommand, tmdbImportPath, addLog, tmdbAutoResponse)

      if (!tmdbResult.success) {
        logger.warn(`[Schedule Execute] TMDB导入失败: ${tmdbResult.error}`)
        addLog('stderr', `TMDB导入失败: ${tmdbResult.error}`)
      }
    }

    const finalMessage = `成功更新至第${episodeCount}集`

    return {
      success: true,
      message: finalMessage,
      episodeCount,
      details: JSON.stringify({
        csvLength: csvContent.length,
        cleanedLength: cleanedCSV.length,
        episodeCount,
        autoImport: task.autoImport,
      }),
    }
  } catch (error) {
    logger.error(`[Schedule Execute] executeScheduleTask异常:`, error)
    return { success: false, message: error instanceof Error ? error.message : '未知错误' }
  }
}

async function executeExternalCommand(
  command: string,
  workingDirectory: string,
  addLog: (type: 'stdout' | 'stderr' | 'info', message: string) => void
): Promise<{ success: boolean; output: string; error: string }> {
  try {
    logger.info(`[Schedule Execute] 调用execute-command API, workingDirectory=${workingDirectory}`)
    const response = await fetch('http://localhost:3000/api/commands/execute-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, workingDirectory }),
    })

    const data = await response.json()
    logger.info(`[Schedule Execute] API响应: success=${data.success}, stdoutLen=${data.output?.length}, stderrLen=${data.error?.length}`)

    const output = data.output || data.error || ''

    if (output.includes('【CSV内容】')) {
      logger.info(`[Schedule Execute] 输出中包含CSV内容标记`)
    } else {
      logger.info(`[Schedule Execute] 输出不包含CSV标记，前100字符: ${output.substring(0, 100)}`)
      output.split('\n').forEach((line: string) => {
        if (line.trim()) {
          addLog('stdout', line)
        }
      })
    }

    return {
      success: data.success,
      output: output,
      error: data.error || '',
    }
  } catch (error) {
    logger.error(`[Schedule Execute] executeExternalCommand异常:`, error)
    addLog('stderr', `API调用失败: ${error instanceof Error ? error.message : '未知错误'}`)
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'API调用失败',
    }
  }
}

async function executeInteractiveCommand(
  command: string,
  workingDirectory: string,
  addLog: (type: 'stdout' | 'stderr' | 'info', message: string) => void,
  autoResponse: string = 'w'
): Promise<{ success: boolean; output: string; error: string }> {
  return new Promise(async (resolve) => {
    try {
      logger.info(`[Schedule Execute] 调用execute-command-interactive API, workingDirectory=${workingDirectory}`)

      let processId: number | null = null
      let fullOutput = ''
      let errorMessage = ''
      let autoResponseSent = false

      const response = await fetch('http://localhost:3000/api/commands/execute-command-interactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, workingDirectory }),
      })

      if (!response.ok || !response.body) {
        errorMessage = `HTTP错误: ${response.status}`
        addLog('stderr', errorMessage)
        resolve({ success: false, output: '', error: errorMessage })
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      const sendAutoResponse = async (pid: number, input: string) => {
        try {
          await fetch('http://localhost:3000/api/commands/send-input', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processId: pid, input, sendDirectly: true }),
          })
          logger.info(`[Schedule Execute] 自动发送响应: "${input}"`)
        } catch (err) {
          logger.error(`[Schedule Execute] 自动响应失败: ${err}`)
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))

              if (data.type === 'start' && data.processId) {
                processId = data.processId
                logger.info(`[Schedule Execute] 交互进程启动: PID=${processId}`)
                addLog('info', `进程已启动 (PID: ${processId})`)
              } else if (data.type === 'stdout') {
                fullOutput += data.message
                addLog('stdout', data.message)

                if (!autoResponseSent && data.message.includes("enter 'w'")) {
                  autoResponseSent = true
                  if (processId) {
                    setTimeout(() => sendAutoResponse(processId, autoResponse), 500)
                  }
                }
              } else if (data.type === 'stderr') {
                fullOutput += data.message
                errorMessage += data.message
                addLog('stderr', data.message)
              } else if (data.type === 'close') {
                logger.info(`[Schedule Execute] 进程关闭: status=${data.status}, exitCode=${data.exitCode}`)
                addLog('info', data.message)
              }
            } catch (err) {
              logger.warn(`[Schedule Execute] 解析SSE数据失败: ${err}`)
            }
          }
        }
      }

      const success = !errorMessage.includes('Error') && !errorMessage.includes('error')
      resolve({ success, output: fullOutput, error: errorMessage })
    } catch (error) {
      logger.error(`[Schedule Execute] executeInteractiveCommand异常:`, error)
      addLog('stderr', `交互执行失败: ${error instanceof Error ? error.message : '未知错误'}`)
      resolve({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : '未知错误',
      })
    }
  })
}

async function getServerConfigValue(key: string): Promise<string | null> {
  if (key === 'tmdb_import_path') {
    const envPath = process.env.TMDB_IMPORT_PATH
    if (envPath) return envPath
  }

  try {
    const response = await fetch(`http://localhost:3000/api/system/config?key=${encodeURIComponent(key)}`)
    if (response.ok) {
      const data = await response.json()
      if (data.value) return data.value
    }
  } catch {
    // API 调用失败
  }

  return null
}