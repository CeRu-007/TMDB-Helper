import fs from 'fs'
import path from 'path'
import { scheduleRepository } from '@/lib/data/schedule-repository'
import { scheduleLogRepository } from '@/lib/data/schedule-log-repository'
import { itemsRepository } from '@/lib/database/repositories/items.repository'
import { getDatabase } from '@/lib/database/connection'
import { logger } from '@/lib/utils/logger'
import { cleanCSV, extractEpisodeCount, analyzeCSVMetadata } from '@/lib/scheduler/csv-cleaner'
import { notifier } from '@/lib/scheduler/notifier'

export interface ExecuteResult {
  success: boolean
  message: string
  episodeCount?: number
  rawEpisodeCount?: number | undefined
  incompleteEpisodes?: number[] | undefined
  details?: string
}

export interface ProcessResult {
  completed: boolean
  message: string
}

export interface LogEntry {
  type: 'stdout' | 'stderr' | 'info'
  message: string
}

export async function executeScheduleTask(
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

    let metadataAnalysis = analyzeCSVMetadata(csvContent)
    let effectiveEpisodeCount: number | undefined

    if (task.checkMetadataCompleteness) {
      effectiveEpisodeCount = metadataAnalysis.effectiveEpisodeCount
      logger.info(`[Schedule Execute] 元数据完整性检查: rawEpisodeCount=${metadataAnalysis.rawEpisodeCount}, effectiveEpisodeCount=${metadataAnalysis.effectiveEpisodeCount}, incompleteEpisodes=[${metadataAnalysis.incompleteEpisodes.join(',')}]`)
      addLog('info', `元数据完整性检查: 原始${metadataAnalysis.rawEpisodeCount}集, 有效${metadataAnalysis.effectiveEpisodeCount}集${metadataAnalysis.incompleteEpisodes.length > 0 ? `, 第${metadataAnalysis.incompleteEpisodes.join(',')}集元数据不完整` : ''}`)
    }

    const incrementalThreshold = task.checkMetadataCompleteness && effectiveEpisodeCount !== undefined
      ? Math.min(currentMaxEpisode, effectiveEpisodeCount)
      : currentMaxEpisode

    const cleanedCSV = cleanCSV(csvContent, task.fieldCleanup, incrementalThreshold, task.incremental)
    const episodeCount = task.checkMetadataCompleteness ? metadataAnalysis.effectiveEpisodeCount : extractEpisodeCount(cleanedCSV)

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

    const finalMessage = task.checkMetadataCompleteness && metadataAnalysis.incompleteEpisodes.length > 0
      ? `有效更新至第${episodeCount}集（第${metadataAnalysis.incompleteEpisodes.join(',')}集元数据不完整）`
      : `成功更新至第${episodeCount}集`

    return {
      success: true,
      message: finalMessage,
      episodeCount,
      rawEpisodeCount: task.checkMetadataCompleteness ? metadataAnalysis.rawEpisodeCount : undefined,
      incompleteEpisodes: task.checkMetadataCompleteness ? metadataAnalysis.incompleteEpisodes : undefined,
      details: JSON.stringify({
        csvLength: csvContent.length,
        cleanedLength: cleanedCSV.length,
        episodeCount,
        rawEpisodeCount: task.checkMetadataCompleteness ? metadataAnalysis.rawEpisodeCount : undefined,
        incompleteEpisodes: task.checkMetadataCompleteness ? metadataAnalysis.incompleteEpisodes : undefined,
        autoImport: task.autoImport,
      }),
    }
  } catch (error) {
    logger.error(`[Schedule Execute] executeScheduleTask异常:`, error)
    return { success: false, message: error instanceof Error ? error.message : '未知错误' }
  }
}

function getBaseUrl(): string {
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

async function executeExternalCommand(
  command: string,
  workingDirectory: string,
  addLog: (type: 'stdout' | 'stderr' | 'info', message: string) => void
): Promise<{ success: boolean; output: string; error: string }> {
  return new Promise(async (resolve) => {
    try {
      logger.info(`[Schedule Execute] 调用execute-command-interactive API, workingDirectory=${workingDirectory}`)

      let fullOutput = ''
      let errorMessage = ''
      let hasClose = false

      const response = await fetch(`${getBaseUrl()}/api/commands/execute-command-interactive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, workingDirectory, timeout: 300000 }),
      })

      if (!response.ok || !response.body) {
        const err = `HTTP错误: ${response.status}`
        addLog('stderr', err)
        resolve({ success: false, output: '', error: err })
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

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
                logger.info(`[Schedule Execute] 交互进程启动: PID=${data.processId}`)
                addLog('info', `进程已启动 (PID: ${data.processId})`)
              } else if (data.type === 'stdout') {
                fullOutput += data.message
                addLog('stdout', data.message)
              } else if (data.type === 'stderr') {
                fullOutput += data.message
                errorMessage += data.message
                addLog('stderr', data.message)
              } else if (data.type === 'close') {
                hasClose = true
                logger.info(`[Schedule Execute] 进程关闭: status=${data.status}, exitCode=${data.exitCode}`)
                addLog('info', data.message)
              } else if (data.type === 'timeout') {
                errorMessage += data.message
                addLog('stderr', data.message)
              }
            } catch (err) {
              logger.warn(`[Schedule Execute] 解析SSE数据失败: ${err}`)
            }
          }
        }
      }

      logger.info(`[Schedule Execute] 流读取结束, hasClose=${hasClose}, errorLen=${errorMessage.length}`)

      const success = !errorMessage.includes('Error') && !errorMessage.includes('error') && !errorMessage.includes('超时')
      resolve({ success, output: fullOutput, error: errorMessage })
    } catch (error) {
      logger.error(`[Schedule Execute] executeExternalCommand异常:`, error)
      addLog('stderr', `API调用失败: ${error instanceof Error ? error.message : '未知错误'}`)
      resolve({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'API调用失败',
      })
    }
  })
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

      const response = await fetch(`${getBaseUrl()}/api/commands/execute-command-interactive`, {
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
          await fetch(`${getBaseUrl()}/api/commands/send-input`, {
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
    const response = await fetch(`${getBaseUrl()}/api/system/config?key=${encodeURIComponent(key)}`)
    if (response.ok) {
      const data = await response.json()
      if (data.value) return data.value
    }
  } catch {
    // API 调用失败
  }

  return null
}

export async function processScheduleTaskResult(
  item: NonNullable<ReturnType<typeof itemsRepository.findByIdWithRelations>>,
  task: NonNullable<ReturnType<typeof scheduleRepository.findById>>,
  executeResult: ExecuteResult,
  isScheduledTask: boolean = false
): Promise<ProcessResult> {
  if (!executeResult.success) {
    return { completed: false, message: executeResult.message }
  }

  const episodeCount = executeResult.episodeCount || 0
  const seasonNumber = task.tmdbSeason || 1
  const targetSeason = item.seasons?.find(s => s.seasonNumber === seasonNumber)
  const previousCurrentEpisode = targetSeason?.currentEpisode || 0

  const shouldUpdateEpisode = task.checkMetadataCompleteness
    ? episodeCount !== previousCurrentEpisode
    : previousCurrentEpisode < episodeCount

  if (shouldUpdateEpisode) {
    let updatedItem = { ...item }

    if (updatedItem.seasons) {
      updatedItem.seasons = updatedItem.seasons.map(season => {
        if (season.seasonNumber === seasonNumber) {
          return { ...season, currentEpisode: episodeCount }
        }
        return season
      })

      updatedItem.episodes = updatedItem.seasons.flatMap(season =>
        season.episodes?.map(ep => ({ ...ep, seasonNumber: season.seasonNumber })) || []
      )
    }

    const totalEpisodes = targetSeason?.totalEpisodes || 0
    const hasIncompleteEpisodes = task.checkMetadataCompleteness && executeResult.incompleteEpisodes && executeResult.incompleteEpisodes.length > 0
    if (totalEpisodes > 0 && episodeCount >= totalEpisodes && !hasIncompleteEpisodes) {
      updatedItem.status = 'completed'
      updatedItem.completed = true
      logger.info(`[Schedule Executor] 词条已完结: ${item.id}, episodeCount=${episodeCount}, totalEpisodes=${totalEpisodes}`)
    } else {
      updatedItem.status = 'ongoing'
      updatedItem.completed = false
      if (hasIncompleteEpisodes) {
        logger.info(`[Schedule Executor] 词条有未完整元数据集数，保持连载中: ${item.id}, episodeCount=${episodeCount}, totalEpisodes=${totalEpisodes}, incompleteEpisodes=[${executeResult.incompleteEpisodes?.join(',')}]`)
      } else {
        logger.info(`[Schedule Executor] 词条未完结，保持连载中: ${item.id}, episodeCount=${episodeCount}, totalEpisodes=${totalEpisodes}`)
      }
    }

    updatedItem.updatedAt = new Date().toISOString()

    const result = itemsRepository.update(updatedItem)
    if (result.success) {
      logger.info(`[Schedule Executor] 词条集数已更新: ${item.id}, season=${seasonNumber}, episode=${episodeCount}`)
    } else {
      logger.error(`[Schedule Executor] 词条集数更新失败: ${item.id}, ${result.error}`)
    }
  }

  if (isScheduledTask) {
    const updatedItem = itemsRepository.findByIdWithRelations(item.id)
    if (updatedItem?.status === 'completed') {
      logger.info(`[Schedule Executor] 词条已完结，删除定时任务: ${task.id}`)
      scheduleRepository.deleteByItemId(item.id)
      return { completed: true, message: '词条已完结，任务已自动删除' }
    }
  }

  return { completed: false, message: executeResult.message }
}