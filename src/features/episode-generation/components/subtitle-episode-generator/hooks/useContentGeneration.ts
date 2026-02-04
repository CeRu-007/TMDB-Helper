import { useState, useCallback } from 'react'
import { useToast } from '@/shared/components/ui/use-toast'
import { useScenarioModels } from '@/lib/hooks/useScenarioModels'
import { SubtitleFile, SubtitleEpisode, GenerationConfig, EnhanceOperation, GenerationStatus, GenerationResult } from '../types'
import { getAllSummaryStyles } from '@/features/episode-generation/plugins/plugin-service'
import { timestampToMinutes } from '../utils'
import { useApiCalls } from './useApiCalls'
import { DELAY_500MS, DELAY_800MS, DELAY_1500MS } from '@/lib/constants/constants'
import { logger } from '@/lib/utils/logger'

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

  // 为所有选中的风格生成内容
  const generateEpisodeContent = useCallback(async (episode: SubtitleEpisode): Promise<GenerationResult[]> => {
    const results: GenerationResult[] = []

    // 验证和过滤有效的风格ID
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

    // 为每个有效的选中风格单独生成
    for (const styleId of validSelectedStyles) {
      try {
        // 处理模仿风格的特殊情况：需要生成多个版本
        if (styleId === 'imitate' && config.imitateConfig?.generateCount) {
          const generateCount = config.imitateConfig.generateCount
          
          for (let i = 0; i < generateCount; i++) {
            try {
              const result = await generateEpisodeContentForStyle(episode, styleId)

              // 检查是否是余额不足的结果
              if (result.error === 'INSUFFICIENT_BALANCE') {
                results.push(result)
                return results // 余额不足时直接返回
              }

              // 为模仿风格的多个版本添加序号标识
              result.styleName = `模仿 (版本${i + 1})`
              results.push(result)

              // 避免API限流，在版本之间添加延迟
              if (i < generateCount - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_800MS))
              }
            } catch (error) {
              logger.error(`模仿风格第${i + 1}版本生成失败:`, error)

              // 检查是否是余额不足错误
              if (isInsufficientBalanceError(error)) {
                results.push({
                  episodeNumber: episode.episodeNumber,
                  originalTitle: episode.title || `第${episode.episodeNumber}集`,
                  generatedTitle: `第${episode.episodeNumber}集`,
                  generatedSummary: '余额不足，无法生成内容',
                  confidence: 0,
                  wordCount: 0,
                  generationTime: Date.now(),
                  model: config.model,
                  styles: [styleId],
                  styleId: styleId,
                  styleName: `模仿 (版本${i + 1})`,
                  error: 'INSUFFICIENT_BALANCE'
                })
                return results // 余额不足时直接返回
              }

              // 添加失败的结果占位符
                        const allSummaryStyles = getAllSummaryStyles()
                        const style = allSummaryStyles.find(s => s.id === styleId)
                        results.push({
                          episodeNumber: episode.episodeNumber,
                          originalTitle: episode.title || `第${episode.episodeNumber}集`,
                          generatedTitle: `第${episode.episodeNumber}集（模仿版本${i + 1}生成失败）`,
                          generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
                          confidence: 0,
                          wordCount: 0,
                          generationTime: Date.now(),
                          model: config.model,
                          styles: [styleId],
                          styleId: styleId,
                          styleName: `模仿 (版本${i + 1})`
                        })            }
          }
        } else {
          // 普通风格的单次生成
          const result = await generateEpisodeContentForStyle(episode, styleId)

          // 检查是否是余额不足的结果
          if (result.error === 'INSUFFICIENT_BALANCE') {
            // 余额不足时，直接返回已有结果，不继续生成其他风格
            results.push(result)
            break
          }

          results.push(result)
        }

        // 避免API限流，在风格之间添加短暂延迟
        if (validSelectedStyles.length > 1 && styleId !== validSelectedStyles[validSelectedStyles.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, DELAY_500MS))
        }
      } catch (error) {
        logger.error(`风格${styleId}生成失败:`, error)
        
        // 检查是否是余额不足错误
        if (isInsufficientBalanceError(error)) {
          // 余额不足时，添加特殊的结果并停止生成
          const allSummaryStyles = getAllSummaryStyles()
          const style = allSummaryStyles.find(s => s.id === styleId)
          results.push({
            episodeNumber: episode.episodeNumber,
            originalTitle: episode.title || `第${episode.episodeNumber}集`,
            generatedTitle: `第${episode.episodeNumber}集`,
            generatedSummary: '余额不足，无法生成内容',
            confidence: 0,
            wordCount: 0,
            generationTime: Date.now(),
            model: config.model,
            styles: [styleId],
            styleId: styleId,
            styleName: style?.name || styleId,
            error: 'INSUFFICIENT_BALANCE'
          })
          break
        }

        // 添加失败的结果占位符
        const allSummaryStyles = getAllSummaryStyles()
        const style = allSummaryStyles.find(s => s.id === styleId)
        results.push({
          episodeNumber: episode.episodeNumber,
          originalTitle: episode.title || `第${episode.episodeNumber}集`,
          generatedTitle: `第${episode.episodeNumber}集（${style?.name || styleId}风格生成失败）`,
          generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
          confidence: 0,
          wordCount: 0,
          generationTime: Date.now(),
          model: config.model,
          styles: [styleId],
          styleId: styleId,
          styleName: style?.name || styleId
        })
      }
    }

    return results
  }, [config, generateEpisodeContentForStyle])

  // 批量生成单个文件
  const handleBatchGenerate = useCallback(async () => {
    // 检查是否有选中的文件
    if (!selectedFile) {
      toast({
        title: "请选择文件",
        description: "请先选择要生成的字幕文件",
        variant: "destructive"
      })
      return
    }

    // 检查是否配置了模型服务
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

      // 计算总任务数（集数 × 风格数）
      const totalTasks = episodes.length * config.selectedStyles.length
      let completedTasks = 0

      for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i]
        if (!episode) continue
        try {
          // 为每个选中的风格生成内容
          const episodeResults = await generateEpisodeContent(episode)

          // 添加所有风格的结果
          results.push(...episodeResults)

          // 计算成功和失败的数量
          const successResults = episodeResults.filter(r => r.confidence > 0)
          successCount += successResults.length
          failCount += episodeResults.length - successResults.length

          // 更新进度
          completedTasks += config.selectedStyles.length
          setGenerationResults(prev => ({ ...prev, [selectedFile.id]: [...results] }))
          setGenerationProgress((completedTasks / totalTasks) * 100)

          // 避免API限流，添加延迟
          if (i < episodes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_1500MS))
          }
        } catch (error) {
          logger.error(`第${episode!.episodeNumber}集生成失败:`, error)
          failCount += config.selectedStyles.length
          completedTasks += config.selectedStyles.length

          // 为每个风格添加失败的结果占位符
          for (const styleId of config.selectedStyles) {
            const allSummaryStyles = getAllSummaryStyles()
            const style = allSummaryStyles.find(s => s.id === styleId)
            results.push({
              episodeNumber: episode!.episodeNumber,
              originalTitle: episode!.title || `第${episode!.episodeNumber}集`,
              generatedTitle: `第${episode!.episodeNumber}集（${style?.name || styleId}风格生成失败）`,
              generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
              confidence: 0,
              wordCount: 0,
              generationTime: Date.now(),
              model: config.model,
              styles: [styleId],
              styleId: styleId,
              styleName: style?.name
            } as GenerationResult)
          }

          setGenerationResults(prev => ({ ...prev, [selectedFile.id]: [...results] }))
          setGenerationProgress((completedTasks / totalTasks) * 100)
        }
      }

      // 显示生成结果摘要
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
      // 检查是否是余额不足错误
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
        // 不显示额外的错误提示
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
    // Validation checks
    if (!validateBatchGeneration()) return

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
    initializeBatchGeneration(setSubtitleFiles, validFiles)

    try {
      const { allResults, totalGenerated, successfulGenerated } = await processAllFiles(
        validFiles,
        setSubtitleFiles,
        setSelectedFile
      )

      // Auto-select appropriate file for display
      selectFileForDisplay(validFiles, allResults, setSelectedFile)

      toast({
        title: "批量生成完成",
        description: `总计生成 ${totalGenerated} 个简介，成功 ${successfulGenerated} 个`,
      })
    } catch (error) {
      handleBatchGenerationError(error)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }, [subtitleFiles, config, generateEpisodeContent, scenarioModels, selectedFile, toast])

  function validateBatchGeneration(): boolean {
    if (!scenarioModels.getCurrentModel()) {
      toast({
        title: "未配置模型",
        description: "请先在设置中配置AI模型",
        variant: "destructive"
      })
      return false
    }

    if (subtitleFiles.length === 0) {
      toast({
        title: "无文件",
        description: "请先上传字幕文件",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  function initializeBatchGeneration(
    setSubtitleFiles: (files: SubtitleFile[] | ((prev: SubtitleFile[]) => SubtitleFile[])) => void,
    validFiles: SubtitleFile[]
  ): void {
    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationResults({})

    // Initialize all files status
    setSubtitleFiles((prev: SubtitleFile[]) => prev.map((file: SubtitleFile) => ({
      ...file,
      generationStatus: validFiles.some(vf => vf.id === file.id) ? 'pending' as GenerationStatus : file.generationStatus,
      generationProgress: 0,
      generatedCount: 0
    })) as SubtitleFile[])
  }

  async function processAllFiles(
    validFiles: SubtitleFile[],
    setSubtitleFiles: (files: SubtitleFile[] | ((prev: SubtitleFile[]) => SubtitleFile[])) => void,
    setSelectedFile: (file: SubtitleFile | null) => void
  ): Promise<{ allResults: Record<string, GenerationResult[]>; totalGenerated: number; successfulGenerated: number }> {
    const allResults: Record<string, GenerationResult[]> = {}
    const totalEpisodes = validFiles.reduce((sum, file) => sum + file.episodes.length, 0)
    let processedEpisodes = 0

    // Initialize results arrays
    validFiles.forEach(file => {
      allResults[file.id] = []
    })

    // Process each file
    for (const file of validFiles) {
      await processSingleFile(file, allResults, setSubtitleFiles, setSelectedFile, totalEpisodes, processedEpisodes)
      processedEpisodes += file.episodes.length
    }

    // Calculate statistics
    const allResultsFlat = Object.values(allResults).flat()
    const totalGenerated = allResultsFlat.length
    const successfulGenerated = allResultsFlat.filter(r => r.confidence > 0).length

    logger.info(`批量生成完成: 总计 ${totalGenerated} 个，成功 ${successfulGenerated} 个，失败 ${totalGenerated - successfulGenerated} 个`)

    return { allResults, totalGenerated, successfulGenerated }
  }

  async function processSingleFile(
    file: SubtitleFile,
    allResults: Record<string, GenerationResult[]>,
    setSubtitleFiles: (files: SubtitleFile[] | ((prev: SubtitleFile[]) => SubtitleFile[])) => void,
    setSelectedFile: (file: SubtitleFile | null) => void,
    totalEpisodes: number,
    processedEpisodes: number
  ): Promise<void> {
    logger.info(`开始处理文件: ${file.name}`)

    // Set file status to generating
    updateFileStatus(setSubtitleFiles, file.id, 'generating', 0, 0)

    for (let i = 0; i < file.episodes.length; i++) {
      const episode = file.episodes[i]
      if (!episode) continue

      try {
        await processEpisode(episode, file, allResults, setSelectedFile)
      } catch (error) {
        handleEpisodeError(error, episode, file, allResults)
      }

      // Update progress
      const currentFileProgress = ((i + 1) / file.episodes.length) * 100
      const globalProgress = ((processedEpisodes + i + 1) / totalEpisodes) * 100

      updateFileStatus(setSubtitleFiles, file.id, 'generating', currentFileProgress, i + 1)
      setGenerationProgress(globalProgress)
      setGenerationResults(prev => ({ ...prev, ...allResults }))

      // Rate limiting delay
      if (processedEpisodes + i < totalEpisodes - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_1500MS))
      }
    }

    // Set final file status
    const fileResults = allResults[file.id] || []
    const hasFailures = fileResults.some((r: GenerationResult) => r.confidence === 0)
    updateFileStatus(setSubtitleFiles, file.id, hasFailures ? 'failed' : 'completed', 100, file.episodes.length)
  }

  async function processEpisode(
    episode: SubtitleEpisode,
    file: SubtitleFile,
    allResults: Record<string, GenerationResult[]>,
    setSelectedFile: (file: SubtitleFile | null) => void
  ): Promise<void> {
    const originalSelectedFile = selectedFile
    setSelectedFile(file)

    const episodeResults = await generateEpisodeContent(episode)
    const resultsWithFileName = episodeResults.map((result: GenerationResult) => ({
      ...result,
      fileName: file.name
    }))

    allResults[file.id]!.push(...resultsWithFileName)
    setSelectedFile(originalSelectedFile)
  }

  function handleEpisodeError(
    error: unknown,
    episode: SubtitleEpisode,
    file: SubtitleFile,
    allResults: Record<string, GenerationResult[]>
  ): void {
    logger.error(`第${episode.episodeNumber}集生成失败:`, error)

    // Add failure placeholders for each style
    for (const styleId of config.selectedStyles) {
      const allSummaryStyles = getAllSummaryStyles()
      const style = allSummaryStyles.find(s => s.id === styleId)

      allResults[file.id]!.push({
        episodeNumber: episode.episodeNumber,
        originalTitle: episode.title || `第${episode.episodeNumber}集`,
        generatedTitle: `第${episode.episodeNumber}集（${style?.name || styleId}风格生成失败）`,
        generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
        confidence: 0,
        wordCount: 0,
        generationTime: Date.now(),
        model: config.model,
        styles: [styleId],
        styleId: styleId,
        styleName: style?.name,
        fileName: file.name
      })
    }
  }

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

  function selectFileForDisplay(
    validFiles: SubtitleFile[],
    allResults: Record<string, GenerationResult[]>,
    setSelectedFile: (file: SubtitleFile | null) => void
  ): void {
    if (validFiles.length === 0) return

    if (!selectedFile) {
      setSelectedFile(validFiles[0]!)
      return
    }

    const currentFileResults = allResults[selectedFile.id] || []
    if (currentFileResults.length === 0) {
      const firstFileWithResults = validFiles.find(file => (allResults[file.id] || []).length > 0)
      if (firstFileWithResults) {
        setSelectedFile(firstFileWithResults!)
      }
    }
  }

  function handleBatchGenerationError(error: unknown): void {
    logger.error('批量生成失败:', error)

    if (isInsufficientBalanceError(error)) {
      setShowInsufficientBalanceDialog(true)
      return
    }

    toast({
      title: "批量生成失败",
      description: error instanceof Error ? error.message : '未知错误',
      variant: "destructive"
    })
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
        await handleRewriteOperation(fileId, resultIndex, result.generatedSummary, enhancedContent, selectedTextInfo)
      } else {
        await handleStandardEnhancement(fileId, resultIndex, enhancedContent, result.generatedTitle)
      }
    } catch (error) {
      handleEnhancementError(error, operation)
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

  async function handleRewriteOperation(
    fileId: string,
    resultIndex: number,
    originalSummary: string,
    enhancedContent: string,
    selectedTextInfo: {text: string, start: number, end: number}
  ): Promise<void> {
    const newSummary = originalSummary.substring(0, selectedTextInfo.start) +
                      enhancedContent +
                      originalSummary.substring(selectedTextInfo.end)

    updateGenerationResult(fileId, resultIndex, {
      generatedSummary: newSummary,
      wordCount: newSummary.length
    })
  }

  async function handleStandardEnhancement(
    fileId: string,
    resultIndex: number,
    enhancedContent: string,
    originalTitle: string
  ): Promise<void> {
    const { enhancedTitle, enhancedSummary } = parseEnhancedContent(enhancedContent, originalTitle)

    updateGenerationResult(fileId, resultIndex, {
      generatedTitle: enhancedTitle,
      generatedSummary: enhancedSummary,
      wordCount: enhancedSummary.length
    })
  }

  function parseEnhancedContent(content: string, originalTitle: string): { enhancedTitle: string; enhancedSummary: string } {
    const lines = content.split('\n').filter((line: string) => line.trim())

    if (lines.length < 2) {
      return { enhancedTitle: originalTitle, enhancedSummary: content }
    }

    const titleMatch = lines[0].match(/^(?:标题[:：]?\s*)?(.+)$/)
    if (titleMatch) {
      return {
        enhancedTitle: titleMatch[1].trim(),
        enhancedSummary: lines.slice(1).join('\n').replace(/^(?:简介[:：]?\s*)?/, '').trim()
      }
    }

    return { enhancedTitle: originalTitle, enhancedSummary: content }
  }

  function updateGenerationResult(
    fileId: string,
    resultIndex: number,
    updates: Partial<GenerationResult>
  ): void {
    setGenerationResults((prev: Record<string, GenerationResult[]>) => {
      const fileResults = prev[fileId] || []
      const newResults = [...fileResults]
      if (newResults[resultIndex]) {
        newResults[resultIndex] = { ...newResults[resultIndex], ...updates }
      }
      return { ...prev, [fileId]: newResults }
    })
  }

  function handleEnhancementError(error: unknown, operation: EnhanceOperation): void {
    console.error(`${getOperationName(operation)}失败:`, error)

    if (isInsufficientBalanceError(error)) {
      setShowInsufficientBalanceDialog(true)
      return
    }

    alert(`${getOperationName(operation)}失败：${error instanceof Error ? error.message : '未知错误'}`)
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

  // AI改进功能
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
          improvedTitle = titleMatch[1].trim()
          improvedSummary = lines.slice(1).join('\n').replace(/^(?:简介[:：]?\s*)?/, '').trim()
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

  // 更新生成结果的函数
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

  // 置顶风格简介的函数
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

  // 批量导出所有结果到TMDB格式
  const handleBatchExportToTMDB = useCallback(async (exportConfig: { includeTitle: boolean; includeOverview: boolean; includeRuntime: boolean }) => {
    try {
      // 收集所有文件的结果
      const allResults: Array<{
        episodeNumber: number
        name: string
        runtime: number
        overview: string
        backdrop: string
      }> = []

      let globalEpisodeNumber = 1 // 全局集数计数器，按文件顺序递增

      // 按文件顺序处理
      for (const file of subtitleFiles) {
        const fileResults = generationResults[file.id] || []

        // 按字幕文件内的集数排序
        const sortedResults = fileResults.sort((a, b) => a.episodeNumber - b.episodeNumber)

        // 按字幕文件内的集数分组，每个集数只取第一个风格的结果
        const episodeGroups = new Map<number, any>()
        for (const result of sortedResults) {
          if (!episodeGroups.has(result.episodeNumber)) {
            episodeGroups.set(result.episodeNumber, result)
          }
        }

        // 为每集创建导出数据
        for (const [, result] of episodeGroups) {
          // 找到对应的原始集数据以获取时间戳
          const originalEpisode = file.episodes.find(ep => ep.episodeNumber === result.episodeNumber)
          const runtime = originalEpisode?.lastTimestamp ? timestampToMinutes(originalEpisode.lastTimestamp) : 0

          const exportItem = {
            episodeNumber: globalEpisodeNumber, // 使用全局递增的集数
            name: exportConfig.includeTitle ? result.generatedTitle : '',
            runtime: exportConfig.includeRuntime ? runtime : 0,
            overview: exportConfig.includeOverview ? result.generatedSummary : '',
            backdrop: '' // 空的backdrop字段
          }

          allResults.push(exportItem)
          globalEpisodeNumber++ // 递增全局集数
        }
      }

      // 结果已经按文件顺序和集数顺序排列，无需重新排序

      // 生成CSV内容
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

      // 写入到TMDB-Import目录
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