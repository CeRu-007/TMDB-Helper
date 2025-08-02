/**
 * 硅基流动多模态AI集成模块
 * 支持视觉语言模型和语音处理
 */

export interface SiliconFlowConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface VisualAnalysisOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  detail?: 'low' | 'high' | 'auto';
}

export interface AudioAnalysisOptions {
  model?: string;
  language?: string;
  format?: 'mp3' | 'wav' | 'opus' | 'pcm';
}

export interface FrameAnalysisResult {
  description: string;
  confidence: number;
  elements: {
    people?: string[];
    objects?: string[];
    scene?: string;
    emotions?: string[];
    actions?: string[];
  };
  timestamp?: number;
}

export interface AudioTranscriptionResult {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    confidence?: number;
  }>;
  language?: string;
  confidence: number;
}

export class SiliconFlowMultimodal {
  private config: SiliconFlowConfig;
  private defaultVisualModel = 'Qwen/Qwen2.5-VL-72B-Instruct';
  private defaultTextModel = 'deepseek-ai/DeepSeek-V2.5';

  constructor(config: SiliconFlowConfig) {
    this.config = {
      baseUrl: 'https://api.siliconflow.cn/v1',
      timeout: 60000,
      ...config
    };
  }

  /**
   * 分析单个视频帧
   */
  async analyzeFrame(
    imageBase64: string, 
    prompt?: string,
    options: VisualAnalysisOptions = {}
  ): Promise<FrameAnalysisResult> {
    const {
      model = this.defaultVisualModel,
      temperature = 0.7,
      maxTokens = 500,
      detail = 'high'
    } = options;

    const defaultPrompt = `请详细分析这个视频帧，包括：
1. 场景描述：环境、地点、时间等
2. 人物分析：人数、动作、表情、服装等
3. 物品识别：重要道具、物品等
4. 情感氛围：整体情绪、氛围感受
5. 动作事件：正在发生的动作或事件

请用JSON格式返回分析结果：
{
  "description": "整体描述",
  "scene": "场景描述",
  "people": ["人物1描述", "人物2描述"],
  "objects": ["物品1", "物品2"],
  "emotions": ["情感1", "情感2"],
  "actions": ["动作1", "动作2"],
  "confidence": 0.9
}`;

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail
                }
              },
              {
                type: 'text',
                text: prompt || defaultPrompt
              }
            ]
          }],
          temperature,
          max_tokens: maxTokens
        }),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`视觉分析API调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('API返回内容为空');
      }

      // 尝试解析JSON格式的响应
      try {
        const parsed = JSON.parse(content);
        return {
          description: parsed.description || content,
          confidence: parsed.confidence || 0.8,
          elements: {
            people: parsed.people || [],
            objects: parsed.objects || [],
            scene: parsed.scene,
            emotions: parsed.emotions || [],
            actions: parsed.actions || []
          }
        };
      } catch {
        // 如果不是JSON格式，直接使用文本内容
        return {
          description: content,
          confidence: 0.7,
          elements: {}
        };
      }
    } catch (error) {
      console.error('视频帧分析失败:', error);
      throw new Error(`视频帧分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量分析多个视频帧
   */
  async analyzeFrames(
    frames: Array<{ imageBase64: string; timestamp?: number }>,
    options: VisualAnalysisOptions = {}
  ): Promise<FrameAnalysisResult[]> {
    const results: FrameAnalysisResult[] = [];
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      try {
        const result = await this.analyzeFrame(frame.imageBase64, undefined, options);
        result.timestamp = frame.timestamp;
        results.push(result);
        
        // 避免API限流，添加延迟
        if (i < frames.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`分析第${i + 1}帧失败:`, error);
        results.push({
          description: '分析失败',
          confidence: 0,
          elements: {},
          timestamp: frame.timestamp
        });
      }
    }
    
    return results;
  }

  /**
   * 生成视频整体描述
   */
  async generateVideoSummary(
    frameAnalyses: FrameAnalysisResult[],
    audioTranscript?: string,
    options: { model?: string; temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const {
      model = this.defaultTextModel,
      temperature = 0.7,
      maxTokens = 800
    } = options;

    const frameDescriptions = frameAnalyses
      .filter(frame => frame.confidence > 0.5)
      .map((frame, index) => {
        const timestamp = frame.timestamp ? `[${Math.floor(frame.timestamp / 60)}:${(frame.timestamp % 60).toFixed(0).padStart(2, '0')}]` : `[帧${index + 1}]`;
        return `${timestamp} ${frame.description}`;
      })
      .join('\n');

    const prompt = `基于以下视频分析内容，生成一个精彩的分集简介：

视频画面分析：
${frameDescriptions}

${audioTranscript ? `音频内容：\n${audioTranscript}\n` : ''}

请生成一个120-200字的分集简介，要求：
1. 整合视觉和音频信息，突出主要情节
2. 语言生动有趣，吸引观众
3. 保持悬念，避免剧透结局
4. 体现本集的核心看点和情感冲突
5. 使用影视剧简介的专业表达方式`;

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: prompt
          }],
          temperature,
          max_tokens: maxTokens
        }),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`文本生成API调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '生成简介失败';
    } catch (error) {
      console.error('生成视频总结失败:', error);
      throw new Error(`生成视频总结失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 语音转文字（注意：硅基流动主要提供TTS，ASR需要其他服务）
   * 这里提供接口定义，实际实现可能需要集成其他语音识别服务
   */
  async transcribeAudio(
    audioBase64: string,
    options: AudioAnalysisOptions = {}
  ): Promise<AudioTranscriptionResult> {
    // 注意：硅基流动目前主要提供文本转语音(TTS)服务
    // 语音转文字(ASR)功能可能需要集成其他服务，如：
    // - 百度语音识别
    // - 腾讯云语音识别
    // - 阿里云语音识别
    // - OpenAI Whisper API
    
    console.warn('语音转文字功能需要集成专门的ASR服务');
    
    // 临时返回模拟结果
    return {
      text: '这是语音转文字的模拟结果。实际实现需要集成专门的语音识别服务。',
      segments: [{
        start: 0,
        end: 10,
        text: '这是语音转文字的模拟结果。',
        confidence: 0.5
      }],
      confidence: 0.5
    };
  }

  /**
   * 检测场景变化
   */
  async detectSceneChanges(
    frameAnalyses: FrameAnalysisResult[],
    threshold: number = 0.7
  ): Promise<number[]> {
    const sceneChanges: number[] = [];
    
    for (let i = 1; i < frameAnalyses.length; i++) {
      const prev = frameAnalyses[i - 1];
      const curr = frameAnalyses[i];
      
      // 简单的场景变化检测：比较场景描述的相似度
      if (prev.elements.scene && curr.elements.scene) {
        const similarity = this.calculateTextSimilarity(
          prev.elements.scene,
          curr.elements.scene
        );
        
        if (similarity < threshold) {
          sceneChanges.push(curr.timestamp || i);
        }
      }
    }
    
    return sceneChanges;
  }

  /**
   * 计算文本相似度（简单实现）
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(10000)
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 获取可用的视觉模型列表
   */
  async getAvailableVisionModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('获取模型列表失败');
      }
      
      const data = await response.json();
      const visionModels = data.data
        ?.filter((model: any) => 
          model.id.includes('VL') || 
          model.id.includes('vision') || 
          model.id.includes('Qwen2.5-VL') ||
          model.id.includes('deepseek-vl')
        )
        ?.map((model: any) => model.id) || [];
      
      return visionModels;
    } catch (error) {
      console.error('获取视觉模型列表失败:', error);
      return [this.defaultVisualModel];
    }
  }
}
