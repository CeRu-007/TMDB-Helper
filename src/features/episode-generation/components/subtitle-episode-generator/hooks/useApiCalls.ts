import { useCallback } from 'react'
import { SubtitleEpisode, GenerationResult } from '../types'
import { useScenarioModels } from '@/lib/hooks/useScenarioModels'
import { GenerationConfig } from '../types'
import { buildPromptWithPlugin, parseResultWithPlugin, initializePluginSystem, buildEnhancePromptWithPlugin, parseEnhanceResultWithPlugin, getEnhanceOperationConfig, getAllSummaryStyles } from '@/features/episode-generation/plugins/plugin-service'
import { logger } from '@/lib/utils/logger'

export interface ApiCallResult {
  episodeNumber: number
  originalTitle?: string
  generatedTitle: string
  generatedSummary: string
  confidence: number
  wordCount: number
  generationTime: number
  model: string
  styles: string[]
  styleId?: string
  styleName?: string
  error?: string
}

export function useApiCalls(config: GenerationConfig) {
  const scenarioModels = useScenarioModels('episode_generation')

  // 初始化插件系统
  initializePluginSystem()

  // 调用API生成内容（为单个风格生成）
  const generateEpisodeContentForStyle = useCallback(async (episode: SubtitleEpisode, styleId: string): Promise<ApiCallResult> => {
    const prompt = buildPromptWithPlugin(episode, config, styleId)

    // 获取实际的模型ID
    const selectedModel = scenarioModels.availableModels.find(m => m.id === config.model)
    if (!selectedModel) {
      throw new Error('未找到选中的模型配置')
    }

    // 使用模型服务API端点
    const apiEndpoint = '/api/model-service/chat/completions'

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modelId: selectedModel.id, // 使用模型的内部ID
        messages: [
          {
            role: "system",
            content: "你是一个专业的影视内容编辑，擅长根据字幕内容生成精彩的分集标题和剧情简介。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: config.temperature,
        max_tokens: 800
      })
    })

    if (!response.ok) {
      let errorMessage = `API调用失败 (${response.status})`
      try {
        const responseText = await response.text()
        logger.error('API错误原始响应:', responseText.substring(0, 500))

        // 检查是否是HTML响应
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          errorMessage = 'API端点返回错误页面，请检查API密钥配置'
          logger.error('收到HTML响应:', responseText.substring(0, 200))
        } else {
          let errorData = null
          try {
            errorData = JSON.parse(responseText)
            
            // 尝试从不同的字段获取错误信息
            if (errorData.error) {
              errorMessage = errorData.error
            }
            
            // 如果有details字段，尝试解析其中的错误信息
            if (errorData.details) {
              try {
                const detailsData = JSON.parse(errorData.details)
                if (detailsData.errors && detailsData.errors.message) {
                  errorMessage = detailsData.errors.message
                }
              } catch (detailsParseError) {
                // 如果details不是JSON，直接使用
                if (typeof errorData.details === 'string') {
                  errorMessage = errorData.details
                }
              }
            }
          } catch (parseError) {
            logger.error('解析API错误响应失败:', parseError)
            errorMessage = `API返回非JSON响应: ${responseText.substring(0, 100)}`
          }

          // 根据错误类型提供更友好的提示
          if (response.status === 401) {
            errorMessage = 'API密钥无效，请检查配置'
          } else if (response.status === 429) {
            // 检查是否是配额超限错误
            const isQuotaExceededError = (error: { code?: string; message?: string }): boolean => {
              if (typeof error === 'string') {
                return error.includes('exceeded today\'s quota') ||
                       error.includes('quota exceeded') ||
                       error.includes('配额已用完') ||
                       error.includes('今日配额已用尽')
              }

              if (error && typeof error === 'object') {
                const errorStr = JSON.stringify(error).toLowerCase()
                const basicCheck = errorStr.includes('exceeded today\'s quota') ||
                                  errorStr.includes('quota exceeded') ||
                                  errorStr.includes('daily quota') ||
                                  errorStr.includes('rate limit')
                
                if (basicCheck) {
                  return true
                }
                
                // 检查嵌套在details字段中的错误
                if (error.details) {
                  if (typeof error.details === 'string') {
                    return error.details.toLowerCase().includes('exceeded today\'s quota') ||
                           error.details.toLowerCase().includes('quota exceeded')
                  }
                  
                  if (typeof error.details === 'object') {
                    const detailsStr = JSON.stringify(error.details).toLowerCase()
                    return detailsStr.includes('exceeded today\'s quota') ||
                           detailsStr.includes('quota exceeded')
                  }
                }
              }

              return false
            }

            const isInsufficientBalanceError = (error: { code?: string; message?: string }): boolean => {
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

            if (isQuotaExceededError(errorData) || isQuotaExceededError(responseText)) {
              // 获取风格名称
              const allStyles = getAllSummaryStyles()
              const style = styleId ? allStyles.find(s => s.id === styleId) : null
              const styleName = style?.name || ''
              
              // 返回一个特殊的结果，表示配额超限
              return {
                episodeNumber: episode.episodeNumber,
                originalTitle: episode.title || `第${episode.episodeNumber}集`,
                generatedTitle: `第${episode.episodeNumber}集`,
                generatedSummary: '今日API配额已用完，请明天再试',
                confidence: 0,
                wordCount: 0,
                generationTime: Date.now(),
                model: config.model,
                styles: styleId ? [styleId] : config.selectedStyles,
                styleId: styleId,
                styleName: styleName,
                error: 'QUOTA_EXCEEDED'
              }
            } else {
              errorMessage = 'API调用频率过高，请稍后重试'
            }
          } else if (response.status === 500) {
            errorMessage = '服务器内部错误，请稍后重试'
          } else if (response.status === 403) {
            // 检查是否是余额不足错误
            const isInsufficientBalanceError = (error: { code?: string; message?: string }): boolean => {
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

            if (isInsufficientBalanceError(errorData) || isInsufficientBalanceError(responseText)) {
              // 获取风格名称
              const allStyles = getAllSummaryStyles()
              const style = styleId ? allStyles.find(s => s.id === styleId) : null
              const styleName = style?.name || ''

              // 返回一个特殊的结果，表示余额不足
              return {
                episodeNumber: episode.episodeNumber,
                originalTitle: episode.title || `第${episode.episodeNumber}集`,
                generatedTitle: `第${episode.episodeNumber}集`,
                generatedSummary: '余额不足，无法生成内容',
                confidence: 0,
                wordCount: 0,
                generationTime: Date.now(),
                model: config.model,
                styles: styleId ? [styleId] : config.selectedStyles,
                styleId: styleId,
                styleName: styleName,
                error: 'INSUFFICIENT_BALANCE'
              }
            } else {
              errorMessage = '访问权限不足，请检查API密钥'
            }
          }
        }
      } catch (e) {
        logger.error('处理API错误响应失败:', e)
        errorMessage = `网络错误或响应格式异常: ${e.message}`
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    
    if (!result.success) {
      logger.error('API返回失败结果:', result)
      throw new Error(result.error || 'API调用失败')
    }

    const content = result.data.content

    if (!content) {
      logger.error('API返回内容为空')
      throw new Error('API返回内容为空，请重试')
    }

    // 使用插件解析生成的内容
    const parsedResult = parseResultWithPlugin(content, episode, config, styleId)
    
    // 如果生成的简介太短，标记为低置信度
    if (parsedResult.generatedSummary.length < 30) {
      logger.warn(`生成的简介太短(${parsedResult.generatedSummary.length}字)，建议重新生成`)
      parsedResult.confidence = Math.min(parsedResult.confidence, 0.3)
    }

    return parsedResult
  }, [config, scenarioModels.availableModels])

  // 内容增强API调用
  const enhanceContent = useCallback(async (
    content: string,
    operation: string,
    operationConfig: { temperature: number; maxTokens: number },
    selectedTextInfo?: {text: string, start: number, end: number}
  ) => {
    let prompt: string
    let systemContent: string

    // 如果是改写操作且有选中文字信息，使用特殊的处理逻辑
    if (operation === 'rewrite' && selectedTextInfo) {
      logger.info('执行改写操作，选中文字:', selectedTextInfo.text)
      prompt = buildEnhancePromptWithPlugin('', content, operation, selectedTextInfo.text)
      systemContent = "你是一位专业的文字编辑专家，擅长改写和优化文字表达。请严格按照用户要求进行改写，保持原意的同时提升表达质量。"
    } else {
      // 使用插件系统构建提示词
      const result = { generatedTitle: '', generatedSummary: content } as GenerationResult
      prompt = buildEnhancePromptWithPlugin(result.generatedTitle, result.generatedSummary, operation)
      systemContent = `你是一位资深的影视内容编辑专家，专门负责优化电视剧、电影等影视作品的分集标题和剧情简介。你具备以下专业能力：

1. **深度理解影视叙事**：熟悉各种影视类型的叙事特点和观众心理
2. **精准语言表达**：能够根据不同平台和受众调整语言风格
3. **内容质量把控**：确保每次优化都能显著提升内容的吸引力和专业度
4. **剧透控制能力**：精确掌握信息透露的分寸，平衡悬念与吸引力

请严格按照用户要求进行内容优化，确保输出格式规范、内容质量上乘。`
    }

    // 获取当前选中的模型
    const selectedModel = scenarioModels.availableModels.find(m => m.id === config.model)
    if (!selectedModel) {
      throw new Error('未找到选中的模型配置')
    }

    // 使用模型服务API端点
    const apiEndpoint = '/api/model-service/chat/completions'

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modelId: selectedModel.id,
        messages: [
          {
            role: "system",
            content: systemContent
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: operationConfig.temperature,
        max_tokens: operationConfig.maxTokens
      })
    })

    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || '生成失败')
    }

    return data.data.content.trim()
  }, [config, scenarioModels.availableModels])

  return {
    generateEpisodeContentForStyle,
    enhanceContent
  }
}