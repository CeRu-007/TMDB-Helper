/**
 * 硬字幕OCR识别模块
 * 使用模型服务的多模态视觉模型进行字幕识别
 */

// ============ 模型轮换器 ============

/**
 * 模型轮换器 - 轮换使用多个模型避免触发速率限制
 */
class ModelRotator {
  private models: string[] = []
  private currentIndex = 0

  constructor(models: string[]) {
    this.models = models
    this.currentIndex = 0
  }

  /**
   * 获取下一个模型
   */
  getNext(): string {
    if (this.models.length === 0) {
      throw new Error('没有可用的模型')
    }

    const model = this.models[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.models.length
    return model
  }

  /**
   * 更新模型列表
   */
  updateModels(models: string[]): void {
    this.models = models
    this.currentIndex = 0
  }

  /**
   * 获取可用模型数量
   */
  getCount(): number {
    return this.models.length
  }
}

// 全局模型轮换器
let globalModelRotator: ModelRotator | null = null

export interface OCRRequest {
  /** 图像数据 (base64 或 URL) */
  image: string
  /** 字幕区域边界框 (百分比) */
  region?: {
    x: number
    y: number
    width: number
    height: number
  }
  /** 时间戳 (秒) */
  timestamp: number
}

export interface OCRBatchRequest {
  /** 拼接后的图像数据 */
  image: string
  /** 各帧的时间戳列表 */
  timestamps: number[]
  /** 各帧对应的语音段 */
  segments?: any[]
}

export interface OCRResult {
  /** 识别到的文本 */
  text: string
  /** 置信度 (0-1) */
  confidence: number
  /** 时间戳 (秒) */
  timestamp: number
  /** 原始响应 */
  rawResponse?: string
}

export interface SubtitleOCRConfig {
  /** 场景类型 */
  scenarioType: 'subtitle_ocr'
  /** 温度参数 */
  temperature?: number
  /** 最大 token 数 */
  maxTokens?: number
  /** 超时时间 (毫秒) */
  timeout?: number
}

/**
 * 字幕OCR识别器
 * 调用模型服务的多模态视觉模型识别字幕
 */
export class SubtitleOCR {
  private config: SubtitleOCRConfig

  constructor(config?: Partial<SubtitleOCRConfig>) {
    this.config = {
      scenarioType: config?.scenarioType ?? 'subtitle_ocr',
      temperature: config?.temperature ?? 0.1,
      maxTokens: config?.maxTokens ?? 500,
      timeout: config?.timeout ?? 30000
    }
  }

  /**
   * 识别单帧图像中的字幕
   * 使用模型轮换机制避免触发速率限制
   */
  async recognize(request: OCRRequest): Promise<OCRResult> {
    const modelServiceData = await this.getModelConfig()

    if (!modelServiceData.success || !modelServiceData.scenario?.primaryModelId) {
      throw new Error('OCR模型未配置，请在模型服务-使用场景中配置字幕OCR模型')
    }

    const { apiBaseUrl, apiKey, primaryModelId, backupModels } = this.extractModelInfo(modelServiceData)

    // 初始化或更新模型轮换器
    const allModels = [primaryModelId, ...(backupModels || [])]
    console.log(`[OCR] 模型轮换器初始化，共 ${allModels.length} 个模型:`, allModels)

    if (!globalModelRotator || globalModelRotator.getCount() !== allModels.length) {
      globalModelRotator = new ModelRotator(allModels)
      console.log(`[OCR] 创建新的模型轮换器`)
    }

    // 轮换使用模型
    const currentModelId = globalModelRotator.getNext()
    console.log(`[OCR] 使用模型: ${currentModelId}`)

    // 构建提示词
    const prompt = this.buildOCRPrompt(request.region)

    // 构建消息
    const messages = this.buildMessages(request.image, prompt)

    // 调用模型API（不重试，失败即抛出）
    const response = await this.callModelAPI(apiBaseUrl, apiKey, currentModelId, messages)

    // 解析结果
    const result = this.parseOCRResult(response)

    return {
      text: result.text,
      confidence: result.confidence,
      timestamp: request.timestamp,
      rawResponse: response.choices?.[0]?.message?.content
    }
  }

  /**
   * 批量识别多帧图像（拼接图片版本）
   * 将多张图片拼接成一张，一次性识别所有字幕
   */
  async recognizeBatch(request: OCRBatchRequest): Promise<OCRResult[]> {
    const modelServiceData = await this.getModelConfig()

    if (!modelServiceData.success || !modelServiceData.scenario?.primaryModelId) {
      throw new Error('OCR模型未配置，请在模型服务-使用场景中配置字幕OCR模型')
    }

    const { apiBaseUrl, apiKey, primaryModelId, backupModels } = this.extractModelInfo(modelServiceData)

    // 初始化或更新模型轮换器
    const allModels = [primaryModelId, ...(backupModels || [])]
    console.log(`[OCR] 批量识别，共 ${request.timestamps.length} 帧，使用 ${allModels.length} 个模型`)

    if (!globalModelRotator || globalModelRotator.getCount() !== allModels.length) {
      globalModelRotator = new ModelRotator(allModels)
    }

    // 轮换使用模型
    const currentModelId = globalModelRotator.getNext()
    console.log(`[OCR] 批量识别使用模型: ${currentModelId}`)

    // 构建批量识别的提示词
    const prompt = this.buildBatchOCRPrompt(request.timestamps.length)

    // 构建消息
    const messages = this.buildMessages(request.image, prompt)

    // 调用模型API
    const response = await this.callModelAPI(apiBaseUrl, apiKey, currentModelId, messages)

    // 解析结果
    const allText = response.choices?.[0]?.message?.content || ''

    // 按行分割文本，分配给各个时间戳
    const lines = allText.split('\n').filter(line => line.trim().length > 0)

    const results: OCRResult[] = []
    for (let i = 0; i < request.timestamps.length; i++) {
      const text = lines[i] || ''
      const confidence = text && !text.includes('[无法识别]') ? 0.9 : 0.1

      results.push({
        text: text.replace(/^\d+[\.\)]\s*/, ''), // 移除序号前缀
        confidence,
        timestamp: request.timestamps[i]
      })
    }

    return results
  }

  /**
   * 构建批量识别的 OCR 提示词
   */
  private buildBatchOCRPrompt(frameCount: number): string {
    return `请识别这张图片中的所有字幕文本。图片包含 ${frameCount} 个视频帧的字幕，按从上到下的顺序排列。

要求：
1. 逐行识别每个帧的字幕文本
2. 每行只返回该帧的字幕内容，不要包含序号
3. 如果某帧无法识别或图片不清晰，请返回 "[无法识别]"
4. 保持每行文本的原始顺序（从上到下）
5. 只返回字幕文本，每行一个字幕，不要包含其他说明

返回格式示例：
第一句字幕内容
第二句字幕内容
[无法识别]
第四句字幕内容`
  }

  /**
   * 批量识别多帧图像
   * 完全串行处理，等每个请求返回后再继续
   */
  async recognizeBatchOriginal(requests: OCRRequest[]): Promise<OCRResult[]> {
    // 串行处理，每个请求都会等待前一个请求返回
    const results: OCRResult[] = []

    for (let i = 0; i < requests.length; i++) {
      try {
        const result = await this.recognize(requests[i])
        results.push(result)
      } catch (err: any) {
        results.push({
          text: '',
          confidence: 0,
          timestamp: requests[i].timestamp,
          rawResponse: `Error: ${err.message}`
        })
      }
    }

    return results
  }

  /**
   * 获取模型服务配置
   */
  private async getModelConfig() {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(
      `${baseUrl}/api/model-service/scenario?scenario=${this.config.scenarioType}`
    )

    if (!response.ok) {
      throw new Error('获取模型服务配置失败')
    }

    return response.json()
  }

  /**
   * 提取模型信息（包含备用模型）
   */
  private extractModelInfo(data: any) {
    const primaryModelId = data.scenario.primaryModelId
    const primaryModel = data.models.find((m: any) => m.id === primaryModelId)

    if (!primaryModel) {
      throw new Error('配置的OCR模型不存在')
    }

    const provider = data.providers.find((p: any) => p.id === primaryModel.providerId)

    if (!provider?.apiKey) {
      throw new Error('OCR模型提供商未配置API密钥')
    }

    // 获取所有可用的备用模型（从场景配置的模型中，排除主模型）
    const backupModels = data.models
      .filter((m: any) => m.id !== primaryModelId)
      .map((m: any) => m.modelId || m.id)

    console.log(`[OCR] 可用模型列表:`, [primaryModel.modelId || primaryModel.id, ...backupModels])

    return {
      apiBaseUrl: provider.apiBaseUrl,
      apiKey: provider.apiKey,
      primaryModelId: primaryModel.modelId || primaryModel.id,
      backupModels
    }
  }

  /**
   * 构建OCR提示词
   */
  private buildOCRPrompt(region?: OCRRequest['region']): string {
    let prompt = `请识别图片中的字幕文本，只返回识别到的文字内容，不要包含任何解释或额外说明。

要求：
1. 精确识别每个字符，包括标点符号
2. 如果是中文，使用中文标点；如果是英文，使用英文标点
3. 如果无法识别或图片不清晰，请返回 "[无法识别]"
4. 只返回字幕原文，不要包含时间信息或序号`

    if (region) {
      prompt += `\n\n注意：字幕位于图片的左上${Math.round(region.y)}%到右下${Math.round(region.y + region.height)}%区域。`
    }

    return prompt
  }

  /**
   * 构建API消息
   */
  private buildMessages(image: string, prompt: string) {
    let imageContent: any

    if (image.startsWith('data:')) {
      imageContent = {
        type: 'image_url',
        image_url: { url: image }
      }
    } else {
      imageContent = {
        type: 'image_url',
        image_url: { url: image }
      }
    }

    return [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        imageContent
      ]
    }]
  }

  /**
   * 调用模型API（简单直接，不重试）
   */
  private async callModelAPI(
    apiBaseUrl: string,
    apiKey: string,
    modelId: string,
    messages: any[]
  ): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API调用失败: ${response.status} ${errorText}`)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * 解析OCR结果
   */
  private parseOCRResult(response: any): { text: string; confidence: number } {
    const content = response.choices?.[0]?.message?.content || ''

    // 清理结果
    const text = content
      .trim()
      .replace(/^["']|["']$/g, '') // 移除首尾引号
      .replace(/^(OCR识别结果|识别结果|字幕|Text)[:：]\s*/i, '') // 移除前缀
      .trim()

    // 估算置信度
    let confidence = 0.9

    // 根据内容特征调整置信度
    if (text.includes('[无法识别]') || text.includes('无法识别')) {
      confidence = 0.1
    } else if (text.length < 2) {
      confidence = 0.3
    } else if (text.length > 100) {
      // 长文本可能有错误
      confidence = 0.7
    }

    // 检查是否包含常见错误模式
    const errorPatterns = [/[oO0]{5,}/, /[iIl1]{10,}/, /[\?\。]{3,}/]
    for (const pattern of errorPatterns) {
      if (pattern.test(text)) {
        confidence = Math.max(0.3, confidence - 0.2)
      }
    }

    return { text, confidence }
  }
}

/**
 * 从视频帧中裁剪字幕区域
 */
export function cropSubtitleRegion(
  imageData: string,
  region: { x: number; y: number; width: number; height: number }
): string {
  // 这是一个简化版本，实际应该使用 canvas 或图像处理库
  // 这里假设传入的是 base64 格式的图片

  // 注意：实际实现需要在前端使用 canvas 或在后端使用 sharp/imageMagick
  // 这里只返回原始图像，区域裁剪由后端处理

  return imageData
}

/**
 * 批量处理帧并合并相邻字幕
 */
export function mergeAdjacentSubtitles(
  results: OCRResult[],
  mergeThreshold: number = 2.0
): OCRResult[] {
  if (results.length === 0) return []

  // 按时间排序
  const sorted = [...results].sort((a, b) => a.timestamp - b.timestamp)

  const merged: OCRResult[] = []
  let current: OCRResult | null = null

  for (const result of sorted) {
    if (!result.text || result.text.includes('[无法识别]')) {
      continue
    }

    if (current) {
      // 检查是否应该合并
      const timeDiff = result.timestamp - (current.timestamp + estimateDuration(current.text))

      if (timeDiff < mergeThreshold) {
        // 合并文本
        current.text = `${current.text} ${result.text}`
        current.confidence = (current.confidence + result.confidence) / 2
      } else {
        merged.push(current)
        current = result
      }
    } else {
      current = result
    }
  }

  if (current) {
    merged.push(current)
  }

  return merged
}

/**
 * 根据文本内容估算持续时间
 */
function estimateDuration(text: string): number {
  // 简单估算：每5个字符约1秒
  return Math.max(1, text.length / 5)
}
