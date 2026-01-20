/**
 * ImageProcessor类 - 图像处理工具
 * 使用单例模式实现，确保整个应用中只有一个实例
 * 集成硅基流动AI模型进行智能帧分析
 */

import { log } from '@/shared/lib/utils/logger'
import { SiliconFlowAPI, FrameAnalysisResult, createSiliconFlowAPI } from '@/shared/lib/utils/siliconflow-api'
import type { SmartSelectionOptions } from './smart-frame-selector'

// 定义Worker类型
type ImageProcessingWorker = Worker;

export class ImageProcessor {
  private static instance: ImageProcessor | null = null;
  private worker: ImageProcessingWorker | null = null;
  private taskCallbacks: Map<string, (result: any) => void> = new Map();
  private initialized: boolean = false;
  private taskCounter: number = 0;
  private initializationPromise: Promise<void> | null = null;
  private maxRetries: number = 3;
  private siliconFlowAPI: SiliconFlowAPI | null = null;
  private aiAnalysisEnabled: boolean = false;
  private smartFrameSelector: any = null;

  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {}

  /**
   * 获取ImageProcessor单例实例
   */
  public static getInstance(): ImageProcessor {
    if (!ImageProcessor.instance) {
      ImageProcessor.instance = new ImageProcessor();
    }
    return ImageProcessor.instance;
  }

  /**
   * 初始化图像处理器
   * 创建Web Worker并设置消息处理程序
   */
  public async initialize(): Promise<void> {
    // 如果已经有初始化Promise，直接返回
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // 创建初始化Promise
    this.initializationPromise = new Promise<void>((resolve, reject) => {
      try {
        // 如果已经初始化，直接返回
        if (this.initialized && this.worker) {
          log.debug('ImageProcessor', '图像处理器已初始化，跳过');
          resolve();
          return;
        }
        
        log.info('ImageProcessor', '正在初始化图像处理器...');
        
        try {
          // 直接创建Worker，不使用Blob
          this.worker = new Worker(new URL('./image-processing-worker.ts', import.meta.url));
          
          // 设置消息处理程序
          this.worker.onmessage = (e: MessageEvent) => {
            const { taskId, error } = e.data;
            
            // 如果有任务ID，调用对应的回调
            if (taskId && this.taskCallbacks.has(taskId)) {
              const callback = this.taskCallbacks.get(taskId)!;
              this.taskCallbacks.delete(taskId);
              callback(e.data);
            } else if (error) {
              // 如果有错误但没有任务ID，通知所有等待的任务
              
              const callbacks = new Map(this.taskCallbacks); // 创建副本避免修改原始Map
              this.taskCallbacks.clear(); // 先清空回调列表
              
              // 然后调用回调
              callbacks.forEach((callback) => {
                callback({ error });
              });
            }
          };
          
          // 设置错误处理程序
          this.worker.onerror = (e: ErrorEvent) => {
            
            // 通知所有等待的任务
            const callbacks = new Map(this.taskCallbacks); // 创建副本避免修改原始Map
            this.taskCallbacks.clear(); // 先清空回调列表
            
            // 然后调用回调
            callbacks.forEach((callback) => {
              callback({ error: `Worker错误: ${e.message}` });
            });
            
            // 如果初始化过程中出错，拒绝Promise
            reject(new Error(`Worker错误: ${e.message}`));
            
            // 标记为未初始化
            this.initialized = false;
            this.worker = null;
          };
          
          // 发送测试消息以确保Worker正常工作
          const testTaskId = `test_${Date.now()}`;
          
          // 设置超时
          const timeoutId = setTimeout(() => {
            if (this.taskCallbacks.has(testTaskId)) {
              this.taskCallbacks.delete(testTaskId);
              reject(new Error('Worker初始化超时'));
              
              // 标记为未初始化
              this.initialized = false;
              if (this.worker) {
                this.worker.terminate();
                this.worker = null;
              }
            }
          }, 5000);
          
          // 注册测试回调
          this.taskCallbacks.set(testTaskId, (result) => {
            clearTimeout(timeoutId);
            
            if (result.error) {
              reject(new Error(`Worker初始化失败: ${result.error}`));
              
              // 标记为未初始化
              this.initialized = false;
              if (this.worker) {
                this.worker.terminate();
                this.worker = null;
              }
            } else {
              
              this.initialized = true;
              resolve();
            }
          });
          
          // 发送测试消息
          this.worker.postMessage({
            type: 'test',
            taskId: testTaskId,
            data: { test: true }
          });
        } catch (error) {
          
          reject(error);
          
          // 标记为未初始化
          this.initialized = false;
          this.worker = null;
          this.initializationPromise = null;
        }
      } catch (error) {
        
        reject(error);
        
        // 标记为未初始化
        this.initialized = false;
        this.worker = null;
        this.initializationPromise = null;
      }
    });
    
    return this.initializationPromise;
  }

  /**
   * 配置硅基流动API
   * @param apiKey API密钥
   * @param options 可选配置
   */
  public configureSiliconFlowAPI(apiKey: string, options?: { model?: string; baseUrl?: string }): void {
    try {
      this.siliconFlowAPI = createSiliconFlowAPI(apiKey, options);
      this.aiAnalysisEnabled = true;
      log.info('ImageProcessor', '硅基流动API配置成功');
    } catch (error) {
      log.error('ImageProcessor', '硅基流动API配置失败:', error);
      this.aiAnalysisEnabled = false;
    }
  }

  /**
   * 禁用AI分析
   */
  public disableAIAnalysis(): void {
    this.aiAnalysisEnabled = false;
    this.siliconFlowAPI = null;
    log.info('ImageProcessor', 'AI分析已禁用');
  }

  /**
   * 检查AI分析是否可用
   */
  public isAIAnalysisEnabled(): boolean {
    return this.aiAnalysisEnabled && this.siliconFlowAPI !== null;
  }

  /**
   * 测试硅基流动API连接
   */
  public async testSiliconFlowConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.siliconFlowAPI) {
      return { success: false, error: '硅基流动API未配置' };
    }

    try {
      return await this.siliconFlowAPI.testConnection();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败'
      };
    }
  }

  /**
   * 智能关键帧检测 - 生成最优时间点
   */
  private async detectKeyFrameTimePoints(
    video: HTMLVideoElement,
    startTime: number,
    duration: number,
    frameCount: number
  ): Promise<number[]> {
    
    // 基于视频长度的智能采样策略
    const timePoints: number[] = [];

    if (duration <= 30) {
      // 短视频：均匀分布 + 小随机偏移
      const step = duration / (frameCount + 1);
      for (let i = 1; i <= frameCount; i++) {
        const baseTime = startTime + i * step;
        const randomOffset = (Math.random() - 0.5) * Math.min(step * 0.3, 2);
        timePoints.push(Math.max(startTime + 1, Math.min(startTime + duration - 1, baseTime + randomOffset)));
      }
    } else if (duration <= 300) {
      // 中等视频：分段采样
      const segments = Math.min(frameCount, 6);
      const segmentDuration = duration / segments;

      for (let i = 0; i < segments; i++) {
        const segmentStart = startTime + i * segmentDuration;
        const segmentEnd = segmentStart + segmentDuration;

        // 在每个段落中选择1-2个点
        const pointsInSegment = Math.ceil(frameCount / segments);
        for (let j = 0; j < pointsInSegment && timePoints.length < frameCount; j++) {
          const progress = (j + 0.3 + Math.random() * 0.4) / pointsInSegment;
          const timePoint = segmentStart + progress * segmentDuration;
          if (timePoint < segmentEnd - 1) {
            timePoints.push(timePoint);
          }
        }
      }
    } else {
      // 长视频：重点采样开头、中间、结尾
      const sections = [
        { start: 0.05, end: 0.25, weight: 0.4 }, // 开头部分
        { start: 0.3, end: 0.7, weight: 0.4 },   // 中间部分
        { start: 0.75, end: 0.95, weight: 0.2 }  // 结尾部分
      ];

      sections.forEach(section => {
        const sectionFrames = Math.ceil(frameCount * section.weight);
        const sectionStart = startTime + duration * section.start;
        const sectionDuration = duration * (section.end - section.start);

        for (let i = 0; i < sectionFrames; i++) {
          const progress = (i + 0.2 + Math.random() * 0.6) / sectionFrames;
          const timePoint = sectionStart + progress * sectionDuration;
          timePoints.push(timePoint);
        }
      });
    }

    // 确保时间点不重复且在有效范围内
    const uniqueTimePoints = Array.from(new Set(
      timePoints
        .filter(t => t >= startTime && t <= startTime + duration - 1)
        .map(t => Math.round(t * 10) / 10) // 保留1位小数
    )).sort((a, b) => a - b);

    return uniqueTimePoints.slice(0, frameCount);
  }

  /**
   * AI预筛选候选帧 - 优化字幕检测版本
   */
  private async performAIPrefiltering(
    candidateFrames: { imageData: ImageData; timePoint: number; aiScore?: number }[],
    targetCount: number,
    options: { useMultiModel?: boolean } = {}
  ): Promise<void> {
    if (!this.siliconFlowAPI) return;

    const { useMultiModel = false } = options;
    console.log(`🤖 开始AI预筛选 ${candidateFrames.length} 个候选帧${useMultiModel ? ' (多模型验证)' : ''}...`);

    // 🔧 优化的批量分析策略
    const batchSize = useMultiModel ? 2 : 3; // 多模型验证时减少并发数
    let processedCount = 0;

    for (let i = 0; i < candidateFrames.length; i += batchSize) {
      const batch = candidateFrames.slice(i, i + batchSize);

      const analysisPromises = batch.map(async (frame) => {
        try {
          // 🔧 根据配置选择分析方法
          const result = useMultiModel ?
            await this.siliconFlowAPI!.analyzeFrameWithMultiModel(frame.imageData) :
            await this.siliconFlowAPI!.analyzeFrame(frame.imageData);

          // 🔧 优化的评分算法 - 更严格的字幕检测
          let score = 0.4; // 降低基础分

          // 字幕检测评分 (权重最高)
          if (!result.hasSubtitles) {
            score += 0.4; // 无字幕大幅加分
          } else {
            // 有字幕时根据详情进行细分
            if (result.subtitleDetails) {
              const details = result.subtitleDetails;
              // 如果是顶部字幕或中间字幕，可能是标题而非对话字幕
              if (details.position === 'top' || details.position === 'middle') {
                score += 0.1; // 轻微加分
              } else {
                score -= 0.2; // 底部字幕（通常是对话）减分
              }
            } else {
              score -= 0.3; // 确认有字幕但无详情，大幅减分
            }
          }

          // 人物检测评分
          if (result.hasPeople) score += 0.25; // 有人物加分

          // 置信度评分
          score += (result.confidence || 0.5) * 0.15;

          // 🔧 多模型验证额外加分
          if (useMultiModel) {
            score += 0.1; // 多模型验证的结果更可靠
          }

          frame.aiScore = Math.max(0, Math.min(1.0, score));

          const subtitleInfo = result.subtitleDetails ?
            `位置=${result.subtitleDetails.position}, 颜色=${result.subtitleDetails.textColor}` :
            '无详情';

          console.log(`AI分析 ${frame.timePoint.toFixed(1)}s: 字幕=${result.hasSubtitles}${result.hasSubtitles ? `(${subtitleInfo})` : ''}, 人物=${result.hasPeople}, 置信度=${result.confidence.toFixed(2)}, 评分=${frame.aiScore.toFixed(2)}`);

        } catch (error) {
          console.warn(`AI分析失败 ${frame.timePoint.toFixed(1)}s:`, error);
          frame.aiScore = 0.2; // 分析失败给更低分
        }
      });

      await Promise.all(analysisPromises);
      processedCount += batch.length;
      console.log(`AI分析进度: ${processedCount}/${candidateFrames.length} (${((processedCount / candidateFrames.length) * 100).toFixed(1)}%)`);
    }

    // 按评分排序
    candidateFrames.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    console.log(`🏆 AI预筛选完成，最高评分: ${candidateFrames[0]?.aiScore?.toFixed(2) || 'N/A'}`);
  }

  /**
   * 应用多样性过滤，移除相似的帧
   */
  private applyDiversityFilter(frames: ImageData[], threshold: number = 0.75): ImageData[] {
    if (frames.length <= 1) return frames;

    const filteredFrames: ImageData[] = [frames[0]]; // 保留第一帧

    for (let i = 1; i < frames.length; i++) {
      const currentFrame = frames[i];
      let isSimilar = false;

      // 检查与已选择帧的相似度
      for (const selectedFrame of filteredFrames) {
        if (this.calculateFrameSimilarity(currentFrame, selectedFrame) > threshold) {
          isSimilar = true;
          break;
        }
      }

      if (!isSimilar) {
        filteredFrames.push(currentFrame);
      }
    }

    return filteredFrames;
  }

  /**
   * 计算两帧之间的相似度
   */
  private calculateFrameSimilarity(frame1: ImageData, frame2: ImageData): number {
    if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
      return 0; // 尺寸不同，认为不相似
    }

    const data1 = frame1.data;
    const data2 = frame2.data;
    const length = Math.min(data1.length, data2.length);

    // 采样计算，提高性能
    const sampleRate = Math.max(1, Math.floor(length / 10000)); // 最多采样10000个像素
    let totalDiff = 0;
    let sampleCount = 0;

    for (let i = 0; i < length; i += 4 * sampleRate) {
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];

      // 计算RGB差异
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      totalDiff += diff;
      sampleCount++;
    }

    const avgDiff = totalDiff / sampleCount;
    const maxDiff = 255 * 3; // RGB最大差异
    const similarity = 1 - (avgDiff / maxDiff);

    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * 分析图像的静态分数
   * @param imageData 图像数据
   * @param sampleRate 采样率
   */
  public async analyzeStaticScore(imageData: ImageData, sampleRate: number = 1): Promise<number> {
    return this.sendTask('staticScore', { imageData, width: imageData.width, height: imageData.height, options: { sampleRate } });
  }

  /**
   * 分析图像中的字幕区域
   * @param imageData 图像数据
   * @param detectionStrength 检测强度
   * @returns 字幕分数（0-1，越高表示越可能有字幕）
   */
  public async analyzeSubtitleScore(imageData: ImageData, detectionStrength: number = 0.8): Promise<number> {
    return this.sendTask('subtitleScore', { 
      imageData, 
      width: imageData.width, 
      height: imageData.height, 
      detectionStrength 
    });
  }

  /**
   * 分析图像的人物分数
   * @param imageData 图像数据
   * @param sampleRate 采样率
   */
  public async analyzePeopleScore(imageData: ImageData, sampleRate: number = 4): Promise<number> {
    return this.sendTask('peopleScore', { imageData, width: imageData.width, height: imageData.height, options: { sampleRate } });
  }

  /**
   * 批量分析图像
   * @param imageData 图像数据
   * @param options 分析选项
   */
  public async batchAnalyzeImage(imageData: ImageData, options: any = {}): Promise<any> {
    return this.sendTask('batchAnalysis', { 
      imageData, 
      width: imageData.width, 
      height: imageData.height, 
      options 
    });
  }

  /**
   * 发送任务到Worker
   * @param type 任务类型
   * @param data 任务数据
   * @returns 任务结果
   */
  private async sendTask(type: string, data: any, retries: number = 0): Promise<any> {
    if (!this.initialized || !this.worker) {
      if (retries < this.maxRetries) {
        console.log(`图像处理器未初始化，尝试初始化 (重试 ${retries + 1}/${this.maxRetries})`);
        try {
          await this.initialize();
          return this.sendTask(type, data, retries + 1);
        } catch (error) {
          throw new Error('图像处理器初始化失败');
        }
      } else {
        throw new Error('图像处理器未初始化且重试次数已达上限');
      }
    }
    
    return new Promise((resolve, reject) => {
      try {
        // 生成唯一任务ID
        const taskId = `task_${Date.now()}_${this.taskCounter++}`;
        
        // 设置超时处理 - 增加超时时间，特别是对于大型任务
        const timeoutDuration = type === 'extractFramesFromVideo' || type === 'findOptimalFrames' ? 
          180000 : // 视频处理任务增加到3分钟
          60000;   // 其他任务增加到1分钟
          
        const timeoutId = setTimeout(() => {
          if (this.taskCallbacks.has(taskId)) {
            this.taskCallbacks.delete(taskId);
            
            reject(new Error(`任务处理超时: ${type}`));
          }
        }, timeoutDuration);
        
        // 注册回调
        this.taskCallbacks.set(taskId, (result) => {
          clearTimeout(timeoutId);
          
          if (result.error) {
            
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        });
        
        // 记录任务开始
        
        // 发送消息到Worker
        this.worker!.postMessage({
          type,
          taskId,
          ...data
        });
      } catch (error) {
        
        reject(error);
      }
    });
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    // 创建回调的副本以避免递归调用
    const callbacks = new Map(this.taskCallbacks);
    
    // 清空原始回调Map
    this.taskCallbacks.clear();
    
    // 终止Worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // 通知所有待处理任务
    callbacks.forEach((callback) => {
      callback({ error: '图像处理器已被销毁' });
    });
    
    this.initialized = false;
    ImageProcessor.instance = null;
    this.initializationPromise = null;
    
  }

  /**
   * 检查帧是否与已有帧相似
   * @param newFrame 新帧
   * @param existingFrames 已存在的帧
   * @returns 如果相似度超过阈值，返回true
   */
  private checkFrameSimilarity(newFrame: ImageData, existingFrames: ImageData[], similarityThreshold: number = 0.85): boolean {
    // 如果没有帧进行比较，直接返回false
    if (existingFrames.length === 0) {
      return false;
    }
    
    const comparisonThreshold = similarityThreshold || 0.85;
    const fastCompare = true; // 进行快速比较以提高性能
    
    // 使用更高效的采样方式比较帧
    // 降低采样率以获得更准确的比较结果
    const sampleRate = Math.max(3, Math.floor(Math.min(newFrame.width, newFrame.height) / 80));
    
    // 划分图像为9个区域进行分析，确保整体结构差异
    const regionsX = 3;
    const regionsY = 3;
    const regionWidth = Math.floor(newFrame.width / regionsX);
    const regionHeight = Math.floor(newFrame.height / regionsY);
    
    for (const existingFrame of existingFrames) {
      // 确保尺寸相同，否则继续下一次比较
      if (newFrame.width !== existingFrame.width || newFrame.height !== existingFrame.height) {
        continue;
      }
      
      // 对每个帧比较像素相似度
      const newData = newFrame.data;
      const existingData = existingFrame.data;
      
      let overallSimilarPixels = 0;
      let overallTotalPixels = 0;
      
      // 分区域检查相似度
      let regionSimilarCount = 0; // 计数有多少区域相似
      
      // 对每个区域进行采样比较
      for (let regionY = 0; regionY < regionsY; regionY++) {
        for (let regionX = 0; regionX < regionsX; regionX++) {
          let similarPixels = 0;
          let totalPixels = 0;
          
          // 计算当前区域边界
          const startX = regionX * regionWidth;
          const endX = (regionX + 1) * regionWidth;
          const startY = regionY * regionHeight;
          const endY = (regionY + 1) * regionHeight;
          
          // 对区域内采样比较
          for (let y = startY; y < endY; y += sampleRate) {
            for (let x = startX; x < endX; x += sampleRate) {
              const i = (y * newFrame.width + x) * 4;
              
              // 确保索引在范围内
              if (i >= newData.length - 3 || i >= existingData.length - 3) continue;
              
              // 计算RGB差异
              const diffR = Math.abs(newData[i] - existingData[i]);
              const diffG = Math.abs(newData[i + 1] - existingData[i + 1]);
              const diffB = Math.abs(newData[i + 2] - existingData[i + 2]);
              
              // 如果是快速比较，使用更简单的相似度计算
              if (fastCompare) {
                // 平均每个通道的差异小于阈值，认为像素相似
                const avgDiff = (diffR + diffG + diffB) / 3;
                if (avgDiff < 30) { // 使用更严格的阈值检测相似性 (从40降低到30)
                  similarPixels++;
                }
              } else {
                // 更复杂的相似度计算
                const pixelSimilarity = 1 - ((diffR + diffG + diffB) / 765); // 765 = 255*3
                if (pixelSimilarity > 0.85) {
                  similarPixels++;
                }
              }
              
              totalPixels++;
            }
          }
          
          // 计算当前区域相似度
          const regionSimilarity = totalPixels > 0 ? similarPixels / totalPixels : 0;
          
          // 记录相似像素数
          overallSimilarPixels += similarPixels;
          overallTotalPixels += totalPixels;
          
          // 如果区域相似度高于阈值，增加区域计数
          if (regionSimilarity > comparisonThreshold - 0.05) { // 区域阈值略低于总体阈值
            regionSimilarCount++;
          }
        }
      }
      
      // 计算整体相似度
      const overallSimilarity = overallTotalPixels > 0 ? overallSimilarPixels / overallTotalPixels : 0;
      
      // 如果相似度高于阈值或有太多区域相似，认为帧太相似
      // 有超过6个区域相似度高，表示两帧实质上非常相似
      if (overallSimilarity > comparisonThreshold || regionSimilarCount >= 6) {
        return true;
      }
    }
    
    // 没有找到相似帧
    return false;
  }

  /**
   * 从视频提取帧 - 优化版本，使用关键帧检测和AI预筛选
   * @param video 视频元素
   * @param options 提取选项
   * @returns 提取的帧数组
   */
  public async extractFramesFromVideo(
    video: HTMLVideoElement,
    options: {
      startTime?: number;
      frameCount?: number;
      interval?: 'uniform' | 'random' | 'keyframes'; // 新增关键帧模式
      keepOriginalResolution?: boolean;
      enhancedFrameDiversity?: boolean;
      useAIPrefilter?: boolean; // 新增AI预筛选选项
      useMultiModelValidation?: boolean; // 新增多模型验证选项
    }
  ): Promise<ImageData[]> {
    try {
        
        // 获取视频时长和设置
        const duration = video.duration;
        const startTime = options.startTime || 0;
        const frameCount = Math.min(options.frameCount || 10, 30); // 优化：减少初始提取数量
        const interval = options.interval || 'keyframes'; // 默认使用关键帧模式
        const keepOriginalResolution = options.keepOriginalResolution || false;
        const enhancedFrameDiversity = options.enhancedFrameDiversity !== undefined ?
          options.enhancedFrameDiversity : true;
        const useAIPrefilter = options.useAIPrefilter && this.isAIAnalysisEnabled();
        const useMultiModelValidation = options.useMultiModelValidation || false;

        // 快速验证视频状态
        if (duration <= 0 || isNaN(duration)) {
          throw new Error('无效的视频时长');
        }

        // 创建canvas用于帧提取
        const canvas = document.createElement('canvas');
        
        // 设置canvas尺寸
        let scale = 1;
        
        if (keepOriginalResolution) {
          // 保持原始分辨率
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
        } else {
          // 对于大型视频，降低canvas尺寸以提高性能
          const maxDimension = 1280; // 限制最大尺寸
          
          if (video.videoWidth > maxDimension || video.videoHeight > maxDimension) {
            scale = maxDimension / Math.max(video.videoWidth, video.videoHeight);
            
          }
          
          canvas.width = Math.floor(video.videoWidth * scale);
          canvas.height = Math.floor(video.videoHeight * scale);
          
        }
        
        const ctx = canvas.getContext('2d', {
          alpha: false,  // 禁用alpha通道以提高性能
          willReadFrequently: true // 提示频繁读取以优化性能
        });

        if (!ctx) {
          throw new Error('无法创建Canvas上下文');
        }
        
        // 确保视频可以播放
        if (video.readyState < 2) {
          
          await new Promise<void>((resolve, reject) => {
            const loadHandler = () => {
              video.removeEventListener('loadeddata', loadHandler);
              video.removeEventListener('error', errorHandler);
              resolve();
            };

            const errorHandler = () => {
              video.removeEventListener('loadeddata', loadHandler);
              video.removeEventListener('error', errorHandler);
              reject(new Error('视频加载失败'));
            };

            video.addEventListener('loadeddata', loadHandler);
            video.addEventListener('error', errorHandler);
          });
        }
        
        // 计算可用的视频时长
        const availableDuration = Math.max(0, duration - startTime);
        if (availableDuration <= 0) {
          throw new Error('无效的视频时长或开始时间');
        }

        // 🔑 智能时间点计算
        let timePoints: number[] = [];

        if (interval === 'keyframes') {
          // 关键帧检测模式 - 使用智能采样
          timePoints = await this.detectKeyFrameTimePoints(video, startTime, availableDuration, frameCount);
        } else if (interval === 'uniform') {
          // 均匀分布模式 - 简化版本
          const step = availableDuration / (frameCount + 1);
          for (let i = 1; i <= frameCount; i++) {
            timePoints.push(startTime + i * step);
          }
        } else {
          // 随机分布模式 - 简化版本
          const segments = Math.max(frameCount * 2, 10);
          const segmentSize = availableDuration / segments;
          const selectedSegments = Array.from({length: segments}, (_, i) => i)
            .sort(() => Math.random() - 0.5)
            .slice(0, frameCount)
            .sort((a, b) => a - b);

          timePoints = selectedSegments.map(seg =>
            startTime + seg * segmentSize + Math.random() * segmentSize * 0.8
          );
        }

        // 确保时间点有效
        timePoints = timePoints.filter(t => t >= startTime && t < duration - 0.1);

        if (timePoints.length === 0) {
          throw new Error('未能生成有效的时间点');
        }

        console.log(`🎯 生成${timePoints.length}个时间点:`, timePoints.map(t => t.toFixed(1)));
        
        // 🚀 优化的帧提取逻辑
        const candidateFrames: { imageData: ImageData; timePoint: number; aiScore?: number }[] = [];

        // 🔧 增强的帧提取逻辑，包含详细错误诊断
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < timePoints.length; i++) {
          const timePoint = timePoints[i];
          let retryCount = 0;
          const maxRetries = 2; // 每个帧最多重试2次

          while (retryCount <= maxRetries) {
            try {
              const retryText = retryCount > 0 ? ` (重试${retryCount}/${maxRetries})` : '';
              console.log(`📸 提取帧 ${i + 1}/${timePoints.length} (${timePoint.toFixed(1)}s)${retryText}`);

              // 验证视频状态
              if (video.readyState < 2) {
                throw new Error(`视频未准备好，readyState: ${video.readyState}`);
              }

              if (video.duration <= 0 || isNaN(video.duration)) {
                throw new Error(`视频时长无效: ${video.duration}`);
              }

              if (timePoint >= video.duration) {
                // 调整时间点到有效范围内
                const adjustedTime = Math.min(timePoint, video.duration - 0.5);
                console.warn(`时间点超出范围，调整: ${timePoint.toFixed(1)}s -> ${adjustedTime.toFixed(1)}s`);
                if (adjustedTime <= 0) {
                  throw new Error(`调整后的时间点仍然无效: ${adjustedTime}`);
                }
                // 使用调整后的时间点继续
              }

            // 设置视频时间
            const oldTime = video.currentTime;
            video.currentTime = timePoint;

            // 等待视频跳转完成
            await new Promise<void>((resolveSeek, rejectSeek) => {
              const timeoutId = setTimeout(() => {
                video.removeEventListener('seeked', seekedHandler);
                video.removeEventListener('error', errorHandler);
                rejectSeek(new Error(`Seek超时: ${timePoint.toFixed(1)}s (从 ${oldTime.toFixed(1)}s)`));
              }, 5000); // 增加到5秒超时

              const seekedHandler = () => {
                clearTimeout(timeoutId);
                video.removeEventListener('seeked', seekedHandler);
                video.removeEventListener('error', errorHandler);
                console.log(`🎯 成功跳转到 ${video.currentTime.toFixed(1)}s`);
                resolveSeek();
              };

              const errorHandler = (e: Event) => {
                clearTimeout(timeoutId);
                video.removeEventListener('seeked', seekedHandler);
                video.removeEventListener('error', errorHandler);
                rejectSeek(new Error(`Seek失败: ${timePoint.toFixed(1)}s - ${e.type}`));
              };

              video.addEventListener('seeked', seekedHandler);
              video.addEventListener('error', errorHandler);
            });

            // 验证Canvas状态
            if (!ctx) {
              throw new Error('Canvas上下文丢失');
            }

            if (canvas.width <= 0 || canvas.height <= 0) {
              throw new Error(`Canvas尺寸无效: ${canvas.width}x${canvas.height}`);
            }

            // 绘制帧到canvas
            try {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            } catch (drawError) {
              throw new Error(`绘制视频帧失败: ${drawError instanceof Error ? drawError.message : '未知错误'}`);
            }

            // 获取图像数据
            let imageData: ImageData;
            try {
              imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch (getDataError) {
              throw new Error(`获取图像数据失败: ${getDataError instanceof Error ? getDataError.message : '未知错误'}`);
            }

            // 验证帧有效性
            if (this.isValidImageData(imageData)) {
              candidateFrames.push({ imageData, timePoint });
              successCount++;
              console.log(`✅ 成功提取帧 ${successCount}/${timePoints.length} (${timePoint.toFixed(1)}s)`);
              break; // 成功提取，跳出重试循环
            } else {
              skipCount++;
              console.warn(`⚠️ 跳过无效帧 ${timePoint.toFixed(1)}s (第${skipCount}个无效帧)`);

              // 如果是因为帧无效而失败，也跳出重试循环（重试不会改善帧质量）
              break;
            }

          } catch (error) {
            const errorMsg = `提取帧失败 ${timePoint.toFixed(1)}s: ${error instanceof Error ? error.message : '未知错误'}`;

            // 🔧 区分可重试和不可重试的错误
            const isRetryableError = error instanceof Error && (
              error.message.includes('Seek超时') ||
              error.message.includes('Seek失败') ||
              error.message.includes('绘制视频帧失败')
            );

            const isFatalError = error instanceof Error && (
              error.message.includes('Canvas上下文') ||
              error.message.includes('视频未准备好') ||
              error.message.includes('视频时长无效')
            );

            if (isLastRetry || !isRetryableError) {
              // 最后一次重试失败，或者是不可重试的错误
              errorCount++;
              errors.push(errorMsg);
              console.warn(`❌ ${errorMsg} ${isLastRetry ? '(重试已用尽)' : '(不可重试)'}`);

              // 致命错误立即终止整个提取过程
              if (isFatalError) {
                
                throw error;
              }

              break; // 跳出重试循环，继续下一个时间点
            } else {
              // 可重试的错误，等待一小段时间后重试
              console.warn(`⚠️ ${errorMsg} (将重试 ${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // 递增延迟
            }
          }
        } // 结束重试循环

        // 🔧 优化的错误率检查 - 只在极端情况下终止
        const currentErrorRate = errorCount / timePoints.length;
        if (currentErrorRate > 0.95 && errorCount > 5) {
          console.error(`错误率极高 (${errorCount}/${timePoints.length}, ${(currentErrorRate * 100).toFixed(1)}%)，终止剩余提取`);
          break;
        }
        }

        // 详细的提取结果报告
        console.log(`📊 帧提取统计:`, {
          总帧数: timePoints.length,
          成功: successCount,
          跳过: skipCount,
          错误: errorCount,
          成功率: `${((successCount / timePoints.length) * 100).toFixed(1)}%`,
          有效帧率: `${(((successCount + skipCount) / timePoints.length) * 100).toFixed(1)}%`
        });

        if (errors.length > 0) {
          console.warn('提取过程中的错误:', errors.slice(0, 5)); // 只显示前5个错误
        }

        // 🔧 增强的错误处理和回退机制
        if (candidateFrames.length === 0) {
          // 提供详细的错误诊断信息
          const diagnosticInfo = {
            视频信息: {
              时长: `${duration.toFixed(1)}s`,
              尺寸: `${video.videoWidth}x${video.videoHeight}`,
              就绪状态: video.readyState,
              网络状态: video.networkState,
              可播放: !video.paused && !video.ended
            },
            提取配置: {
              开始时间: `${startTime.toFixed(1)}s`,
              帧数量: frameCount,
              时间点数量: timePoints.length,
              模式: interval
            },
            Canvas信息: {
              尺寸: `${canvas.width}x${canvas.height}`,
              上下文: !!ctx
            },
            统计信息: {
              成功: successCount,
              跳过: skipCount,
              错误: errorCount,
              错误率: `${((errorCount / timePoints.length) * 100).toFixed(1)}%`
            }
          };

          // 尝试回退策略
          if (timePoints.length > 0) {
            
            try {
              // 回退策略1：尝试提取视频中间的一帧
              const middleTime = duration / 2;
              video.currentTime = middleTime;

              await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('回退策略超时')), 3000);
                const handler = () => {
                  clearTimeout(timeout);
                  video.removeEventListener('seeked', handler);
                  resolve();
                };
                video.addEventListener('seeked', handler);
              });

              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const fallbackImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

              // 降低验证标准
              if (fallbackImageData && fallbackImageData.data && fallbackImageData.data.length > 0) {
                candidateFrames.push({ imageData: fallbackImageData, timePoint: middleTime });
                
              }
            } catch (fallbackError) {
              
            }
          }

          // 如果回退策略也失败了
          if (candidateFrames.length === 0) {
            const errorMessage = `未能提取到任何有效帧。诊断信息：
- 视频时长: ${duration.toFixed(1)}s，尺寸: ${video.videoWidth}x${video.videoHeight}
- 尝试提取 ${timePoints.length} 个时间点
- 成功: ${successCount}，跳过: ${skipCount}，错误: ${errorCount}
- 主要错误: ${errors.slice(0, 3).join('; ')}
建议：检查视频文件是否完整，或尝试其他视频格式`;

            throw new Error(errorMessage);
          }
        }

        // 🤖 AI预筛选（如果启用且候选帧过多）
        if (useAIPrefilter && candidateFrames.length > frameCount) {
          
          await this.performAIPrefiltering(candidateFrames, frameCount, {
            useMultiModel: useMultiModelValidation
          });
        }

        // 🏆 最终帧选择
        let finalFrames: ImageData[];

        if (useAIPrefilter && candidateFrames.some(f => f.aiScore !== undefined)) {
          // 基于AI评分选择
          finalFrames = candidateFrames
            .sort((a, b) => (b.aiScore || 0.5) - (a.aiScore || 0.5))
            .slice(0, frameCount)
            .map(f => f.imageData);

        } else {
          // 基于时间分布选择
          const step = Math.max(1, Math.floor(candidateFrames.length / frameCount));
          finalFrames = candidateFrames
            .filter((_, index) => index % step === 0)
            .slice(0, frameCount)
            .map(f => f.imageData);

        }

        // 应用多样性过滤（如果启用）
        if (enhancedFrameDiversity && finalFrames.length > 1) {
          finalFrames = this.applyDiversityFilter(finalFrames, 0.75);
          
        }

        return finalFrames;

    } catch (error) {
      
      throw error;
    }
  }

  /**
   * 找出最佳帧
   * @param frames 帧数组
   * @param count 要选择的帧数
   * @param preferences 偏好设置
   * @param options 选项设置
   * @returns 选择的最佳帧
   */
  public async findOptimalFrames(
    frames: ImageData[],
    count: number,
    preferences: {
      prioritizeStatic?: boolean;
      avoidSubtitles?: boolean;
      preferPeople?: boolean;
      preferFaces?: boolean;
      avoidEmptyFrames?: boolean;
    },
    options: {
      subtitleDetectionStrength?: number;
      staticFrameThreshold?: number;
      sampleRate?: number;
    }
  ): Promise<{
    frames: Array<{
      index: number;
      scores: {
        staticScore: number;
        subtitleScore: number;
        peopleScore: number;
        emptyFrameScore?: number;
        diversityScore?: number;
      };
    }>;
  }> {
    try {
      
      // 🎯 尝试使用新的智能帧选择器
      try {
        if (!this.smartFrameSelector) {
          // 动态导入避免构造函数问题
          const { SmartFrameSelector } = await import('./smart-frame-selector');
          this.smartFrameSelector = new SmartFrameSelector();
          
          // 如果启用了AI分析，配置AI
          if (this.isAIAnalysisEnabled() && this.siliconFlowAPI) {
            // 从siliconFlowAPI获取配置信息
            const apiKey = (this.siliconFlowAPI as any).config?.apiKey;
            const model = (this.siliconFlowAPI as any).config?.model;
            if (apiKey) {
              this.smartFrameSelector.configureAI(apiKey, model);
            }
          }
        }

        // 构建智能选择选项
        const selectionOptions: SmartSelectionOptions = {
          targetCount: count,
          preferences: {
            prioritizeStatic: preferences.prioritizeStatic ?? true,
            avoidSubtitles: preferences.avoidSubtitles ?? true,
            preferPeople: preferences.preferPeople ?? true,
            preferFaces: preferences.preferFaces ?? true,
            enhanceDiversity: true // 启用多样性优化
          },
          aiAnalysis: {
            enabled: this.isAIAnalysisEnabled(),
            maxAIFrames: Math.min(15, Math.max(count * 2, 10)), // 动态调整AI分析帧数
            confidenceThreshold: options.subtitleDetectionStrength ?? 0.8
          },
          performance: {
            maxProcessingTime: 180000, // 3分钟超时
            enableCaching: true,
            batchSize: 5
          }
        };

        // 🎯 执行智能帧选择
        const smartResult = await this.smartFrameSelector.selectBestFrames(frames, selectionOptions);

        // 转换为原有格式
        const result = {
          frames: smartResult.selectedFrames.map(frame => ({
            index: frame.originalIndex,
            scores: {
              staticScore: frame.scores.staticScore,
              subtitleScore: frame.scores.subtitleScore,
              peopleScore: frame.scores.peopleScore,
              emptyFrameScore: frame.scores.qualityScore,
              diversityScore: frame.scores.diversityScore
            }
          }))
        };

        return result;

      } catch (smartSelectorError) {
        
        // 继续执行原有的传统分析逻辑
      }

      // 检查是否启用AI分析（保留原有逻辑作为回退）
      const useAIAnalysis = this.isAIAnalysisEnabled();
      if (useAIAnalysis) {
        
      } else {
        
      }

      // 如果帧数过多，先进行初步筛选以减轻计算负担
      let framesToAnalyze = frames;
      const maxFramesToAnalyze = useAIAnalysis ? 20 : 40; // AI分析时减少帧数以控制成本

      if (frames.length > maxFramesToAnalyze) {
        console.log(`帧数过多 (${frames.length})，进行初步筛选`);
        // 均匀选择帧进行分析
        const step = Math.floor(frames.length / maxFramesToAnalyze);
        framesToAnalyze = [];
        for (let i = 0; i < frames.length; i += step) {
          framesToAnalyze.push(frames[i]);
        }
        
      }
      
      // 使用批处理来分析帧，避免一次性分析太多帧导致超时
      const batchSize = 5; // 每批分析的帧数
      // 扩展帧分析接口，添加originalIndex属性
      interface FrameAnalysis {
        index: number;
        originalIndex: number;
        scores: {
          staticScore: number;
          subtitleScore: number;
          peopleScore: number;
          emptyFrameScore?: number;
          diversityScore?: number;
        };
      }
      
      const frameAnalysis: FrameAnalysis[] = [];
      
      // 批量分析帧
      for (let i = 0; i < framesToAnalyze.length; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, framesToAnalyze.length);
        const currentBatch = framesToAnalyze.slice(i, batchEnd);
        
        console.log(`分析帧批次 ${i/batchSize + 1}/${Math.ceil(framesToAnalyze.length/batchSize)}`);
        
        try {
          // 创建批处理Promise
          const batchPromises = currentBatch.map(async (frame, batchIndex) => {
            const originalIndex = framesToAnalyze.indexOf(frame);

            try {
              let scores: any = {};

              if (useAIAnalysis && this.siliconFlowAPI) {
                // 使用AI分析
                
                const aiResult = await this.siliconFlowAPI.analyzeFrame(frame);

                if (!aiResult.error) {
                  // 将AI结果转换为传统评分格式
                  scores = {
                    staticScore: 0.8, // AI分析的帧通常质量较好
                    subtitleScore: aiResult.hasSubtitles ? 0.9 : 0.1, // 有字幕得分高，无字幕得分低
                    peopleScore: aiResult.hasPeople ? 0.9 : 0.1, // 有人物得分高，无人物得分低
                    emptyFrameScore: aiResult.hasPeople ? 0.1 : 0.8, // 有人物时空帧得分低
                    diversityScore: aiResult.confidence || 0.7 // 使用AI的置信度作为多样性分数
                  };

                } else {
                  
                  // AI分析失败，回退到传统方法
                  const effectiveSampleRate = Math.min(options.sampleRate || 2, 3);
                  const results = await this.batchAnalyzeImage(frame, {
                    sampleRate: effectiveSampleRate,
                    subtitleDetectionStrength: options.subtitleDetectionStrength || 0.8,
                    staticFrameThreshold: options.staticFrameThreshold || 0.8,
                    simplifiedAnalysis: true
                  });

                  scores = {
                    staticScore: results.staticScore || 0.5,
                    subtitleScore: results.subtitleScore || 0.5,
                    peopleScore: results.peopleScore || 0.5,
                    emptyFrameScore: results.emptyFrameScore || 0.5,
                    diversityScore: results.diversityScore || 0.5
                  };
                }
              } else {
                // 使用传统像素分析方法
                const effectiveSampleRate = Math.min(options.sampleRate || 2, 3);
                const results = await this.batchAnalyzeImage(frame, {
                  sampleRate: effectiveSampleRate,
                  subtitleDetectionStrength: options.subtitleDetectionStrength || 0.8,
                  staticFrameThreshold: options.staticFrameThreshold || 0.8,
                  simplifiedAnalysis: true
                });

                scores = {
                  staticScore: results.staticScore || 0.5,
                  subtitleScore: results.subtitleScore || 0.5,
                  peopleScore: results.peopleScore || 0.5,
                  emptyFrameScore: results.emptyFrameScore || 0.5,
                  diversityScore: results.diversityScore || 0.5
                };
              }

              return {
                index: frames.indexOf(frame), // 获取原始帧数组中的索引
                originalIndex: originalIndex, // 保存在筛选后数组中的索引
                scores: scores
              };
            } catch (error) {
              
              // 返回默认分数，而不是失败整个批次
              return {
                index: frames.indexOf(frame),
                originalIndex: originalIndex,
                scores: {
                  staticScore: 0.5,
                  subtitleScore: 0.5,
                  peopleScore: 0.5,
                  emptyFrameScore: 0.5,
                  diversityScore: 0.5
                }
              };
            }
          });
          
          // 等待当前批次完成
          const batchResults = await Promise.allSettled(batchPromises);
          
          // 处理结果
          batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
              frameAnalysis.push(result.value);
            }
          });
          
        } catch (error) {
          
          // 继续处理其他批次，不要中断整个过程
        }
      }
      
      // 如果没有成功分析任何帧，返回基本结果
      if (frameAnalysis.length === 0) {
        
        return {
          frames: frames.slice(0, count).map((_, index) => ({
            index,
            scores: {
              staticScore: 0.5,
              subtitleScore: 0.5,
              peopleScore: 0.5,
              emptyFrameScore: 0.5,
              diversityScore: 0.5
            }
          }))
        };
      }

      // ==================== 新增: 优先检测人物帧并优化字幕 ====================
      
      // 1. 先按人物分数对帧排序，找出包含人物的高质量帧
      const peopleFrames = [...frameAnalysis].sort((a, b) => 
        b.scores.peopleScore - a.scores.peopleScore
      ).filter(frame => frame.scores.peopleScore > 0.6); // 选择人物分数较高的帧

      // 2. 处理每个包含人物的帧，检查其相邻帧是否有无字幕的更好选择
      const optimizedFrames: typeof frameAnalysis = [];
      const processedIndices = new Set<number>();
      
      // 尝试为每个高质量人物帧找到最佳的无字幕替代帧
      for (const peopleFrame of peopleFrames) {
        // 如果这个帧已经被处理过，跳过
        if (processedIndices.has(peopleFrame.index)) {
          continue;
        }
        
        // 检查该帧字幕分数
        if (peopleFrame.scores.subtitleScore < 0.3) {
          // 如果已经是低字幕分数，直接使用该帧
          optimizedFrames.push(peopleFrame);
          processedIndices.add(peopleFrame.index);
          continue;
        }
        
        // 查找相邻帧 (在原始帧数组中的相邻帧)
        const adjacentFrameIndices: number[] = [];
        const searchRange = 5; // 搜索前后5帧
        
        for (let offset = -searchRange; offset <= searchRange; offset++) {
          if (offset === 0) continue; // 跳过自身
          
          const adjIndex = peopleFrame.index + offset;
          if (adjIndex >= 0 && adjIndex < frames.length) {
            adjacentFrameIndices.push(adjIndex);
          }
        }
        
        // 如果没有相邻帧，使用原始帧
        if (adjacentFrameIndices.length === 0) {
          optimizedFrames.push(peopleFrame);
          processedIndices.add(peopleFrame.index);
          continue;
        }
        
        // 在相邻帧中找出已分析过的帧
        const analyzedAdjacentFrames = frameAnalysis.filter(f => 
          adjacentFrameIndices.includes(f.index)
        );
        
        // 如果没有已分析的相邻帧，分析一些相邻帧
        if (analyzedAdjacentFrames.length === 0) {
          try {
            // 选择一些相邻帧进行分析
            const framesToAnalyzeAdditionally: ImageData[] = [];
            for (const adjIndex of adjacentFrameIndices.slice(0, 3)) { // 最多分析3个相邻帧
              framesToAnalyzeAdditionally.push(frames[adjIndex]);
            }
            
            // 分析这些相邻帧
            for (let i = 0; i < framesToAnalyzeAdditionally.length; i++) {
              const adjFrame = framesToAnalyzeAdditionally[i];
              const adjIndex = adjacentFrameIndices[i];
              
              const results = await this.batchAnalyzeImage(adjFrame, {
                sampleRate: Math.min(options.sampleRate || 2, 3),
                subtitleDetectionStrength: options.subtitleDetectionStrength || 0.8,
                simplifiedAnalysis: true
              });
              
              analyzedAdjacentFrames.push({
                index: adjIndex,
                originalIndex: -1, // 不在原始分析集中
                scores: {
                  staticScore: results.staticScore || 0.5,
                  subtitleScore: results.subtitleScore || 0.5,
                  peopleScore: results.peopleScore || 0.5,
                  emptyFrameScore: results.emptyFrameScore || 0.5,
                  diversityScore: results.diversityScore || 0.5
                }
              });
            }
          } catch (error) {
            
            // 如果分析失败，使用原始帧
            optimizedFrames.push(peopleFrame);
            processedIndices.add(peopleFrame.index);
            continue;
          }
        }
        
        // 在相邻帧中找出无字幕的最佳替代帧
        // 按照字幕分数升序排序（低字幕分数优先）
        analyzedAdjacentFrames.sort((a, b) => {
          // 主要按字幕分数排序
          const subtitleDiff = a.scores.subtitleScore - b.scores.subtitleScore;
          
          if (Math.abs(subtitleDiff) > 0.2) {
            return subtitleDiff; // 字幕分数差异明显，按字幕分数排序
          }
          
          // 字幕分数相近，考虑人物分数
          const peopleDiff = b.scores.peopleScore - a.scores.peopleScore;
          
          if (Math.abs(peopleDiff) > 0.1) {
            return peopleDiff; // 人物分数差异明显，按人物分数排序
          }
          
          // 两者都相近，考虑静态分数
          return b.scores.staticScore - a.scores.staticScore;
        });
        
        // 选择最佳替代帧 - 字幕分数低且人物分数不低于原始帧的70%
        const bestAlternative = analyzedAdjacentFrames.find(frame => 
          frame.scores.subtitleScore < 0.3 && // 低字幕分数
          frame.scores.peopleScore > peopleFrame.scores.peopleScore * 0.7 // 人物分数不能太低
        );
        
        if (bestAlternative) {
          
          // 使用这个替代帧，但保留原始帧的一些特性
          optimizedFrames.push({
            ...bestAlternative,
            scores: {
              ...bestAlternative.scores,
              // 混合原始帧和替代帧的分数，保留替代帧的低字幕特性
              peopleScore: Math.max(bestAlternative.scores.peopleScore, peopleFrame.scores.peopleScore * 0.9)
            }
          });
          
          // 标记两个帧都已处理
          processedIndices.add(peopleFrame.index);
          processedIndices.add(bestAlternative.index);
        } else {
          // 没有找到合适的替代帧，使用原始帧
          optimizedFrames.push(peopleFrame);
          processedIndices.add(peopleFrame.index);
        }
      }

      // 计算综合得分
      interface ScoredFrame extends FrameAnalysis {
        totalScore: number;
      }
      
      const scoredFrames = frameAnalysis.map(frame => {
        const { scores } = frame;
        let totalScore = 0;
        
        // 根据偏好设置计算得分
        if (preferences.prioritizeStatic) {
          totalScore += scores.staticScore * 2;
        }
        
        if (preferences.avoidSubtitles) {
          totalScore += (1 - scores.subtitleScore) * 3; // 字幕分数越低越好
        }
        
        if (preferences.preferPeople) {
          totalScore += scores.peopleScore * 2;
        }
        
        if (preferences.avoidEmptyFrames && scores.emptyFrameScore !== undefined) {
          totalScore += (1 - scores.emptyFrameScore) * 2; // 空帧分数越低越好
        }
        
        // 添加多样性分数，始终考虑多样性
        if (scores.diversityScore !== undefined) {
          totalScore += scores.diversityScore * 3.0; // 增强多样性权重，确保选择内容更有差异的帧
        }
        
        return {
          ...frame,
          totalScore
        } as ScoredFrame;
      });
      
      // 按总分排序
      const sortedFrames = [...scoredFrames].sort((a, b) => b.totalScore - a.totalScore);
      
      // 补充剩余帧 - 优先使用已优化的人物帧，然后添加其他高分帧
      const finalSelectedFrames: ScoredFrame[] = optimizedFrames.map(frame => ({
        ...frame,
        totalScore: 0 // 临时占位，不会影响结果
      }));
      
      // 已选择的帧索引集合
      const selectedIndices = new Set(finalSelectedFrames.map(f => f.index));
      
      // 从高分到低分遍历，选择尚未选择的帧
      for (const frame of sortedFrames) {
        // 如果已经选择了足够的帧，停止
        if (finalSelectedFrames.length >= count) {
          break;
        }
        
        // 如果这个帧已经被选择，跳过
        if (selectedIndices.has(frame.index)) {
          continue;
        }
        
        // 检查这个帧是否与已选帧有明显差异
        let isDiverseEnough = true;
        for (const selected of finalSelectedFrames) {
          // 使用帧索引获取实际帧
          const candidateFrame = frames[frame.index];
          const selectedFrame = frames[selected.index];
          
          // 检查相似度 - 使用较低的阈值来确保多样性
          if (candidateFrame && selectedFrame && 
              this.checkFrameSimilarity(candidateFrame, [selectedFrame], 0.75)) {
            isDiverseEnough = false;
            break;
          }
        }
        
        // 如果这个帧与已选帧差异够大，添加它
        if (isDiverseEnough) {
          finalSelectedFrames.push(frame);
          selectedIndices.add(frame.index);
        }
      }
      
      // 如果仍然不够，添加其他未被选择的帧
      if (finalSelectedFrames.length < count) {
        for (const frame of sortedFrames) {
          if (finalSelectedFrames.length >= count) {
            break;
          }
          
          if (!selectedIndices.has(frame.index)) {
            finalSelectedFrames.push(frame);
            selectedIndices.add(frame.index);
          }
        }
      }

      // 根据索引排序，保持时间顺序
      finalSelectedFrames.sort((a, b) => a.index - b.index);
      
      // 移除临时属性，返回最终结果
      return {
        frames: finalSelectedFrames.map(({ index, scores }) => ({ index, scores }))
      };
    } catch (error) {
      
      // 发生错误时，尝试返回最少一帧
      if (frames.length > 0) {
        
        return {
          frames: [{ 
            index: 0, 
            scores: { 
              staticScore: 0.5, 
              subtitleScore: 0.5, 
              peopleScore: 0.5 
            } 
          }]
        };
      }
      
      throw error;
    }
  }

  /**
   * 生成缩略图
   * @param frame 图像数据
   * @param options 生成选项
   * @returns 缩略图URL
   */
  public async generateThumbnail(
    frame: ImageData,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
    }
  ): Promise<{ url: string }> {
    try {
      const maxWidth = options.maxWidth || 640;
      const maxHeight = options.maxHeight || 360;
      const quality = options.quality || 0.8;
      const format = options.format || 'jpeg';
      
      // 创建canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }
      
      // 验证输入帧的有效性
      if (!frame || frame.width <= 0 || frame.height <= 0 || !frame.data || frame.data.length === 0) {
        throw new Error('无效的图像数据');
      }
      
      // 检查是否是全黑图像
      let isEntirelyBlack = true;
      const sampleRate = 10; // 每10个像素采样一次
      for (let y = 0; y < frame.height && isEntirelyBlack; y += sampleRate) {
        for (let x = 0; x < frame.width && isEntirelyBlack; x += sampleRate) {
          const offset = (y * frame.width + x) * 4;
          // 如果任何一个像素不是黑色，则图像不是全黑的
          if (frame.data[offset] > 5 || 
              frame.data[offset + 1] > 5 || 
              frame.data[offset + 2] > 5) {
            isEntirelyBlack = false;
            break;
          }
        }
      }
      
      // 如果是全黑图像，创建带文本的图像
      if (isEntirelyBlack) {
        
        // 设置canvas尺寸
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        
        // 填充灰色背景
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制文本
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无法提取缩略图', canvas.width / 2, canvas.height / 2);
        
        // 转换为数据URL
        let mimeType: string;
        switch (format) {
          case 'webp':
            mimeType = 'image/webp';
            break;
          case 'png':
            mimeType = 'image/png';
            break;
          default:
            mimeType = 'image/jpeg';
        }
        
        const url = canvas.toDataURL(mimeType, quality);
        return { url };
      }
      
      // 计算缩放比例
      const scale = Math.min(
        maxWidth / frame.width,
        maxHeight / frame.height
      );
      
      // 设置canvas尺寸
      canvas.width = frame.width * scale;
      canvas.height = frame.height * scale;
      
      // 创建临时canvas来处理原始ImageData
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        throw new Error('无法创建临时Canvas上下文');
      }
      
      tempCanvas.width = frame.width;
      tempCanvas.height = frame.height;
      tempCtx.putImageData(frame, 0, 0);
      
      // 将原始图像缩放到目标尺寸
      ctx.drawImage(
        tempCanvas,
        0, 0, frame.width, frame.height,
        0, 0, canvas.width, canvas.height
      );
      
      // 增强图像对比度和亮度（可选）
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 简单的对比度增强
        const contrast = 1.1; // 增强对比度10%
        const brightness = 5; // 轻微提高亮度
        
        for (let i = 0; i < data.length; i += 4) {
          // 应用亮度和对比度
          data[i] = Math.max(0, Math.min(255, (data[i] - 128) * contrast + 128 + brightness));
          data[i+1] = Math.max(0, Math.min(255, (data[i+1] - 128) * contrast + 128 + brightness));
          data[i+2] = Math.max(0, Math.min(255, (data[i+2] - 128) * contrast + 128 + brightness));
        }
        
        ctx.putImageData(imageData, 0, 0);
      } catch (error) {
        
      }
      
      // 转换为数据URL
      let mimeType: string;
      switch (format) {
        case 'webp':
          mimeType = 'image/webp';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
        default:
          mimeType = 'image/jpeg';
      }
      
      const url = canvas.toDataURL(mimeType, quality);
      
      return { url };
    } catch (error) {
      
      // 创建错误占位图
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = options.maxWidth || 640;
        canvas.height = options.maxHeight || 360;
        
        // 填充红色背景表示错误
        ctx.fillStyle = '#881111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制错误文本
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('缩略图生成失败', canvas.width / 2, canvas.height / 2);
        
        const url = canvas.toDataURL('image/jpeg', 0.8);
        return { url };
      }
      
      throw error;
    }
  }

  /**
   * 验证 ImageData 是否有效
   */
  private isValidImageData(imageData: ImageData): boolean {
    try {
      // 基本结构检查
      if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
        
        return false;
      }

      // 尺寸检查
      if (imageData.width <= 0 || imageData.height <= 0) {
        
        return false;
      }

      // 数据长度检查
      const expectedLength = imageData.width * imageData.height * 4;
      if (imageData.data.length !== expectedLength) {
        
        return false;
      }

      // 🔧 优化的内容检查 - 更宽松的验证标准
      const data = imageData.data;
      let hasContent = false;
      let nonZeroPixels = 0;
      let totalBrightness = 0;
      let maxBrightness = 0;

      // 采样检查，避免检查所有像素
      const sampleRate = Math.max(1, Math.floor(data.length / 8000)); // 最多检查2000个像素
      let sampleCount = 0;

      for (let i = 0; i < data.length; i += 4 * sampleRate) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        sampleCount++;

        // 检查是否有非透明像素
        if (a > 0) {
          nonZeroPixels++;

          // 计算亮度
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          totalBrightness += brightness;
          maxBrightness = Math.max(maxBrightness, brightness);

          // 降低阈值，检查是否有任何可见内容
          if (r > 5 || g > 5 || b > 5) {
            hasContent = true;
          }
        }
      }

      const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 0;
      const transparentRatio = nonZeroPixels / sampleCount;

      // 更宽松的验证条件
      if (transparentRatio < 0.1) {
        console.warn('ImageData 透明度过高:', `${(transparentRatio * 100).toFixed(1)}%`);
        return false;
      }

      if (!hasContent && avgBrightness < 5) {
        console.warn('ImageData 内容过暗:', `平均亮度 ${avgBrightness.toFixed(1)}`);
        return false;
      }

      // 如果有基本的亮度变化，认为是有效的
      if (maxBrightness > 15) {
        return true;
      }

      return true;
    } catch (error) {
      
      return false;
    }
  }
}

export default ImageProcessor; 