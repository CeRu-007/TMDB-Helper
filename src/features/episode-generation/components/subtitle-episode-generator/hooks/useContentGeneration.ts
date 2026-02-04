import { useState, useCallback } from 'react'
import { useToast } from '@/shared/components/ui/use-toast'
import { useScenarioModels } from '@/lib/hooks/useScenarioModels'
import { SubtitleFile, SubtitleEpisode, GenerationConfig, EnhanceOperation, GenerationStatus, GenerationResult } from '../types'
import { getAllSummaryStyles } from '@/features/episode-generation/plugins/plugin-service'
import { timestampToMinutes } from '../utils'
import { useApiCalls } from './useApiCalls'
import { DELAY_500MS, DELAY_800MS, DELAY_1500MS } from '@/lib/constants/constants'
import { logger } from '@/lib/utils/logger'
import { cleanTitleBrackets, cleanSummaryPrefixAndBrackets } from '@/features/episode-generation/lib/text-cleaner'

// Error detection utilities
function isInsufficientBalanceError(error: unknown): boolean {
  // Check string errors
  if (typeof error === 'string') {
    const insufficientBalanceMessages = [
      'account balance is insufficient',
      '余额已用完',
      '余额不足'
    ]
    return insufficientBalanceMessages.some(msg => error.includes(msg))
  }

  // Check object errors
  if (error && typeof error === 'object') {
    const errorObj = error as { code?: string; message?: string; errorType?: string }
    const errorStr = JSON.stringify(error).toLowerCase()
    const balanceIndicators = ['30001', 'account balance is insufficient', 'insufficient_balance']

    return balanceIndicators.some(indicator => errorStr.includes(indicator)) ||
           errorObj.errorType === 'INSUFFICIENT_BALANCE'
  }

  return false
}

// Helper function to create error result
function createErrorResult(
  episode: SubtitleEpisode,
  styleId: string,
  error: unknown,
  model: string,
  suffix?: string
): GenerationResult {
  const allSummaryStyles = getAllSummaryStyles()
  const style = allSummaryStyles.find(s => s.id === styleId)

  if (isInsufficientBalanceError(error)) {
    return {
      episodeNumber: episode.episodeNumber,
      originalTitle: episode.title || `第${episode.episodeNumber}集`,
      generatedTitle: `第${episode.episodeNumber}集`,
      generatedSummary: '余额不足，无法生成内容',
      confidence: 0,
      wordCount: 0,
      generationTime: Date.now(),
      model,
      styles: [styleId],
      styleId,
      styleName: style?.name || styleId,
      error: 'INSUFFICIENT_BALANCE'
    }
  }

  return {
    episodeNumber: episode.episodeNumber,
    originalTitle: episode.title || `第${episode.episodeNumber}集`,
    generatedTitle: `第${episode.episodeNumber}集（${style?.name || styleId}风格生成失败${suffix ? ` - ${suffix}` : ''}）`,
    generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
    confidence: 0,
    wordCount: 0,
    generationTime: Date.now(),
    model,
    styles: [styleId],
    styleId,
    styleName: style?.name || styleId
  }
}

// Helper function to process imitate style generation
async function processImitateStyle(
  episode: SubtitleEpisode,
  config: GenerationConfig,
  generateEpisodeContentForStyle: (episode: SubtitleEpisode, styleId: string) => Promise<GenerationResult>,
  generateCount: number
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = []

  for (let i = 0; i < generateCount; i++) {
    try {
      const result = await generateEpisodeContentForStyle(episode, 'imitate')

      // Check for insufficient balance
      if (result.error === 'INSUFFICIENT_BALANCE') {
        results.push(result)
        return results
      }

      // Add version identifier for imitate style
      result.styleName = `模仿 (版本${i + 1})`
      results.push(result)

      // Rate limiting delay between versions
      if (i < generateCount - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_800MS))
      }
    } catch (error) {
      logger.error(`模仿风格第${i + 1}版本生成失败:`, error)

      const errorResult = createErrorResult(
        episode,
        'imitate',
        error,
        config.model,
        `模仿版本${i + 1}生成失败`
      )

      if (errorResult.error === 'INSUFFICIENT_BALANCE') {
        results.push(errorResult)
        return results
      }

      errorResult.styleName = `模仿 (版本${i + 1})`
      results.push(errorResult)
    }
  }

  return results
}

export function useContentGeneration(
  config: GenerationConfig,
  subtitleFiles: SubtitleFile[],
  selectedFile: SubtitleFile | null
) {
  const [generationResults, setGenerationResults] = useState<Record<string, GenerationResult[]>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false)
  const [aiImprovingIndex, setAiImprovingIndex] = useState<{ fileId: string; resultIndex: number } | null>(null)
  const { toast } = useToast()
  const scenarioModels = useScenarioModels('episode_generation')
  const { generateEpisodeContentForStyle, enhanceContent } = useApiCalls(config)

  // Generate content for all selected styles
  const generateEpisodeContent = useCallback(async (episode: SubtitleEpisode): Promise<GenerationResult[]> => {
    const results: GenerationResult[] = []

    // Validate and filter valid style IDs
    const allSummaryStyles = getAllSummaryStyles()
    const validStyleIds = allSummaryStyles.map(s => s.id)
    const validSelectedStyles = config.selectedStyles.filter(styleId => {
      const isValid = validStyleIds.includes(styleId)
      if (!isValid) {
        logger.warn(`无效的风格ID: ${styleId}`)
      }
      return isValid
    })

    if (validSelectedStyles.length === 0) {
      logger.warn('没有选择有效的简介风格')
      return results
    }

    // Generate for each valid selected style
    for (const styleId of validSelectedStyles) {
      try {
        // Handle imitate style special case: generate multiple versions
        if (styleId === 'imitate' && config.imitateConfig?.generateCount) {
          const imitateResults = await processImitateStyle(
            episode,
            config,
            generateEpisodeContentForStyle,
            config.imitateConfig.generateCount
          )

          // Check if any insufficient balance error occurred
          if (imitateResults.some(r => r.error === 'INSUFFICIENT_BALANCE')) {
            results.push(...imitateResults)
            return results
          }

          results.push(...imitateResults)
        } else {
          // Single generation for regular styles
          const result = await generateEpisodeContentForStyle(episode, styleId)

          // Check for insufficient balance
          if (result.error === 'INSUFFICIENT_BALANCE') {
            results.push(result)
            break
          }

          results.push(result)
        }

        // Rate limiting delay between styles
        if (validSelectedStyles.length > 1 && styleId !== validSelectedStyles[validSelectedStyles.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, DELAY_500MS))
        }
      } catch (error) {
        logger.error(`风格${styleId}生成失败:`, error)

        const errorResult = createErrorResult(episode, styleId, error, config.model)
        results.push(errorResult)

        if (errorResult.error === 'INSUFFICIENT_BALANCE') {
          break
        }
      }
    }

    return results
  }, [config, generateEpisodeContentForStyle])

  // Batch generate single file
  const handleBatchGenerate = useCallback(async () => {
    // Validation checks
    if (!selectedFile) {
      toast({
        title: "请选择文件",
        description: "请先选择要生成的字幕文件",
        variant: "destructive"
      })
      return
    }

    if (!scenarioModels.getCurrentModel()) {
      toast({
        title: "未配置模型",
        description: "请先在设置中配置AI模型",
        variant: "destructive"
      })
      return
    }

    if (selectedFile.episodes.length === 0) {
      toast({
        title: "无可用内容",
        description: "所选文件没有解析出有效的集数内容",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationResults(prev => ({ ...prev, [selectedFile.id]: [] }))

    try {
      const results: GenerationResult[] = []
      const episodes = selectedFile.episodes
      let successCount = 0
      let failCount = 0

      // Calculate total tasks (episodes × styles)
      const totalTasks = episodes.length * config.selectedStyles.length
      let completedTasks = 0

      for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i]
        if (!episode) continue

        try {
          const episodeResults = await generateEpisodeContent(episode)
          results.push(...episodeResults)

          // Count successes and failures
          const successResults = episodeResults.filter(r => r.confidence > 0)
          successCount += successResults.length
          failCount += episodeResults.length - successResults.length

          // Update progress
          completedTasks += config.selectedStyles.length
          setGenerationResults(prev => ({ ...prev, [selectedFile.id]: [...results] }))
          setGenerationProgress((completedTasks / totalTasks) * 100)

          // Rate limiting delay
          if (i < episodes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_1500MS))
          }
        } catch (error) {
          logger.error(`第${episode.episodeNumber}集生成失败:`, error)
          failCount += config.selectedStyles.length
          completedTasks += config.selectedStyles.length

          // Add failure placeholders for each style
          for (const styleId of config.selectedStyles) {
            results.push(createErrorResult(episode, styleId, error, config.model))
          }

          setGenerationResults(prev => ({ ...prev, [selectedFile.id]: [...results] }))
          setGenerationProgress((completedTasks / totalTasks) * 100)
        }
      }

      // Show generation summary
      if (successCount > 0) {
        toast({
          title: "生成完成",
          description: `成功生成 ${successCount} 个简介，失败 ${failCount} 个`,
        })
      } else {
        toast({
          title: "生成失败",
          description: "所有简介生成均失败，请检查配置和网络",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error('批量生成失败:', error)
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
      } else {
        toast({
          title: "生成失败",
          description: error instanceof Error ? error.message : '未知错误',
          variant: "destructive"
        })
      }
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }, [selectedFile, config, generateEpisodeContent, scenarioModels, toast])

  // Batch generate all files
  const handleBatchGenerateAll = useCallback(async (
    setSubtitleFiles: (files: SubtitleFile[] | ((prev: SubtitleFile[]) => SubtitleFile[])) => void,
    setSelectedFile: (file: SubtitleFile | null) => void
  ): Promise<void> => {
    if (!scenarioModels.getCurrentModel()) {
      toast({
        title: "未配置模型",
        description: "请先在设置中配置AI模型",
        variant: "destructive"
      })
      return
    }

    if (subtitleFiles.length === 0) {
      toast({
        title: "无文件",
        description: "请先上传字幕文件",
        variant: "destructive"
      })
      return
    }

    const validFiles = subtitleFiles.filter(file => file.episodes.length > 0)
    if (validFiles.length === 0) {
      toast({
        title: "无可用内容",
        description: "所有文件都没有解析出有效的集数内容",
        variant: "destructive"
      })
      return
    }

    // Initialize generation state
    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationResults({})

    setSubtitleFiles((prev: SubtitleFile[]) => prev.map((file: SubtitleFile) => ({
      ...file,
      generationStatus: validFiles.some(vf => vf.id === file.id) ? 'pending' as GenerationStatus : file.generationStatus,
      generationProgress: 0,
      generatedCount: 0
    })) as SubtitleFile[])

    try {
      const allResults: Record<string, GenerationResult[]> = {}
      const totalEpisodes = validFiles.reduce((sum, file) => sum + file.episodes.length, 0)
      let processedEpisodes = 0
      let successfulGenerated = 0
      let totalGenerated = 0

      // Initialize result arrays
      validFiles.forEach(file => {
        allResults[file.id] = []
      })

      // Process each file
      for (const file of validFiles) {
        logger.info(`开始处理文件: ${file.name}`)
        updateFileStatus(setSubtitleFiles, file.id, 'generating', 0, 0)

        for (let i = 0; i < file.episodes.length; i++) {
          const episode = file.episodes[i]
          if (!episode) continue

          const originalSelectedFile = selectedFile
          setSelectedFile(file)

          try {
            const episodeResults = await generateEpisodeContent(episode)
            const resultsWithFileName = episodeResults.map((result: GenerationResult) => ({
              ...result,
              fileName: file.name
            }))

            allResults[file.id]!.push(...resultsWithFileName)
          } catch (error) {
            logger.error(`第${episode.episodeNumber}集生成失败:`, error)

            // Add failure placeholders
            for (const styleId of config.selectedStyles) {
              allResults[file.id]!.push(createErrorResult(episode, styleId, error, config.model))
            }
          }

          setSelectedFile(originalSelectedFile)

          // Update progress
          const currentFileProgress = ((i + 1) / file.episodes.length) * 100
          const globalProgress = ((processedEpisodes + i + 1) / totalEpisodes) * 100

          updateFileStatus(setSubtitleFiles, file.id, 'generating', currentFileProgress, i + 1)
          setGenerationProgress(globalProgress)
          setGenerationResults(prev => ({ ...prev, ...allResults }))

          // Rate limiting
          if (processedEpisodes + i < totalEpisodes - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_1500MS))
          }
        }

        // Set final file status
        const fileResults = allResults[file.id] || []
        const hasFailures = fileResults.some((r: GenerationResult) => r.confidence === 0)
        updateFileStatus(setSubtitleFiles, file.id, hasFailures ? 'failed' : 'completed', 100, file.episodes.length)
        processedEpisodes += file.episodes.length
      }

      // Calculate statistics
      const allResultsFlat = Object.values(allResults).flat()
      totalGenerated = allResultsFlat.length
      successfulGenerated = allResultsFlat.filter(r => r.confidence > 0).length

      logger.info(`批量生成完成: 总计 ${totalGenerated} 个，成功 ${successfulGenerated} 个，失败 ${totalGenerated - successfulGenerated} 个`)

      // Auto-select appropriate file for display
      if (!selectedFile && validFiles.length > 0) {
        setSelectedFile(validFiles[0]!)
      } else if (selectedFile && (allResults[selectedFile.id] || []).length === 0) {
        const firstFileWithResults = validFiles.find(file => (allResults[file.id] || []).length > 0)
        if (firstFileWithResults) {
          setSelectedFile(firstFileWithResults!)
        }
      }

      toast({
        title: "批量生成完成",
        description: `总计生成 ${totalGenerated} 个简介，成功 ${successfulGenerated} 个`,
      })
    } catch (error) {
      logger.error('批量生成失败:', error)
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
      } else {
        toast({
          title: "批量生成失败",
          description: error instanceof Error ? error.message : '未知错误',
          variant: "destructive"
        })
      }
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }, [subtitleFiles, config, generateEpisodeContent, scenarioModels, selectedFile, toast])

  function updateFileStatus(
    setSubtitleFiles: (files: SubtitleFile[] | ((prev: SubtitleFile[]) => SubtitleFile[])) => void,
    fileId: string,
    status: GenerationStatus,
    progress: number,
    generatedCount: number
  ): void {
    setSubtitleFiles((prev: SubtitleFile[]) => prev.map((f: SubtitleFile) =>
      f.id === fileId
        ? { ...f, generationStatus: status, generationProgress: progress, generatedCount }
        : f
    ) as SubtitleFile[])
  }

  // Content enhancement functionality
  const handleEnhanceContent = useCallback(async (
    fileId: string,
    resultIndex: number,
    operation: EnhanceOperation,
    selectedTextInfo?: {text: string, start: number, end: number}
  ): Promise<void> => {
    const results = generationResults[fileId] || []
    const result = results[resultIndex]
    if (!result) return

    try {
      const operationConfig = getOperationConfig(operation)
      const enhancedContent = await enhanceContent(result.generatedSummary, operation, operationConfig, selectedTextInfo)

      if (operation === 'rewrite' && selectedTextInfo) {
        const newSummary = result.generatedSummary.substring(0, selectedTextInfo.start) +
                          enhancedContent +
                          result.generatedSummary.substring(selectedTextInfo.end)

        setGenerationResults((prev: Record<string, GenerationResult[]>) => {
          const fileResults = prev[fileId] || []
          const newResults = [...fileResults]
          if (newResults[resultIndex]) {
            newResults[resultIndex] = { ...newResults[resultIndex], generatedSummary: newSummary, wordCount: newSummary.length }
          }
          return { ...prev, [fileId]: newResults }
        })
      } else {
        const lines = enhancedContent.split('\n').filter((line: string) => line.trim())
        let enhancedTitle = result.generatedTitle
        let enhancedSummary = enhancedContent

        if (lines.length >= 2) {
          const titleMatch = lines[0].match(/^(?:标题[:：]?\s*)?(.+)$/)
          if (titleMatch) {
            enhancedTitle = titleMatch[1].trim()
            enhancedSummary = lines.slice(1).join('\n').replace(/^(?:简介[:：]?\s*)?/, '').trim()
          }
        }

        setGenerationResults((prev: Record<string, GenerationResult[]>) => {
          const fileResults = prev[fileId] || []
          const newResults = [...fileResults]
          if (newResults[resultIndex]) {
            newResults[resultIndex] = {
              ...newResults[resultIndex],
              generatedTitle: enhancedTitle,
              generatedSummary: enhancedSummary,
              wordCount: enhancedSummary.length
            }
          }
          return { ...prev, [fileId]: newResults }
        })
      }
    } catch (error) {
      console.error(`${getOperationName(operation)}失败:`, error)
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
      } else {
        alert(`${getOperationName(operation)}失败：${error instanceof Error ? error.message : '未知错误'}`)
      }
    }
  }, [generationResults, enhanceContent])

  function getOperationConfig(operation: EnhanceOperation): { temperature: number; maxTokens: number } {
    const configs = {
      polish: { temperature: 0.6, maxTokens: 1000 },
      shorten: { temperature: 0.4, maxTokens: 600 },
      expand: { temperature: 0.8, maxTokens: 1200 },
      rewrite: { temperature: 0.7, maxTokens: 1000 },
      proofread: { temperature: 0.3, maxTokens: 1000 }
    }
    return configs[operation] || { temperature: 0.7, maxTokens: 800 }
  }

  function getOperationName(operation: EnhanceOperation): string {
    const operationNames = {
      polish: '润色',
      shorten: '缩写',
      expand: '扩写',
      rewrite: '改写',
      proofread: '纠错'
    }
    return operationNames[operation] || '处理'
  }

  // AI improvement functionality
  const handleAIImprovement = useCallback(async (fileId: string, resultIndex: number, userPrompt: string) => {
    const results = generationResults[fileId] || []
    const result = results[resultIndex]
    if (!result) return

    const selectedModel = scenarioModels.availableModels.find(m => m.id === config.model)
    if (!selectedModel) {
      throw new Error('未找到选中的模型配置')
    }

    setAiImprovingIndex({ fileId, resultIndex })

    const systemPrompt = `你是一位专业的影视内容编辑专家，专门负责优化电视剧、电影等影视作品的分集标题和剧情简介。

当前分集信息：
- 标题：${result.generatedTitle}
- 简介：${result.generatedSummary}

请根据用户的改进建议，生成改进后的标题和简介。

输出格式：
标题：[新的标题]
简介：[新的简介内容]`

    try {
      const response = await fetch('/api/model-service/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel.id,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        logger.error('AI改进API错误:', errorData)
        throw new Error(`AI改进请求失败: ${response.status}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'AI改进失败')
      }

      const assistantContent = data.data.content
      const lines = assistantContent.split('\n').filter((line: string) => line.trim())
      let improvedTitle = result.generatedTitle
      let improvedSummary = assistantContent

      if (lines.length >= 2) {
        const titleMatch = lines[0].match(/^(?:标题[:：]?\s*)?(.+)$/)
        if (titleMatch) {
          // Clean up title and summary
          improvedTitle = cleanTitleBrackets(titleMatch[1].trim())
          improvedSummary = cleanSummaryPrefixAndBrackets(lines.slice(1).join('\n'))
        }
      }

      setGenerationResults((prev: Record<string, GenerationResult[]>) => {
        const fileResults = prev[fileId] || []
        const newResults = [...fileResults]
        if (newResults[resultIndex]) {
          newResults[resultIndex] = {
            ...newResults[resultIndex],
            generatedTitle: improvedTitle,
            generatedSummary: improvedSummary,
            wordCount: improvedSummary.length
          }
        }
        return { ...prev, [fileId]: newResults }
      })

    } catch (error) {
      logger.error('AI改进失败:', error)
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
        throw new Error('余额不足，无法使用AI改进功能')
      }
      throw error
    } finally {
      setAiImprovingIndex(null)
    }
  }, [generationResults, config, scenarioModels.availableModels])

  // Update generation result
  const handleUpdateResult = useCallback((fileId: string, resultIndex: number, updatedResult: Partial<any>) => {
    setGenerationResults((prev: Record<string, GenerationResult[]>) => {
      const fileResults = prev[fileId] || []
      const newResults = [...fileResults]
      if (newResults[resultIndex]) {
        newResults[resultIndex] = { ...newResults[resultIndex], ...updatedResult }
      }
      return {
        ...prev,
        [fileId]: newResults
      }
    })
  }, [])

  // Move style summary to top
  const handleMoveToTop = useCallback((fileId: string, resultIndex: number) => {
    setGenerationResults((prev: Record<string, GenerationResult[]>) => {
      const fileResults = prev[fileId] || []
      if (resultIndex <= 0 || resultIndex >= fileResults.length) return prev

      const newResults = [...fileResults]
      const [movedItem] = newResults.splice(resultIndex, 1)
      newResults.unshift(movedItem!)

      return {
        ...prev,
        [fileId]: newResults
      }
    })
  }, [])

  // Batch export all results to TMDB format
  const handleBatchExportToTMDB = useCallback(async (exportConfig: { includeTitle: boolean; includeOverview: boolean; includeRuntime: boolean }) => {
    try {
      const allResults: Array<{
        episodeNumber: number
        name: string
        runtime: number
        overview: string
        backdrop: string
      }> = []

      let globalEpisodeNumber = 1

      // Process in file order
      for (const file of subtitleFiles) {
        const fileResults = generationResults[file.id] || []

        // Sort by episode number within subtitle file
        const sortedResults = fileResults.sort((a, b) => a.episodeNumber - b.episodeNumber)

        // Group by episode number, take only first style result for each episode
        const episodeGroups = new Map<number, any>()
        for (const result of sortedResults) {
          if (!episodeGroups.has(result.episodeNumber)) {
            episodeGroups.set(result.episodeNumber, result)
          }
        }

        // Create export data for each episode
        for (const [, result] of episodeGroups) {
          const originalEpisode = file.episodes.find(ep => ep.episodeNumber === result.episodeNumber)
          const runtime = originalEpisode?.lastTimestamp ? timestampToMinutes(originalEpisode.lastTimestamp) : 0

          const exportItem = {
            episodeNumber: globalEpisodeNumber,
            name: exportConfig.includeTitle ? result.generatedTitle : '',
            runtime: exportConfig.includeRuntime ? runtime : 0,
            overview: exportConfig.includeOverview ? result.generatedSummary : '',
            backdrop: ''
          }

          allResults.push(exportItem)
          globalEpisodeNumber++
        }
      }

      // Generate CSV content
      const headers = ['episode_number', 'name', 'runtime', 'overview', 'backdrop']
      const csvContent = [
        headers.join(','),
        ...allResults.map(item => [
          item.episodeNumber,
          `"${item.name.replace(/"/g, '""')}"`,
          item.runtime,
          `"${item.overview.replace(/"/g, '""')}"`,
          `"${item.backdrop}"`
        ].join(','))
      ].join('\n')

      // Write to TMDB-Import directory
      const response = await fetch('/api/external/write-tmdb-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: csvContent
        })
      })

      if (response.ok) {
        return { success: true }
      } else {
        throw new Error('写入文件失败')
      }
    } catch (error) {
      logger.error('导出失败:', error)
      throw error
    }
  }, [subtitleFiles, generationResults])

  return {
    generationResults,
    isGenerating,
    generationProgress,
    showInsufficientBalanceDialog,
    setShowInsufficientBalanceDialog,
    setGenerationResults,
    handleBatchGenerate,
    handleBatchGenerateAll,
    handleEnhanceContent,
    handleUpdateResult,
    handleMoveToTop,
    handleBatchExportToTMDB,
    handleAIImprovement,
    aiImprovingIndex
  }
}