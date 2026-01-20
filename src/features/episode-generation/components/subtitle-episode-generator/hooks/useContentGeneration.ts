import { useState, useCallback } from 'react'
import { useToast } from '@/components/common/use-toast'
import { useScenarioModels } from '@/lib/hooks/useScenarioModels'
import { SubtitleFile, GenerationConfig, EnhanceOperation, GenerationStatus } from '../types'
import { GENERATION_STYLES } from '../constants'
import { timestampToMinutes } from '../utils'
import { useApiCalls } from './useApiCalls'

export function useContentGeneration(
  config: GenerationConfig,
  subtitleFiles: SubtitleFile[],
  selectedFile: SubtitleFile | null
) {
  const [generationResults, setGenerationResults] = useState<Record<string, any[]>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [showInsufficientBalanceDialog, setShowInsufficientBalanceDialog] = useState(false)
  const { toast } = useToast()
  const scenarioModels = useScenarioModels('episode_generation')
  const { generateEpisodeContentForStyle, enhanceContent } = useApiCalls(config)

  // 检测是否是余额不足错误
  const isInsufficientBalanceError = (error: any): boolean => {
    if (typeof error === 'string') {
      return error.includes('account balance is insufficient') ||
             error.includes('余额已用完') ||
             error.includes('余额不足')
    }

    if (error && typeof error === 'object') {
      const errorStr = JSON.stringify(error).toLowerCase()
      return errorStr.includes('30001') ||
             errorStr.includes('account balance is insufficient') ||
             errorStr.includes('insufficient_balance') ||
             error.errorType === 'INSUFFICIENT_BALANCE'
    }

    return false
  }

  // 为所有选中的风格生成内容
  const generateEpisodeContent = useCallback(async (episode: any): Promise<any[]> => {
    const results: any[] = []

    // 验证和过滤有效的风格ID
    const validStyleIds = GENERATION_STYLES.map(s => s.id)
    const validSelectedStyles = config.selectedStyles.filter(styleId => {
      const isValid = validStyleIds.includes(styleId)
      if (!isValid) {
        console.warn(`无效的风格ID: ${styleId}`)
      }
      return isValid
    })

    if (validSelectedStyles.length === 0) {
      console.warn('没有选择有效的简介风格')
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
                await new Promise(resolve => setTimeout(resolve, 800))
              }
            } catch (error) {
              console.error(`模仿风格第${i + 1}版本生成失败:`, error)
              
              // 检查是否是余额不足错误
              if (isInsufficientBalanceError(error)) {
                const style = GENERATION_STYLES.find(s => s.id === styleId)
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
              const style = GENERATION_STYLES.find(s => s.id === styleId)
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
              })
            }
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
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`风格${styleId}生成失败:`, error)
        
        // 检查是否是余额不足错误
        if (isInsufficientBalanceError(error)) {
          // 余额不足时，添加特殊的结果并停止生成
          const style = GENERATION_STYLES.find(s => s.id === styleId)
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
        const style = GENERATION_STYLES.find(s => s.id === styleId)
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
      const results: any[] = []
      const episodes = selectedFile.episodes
      let successCount = 0
      let failCount = 0

      // 计算总任务数（集数 × 风格数）
      const totalTasks = episodes.length * config.selectedStyles.length
      let completedTasks = 0

      for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i]
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
            await new Promise(resolve => setTimeout(resolve, 1500))
          }
        } catch (error) {
          console.error(`第${episode.episodeNumber}集生成失败:`, error)
          failCount += config.selectedStyles.length
          completedTasks += config.selectedStyles.length

          // 为每个风格添加失败的结果占位符
          for (const styleId of config.selectedStyles) {
            const style = GENERATION_STYLES.find(s => s.id === styleId)
            results.push({
              episodeNumber: episode.episodeNumber,
              generatedTitle: `第${episode.episodeNumber}集（${style?.name || styleId}风格生成失败）`,
              generatedSummary: `生成失败：${error instanceof Error ? error.message : '未知错误'}`,
              confidence: 0,
              wordCount: 0,
              generationTime: Date.now(),
              model: config.model,
              styles: [styleId],
              styleId: styleId,
              styleName: style?.name
            })
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
      console.error('批量生成失败:', error)
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

  // 批量生成所有文件的简介
  const handleBatchGenerateAll = useCallback(async (setSubtitleFiles: (files: SubtitleFile[]) => void, setSelectedFile: (file: SubtitleFile | null) => void) => {
    // 检查是否配置了模型服务
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

    // 检查是否有可生成的文件
    const validFiles = subtitleFiles.filter(file => file.episodes.length > 0)
    if (validFiles.length === 0) {
      toast({
        title: "无可用内容",
        description: "所有文件都没有解析出有效的集数内容",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationResults({})

    // 初始化所有文件状态为pending
    setSubtitleFiles(prev => prev.map(file => ({
      ...file,
      generationStatus: validFiles.some(vf => vf.id === file.id) ? 'pending' as GenerationStatus : file.generationStatus,
      generationProgress: 0,
      generatedCount: 0
    })))

    try {
      const allResults: Record<string, any[]> = {}
      let totalEpisodes = 0
      let processedEpisodes = 0

      // 计算总集数
      validFiles.forEach(file => {
        totalEpisodes += file.episodes.length
        allResults[file.id] = [] // 初始化每个文件的结果数组
      })

      // 为每个文件生成简介
      for (const file of validFiles) {
        console.log(`开始处理文件: ${file.name}`)
        
        // 设置当前文件状态为generating
        setSubtitleFiles(prev => prev.map(f =>
          f.id === file.id
            ? { ...f, generationStatus: 'generating' as GenerationStatus, generationProgress: 0, generatedCount: 0 }
            : f
        ))

        for (let i = 0; i < file.episodes.length; i++) {
          const episode = file.episodes[i]
          try {
            // 临时设置当前文件为选中文件以便生成
            const originalSelectedFile = selectedFile
            setSelectedFile(file)

            const episodeResults = await generateEpisodeContent(episode)
            // 为每个风格的结果添加文件名信息
            const resultsWithFileName = episodeResults.map(result => ({
              ...result,
              fileName: file.name // 添加文件名信息
            }))
            allResults[file.id].push(...resultsWithFileName)

            processedEpisodes++
            setGenerationProgress((processedEpisodes / totalEpisodes) * 100)
            setGenerationResults(prev => ({ ...prev, ...allResults }))

            // 更新当前文件的进度
            const currentFileProgress = ((i + 1) / file.episodes.length) * 100
            setSubtitleFiles(prev => prev.map(f =>
              f.id === file.id
                ? {
                    ...f,
                    generationProgress: currentFileProgress,
                    generatedCount: i + 1
                  }
                : f
            ))

            // 恢复原选中文件
            setSelectedFile(originalSelectedFile)

            // 避免API限流，添加延迟
            if (processedEpisodes < totalEpisodes) {
              await new Promise(resolve => setTimeout(resolve, 1500))
            }
          } catch (error) {
            console.error(`第${episode.episodeNumber}集生成失败:`, error)
            
            // 为每个风格添加失败的结果占位符
            for (const styleId of config.selectedStyles) {
              const style = GENERATION_STYLES.find(s => s.id === styleId)
              allResults[file.id].push({
                episodeNumber: episode.episodeNumber,
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

            processedEpisodes++
            setGenerationProgress((processedEpisodes / totalEpisodes) * 100)
            setGenerationResults(prev => ({ ...prev, ...allResults }))

            // 更新当前文件的进度（失败情况）
            const currentFileProgress = ((i + 1) / file.episodes.length) * 100
            setSubtitleFiles(prev => prev.map(f =>
              f.id === file.id
                ? {
                    ...f,
                    generationProgress: currentFileProgress,
                    generatedCount: i + 1
                  }
                : f
            ))
          }
        }

        // 文件处理完成，设置最终状态
        const fileResults = allResults[file.id] || []
        const hasFailures = fileResults.some(r => r.confidence === 0)
        setSubtitleFiles(prev => prev.map(f =>
          f.id === file.id
            ? {
                ...f,
                generationStatus: hasFailures ? 'failed' as GenerationStatus : 'completed' as GenerationStatus,
                generationProgress: 100,
                generatedCount: file.episodes.length
              }
            : f
        ))
      }

      // 计算总体统计
      const allResultsFlat = Object.values(allResults).flat()
      const totalGenerated = allResultsFlat.length
      const successfulGenerated = allResultsFlat.filter(r => r.confidence > 0).length
      const failedGenerated = totalGenerated - successfulGenerated
      
      console.log(`批量生成完成: 总计 ${totalGenerated} 个，成功 ${successfulGenerated} 个，失败 ${failedGenerated} 个`)
      
      // 生成完成后，自动选择合适的文件显示结果
      if (validFiles.length > 0) {
        if (!selectedFile) {
          // 如果没有选中文件，选择第一个文件
          setSelectedFile(validFiles[0])
        } else {
          // 如果当前选中的文件没有生成结果，选择第一个有结果的文件
          const currentFileResults = allResults[selectedFile.id] || []
          if (currentFileResults.length === 0) {
            const firstFileWithResults = validFiles.find(file => (allResults[file.id] || []).length > 0)
            if (firstFileWithResults) {
              setSelectedFile(firstFileWithResults)
            }
          }
        }
      }

      toast({
        title: "批量生成完成",
        description: `总计生成 ${totalGenerated} 个简介，成功 ${successfulGenerated} 个`,
      })
    } catch (error) {
      console.error('批量生成失败:', error)
      // 检查是否是余额不足错误
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
        // 不显示额外的错误提示
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

  // 内容增强功能
  const handleEnhanceContent = useCallback(async (fileId: string, resultIndex: number, operation: EnhanceOperation, selectedTextInfo?: {text: string, start: number, end: number}) => {
    const results = generationResults[fileId] || []
    const result = results[resultIndex]
    if (!result) return

    try {
      // 获取操作配置
      const getOperationConfig = (operation: EnhanceOperation) => {
        switch (operation) {
          case 'polish':
            return { temperature: 0.6, maxTokens: 1000 } // 需要更精确的控制
          case 'shorten':
            return { temperature: 0.4, maxTokens: 600 } // 需要更简洁的输出
          case 'expand':
            return { temperature: 0.8, maxTokens: 1200 } // 需要更多创造性
          case 'rewrite':
            return { temperature: 0.7, maxTokens: 1000 } // 平衡创造性和准确性
          case 'proofread':
            return { temperature: 0.3, maxTokens: 1000 } // 需要精确的语法纠正
          default:
            return { temperature: 0.7, maxTokens: 800 }
        }
      }

      const operationConfig = getOperationConfig(operation)
      const enhancedContent = await enhanceContent(result, operation, operationConfig, selectedTextInfo)

      // 如果是改写操作且有选中文字信息，进行部分替换
      if (operation === 'rewrite' && selectedTextInfo) {
        const originalSummary = result.generatedSummary
        const newSummary = originalSummary.substring(0, selectedTextInfo.start) +
                          enhancedContent +
                          originalSummary.substring(selectedTextInfo.end)

        // 更新结果
        setGenerationResults(prev => {
          const fileResults = prev[fileId] || []
          const newResults = [...fileResults]
          if (newResults[resultIndex]) {
            newResults[resultIndex] = { ...newResults[resultIndex], generatedSummary: newSummary, wordCount: newSummary.length }
          }
          return { ...prev, [fileId]: newResults }
        })
      } else {
        // 原有的增强逻辑
        const lines = enhancedContent.split('\n').filter((line: string) => line.trim())
        let enhancedTitle = result.generatedTitle
        let enhancedSummary = enhancedContent

        // 尝试解析标题和简介
        if (lines.length >= 2) {
          const titleMatch = lines[0].match(/^(?:标题[:：]?\s*)?(.+)$/)
          if (titleMatch) {
            enhancedTitle = titleMatch[1].trim()
            enhancedSummary = lines.slice(1).join('\n').replace(/^(?:简介[:：]?\s*)?/, '').trim()
          }
        }

        // 更新结果
        setGenerationResults(prev => {
          const fileResults = prev[fileId] || []
          const newResults = [...fileResults]
          if (newResults[resultIndex]) {
            newResults[resultIndex] = { ...newResults[resultIndex], generatedTitle: enhancedTitle, generatedSummary: enhancedSummary, wordCount: enhancedSummary.length }
          }
          return { ...prev, [fileId]: newResults }
        })
      }

    } catch (error) {
      console.error(`${getOperationName(operation)}失败:`, error)
      // 检查是否是余额不足错误
      if (isInsufficientBalanceError(error)) {
        setShowInsufficientBalanceDialog(true)
        return // 直接返回，不显示错误提示
      } else {
        alert(`${getOperationName(operation)}失败：${error instanceof Error ? error.message : '未知错误'}`)
      }
    }

    function getOperationName(operation: EnhanceOperation) {
      switch (operation) {
        case 'polish': return '润色'
        case 'shorten': return '缩写'
        case 'expand': return '扩写'
        case 'rewrite': return '改写'
        case 'proofread': return '纠错'
        default: return '处理'
      }
    }
  }, [generationResults, enhanceContent])

  // 更新生成结果的函数
  const handleUpdateResult = useCallback((fileId: string, resultIndex: number, updatedResult: Partial<any>) => {
    setGenerationResults(prev => {
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
    setGenerationResults(prev => {
      const fileResults = prev[fileId] || []
      if (resultIndex <= 0 || resultIndex >= fileResults.length) return prev

      const newResults = [...fileResults]
      const [movedItem] = newResults.splice(resultIndex, 1)
      newResults.unshift(movedItem)

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
      console.error('导出失败:', error)
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
    handleBatchExportToTMDB
  }
}