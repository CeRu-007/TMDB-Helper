/**
 * 硅基流动 API 集成模块
 * 用于视频帧内容分析：字幕检测、人物检测等
 */

import { logger } from '@/lib/utils/logger'

export interface SiliconFlowConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface FrameAnalysisResult {
  hasSubtitles: boolean;
  hasPeople: boolean;
  confidence: number;
  description?: string;
  subtitleText?: string;
  peopleCount?: number;
  error?: string;
  // 新增字幕详情
  subtitleDetails?: {
    position: 'bottom' | 'top' | 'middle' | 'none';
    textColor: 'white' | 'yellow' | 'other' | 'none';
    hasBackground: boolean;
    estimatedLines: number;
  };
}

export class SiliconFlowAPI {
  private config: SiliconFlowConfig;

  constructor(config: SiliconFlowConfig) {
    this.config = {
      baseUrl: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen2.5-VL-32B-Instruct',
      ...config
    };
  }

  /**
   * 将 ImageData 转换为 base64 格式
   */
  private imageDataToBase64(imageData: ImageData): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建 Canvas 上下文');
      }

      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);

      // 使用JPEG格式，质量0.9，确保兼容性
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      return dataUrl;
    } catch (error) {
      
      throw new Error(`图像转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成优化的字幕检测prompt
   */
  private generateOptimizedPrompt(): string {
    return `请仔细分析这张视频帧图片，重点关注字幕检测：

🎯 字幕检测要求：
1. 检查图片底部、顶部或中间是否有文字内容
2. 字幕通常特征：
   - 位置：多在画面下方1/4区域或上方
   - 颜色：白色、黄色文字，常有黑色或半透明背景
   - 字体：较大、清晰的字体，通常为宋体或黑体
   - 排列：水平排列，可能有多行
   - 内容：对话、旁白、说明文字等

3. 需要区分的内容：
   - ✅ 字幕：对话字幕、解说字幕、翻译字幕
   - ❌ 非字幕：UI界面、标题、水印、时间戳、频道logo

👥 人物检测要求：
1. 检查是否有人物出现（真人、动画人物、卡通角色）
2. 包括：面部、身体、人物轮廓
3. 不包括：纯风景、物品、建筑

📊 请严格按照以下JSON格式回答：
{
  "hasSubtitles": boolean,
  "hasPeople": boolean,
  "confidence": number,
  "subtitleDetails": {
    "position": "bottom|top|middle|none",
    "textColor": "white|yellow|other|none",
    "hasBackground": boolean,
    "estimatedLines": number
  },
  "description": "简短描述画面内容"
}

⚠️ 注意：字幕检测要求非常严格，只有确认是对话或解说字幕才标记为true。`;
  }

  /**
   * 增强的文本分析回退方法
   */
  private parseTextAnalysis(content: string): FrameAnalysisResult {
    const lowerContent = content.toLowerCase();

    // 🔧 更精确的字幕检测关键词
    const subtitleKeywords = [
      '字幕', '对话', '说话', '文字', '文本',
      'subtitle', 'caption', 'text', 'dialogue',
      '底部文字', '下方文字', '翻译', '解说'
    ];

    const noSubtitleKeywords = [
      '没有字幕', '无字幕', '无文字', '纯画面',
      'no subtitle', 'no text', 'no caption',
      '干净', '清洁', '无文本'
    ];

    // 人物检测关键词
    const peopleKeywords = [
      '人物', '人', '男', '女', '角色', '演员',
      'person', 'people', 'human', 'character',
      '面部', '脸', '身体', '人像'
    ];

    const noPeopleKeywords = [
      '没有人', '无人', '风景', '景色', '物品',
      'no person', 'no people', 'landscape',
      '建筑', '动物', '植物'
    ];

    // 计算字幕检测结果
    let hasSubtitles = false;
    let subtitleConfidence = 0;

    for (const keyword of subtitleKeywords) {
      if (lowerContent.includes(keyword)) {
        hasSubtitles = true;
        subtitleConfidence += 0.3;
      }
    }

    for (const keyword of noSubtitleKeywords) {
      if (lowerContent.includes(keyword)) {
        hasSubtitles = false;
        subtitleConfidence = Math.max(0, subtitleConfidence - 0.5);
      }
    }

    // 计算人物检测结果
    let hasPeople = false;
    let peopleConfidence = 0;

    for (const keyword of peopleKeywords) {
      if (lowerContent.includes(keyword)) {
        hasPeople = true;
        peopleConfidence += 0.3;
      }
    }

    for (const keyword of noPeopleKeywords) {
      if (lowerContent.includes(keyword)) {
        hasPeople = false;
        peopleConfidence = Math.max(0, peopleConfidence - 0.5);
      }
    }

    const confidence = Math.min(1, Math.max(0.3, (subtitleConfidence + peopleConfidence) / 2));

    return {
      hasSubtitles,
      hasPeople,
      confidence,
      description: content.substring(0, 100),
      subtitleDetails: hasSubtitles ? {
        position: 'bottom', // 默认假设底部
        textColor: 'white', // 默认白色
        hasBackground: true, // 默认有背景
        estimatedLines: 1 // 默认1行
      } : undefined
    };
  }

  /**
   * 分析视频帧内容
   */
  async analyzeFrame(imageData: ImageData): Promise<FrameAnalysisResult> {
    try {
      const base64Image = this.imageDataToBase64(imageData);

      // 构建请求体
      const requestBody = {
        model: this.config.model,
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            },
            {
              type: "text",
              text: this.generateOptimizedPrompt()
            }
          ]
        }],
        temperature: 0.1,
        max_tokens: 500
      };

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        throw new Error(`API 请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        
        throw new Error('API 返回格式错误');
      }

      const content = result.choices[0].message.content;
      
      // 尝试解析JSON，如果失败则提供默认值
      let analysisResult: FrameAnalysisResult;
      try {
        analysisResult = JSON.parse(content) as FrameAnalysisResult;
      } catch (parseError) {
        
        // 🔧 增强的文本分析作为回退
        analysisResult = this.parseTextAnalysis(content);
      }

      // 验证返回结果的完整性
      if (typeof analysisResult.hasSubtitles !== 'boolean') {
        analysisResult.hasSubtitles = false;
      }
      if (typeof analysisResult.hasPeople !== 'boolean') {
        analysisResult.hasPeople = false;
      }
      if (typeof analysisResult.confidence !== 'number') {
        analysisResult.confidence = 0.5;
      }

      return analysisResult;

    } catch (error) {
      
      logger.error('错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        apiKey: this.config.apiKey ? `${this.config.apiKey.substring(0, 10)}...` : '未设置',
        model: this.config.model,
        baseUrl: this.config.baseUrl
      });

      // 返回错误结果，但不中断整个流程
      return {
        hasSubtitles: false,
        hasPeople: false,
        confidence: 0,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 使用多模型验证进行字幕检测（提高准确性）
   */
  async analyzeFrameWithMultiModel(imageData: ImageData): Promise<FrameAnalysisResult> {
    const models = [
      'Qwen/Qwen2.5-VL-32B-Instruct',
      'THUDM/GLM-4.1V-9B-Thinking'
    ];

    const results: FrameAnalysisResult[] = [];

    for (const model of models) {
      try {
        const originalModel = this.config.model;
        this.config.model = model;

        const result = await this.analyzeFrame(imageData);
        if (!result.error) {
          results.push(result);
        }

        this.config.model = originalModel;
      } catch (error) {
        
      }
    }

    if (results.length === 0) {
      throw new Error('所有模型分析都失败了');
    }

    // 🔧 多模型结果融合策略
    const hasSubtitlesVotes = results.filter(r => r.hasSubtitles).length;
    const hasPeopleVotes = results.filter(r => r.hasPeople).length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    // 字幕检测采用保守策略：多数模型认为有字幕才认为有字幕
    const finalHasSubtitles = hasSubtitlesVotes > results.length / 2;
    const finalHasPeople = hasPeopleVotes > results.length / 2;

    return {
      hasSubtitles: finalHasSubtitles,
      hasPeople: finalHasPeople,
      confidence: avgConfidence,
      description: results[0].description,
      subtitleDetails: finalHasSubtitles ? results.find(r => r.hasSubtitles)?.subtitleDetails : undefined
    };
  }

  /**
   * 批量分析多个帧（带并发控制）
   */
  async analyzeFramesBatch(
    frames: ImageData[],
    options: {
      maxConcurrent?: number;
      onProgress?: (completed: number, total: number) => void;
      useMultiModel?: boolean; // 新增多模型验证选项
    } = {}
  ): Promise<FrameAnalysisResult[]> {
    const { maxConcurrent = 3, onProgress, useMultiModel = false } = options;
    const results: FrameAnalysisResult[] = [];

    // 🔧 根据是否使用多模型验证选择分析方法
    const analyzeMethod = useMultiModel ?
      (frame: ImageData) => this.analyzeFrameWithMultiModel(frame) :
      (frame: ImageData) => this.analyzeFrame(frame);

    // 分批处理以控制并发
    const batchSize = useMultiModel ? Math.max(1, Math.floor(maxConcurrent / 2)) : maxConcurrent;

    for (let i = 0; i < frames.length; i += batchSize) {
      const batch = frames.slice(i, i + batchSize);
      const batchPromises = batch.map(frame => analyzeMethod(frame));

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (onProgress) {
        onProgress(results.length, frames.length);
      }
    }

    return results;
  }

  /**
   * 测试 API 连接
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      
      // 创建一个标准的测试图片
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建测试画布');
      }

      // 绘制一个有内容的测试图案
      ctx.fillStyle = '#4a90e2';
      ctx.fillRect(0, 0, 320, 240);

      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.fillText('Test Image', 100, 120);

      // 添加一些几何图形
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(160, 120, 30, 0, 2 * Math.PI);
      ctx.fill();

      const imageData = ctx.getImageData(0, 0, 320, 240);
      
      const result = await this.analyzeFrame(imageData);
      
      return {
        success: !result.error,
        error: result.error
      };
    } catch (error) {
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败'
      };
    }
  }
}

/**
 * 创建硅基流动 API 实例的工厂函数
 */
export function createSiliconFlowAPI(apiKey: string, options?: Partial<SiliconFlowConfig>): SiliconFlowAPI {
  return new SiliconFlowAPI({
    apiKey,
    ...options
  });
}

/**
 * 默认的 API 配置
 */
export const DEFAULT_SILICONFLOW_CONFIG = {
  baseUrl: 'https://api.siliconflow.cn/v1',
  model: 'Qwen/Qwen2.5-VL-32B-Instruct'
};
