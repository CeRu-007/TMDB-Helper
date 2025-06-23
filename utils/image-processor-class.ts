/**
 * ImageProcessor类 - 图像处理工具
 * 使用单例模式实现，确保整个应用中只有一个实例
 */

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
          console.log('图像处理器已初始化，跳过');
          resolve();
          return;
        }
        
        console.log('正在初始化图像处理器...');
        
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
              console.error('Worker错误:', error);
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
            console.error('Worker错误:', e.message);
            
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
              console.log('图像处理器初始化成功');
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
          console.error('创建Worker失败:', error);
          reject(error);
          
          // 标记为未初始化
          this.initialized = false;
          this.worker = null;
          this.initializationPromise = null;
        }
      } catch (error) {
        console.error('初始化图像处理器失败:', error);
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
            console.error(`任务 ${type} 处理超时，ID: ${taskId}`);
            reject(new Error(`任务处理超时: ${type}`));
          }
        }, timeoutDuration);
        
        // 注册回调
        this.taskCallbacks.set(taskId, (result) => {
          clearTimeout(timeoutId);
          
          if (result.error) {
            console.error(`任务 ${type} 执行错误:`, result.error);
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        });
        
        // 记录任务开始
        console.log(`开始处理任务: ${type}, ID: ${taskId}`);
        
        // 发送消息到Worker
        this.worker!.postMessage({
          type,
          taskId,
          ...data
        });
      } catch (error) {
        console.error(`发送任务失败: ${type}`, error);
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
    console.log('ImageProcessor 资源已释放');
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
   * 从视频提取帧
   * @param video 视频元素
   * @param options 提取选项
   * @returns 提取的帧数组
   */
  public async extractFramesFromVideo(
    video: HTMLVideoElement,
    options: {
      startTime?: number;
      frameCount?: number;
      interval?: 'uniform' | 'random';
      keepOriginalResolution?: boolean; // 保持原始分辨率
      enhancedFrameDiversity?: boolean; // 增强帧多样性
    }
  ): Promise<ImageData[]> {
    return new Promise<ImageData[]>((resolve, reject) => {
      try {
        console.log('开始提取视频帧，视频尺寸:', video.videoWidth, 'x', video.videoHeight);
        
        // 获取视频时长和设置
        const duration = video.duration;
        const startTime = options.startTime || 0;
        const frameCount = Math.min(options.frameCount || 10, 50); // 允许提取更多帧(30->50)以确保有足够的多样性
        const interval = options.interval || 'uniform';
        const keepOriginalResolution = options.keepOriginalResolution || false;
        const enhancedFrameDiversity = options.enhancedFrameDiversity !== undefined ? 
          options.enhancedFrameDiversity : true; // 默认启用增强多样性
        
        console.log(`视频长度: ${duration}秒, 开始时间: ${startTime}秒, 提取帧数: ${frameCount}, 间隔模式: ${interval}, 保持原始分辨率: ${keepOriginalResolution}, 增强多样性: ${enhancedFrameDiversity}`);
        
        // 创建一个隐藏的canvas用于绘制帧
        const canvas = document.createElement('canvas');
        
        // 设置canvas尺寸
        let scale = 1;
        
        if (keepOriginalResolution) {
          // 保持原始分辨率
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          console.log(`使用原始分辨率: ${canvas.width} x ${canvas.height}`);
        } else {
          // 对于大型视频，降低canvas尺寸以提高性能
          const maxDimension = 1280; // 限制最大尺寸
          
          if (video.videoWidth > maxDimension || video.videoHeight > maxDimension) {
            scale = maxDimension / Math.max(video.videoWidth, video.videoHeight);
            console.log(`视频尺寸过大，缩放比例: ${scale}`);
          }
          
          canvas.width = Math.floor(video.videoWidth * scale);
          canvas.height = Math.floor(video.videoHeight * scale);
          console.log(`使用缩放分辨率: ${canvas.width} x ${canvas.height}`);
        }
        
        const context = canvas.getContext('2d', { 
          alpha: false,  // 禁用alpha通道以提高性能
          willReadFrequently: true // 提示频繁读取以优化性能
        });
        
        if (!context) {
          reject(new Error('无法创建Canvas上下文'));
          return;
        }
        
        // 确保视频可以播放
        if (video.readyState < 2) {
          // 如果视频没准备好，监听loadeddata事件
          const loadHandler = () => {
            video.removeEventListener('loadeddata', loadHandler);
            video.removeEventListener('error', errorHandler);
            
            // 递归调用，此时视频已准备好
            this.extractFramesFromVideo(video, options)
              .then(resolve)
              .catch(reject);
          };
          
          const errorHandler = () => {
            video.removeEventListener('loadeddata', loadHandler);
            video.removeEventListener('error', errorHandler);
            reject(new Error('视频加载失败'));
          };
          
          video.addEventListener('loadeddata', loadHandler);
          video.addEventListener('error', errorHandler);
          return;
        }
        
        // 计算可用的视频时长（排除开始时间）
        const availableDuration = Math.max(0, duration - startTime);
        
        if (availableDuration <= 0 || isNaN(availableDuration)) {
          reject(new Error('无效的视频时长或开始时间'));
          return;
        }
        
        // 计算时间点
        const timePoints: number[] = [];
        
        // 增强帧多样性 - 确保最小时间间隔更大，防止提取到相同或相似帧
        const minTimeGap = enhancedFrameDiversity 
          ? Math.max(3.0, availableDuration / (frameCount * 1.5)) // 更大的间隔，至少3秒，增强多样性
          : Math.max(0.5, availableDuration / (frameCount * 3)); // 至少0.5秒间隔，标准模式
        
        // 用于记录已选择的场景特征，避免选择相似帧
        const selectedScenes: {timepoint: number, features?: number[]}[] = [];
        
        if (interval === 'uniform') {
          // 均匀分布 - 添加更大的随机偏移以避免完全一致的间隔
          const step = availableDuration / (frameCount - 1 || 1);
          for (let i = 0; i < frameCount; i++) {
            // 增强随机性，添加最多±30%的随机偏移，但确保不小于minTimeGap
            const randomOffset = enhancedFrameDiversity
              ? (Math.random() * 0.6 - 0.3) * step // 更大范围的随机性(30%)
              : (Math.random() * 0.2 - 0.1) * step;
            
            let timePoint = startTime + (i * step) + randomOffset;
            
            // 确保不超出视频范围
            timePoint = Math.max(startTime, Math.min(duration - 0.1, timePoint));
            
            // 避免与前一个时间点过于接近
            if (i > 0 && timePoint - timePoints[timePoints.length - 1] < minTimeGap) {
              timePoint = timePoints[timePoints.length - 1] + minTimeGap;
            }
            
            // 确保不超出视频范围
            if (timePoint < duration) {
              timePoints.push(timePoint);
              selectedScenes.push({timepoint: timePoint});
            }
          }
        } else if (interval === 'random') {
          // 随机分布 - 但确保时间点不会太接近
          // 先将视频分成更多的段落来增加选择的多样性
          const segments = frameCount * 3; // 创建更多段落以增加多样性(2->3)
          const segmentSize = availableDuration / segments;
          
          // 在每个段落中随机选择一个时间点
          const segmentIndices = Array.from({ length: segments }, (_, i) => i);
          
          // 打乱段落顺序
          for (let i = segmentIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [segmentIndices[i], segmentIndices[j]] = [segmentIndices[j], segmentIndices[i]];
          }
          
          // 选择前frameCount个段落
          const selectedSegments = segmentIndices.slice(0, frameCount);
          
          // 对选定的段落排序，保持时间顺序
          selectedSegments.sort((a, b) => a - b);
          
          // 在每个段落中选择一个随机时间点
          for (const segmentIndex of selectedSegments) {
            const segmentStart = startTime + (segmentIndex * segmentSize);
            const segmentEnd = segmentStart + segmentSize;
            
            // 使用更广的随机范围，但确保时间点不会重叠
            let timePoint = segmentStart + (Math.random() * 0.85 + 0.10) * segmentSize; // 0.9+0.05 -> 0.85+0.10
            
            // 确保不超出视频范围
            timePoint = Math.min(duration - 0.1, timePoint);
            
            // 避免与前一个时间点过于接近
            if (timePoints.length > 0 && timePoint - timePoints[timePoints.length - 1] < minTimeGap) {
              timePoint = timePoints[timePoints.length - 1] + minTimeGap;
            }
            
            // 确保不超出视频范围
            if (timePoint < duration) {
              timePoints.push(timePoint);
              selectedScenes.push({timepoint: timePoint});
            }
          }
        }
        
        // 确保我们有足够多不同的时间点
        if (timePoints.length < 2) {
          // 如果只有一个或没有时间点，添加一些额外的点
          const step = availableDuration / 4;
          for (let i = 1; i <= 3; i++) {
            const timePoint = startTime + (i * step);
            if (timePoint < duration && !timePoints.includes(timePoint)) {
              timePoints.push(timePoint);
            }
          }
        }
        
        // 打乱时间点顺序以减少连续相似帧
        if (interval === 'random') {
          for (let i = timePoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [timePoints[i], timePoints[j]] = [timePoints[j], timePoints[i]];
          }
        }
        
        console.log('提取视频帧的时间点:', timePoints);
        
        // 收集的帧
        const frames: ImageData[] = [];
        let errorCount = 0;
        const maxErrors = 3; // 允许的最大错误数
        
        // 使用批处理提高性能
        const batchSize = 3; // 每批处理的帧数
        
        // 批量提取帧
        const extractFrameBatch = async (startIndex: number): Promise<void> => {
          if (startIndex >= timePoints.length) {
            // 提取完成
            if (frames.length === 0) {
              reject(new Error('未能成功提取任何帧'));
              return;
            }
            resolve(frames);
            return;
          }
          
          const endIndex = Math.min(startIndex + batchSize, timePoints.length);
          const currentBatch = timePoints.slice(startIndex, endIndex);
          const batchPromises: Promise<ImageData | null>[] = [];
          
          // 为每个时间点创建提取帧的Promise
          for (let i = 0; i < currentBatch.length; i++) {
            batchPromises.push(extractSingleFrame(currentBatch[i]));
          }
          
          try {
            // 等待当前批次完成
            const batchResults = await Promise.all(batchPromises);
            
            // 添加成功提取的帧
            batchResults.forEach(frame => {
              if (frame) frames.push(frame);
            });
            
            // 处理下一批
            await extractFrameBatch(endIndex);
          } catch (error) {
            console.error('批量提取帧失败:', error);
            errorCount++;
            
            if (errorCount > maxErrors) {
              // 如果已经有足够的帧，即使有错误也继续
              if (frames.length >= Math.ceil(frameCount / 2)) {
                console.warn(`提取帧过程中发生错误，但已经提取了${frames.length}帧，继续处理`);
                resolve(frames);
              } else {
                reject(new Error('提取帧过程中发生太多错误'));
              }
            } else {
              // 尝试继续处理下一批
              await extractFrameBatch(endIndex);
            }
          }
        };
        
        // 提取单个时间点的帧
        const extractSingleFrame = (time: number): Promise<ImageData | null> => {
          return new Promise((resolveFrame, rejectFrame) => {
            // 设置超时处理
            const timeoutId = setTimeout(() => {
              video.removeEventListener('seeked', seekedHandler);
              video.removeEventListener('error', errorHandler);
              console.warn(`提取时间点 ${time} 的帧超时`);
              resolveFrame(null); // 返回null而不是拒绝，允许继续处理其他帧
            }, 10000); // 10秒超时
            
            // 设置视频当前时间
            video.currentTime = time;
            
            // 等待视频跳转完成
            const seekedHandler = () => {
              clearTimeout(timeoutId);
              video.removeEventListener('seeked', seekedHandler);
              video.removeEventListener('error', errorHandler);
              
              try {
                // 绘制当前帧到canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // 获取图像数据
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                
                // 如果启用了增强帧多样性，检查与已有帧的相似度
                if (enhancedFrameDiversity && frames.length > 0) {
                  // 检查是否与已有帧过于相似
                  const isTooSimilar = this.checkFrameSimilarity(imageData, frames, 0.75); // 降低阈值(0.8->0.75)更严格判断相似度
                  if (isTooSimilar) {
                    console.log(`时间点 ${time} 的帧与已有帧过于相似，尝试调整时间点`);
                    
                    // 尝试调整时间点，更大的时间偏移
                    const adjustedTime = time + (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 1.5); // 1.5-4.5秒偏移
                    
                    // 确保在视频范围内
                    if (adjustedTime > 0 && adjustedTime < video.duration) {
                      // 递归尝试新的时间点
                      video.currentTime = adjustedTime;
                      return;
                    }
                  }
                }
                
                resolveFrame(imageData);
              } catch (error) {
                console.error(`处理时间点 ${time} 的帧失败:`, error);
                resolveFrame(null);
              }
            };
            
            const errorHandler = () => {
              clearTimeout(timeoutId);
              video.removeEventListener('seeked', seekedHandler);
              video.removeEventListener('error', errorHandler);
              console.error(`视频跳转到时间点 ${time} 失败`);
              resolveFrame(null);
            };
            
            video.addEventListener('seeked', seekedHandler);
            video.addEventListener('error', errorHandler);
          });
        };
        
        // 开始批量提取
        extractFrameBatch(0).catch(error => {
          console.error('提取帧过程失败:', error);
          reject(error);
        });
        
      } catch (error) {
        console.error('提取视频帧失败:', error);
        reject(error);
      }
    });
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
      console.log(`开始分析 ${frames.length} 帧以找到最优 ${count} 帧`);
      
      // 如果帧数过多，先进行初步筛选以减轻计算负担
      let framesToAnalyze = frames;
      const maxFramesToAnalyze = 40; // 增加最大分析帧数(30->40)，以确保更好的选择
      
      if (frames.length > maxFramesToAnalyze) {
        console.log(`帧数过多 (${frames.length})，进行初步筛选`);
        // 均匀选择帧进行分析
        const step = Math.floor(frames.length / maxFramesToAnalyze);
        framesToAnalyze = [];
        for (let i = 0; i < frames.length; i += step) {
          framesToAnalyze.push(frames[i]);
        }
        console.log(`筛选后待分析帧数: ${framesToAnalyze.length}`);
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
              // 降低分析采样率以提高性能
              const effectiveSampleRate = Math.min(options.sampleRate || 2, 3);
              
              // 批量分析图像，使用简化的参数
              const results = await this.batchAnalyzeImage(frame, {
                sampleRate: effectiveSampleRate,
                subtitleDetectionStrength: options.subtitleDetectionStrength || 0.8,
                staticFrameThreshold: options.staticFrameThreshold || 0.8,
                simplifiedAnalysis: true // 添加简化分析标志
              });
              
              return {
                index: frames.indexOf(frame), // 获取原始帧数组中的索引
                originalIndex: originalIndex, // 保存在筛选后数组中的索引
                scores: {
                  staticScore: results.staticScore || 0.5,
                  subtitleScore: results.subtitleScore || 0.5,
                  peopleScore: results.peopleScore || 0.5,
                  emptyFrameScore: results.emptyFrameScore || 0.5,
                  diversityScore: results.diversityScore || 0.5
                }
              };
            } catch (error) {
              console.error(`分析帧 ${originalIndex} 失败:`, error);
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
          console.error(`处理帧批次 ${i/batchSize + 1} 失败:`, error);
          // 继续处理其他批次，不要中断整个过程
        }
      }
      
      // 如果没有成功分析任何帧，返回基本结果
      if (frameAnalysis.length === 0) {
        console.warn('没有成功分析任何帧，返回基本结果');
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
      
      console.log(`成功分析 ${frameAnalysis.length} 帧`);
      
      // ==================== 新增: 优先检测人物帧并优化字幕 ====================
      
      // 1. 先按人物分数对帧排序，找出包含人物的高质量帧
      const peopleFrames = [...frameAnalysis].sort((a, b) => 
        b.scores.peopleScore - a.scores.peopleScore
      ).filter(frame => frame.scores.peopleScore > 0.6); // 选择人物分数较高的帧
      
      console.log(`找到 ${peopleFrames.length} 个包含人物的高质量帧`);
      
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
            console.error('分析相邻帧失败:', error);
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
          console.log(`找到帧 ${peopleFrame.index} 的无字幕替代帧 ${bestAlternative.index}`);
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
      
      console.log(`优化后的人物帧数量: ${optimizedFrames.length}`);
      
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
      
      console.log(`最终选择了 ${finalSelectedFrames.length} 个帧`);
      
      // 根据索引排序，保持时间顺序
      finalSelectedFrames.sort((a, b) => a.index - b.index);
      
      // 移除临时属性，返回最终结果
      return {
        frames: finalSelectedFrames.map(({ index, scores }) => ({ index, scores }))
      };
    } catch (error) {
      console.error('分析帧失败:', error);
      
      // 发生错误时，尝试返回最少一帧
      if (frames.length > 0) {
        console.warn('由于分析错误，返回第一帧作为备选');
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
        console.warn('检测到全黑图像，生成替代图像');
        
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
        console.warn('增强图像失败，继续使用原始图像:', error);
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
      console.error('生成缩略图失败:', error);
      
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
}

export default ImageProcessor; 