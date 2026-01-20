import { useCallback } from 'react'
import { useScenarioModels } from '@/shared/lib/hooks/useScenarioModels'
import { GenerationConfig } from '../types'
import { GENERATION_STYLES } from '../constants'
import { buildPromptForStyle, parseGeneratedContent } from '../utils'

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

  // 调用API生成内容（为单个风格生成）
  const generateEpisodeContentForStyle = useCallback(async (episode: any, styleId: string): Promise<ApiCallResult> => {
    const prompt = buildPromptForStyle(episode, config, styleId)

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
        console.error('API错误原始响应:', responseText.substring(0, 500))

        // 检查是否是HTML响应
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          errorMessage = 'API端点返回错误页面，请检查API密钥配置'
          console.error('收到HTML响应:', responseText.substring(0, 200))
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
            console.error('解析API错误响应失败:', parseError)
            errorMessage = `API返回非JSON响应: ${responseText.substring(0, 100)}`
          }

          // 根据错误类型提供更友好的提示
          if (response.status === 401) {
            errorMessage = 'API密钥无效，请检查配置'
          } else if (response.status === 429) {
            // 检查是否是配额超限错误
            const isQuotaExceededError = (error: any): boolean => {
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

            if (isQuotaExceededError(errorData) || isQuotaExceededError(responseText)) {
              // 获取风格名称
              const style = styleId ? GENERATION_STYLES.find(s => s.id === styleId) : null
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

            if (isInsufficientBalanceError(errorData) || isInsufficientBalanceError(responseText)) {
              // 获取风格名称
              const style = styleId ? GENERATION_STYLES.find(s => s.id === styleId) : null
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
        console.error('处理API错误响应失败:', e)
        errorMessage = `网络错误或响应格式异常: ${e.message}`
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    
    if (!result.success) {
      console.error('API返回失败结果:', result)
      throw new Error(result.error || 'API调用失败')
    }

    const content = result.data.content

    if (!content) {
      console.error('API返回内容为空')
      throw new Error('API返回内容为空，请重试')
    }

    // 解析生成的内容
    const parsedResult = parseGeneratedContent(content, episode, config, styleId)
    
    // 如果生成的简介太短，标记为低置信度
    if (parsedResult.generatedSummary.length < 30) {
      console.warn(`生成的简介太短(${parsedResult.generatedSummary.length}字)，建议重新生成`)
      parsedResult.confidence = Math.min(parsedResult.confidence, 0.3)
    }

    return parsedResult
  }, [config, scenarioModels.availableModels])

  // 内容增强API调用
  const enhanceContent = useCallback(async (
    content: any,
    operation: string,
    operationConfig: { temperature: number; maxTokens: number },
    selectedTextInfo?: {text: string, start: number, end: number}
  ) => {
    let prompt: string
    let systemContent: string

    // 如果是改写操作且有选中文字信息，使用特殊的处理逻辑
    if (operation === 'rewrite' && selectedTextInfo) {
      console.log('执行改写操作，选中文字:', selectedTextInfo.text)
      prompt = `请对以下文字进行改写，保持原意但使用不同的表达方式：

【需要改写的文字】
${selectedTextInfo.text}

【改写要求】
1. 保持原文的核心意思和信息
2. 使用不同的词汇和句式表达
3. 让表达更加生动自然
4. 保持与上下文的连贯性
5. 字数与原文相近

请直接输出改写后的文字，不要包含其他说明：`

      systemContent = "你是一位专业的文字编辑专家，擅长改写和优化文字表达。请严格按照用户要求进行改写，保持原意的同时提升表达质量。"
    } else {
      // 使用原有的增强逻辑
      const buildEnhancePrompt = (result: any, operation: string): string => {
        const currentTitle = result.generatedTitle
        const currentSummary = result.generatedSummary

        switch (operation) {
          case 'polish':
            return `请对以下影视剧集标题和简介进行专业润色，提升内容的吸引力和表达质量：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【润色要求】
1. **词汇升级**：将平淡词汇替换为更生动、更有感染力的表达
2. **句式优化**：调整句子结构，增强节奏感和可读性
3. **情感渲染**：适度增强情感色彩，但不夸张造作
4. **保持原意**：核心情节和信息点必须完全保留
5. **长度控制**：标题15字内，简介120-200字为佳

【参考标准】
- 标题要有冲击力，能瞬间抓住观众注意力
- 简介要有画面感，让读者产生观看欲望
- 语言要精练有力，避免冗余表达

请严格按照以下格式输出：
标题：[润色后的标题]
简介：[润色后的简介]`

          case 'shorten':
            return `请将以下影视剧集标题和简介进行专业精简，提炼出最核心的信息：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【精简策略】
1. **核心提取**：识别并保留最关键的情节转折点和冲突
2. **信息优先级**：主要人物关系 > 核心冲突 > 情节发展 > 背景信息
3. **删除冗余**：去除修饰性词汇、重复表达和次要细节
4. **保持吸引力**：即使精简也要保持悬念和观看欲望
5. **严格控制**：标题10字内，简介60-80字

【质量标准】
- 每个字都有存在价值，不能再删减
- 读完后能清楚了解本集的核心看点
- 保持原有的情感基调和类型特色

请严格按照以下格式输出：
标题：[精简后的标题]
简介：[精简后的简介]`

          case 'expand':
            return `请将以下影视剧集标题和简介进行专业扩写，丰富内容层次和细节描述：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【扩写方向】
1. **情节深化**：补充关键情节的前因后果，增加转折细节
2. **人物刻画**：丰富主要角色的动机、情感状态和关系变化
3. **环境渲染**：适度增加场景描述，营造氛围感
4. **悬念构建**：通过细节暗示增强观众的期待感
5. **情感层次**：深化角色间的情感冲突和内心戏

【扩写原则】
- 所有新增内容必须符合剧情逻辑
- 保持原有的节奏感，不拖沓冗长
- 增强画面感和代入感
- 标题可适度调整以匹配扩写内容
- 简介控制在200-300字

请严格按照以下格式输出：
标题：[扩写后的标题]
简介：[扩写后的简介]`

          case 'proofread':
            return `请对以下影视剧集标题和简介进行语法纠错和语句优化，使其更加通顺流畅：

【原始内容】
标题：${currentTitle}
简介：${currentSummary}

【纠错优化要求】
1. **语法纠正**：修正语法错误、标点符号使用不当等问题
2. **语句通顺**：优化句式结构，使表达更加流畅自然
3. **用词准确**：选择更准确、恰当的词汇表达
4. **逻辑清晰**：确保句子间逻辑关系清楚，表达连贯
5. **风格统一**：保持整体语言风格的一致性

【纠错原则】
- 保持原意不变，只优化表达方式
- 修正明显的语法和用词错误
- 提升语言的准确性和流畅度
- 保持内容的完整性和可读性
- 适合正式的影视介绍场合

【注意事项】
- 不改变核心内容和信息量
- 保持原有的语言风格特色
- 确保修改后的内容更加专业和准确

请严格按照以下格式输出：
标题：[纠错后的标题]
简介：[纠错后的简介]`

          default:
            return currentSummary
        }
      }

      prompt = buildEnhancePrompt(content, operation)
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