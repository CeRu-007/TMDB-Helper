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
    if (this.initialized) return;

    try {
      // 创建Web Worker
      if (typeof window !== 'undefined') {
        this.worker = new Worker(new URL('../utils/image-processing-worker.ts', import.meta.url));
        
        // 设置消息处理程序
        this.worker.onmessage = (e: MessageEvent) => {
          const { taskId, ...result } = e.data;
          
          // 如果存在对应的回调，调用它并从Map中移除
          if (taskId && this.taskCallbacks.has(taskId)) {
            const callback = this.taskCallbacks.get(taskId);
            if (callback) callback(result);
            this.taskCallbacks.delete(taskId);
          }
        };
        
        this.initialized = true;
        console.log('ImageProcessor 初始化成功');
      } else {
        console.warn('ImageProcessor 无法在服务器端初始化');
      }
    } catch (error) {
      console.error('初始化 ImageProcessor 失败:', error);
      throw new Error('初始化图像处理器失败');
    }
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
   * 分析图像的字幕分数
   * @param imageData 图像数据
   * @param detectionStrength 字幕检测强度
   */
  public async analyzeSubtitleScore(imageData: ImageData, detectionStrength: number = 0.8): Promise<number> {
    return this.sendTask('subtitleScore', { 
      imageData, 
      width: imageData.width, 
      height: imageData.height, 
      options: { subtitleDetectionStrength: detectionStrength } 
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
   * 发送任务到Web Worker并返回Promise
   * @param type 任务类型
   * @param data 任务数据
   */
  private sendTask(type: string, data: any): Promise<any> {
    if (!this.worker || !this.initialized) {
      throw new Error('ImageProcessor 未初始化');
    }

    return new Promise((resolve, reject) => {
      try {
        // 生成唯一任务ID
        const taskId = `task_${++this.taskCounter}_${Date.now()}`;
        
        // 存储回调
        this.taskCallbacks.set(taskId, (result) => {
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.score !== undefined ? result.score : result.results);
          }
        });
        
        // 发送消息到Worker
        // 确保worker非空
        if (this.worker) {
          this.worker.postMessage({
            type,
            taskId,
            ...data
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.taskCallbacks.clear();
    this.initialized = false;
    ImageProcessor.instance = null;
  }

  /**
   * 从视频中提取帧
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
    }
  ): Promise<ImageData[]> {
    try {
      const startTime = options.startTime || 0;
      const frameCount = options.frameCount || 10;
      const interval = options.interval || 'uniform';
      
      // 创建canvas用于提取帧
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }
      
      // 确保视频已经加载完成并且可以播放
      if (video.readyState < 2) {
        console.log('视频尚未完全加载，等待加载...');
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            video.removeEventListener('loadeddata', loadHandler);
            reject(new Error('视频加载超时'));
          }, 30000);
          
          const loadHandler = () => {
            clearTimeout(timeoutId);
            video.removeEventListener('loadeddata', loadHandler);
            resolve();
          };
          
          video.addEventListener('loadeddata', loadHandler);
          
          // 如果视频已经加载，直接解析
          if (video.readyState >= 2) {
            clearTimeout(timeoutId);
            resolve();
          }
        });
      }
      
      // 确保视频尺寸有效
      if (video.videoWidth <= 0 || video.videoHeight <= 0) {
        throw new Error('视频尺寸无效');
      }
      
      // 设置canvas尺寸
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // 计算实际可用时长，从startTime到视频结束
      const availableDuration = Math.max(0, video.duration - startTime);
      
      // 如果可用时长很短，但要求的帧数很多，调整提取策略
      if (availableDuration > 0 && frameCount > 0) {
        const frames: ImageData[] = [];
        
        // 如果视频很短但要求很多帧，我们会生成更密集的时间点
        // 最小时间间隔（秒），避免时间点过于接近
        const minTimeInterval = 0.1; // 100毫秒
        
        // 计算实际可提取的帧数，考虑最小时间间隔
        const maxPossibleFrames = Math.max(1, Math.floor(availableDuration / minTimeInterval));
        
        // 决定实际尝试提取的帧数
        const actualFramesToExtract = Math.min(frameCount, maxPossibleFrames);
        console.log(`视频可用时长: ${availableDuration}秒, 请求帧数: ${frameCount}, 实际可提取: ${actualFramesToExtract}`);
        
        // 为了保证帧的多样性，优先使用均匀分布
        const timePoints: number[] = [];
        
        // 生成时间点
        if (interval === 'uniform') {
          // 均匀分布时间点
          const step = actualFramesToExtract > 1 ? 
            availableDuration / (actualFramesToExtract - 1) : 0;
          
          for (let i = 0; i < actualFramesToExtract; i++) {
            timePoints.push(startTime + i * step);
          }
        } else {
          // 随机分布时间点
          for (let i = 0; i < actualFramesToExtract; i++) {
            timePoints.push(startTime + Math.random() * availableDuration);
          }
          
          // 排序时间点，避免来回跳跃
          timePoints.sort((a, b) => a - b);
        }
        
        // 如果实际可提取的帧数少于请求的帧数，我们通过重复采样某些关键点来补充
        if (actualFramesToExtract < frameCount && actualFramesToExtract > 0) {
          console.log(`需要补充帧: ${frameCount - actualFramesToExtract}`);
          
          // 计算需要补充的帧数
          const additionalFrames = frameCount - actualFramesToExtract;
          
          // 从已有时间点中选择关键点重复采样
          // 策略：优先选择视频开始、中间和结束附近的点
          const keyTimePoints = [
            timePoints[0], // 开始
            timePoints[Math.floor(timePoints.length / 2)], // 中间
            timePoints[timePoints.length - 1] // 结束
          ];
          
          // 对每个关键点周围进行微小偏移采样
          for (let i = 0; i < additionalFrames; i++) {
            const baseTimePoint = keyTimePoints[i % keyTimePoints.length];
            // 添加±100ms的随机偏移，但确保在视频范围内
            const offset = (Math.random() - 0.5) * 0.2; // -0.1s 到 0.1s 的偏移
            const newTimePoint = Math.max(startTime, Math.min(video.duration, baseTimePoint + offset));
            timePoints.push(newTimePoint);
          }
          
          // 重新排序时间点
          timePoints.sort((a, b) => a - b);
        }
        
        // 预先播放视频一小段，确保解码器已启动
        console.log('预先播放视频以确保解码器启动');
        try {
          video.currentTime = startTime;
          await video.play();
          // 短暂播放后暂停
          setTimeout(() => {
            video.pause();
          }, 100);
        } catch (error) {
          console.warn('视频预播放失败，这可能导致黑屏:', error);
          // 继续处理，因为某些浏览器可能不允许自动播放
        }
        
        // 提取帧
        for (const timePoint of timePoints) {
          try {
            // 设置视频时间
            video.currentTime = timePoint;
            
            // 等待视频定位到指定时间
            await new Promise<void>((resolve, reject) => {
              const seeked = () => {
                video.removeEventListener('seeked', seeked);
                resolve();
              };
              
              // 添加错误处理
              const errorHandler = () => {
                video.removeEventListener('error', errorHandler);
                reject(new Error('视频定位失败'));
              };
              
              // 添加超时处理
              const timeoutId = setTimeout(() => {
                video.removeEventListener('seeked', seeked);
                video.removeEventListener('error', errorHandler);
                reject(new Error('视频定位超时'));
              }, 5000);
              
              video.addEventListener('seeked', () => {
                clearTimeout(timeoutId);
                seeked();
              });
              
              video.addEventListener('error', () => {
                clearTimeout(timeoutId);
                errorHandler();
              });
              
              // 如果视频已经在正确的位置，直接解析
              if (Math.abs(video.currentTime - timePoint) < 0.1) {
                clearTimeout(timeoutId);
                resolve();
              }
            });
            
            // 为了解决黑屏问题，确保视频帧已经完全渲染
            // 添加小延迟允许视频帧完全渲染
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // 绘制视频帧到canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 获取图像数据前先检查画布是否为空白
            const centerPixel = ctx.getImageData(
              Math.floor(canvas.width / 2),
              Math.floor(canvas.height / 2),
              1, 1
            );
            const isBlackPixel = 
              centerPixel.data[0] <= 5 && 
              centerPixel.data[1] <= 5 && 
              centerPixel.data[2] <= 5;
            
            // 如果中心像素几乎是黑色，可能是黑屏，尝试额外等待并重新绘制
            if (isBlackPixel) {
              console.log(`检测到可能的黑屏 (时间点: ${timePoint}), 尝试重新绘制`);
              // 额外等待
              await new Promise(resolve => setTimeout(resolve, 100));
              // 重新绘制
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            
            // 获取图像数据
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // 进行额外验证，确保不是纯黑图像
            let isEntirelyBlack = true;
            // 采样检查图像是否全黑（每10个像素采样一次）
            const sampleRate = 10;
            for (let y = 0; y < imageData.height && isEntirelyBlack; y += sampleRate) {
              for (let x = 0; x < imageData.width && isEntirelyBlack; x += sampleRate) {
                const offset = (y * imageData.width + x) * 4;
                // 如果任何一个像素不是黑色，则图像不是全黑的
                if (imageData.data[offset] > 5 || 
                    imageData.data[offset + 1] > 5 || 
                    imageData.data[offset + 2] > 5) {
                  isEntirelyBlack = false;
                  break;
                }
              }
            }
            
            if (isEntirelyBlack) {
              console.warn(`时间点 ${timePoint}s 提取的帧是全黑的，尝试调整时间点`);
              // 尝试调整时间点，向前移动100ms再次尝试
              video.currentTime = timePoint + 0.1;
              await new Promise<void>(resolve => {
                video.onseeked = () => {
                  video.onseeked = null;
                  resolve();
                };
              });
              
              // 重新绘制
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              // 重新获取图像数据
              const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              frames.push(newImageData);
            } else {
              frames.push(imageData);
            }
          } catch (error) {
            console.warn(`提取时间点 ${timePoint}s 的帧失败:`, error);
            // 继续处理下一帧，而不是完全失败
          }
        }
        
        // 如果成功提取了至少一帧，则返回
        if (frames.length > 0) {
          console.log(`成功提取 ${frames.length} 帧，请求数量为 ${frameCount}`);
          return frames;
        }
        
        throw new Error('未能提取任何帧');
      } else {
        throw new Error(`无效的视频参数：时长=${video.duration}s，开始时间=${startTime}s，帧数=${frameCount}`);
      }
    } catch (error) {
      console.error('提取视频帧失败:', error);
      throw error;
    }
  }

  /**
   * 找出最佳帧
   * @param frames 帧数组
   * @param count 需要的帧数量
   * @param preferences 偏好设置
   * @param options 分析选项
   * @returns 最佳帧数组
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
      };
    }>;
  }> {
    try {
      // 分析每一帧
      const frameAnalysis = await Promise.all(
        frames.map(async (frame, index) => {
          // 批量分析图像
          const results = await this.batchAnalyzeImage(frame, {
            sampleRate: options.sampleRate || 2,
            subtitleDetectionStrength: options.subtitleDetectionStrength || 0.8,
            staticFrameThreshold: options.staticFrameThreshold || 0.8
          });
          
          return {
            index,
            scores: {
              staticScore: results.staticScore || 0.5,
              subtitleScore: results.subtitleScore || 0.5,
              peopleScore: results.peopleScore || 0.5,
              emptyFrameScore: results.emptyFrameScore || 0.5
            }
          };
        })
      );
      
      // 计算综合得分
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
        
        return {
          ...frame,
          totalScore
        };
      });
      
      // 按总分排序所有帧
      const sortedFrames = [...scoredFrames].sort((a, b) => b.totalScore - a.totalScore);
      
      // 如果有足够的帧，直接返回请求数量的帧
      if (sortedFrames.length >= count) {
        return {
          frames: sortedFrames.slice(0, count).map(({ index, scores }) => ({ index, scores }))
        };
      }
      
      // 否则返回所有可用帧
      console.warn(`警告：请求 ${count} 帧，但只有 ${sortedFrames.length} 帧可用`);
      return {
        frames: sortedFrames.map(({ index, scores }) => ({ index, scores }))
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