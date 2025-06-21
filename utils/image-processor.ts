// 图像处理工具类
// 用于管理图像分析Web Worker和提供高性能图像处理功能

// 移除uuid依赖，使用内置方法生成唯一ID
// import { v4 as uuidv4 } from "uuid";

interface AnalysisOptions {
  sampleRate?: number;
  subtitleDetectionStrength?: number;
  staticFrameThreshold?: number;
}

interface ImageAnalysisResult {
  staticScore: number;
  subtitleScore: number;
  peopleScore: number;
  emptyFrameScore?: number; // 空镜头评分：值越高表示越可能是空镜头/纯色背景/转场
  edgeMap?: Uint8Array;
  colorProfile?: {
    dominantColors: number[];
    colorVariety: number;
  };
}

type AnalysisCallback = (result: ImageAnalysisResult) => void;

// 缓存管理，避免重复创建Worker和分析相同图像
interface CacheEntry {
  timestamp: number;
  result: ImageAnalysisResult;
}

interface WorkerResponse {
  type: 'staticScore' | 'subtitleScore' | 'peopleScore' | 'batchAnalysis';
  score?: number;
  results?: ImageAnalysisResult;
  taskId?: string;
  error?: string;
}

// 单例模式图像处理器
class ImageProcessor {
  private static instance: ImageProcessor;
  private worker: Worker | null = null;
  private pendingTasks: Map<string, {
    resolve: (result: ImageAnalysisResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private resultCache: Map<string, CacheEntry> = new Map();
  private MAX_CACHE_SIZE = 100;
  private MAX_CACHE_AGE_MS = 5 * 60 * 1000; // 5分钟缓存过期
  private canvasPool: HTMLCanvasElement[] = [];
  private offscreenCanvas: OffscreenCanvas | null = null;
  private isInitialized = false;
  private workerInitPromise: Promise<void> | null = null;
  private TASK_TIMEOUT_MS = 30000; // 任务超时时间：增加到30秒
  private useWorker = true; // 是否使用Worker，在出错时可以设为false降级处理

  private constructor() {
    // 私有构造函数，防止直接实例化
  }

  public static getInstance(): ImageProcessor {
    if (!ImageProcessor.instance) {
      ImageProcessor.instance = new ImageProcessor();
    }
    return ImageProcessor.instance;
  }

  // 生成唯一ID (替代uuid库)
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // 初始化处理器
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.workerInitPromise) {
      return this.workerInitPromise;
    }
    
    this.workerInitPromise = new Promise<void>((resolve, reject) => {
      try {
        // 添加超时机制
        const initTimeout = setTimeout(() => {
          console.warn('图像处理器初始化超时，将使用降级处理方式');
          this.useWorker = false;
          this.isInitialized = true;
          resolve(); // 即使超时也resolve，但标记不使用Worker
        }, 5000); // 5秒超时
        
        // 创建Web Worker
        try {
          this.worker = new Worker(
            new URL('../utils/image-processing-worker.ts', import.meta.url),
            { type: 'module' }
          );
        } catch (workerError) {
          console.error('创建Web Worker失败，将使用降级处理方式:', workerError);
          this.useWorker = false;
          clearTimeout(initTimeout);
          this.isInitialized = true;
          resolve();
          return;
        }

        // 配置消息处理
        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const response = e.data;
          
          if (response.error) {
            console.error('Image processing worker error:', response.error);
            return;
          }

          const taskId = response.taskId;
          if (!taskId || !this.pendingTasks.has(taskId)) {
            return;
          }

          const task = this.pendingTasks.get(taskId)!;
          clearTimeout(task.timeout); // 清除超时计时器
          
          if (response.type === 'batchAnalysis') {
            task.resolve(response.results as ImageAnalysisResult);
          } else if (response.score !== undefined) {
            // 创建一个临时结果对象
            const result: ImageAnalysisResult = {
              staticScore: 0,
              subtitleScore: 0,
              peopleScore: 0
            };
            
            // 根据类型设置相应的分数
            switch (response.type) {
              case 'staticScore':
                result.staticScore = response.score;
                break;
              case 'subtitleScore':
                result.subtitleScore = response.score;
                break;
              case 'peopleScore':
                result.peopleScore = response.score;
                break;
            }
            
            task.resolve(result);
          }
          
          this.pendingTasks.delete(taskId);
        };
        
        // 处理Worker错误
        this.worker.onerror = (error) => {
          console.error('Web Worker错误，将使用降级处理方式:', error);
          this.useWorker = false;
          
          // 拒绝所有待处理任务
          for (const [taskId, task] of this.pendingTasks.entries()) {
            clearTimeout(task.timeout);
            task.reject(new Error('Worker处理失败'));
            this.pendingTasks.delete(taskId);
          }
          
          clearTimeout(initTimeout);
          this.isInitialized = true;
          resolve(); // 仍然resolve，但标记不使用Worker
        };

        // 创建离屏Canvas (如果浏览器支持)
        if (typeof OffscreenCanvas !== 'undefined') {
          try {
            this.offscreenCanvas = new OffscreenCanvas(1, 1);
          } catch (error) {
            console.warn('OffscreenCanvas不可用:', error);
            // 继续，这不是关键功能
          }
        }
        
        // 发送测试消息确认Worker正常工作
        const testTaskId = this.generateUniqueId();
        
        // 创建一个小的测试数据
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 10;
        testCanvas.height = 10;
        const testCtx = testCanvas.getContext('2d');
        if (!testCtx) {
          throw new Error('无法创建Canvas上下文');
        }
        const testImageData = testCtx.getImageData(0, 0, 10, 10);
        
        // 克隆数据以避免transferable objects问题
        const clonedData = new Uint8ClampedArray(testImageData.data);
        const clonedImageData = new ImageData(clonedData, 10, 10);
        
        // 发送测试消息
        this.worker.postMessage({
          type: 'staticScore',
          imageData: clonedImageData,
          width: 10,
          height: 10,
          taskId: testTaskId
        });
        
        // 设置短超时，如果Worker没有响应则降级
        setTimeout(() => {
          if (this.useWorker) {
            clearTimeout(initTimeout);
            this.isInitialized = true;
            resolve();
          }
        }, 1000);
        
      } catch (error) {
        console.error('Failed to initialize image processor:', error);
        this.useWorker = false;
        this.isInitialized = true;
        this.workerInitPromise = null;
        reject(error);
      }
    });
    
    return this.workerInitPromise;
  }

  // 分析图像
  public async analyzeImage(
    imageData: ImageData | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    options: AnalysisOptions = {}
  ): Promise<ImageAnalysisResult> {
    await this.initialize();

    // 处理不同类型的输入数据
    const processedImageData = await this.prepareImageData(imageData);
    
    // 计算缓存键
    const cacheKey = this.generateCacheKey(processedImageData, options);
    
    // 检查缓存
    const cachedResult = this.checkCache(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // 如果Worker不可用，使用主线程处理
    if (!this.useWorker || !this.worker) {
      // 使用简化的算法在主线程中处理
      const result = this.analyzeImageInMainThread(processedImageData, options);
      this.cacheResult(cacheKey, result);
      return result;
    }

    // 创建任务ID
    const taskId = this.generateUniqueId();

    // 创建Promise以等待Worker响应
    const resultPromise = new Promise<ImageAnalysisResult>((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        if (this.pendingTasks.has(taskId)) {
          this.pendingTasks.delete(taskId);
          console.warn('图像分析任务超时，将使用主线程处理');
          
          // 降级到主线程处理
          const result = this.analyzeImageInMainThread(processedImageData, options);
          resolve(result);
        }
      }, this.TASK_TIMEOUT_MS);
      
      this.pendingTasks.set(taskId, { resolve, reject, timeout });
    });

    try {
      // 克隆数据以避免transferable objects问题
      const clonedData = new Uint8ClampedArray(processedImageData.data);
      const clonedImageData = new ImageData(clonedData, processedImageData.width, processedImageData.height);
      
      // 发送数据到Worker进行处理
      this.worker!.postMessage({
        type: 'batchAnalysis',
        imageData: clonedImageData,
        width: processedImageData.width,
        height: processedImageData.height,
        options,
        taskId
      }); // 不再使用transferable objects
    } catch (error) {
      console.error('发送数据到Worker失败:', error);
      
      // 清理任务
      if (this.pendingTasks.has(taskId)) {
        const { timeout } = this.pendingTasks.get(taskId)!;
        clearTimeout(timeout);
        this.pendingTasks.delete(taskId);
      }
      
      // 降级到主线程处理
      return this.analyzeImageInMainThread(processedImageData, options);
    }

    // 等待结果
    try {
      const result = await resultPromise;
      
      // 缓存结果
      this.cacheResult(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Worker分析图像失败:', error);
      
      // 降级到主线程处理
      return this.analyzeImageInMainThread(processedImageData, options);
    }
  }
  
  // 在主线程中进行图像分析的方法
  private analyzeImageInMainThread(imageData: ImageData, options: AnalysisOptions): ImageAnalysisResult {
    try {
      // 使用简化的算法在主线程中处理
      const sampleRate = options.sampleRate || 2;
      
      // 计算静态分数
      const staticScore = this.calculateStaticScoreInMainThread(imageData, sampleRate);
      
      // 计算字幕分数
      const subtitleScore = this.detectSubtitlesInMainThread(imageData);
      
      // 计算人物分数
      const peopleScore = this.detectPeopleInMainThread(imageData);
      
      // 计算空镜头分数
      const emptyFrameScore = this.detectEmptyFrameInMainThread(imageData);
      
      // 返回结果
      return {
        staticScore,
        subtitleScore,
        peopleScore,
        emptyFrameScore
      };
    } catch (error) {
      console.error('主线程图像分析失败:', error);
      // 返回默认值
      return {
        staticScore: 0.5,
        subtitleScore: 0.5,
        peopleScore: 0.5,
        emptyFrameScore: 0.5
      };
    }
  }
  
  // 主线程中计算静态分数的方法
  private calculateStaticScoreInMainThread(imageData: ImageData, sampleRate: number = 2): number {
    const { width, height, data } = imageData;
    
    // 分析特征
    const features = {
      edgeDensity: 0,          // 边缘密度
      colorDiversity: 0,       // 颜色多样性
      contentRichness: 0,      // 内容丰富度
      uniformityScore: 0       // 均匀性评分
    };
    
    // 1. 边缘密度分析
    let edgeCount = 0;
    let totalPixels = 0;
    const stride = Math.max(1, Math.floor(4 * sampleRate)); // 考虑每像素4个通道
    
    // 使用2D采样而非1D，更好地捕获图像特征
    for (let y = 0; y < height; y += sampleRate) {
      const rowOffset = y * width * 4;
      let lastBrightness = -1;
      
      for (let x = 0; x < width; x += sampleRate) {
        const pixelOffset = rowOffset + (x * 4);
        if (pixelOffset >= data.length - 4) continue;
        
        const r = data[pixelOffset];
        const g = data[pixelOffset + 1];
        const b = data[pixelOffset + 2];
        
        // 计算像素亮度 - 使用更准确的亮度公式
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // 检测水平边缘
        if (lastBrightness >= 0) {
          if (Math.abs(brightness - lastBrightness) > 25) {
            edgeCount++;
          }
        }
        
        // 更新上一个亮度值
        lastBrightness = brightness;
        totalPixels++;
      }
    }
    
    // 计算边缘密度
    const edgeDensity = edgeCount / totalPixels;
    features.edgeDensity = edgeDensity;
    
    // 2. 颜色多样性分析
    const colorHistogram: {[key: string]: number} = {};
    
    // 采样计算颜色分布
    for (let i = 0; i < data.length; i += 4 * sampleRate * 2) {
      if (i >= data.length - 4) break;
      
      const r = Math.floor(data[i] / 32) * 32;     // 量化为8个区间
      const g = Math.floor(data[i+1] / 32) * 32;
      const b = Math.floor(data[i+2] / 32) * 32;
      
      const colorKey = `${r},${g},${b}`;
      colorHistogram[colorKey] = (colorHistogram[colorKey] || 0) + 1;
    }
    
    // 计算颜色多样性 (熵)
    let entropy = 0;
    const totalColors = Object.values(colorHistogram).reduce((sum, val) => sum + val, 0);
    
    for (const color of Object.values(colorHistogram)) {
      const p = color / totalColors;
      entropy -= p * Math.log2(p);
    }
    
    // 标准化熵值到0-1范围
    features.colorDiversity = Math.min(1, entropy / 3);
    
    // 计算静态分数 (边缘越少越静态)
    return Math.max(0, 1 - (edgeDensity * 10));
  }

  // 主线程中检测字幕的方法 - 更新为增强版算法
  private detectSubtitlesInMainThread(imageData: ImageData): number {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // 定义多个检测区域，更精细地划分视频帧
    const regions = [
      { startY: Math.floor(height * 0.80), endY: height, weight: 0.50 },      // 底部区域（最高权重）
      { startY: Math.floor(height * 0.70), endY: Math.floor(height * 0.80), weight: 0.20 }, // 底部上方区域
      { startY: Math.floor(height * 0.05), endY: Math.floor(height * 0.15), weight: 0.15 }, // 顶部区域
      { startY: Math.floor(height * 0.15), endY: Math.floor(height * 0.25), weight: 0.10 }, // 顶部下方区域
      { startY: Math.floor(height * 0.40), endY: Math.floor(height * 0.60), weight: 0.05 }  // 中间区域（最低权重）
    ];
    
    // 用于存储各种字幕特征的检测结果
    const results = {
      textPatterns: 0,        // 文本模式特征（如规则的文本行）
      contrastRegions: 0,     // 高对比度区域
      horizontalEdges: 0,     // 水平边缘（文字的主要特征）
      verticalEdges: 0,       // 垂直边缘（文字的次要特征）
      colorPatterns: 0,       // 颜色模式（如字幕背景）
      textureUniformity: 0,   // 纹理均匀性（字幕通常有一致的纹理）
      regularSpacing: 0,      // 规则间距（字符间距通常很规则）
      edgeRatio: 0,           // 边缘比例（字幕通常有特定的水平/垂直边缘比例）
      boxDetection: 0,        // 字幕框检测
      verticalAlignment: 0,   // 垂直对齐检测
      temporalConsistency: 0, // 时间一致性（预留，需要多帧信息）
      totalPixelsAnalyzed: 0  // 分析的总像素数
    };
    
    // 字幕背景色检测 - 检测常见的字幕背景色
    const subtitleBackgrounds = [
      {r: 0, g: 0, b: 0, a: 128, name: "半透明黑"}, // 半透明黑色背景
      {r: 0, g: 0, b: 0, a: 255, name: "纯黑"}, // 纯黑色背景
      {r: 128, g: 128, b: 128, a: 128, name: "半透明灰"}, // 半透明灰色背景
      {r: 255, g: 255, b: 255, a: 128, name: "半透明白"},
    ];
    
    // 字幕文本颜色检测 - 检测常见的字幕文本颜色
    const subtitleTextColors = [
      {r: 255, g: 255, b: 255, name: "白色"},
      {r: 255, g: 255, b: 0, name: "黄色"},
      {r: 0, g: 255, b: 255, name: "青色"},
      {r: 0, g: 0, b: 0, name: "黑色"},
      {r: 255, g: 0, b: 0, name: "红色"},
      {r: 0, g: 255, b: 0, name: "绿色"},
      {r: 0, g: 0, b: 255, name: "蓝色"},
      {r: 255, g: 128, b: 0, name: "橙色"},
      {r: 255, g: 0, b: 255, name: "紫色"},
    ];
    
    // 分析每个区域
    for (const region of regions) {
      // 区域特征计数器
      let regionTextPatterns = 0;
      let regionContrastPixels = 0;
      let regionHorizontalEdges = 0;
      let regionVerticalEdges = 0;
      let regionColorPatterns = 0;
      let regionTextureUniformity = 0;
      let regionPixels = 0;
      let regionBoxDetection = 0; // 字幕框检测
      
      // 存储上一行的亮度值，用于检测垂直边缘
      const prevRowBrightness: number[] = new Array(width).fill(-1);
      
      // 用于检测文本模式的变量
      let linePatternStrength = 0;
      let lastLinePatternStrength = 0;
      let patternConsistencyCount = 0;
      
      // 用于检测规则间距的变量
      const edgePositions: number[][] = [];
      
      // 用于字幕框检测的变量
      let consecutiveUniformRows = 0;
      let maxConsecutiveUniformRows = 0;
      let lastRowUniform = false;
      
      // 颜色聚类分析
      const colorClusters: {[key: string]: number} = {};
      
      // 分析区域内的每一行
      for (let y = region.startY; y < region.endY; y++) {
        let lastBrightness = -1;
        let horizontalEdgeCount = 0;
        let rowBrightValues: number[] = [];
        let rowEdgePositions: number[] = [];
        
        // 行的均匀性分析变量
        let rowUniformity = 0;
        let brightPixels = 0;
        let darkPixels = 0;
        
        // 分析该行的每个像素
        for (let x = 0; x < width; x += 1) { // 减少跳跃采样以提高准确性
          const i = (y * width + x) * 4;
          if (i >= data.length - 4) continue;
          
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3]; // 考虑透明度
          
          // 计算亮度
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          rowBrightValues.push(brightness);
          
          // 颜色聚类
          // 简化的颜色量化，将RGB值归类到16个区间
          const colorKey = `${Math.floor(r/16)},${Math.floor(g/16)},${Math.floor(b/16)}`;
          colorClusters[colorKey] = (colorClusters[colorKey] || 0) + 1;
          
          // 检测高对比度区域（可能是字幕）
          if (brightness > 200) {
            brightPixels++;
          } else if (brightness < 50) {
            darkPixels++;
          }
          
          // 检测字幕背景色
          for (const bg of subtitleBackgrounds) {
            // 允许一定的颜色偏差
            if (Math.abs(r - bg.r) < 30 && 
                Math.abs(g - bg.g) < 30 && 
                Math.abs(b - bg.b) < 30 &&
                (bg.a === 255 || a < 240)) { // 考虑透明度
              regionColorPatterns += 0.5;
              break;
            }
          }
          
          // 检测字幕文本颜色
          for (const textColor of subtitleTextColors) {
            // 允许一定的颜色偏差
            if (Math.abs(r - textColor.r) < 30 && 
                Math.abs(g - textColor.g) < 30 && 
                Math.abs(b - textColor.b) < 30) {
              regionColorPatterns += 1;
              break;
            }
          }
          
          // 检测水平对比度（字幕文字特征）
          if (lastBrightness >= 0) {
            const horizontalContrast = Math.abs(brightness - lastBrightness);
            if (horizontalContrast > 40) { // 降低阈值以捕获更多边缘
              horizontalEdgeCount++;
              rowEdgePositions.push(x); // 记录边缘位置
            }
          }
          
          // 检测垂直对比度
          if (prevRowBrightness[x] >= 0) {
            const verticalContrast = Math.abs(brightness - prevRowBrightness[x]);
            if (verticalContrast > 40) {
              regionVerticalEdges++;
            }
          }
          
          // 更新上一个亮度值
          lastBrightness = brightness;
          prevRowBrightness[x] = brightness;
          
          regionPixels++;
        }
        
        // 分析行的亮度分布，计算纹理均匀性
        if (rowBrightValues.length > 10) {
          const sortedValues = [...rowBrightValues].sort((a, b) => a - b);
          const median = sortedValues[Math.floor(sortedValues.length / 2)];
          let uniformCount = 0;
          
          // 计算接近中值的像素比例
          for (const val of rowBrightValues) {
            if (Math.abs(val - median) < 25) { // 降低阈值以更严格地定义均匀性
              uniformCount++;
            }
          }
          
          // 如果大部分像素亮度接近，说明纹理均匀
          const rowUniformityScore = uniformCount / rowBrightValues.length;
          if (rowUniformityScore > 0.75) {
            regionTextureUniformity++;
            
            // 字幕框检测
            if (!lastRowUniform) {
              consecutiveUniformRows = 1;
            } else {
              consecutiveUniformRows++;
            }
            lastRowUniform = true;
            
            if (consecutiveUniformRows > maxConsecutiveUniformRows) {
              maxConsecutiveUniformRows = consecutiveUniformRows;
            }
          } else {
            lastRowUniform = false;
          }
        }
        
        // 分析该行的文本模式
        if (horizontalEdgeCount > 0) {
          // 计算该行的文本模式强度
          const currentLinePatternStrength = horizontalEdgeCount / width;
          
          // 检测连续行的一致性（字幕通常有一致的文本模式）
          if (Math.abs(currentLinePatternStrength - lastLinePatternStrength) < 0.08 && 
              currentLinePatternStrength > 0.04) {
            patternConsistencyCount++;
          }
          
          lastLinePatternStrength = currentLinePatternStrength;
        }
        
        // 如果该行有足够的水平边缘，可能是文本
        if (horizontalEdgeCount > width * 0.025) {
          regionHorizontalEdges++;
          
          // 保存边缘位置用于分析规则间距
          if (rowEdgePositions.length > 3) { // 至少需要几个边缘才能分析间距
            edgePositions.push(rowEdgePositions);
          }
        }
        
        // 分析行中的明暗像素比例
        // 字幕通常会有明显的明暗对比
        if (brightPixels + darkPixels > rowBrightValues.length * 0.1) {
          const contrastRatio = Math.min(brightPixels, darkPixels) / Math.max(brightPixels, darkPixels);
          if (contrastRatio > 0.1) { // 有一定比例的明暗对比
            regionContrastPixels += (brightPixels + darkPixels);
          }
        }
      }
      
      // 字幕框检测评分
      if (maxConsecutiveUniformRows >= 2 && maxConsecutiveUniformRows <= 5) {
        // 典型字幕通常占2-5行
        regionBoxDetection = Math.min(1.0, maxConsecutiveUniformRows / 5);
      }
      
      // 检测文本模式的一致性（字幕的特征）
      if (patternConsistencyCount > (region.endY - region.startY) * 0.12) {
        regionTextPatterns = patternConsistencyCount / (region.endY - region.startY);
      }
      
      // 分析边缘的规则间距
      let regularSpacingScore = 0;
      if (edgePositions.length > 2) {
        // 计算每行边缘间的间距
        const spacings: number[] = [];
        for (const rowEdges of edgePositions) {
          if (rowEdges.length < 4) continue; // 忽略边缘太少的行
          
          for (let i = 1; i < rowEdges.length; i++) {
            const spacing = rowEdges[i] - rowEdges[i-1];
            if (spacing > 3 && spacing < 50) { // 过滤掉太大或太小的间距
              spacings.push(spacing);
            }
          }
        }
        
        // 如果有足够的间距样本
        if (spacings.length > 5) {
          // 计算间距的标准差与平均值的比率
          const avg = spacings.reduce((sum, val) => sum + val, 0) / spacings.length;
          const variance = spacings.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / spacings.length;
          const stdDev = Math.sqrt(variance);
          
          // 规则间距的特征是标准差相对较小
          const variationCoefficient = stdDev / avg;
          if (variationCoefficient < 0.5) { // 变异系数小表示间距规则
            regularSpacingScore = 1 - variationCoefficient;
          }
        }
      }
      
      // 计算水平边缘与垂直边缘的比例
      let edgeRatioScore = 0;
      if (regionHorizontalEdges > 0 && regionVerticalEdges > 0) {
        const ratio = regionHorizontalEdges / regionVerticalEdges;
        // 字幕通常水平边缘多于垂直边缘
        if (ratio > 1.2 && ratio < 4) {
          edgeRatioScore = 0.5 + Math.min(0.5, (ratio - 1.2) / 2.8);
        }
      }
      
      // 分析颜色聚类
      let colorClusterScore = 0;
      const colorClusterEntries = Object.entries(colorClusters);
      if (colorClusterEntries.length > 0) {
        // 排序找出主要颜色
        colorClusterEntries.sort((a, b) => b[1] - a[1]);
        
        // 计算前两种颜色的像素占比
        if (colorClusterEntries.length >= 2) {
          const topTwoColors = colorClusterEntries[0][1] + colorClusterEntries[1][1];
          const topTwoRatio = topTwoColors / regionPixels;
          
          // 如果前两种颜色占比高，可能是字幕（文本+背景）
          if (topTwoRatio > 0.6) {
            colorClusterScore = Math.min(1.0, (topTwoRatio - 0.6) * 2.5);
          }
        }
      }
      
      // 累加区域特征到总结果，应用权重
      results.textPatterns += regionTextPatterns * region.weight;
      results.contrastRegions += (regionContrastPixels / regionPixels) * region.weight;
      results.horizontalEdges += (regionHorizontalEdges / (region.endY - region.startY)) * region.weight;
      results.verticalEdges += (regionVerticalEdges / regionPixels) * region.weight;
      results.colorPatterns += (regionColorPatterns / regionPixels) * region.weight;
      results.textureUniformity += (regionTextureUniformity / (region.endY - region.startY)) * region.weight;
      results.regularSpacing += regularSpacingScore * region.weight;
      results.edgeRatio += edgeRatioScore * region.weight;
      results.boxDetection += regionBoxDetection * region.weight;
      results.totalPixelsAnalyzed += regionPixels;
    }
    
    // 综合所有特征计算最终字幕分数
    let finalScore = 0;
    finalScore += results.textPatterns * 0.25;           // 文本模式是最强的字幕指标
    finalScore += results.horizontalEdges * 0.15;        // 水平边缘是字幕的重要特征
    finalScore += results.contrastRegions * 0.15;        // 高对比度区域
    finalScore += results.regularSpacing * 0.15;         // 规则间距
    finalScore += results.edgeRatio * 0.10;              // 边缘比例
    finalScore += results.colorPatterns * 0.10;          // 颜色模式
    finalScore += results.boxDetection * 0.05;           // 字幕框检测
    finalScore += results.verticalEdges * 0.03;          // 垂直边缘
    finalScore += results.textureUniformity * 0.02;      // 纹理均匀性
    
    // 应用阈值和归一化
    finalScore = Math.min(1, Math.max(0, finalScore));
    
    // 如果分数非常低，可能是误检，进一步降低分数
    if (finalScore < 0.1) {
      finalScore *= 0.5;
    }
    
    // 如果分数非常高，可能是明确的字幕，进一步提高分数
    if (finalScore > 0.7) {
      finalScore = Math.min(1, finalScore * 1.2);
    }
    
    return finalScore;
  }
  
  // 简化版的空镜头检测
  private detectEmptyFrameInMainThread(imageData: ImageData): number {
    const { width, height, data } = imageData;
    
    // 1. 计算颜色多样性 (简化版)
    const colorHistogram: {[key: string]: number} = {};
    let totalSamples = 0;
    
    // 采样计算颜色分布 (稀疏采样)
    for (let i = 0; i < data.length; i += 4 * 8) {
      if (i >= data.length - 4) break;
      
      const r = Math.floor(data[i] / 32) * 32;
      const g = Math.floor(data[i+1] / 32) * 32;
      const b = Math.floor(data[i+2] / 32) * 32;
      
      const colorKey = `${r},${g},${b}`;
      colorHistogram[colorKey] = (colorHistogram[colorKey] || 0) + 1;
      totalSamples++;
    }
    
    // 计算主色占比
    let dominantColorRatio = 0;
    if (totalSamples > 0) {
      const sortedColors = Object.entries(colorHistogram)
        .sort((a, b) => b[1] - a[1]);
      
      if (sortedColors.length > 0) {
        dominantColorRatio = sortedColors[0][1] / totalSamples;
      }
    }
    
    // 计算颜色多样性 (简化版熵)
    let colorDiversity = 0;
    if (Object.keys(colorHistogram).length > 1) {
      colorDiversity = Math.min(1, Object.keys(colorHistogram).length / 20);
    }
    
    // 2. 简化版的边缘密度评估
    const edgeDensity = this.calculateEdgeDensityInMainThread(imageData);
    
    // 3. 综合评分 - 空镜头可能性
    const emptyFrameScore = 
      (1 - colorDiversity) * 0.4 +      // 颜色多样性低
      dominantColorRatio * 0.4 +        // 主色占比高
      (1 - edgeDensity) * 0.2;          // 边缘密度低
    
    return Math.min(1, Math.max(0, emptyFrameScore));
  }
  
  // 辅助函数：计算边缘密度
  private calculateEdgeDensityInMainThread(imageData: ImageData): number {
    const { width, height, data } = imageData;
    let edgeCount = 0;
    let totalPixels = 0;
    
    // 稀疏采样
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const pixelOffset = (y * width + x) * 4;
        if (pixelOffset >= data.length - 4) continue;
        
        totalPixels++;
        
        // 检测边缘
        if (x > 0 && y > 0) {
          const currentBrightness = 
            0.299 * data[pixelOffset] + 
            0.587 * data[pixelOffset + 1] + 
            0.114 * data[pixelOffset + 2];
            
          const leftOffset = pixelOffset - 4;
          if (leftOffset >= 0) {
            const leftBrightness = 
              0.299 * data[leftOffset] + 
              0.587 * data[leftOffset + 1] + 
              0.114 * data[leftOffset + 2];
              
            if (Math.abs(currentBrightness - leftBrightness) > 20) {
              edgeCount++;
              continue;
            }
          }
          
          const topOffset = pixelOffset - (width * 4);
          if (topOffset >= 0) {
            const topBrightness = 
              0.299 * data[topOffset] + 
              0.587 * data[topOffset + 1] + 
              0.114 * data[topOffset + 2];
            
            if (Math.abs(currentBrightness - topBrightness) > 20) {
              edgeCount++;
            }
          }
        }
      }
    }
    
    return totalPixels > 0 ? edgeCount / totalPixels : 0;
  }

  // 简化版的人物检测
  private detectPeopleInMainThread(imageData: ImageData): number {
    const { width, height, data } = imageData;
    const sampleRate = 2;
    
    // 改进的人物检测 (基于肤色和区域分析)
    // 将图像划分为3x3网格，分别计算每个区域的肤色比例
    const gridSize = 3;
    const gridScores: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    const gridCounts: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
    
    let skinPixels = 0;
    let sampledPixels = 0;
    
    for (let y = 0; y < height; y += sampleRate * 2) {
      for (let x = 0; x < width; x += sampleRate * 2) {
        const pixelOffset = (y * width + x) * 4;
        if (pixelOffset >= data.length - 4) continue;
        
        const r = data[pixelOffset];
        const g = data[pixelOffset + 1];
        const b = data[pixelOffset + 2];
        
        // 计算网格位置
        const gridX = Math.min(gridSize - 1, Math.floor(x / width * gridSize));
        const gridY = Math.min(gridSize - 1, Math.floor(y / height * gridSize));
        gridCounts[gridY][gridX]++;
        
        // 改进的肤色检测 - 结合RGB和YCbCr模型
        // RGB模型检测
        const isSkinRGB = (
          r > 95 && g > 40 && b > 20 && // 基本亮度要求
          r > g && r > b && // 红色分量最大
          Math.abs(r - g) > 15 && // 红绿差异明显
          r - g > 15 && // 红色明显大于绿色
          r - b > 15 // 红色明显大于蓝色
        );
        
        // YCbCr模型检测
        const yColor = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        const isSkinYCbCr = (
          yColor > 80 && // 足够亮
          cb > 85 && cb < 135 && // Cb在肤色范围内
          cr > 135 && cr < 180 // Cr在肤色范围内
        );
        
        // 综合两种模型的结果
        if (isSkinRGB || isSkinYCbCr) {
        skinPixels++;
          gridScores[gridY][gridX]++;
      }
        
      sampledPixels++;
      }
    }
    
    // 计算基础肤色分数
    const skinRatio = sampledPixels > 0 ? skinPixels / sampledPixels : 0;
    let peopleScore = Math.min(1, skinRatio * 5); // 基础分数
    
    // 人脸特征检测 - 基于肤色区域分布
    // 1. 中心区域权重更高（人脸通常在中心）
    const centerWeight = 1.5;
    const centerX = 1, centerY = 1; // 3x3网格的中心
    
    // 2. 计算加权的区域肤色分数
    let weightedRegionScore = 0;
    let totalWeight = 0;
    
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        // 计算与中心的距离作为权重
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        const weight = 1 / (1 + distance) * (distance < 1 ? centerWeight : 1);
        
        // 计算该区域的肤色比例
        const regionRatio = gridCounts[y][x] > 0 ? gridScores[y][x] / gridCounts[y][x] : 0;
        
        weightedRegionScore += regionRatio * weight;
        totalWeight += weight;
      }
    }
    
    // 标准化加权分数
    const normalizedRegionScore = totalWeight > 0 ? weightedRegionScore / totalWeight : 0;
    
    // 3. 检测人脸特征的可能性 - 基于区域分布模式
    // 人脸通常在上半部分有较高的肤色比例
    const topHalfSkinRatio = (
      gridScores[0][0] + gridScores[0][1] + gridScores[0][2] +
      gridScores[1][0] + gridScores[1][1] + gridScores[1][2]
    ) / (
      gridCounts[0][0] + gridCounts[0][1] + gridCounts[0][2] +
      gridCounts[1][0] + gridCounts[1][1] + gridCounts[1][2] || 1
    );
    
    // 中心区域通常有更高的肤色比例
    const centerSkinRatio = gridCounts[1][1] > 0 ? gridScores[1][1] / gridCounts[1][1] : 0;
    
    // 检测面部对称性 - 左右区域肤色比例相近
    const leftSkinRatio = (
      gridScores[0][0] + gridScores[1][0] + gridScores[2][0]
    ) / (
      gridCounts[0][0] + gridCounts[1][0] + gridCounts[2][0] || 1
    );
    
    const rightSkinRatio = (
      gridScores[0][2] + gridScores[1][2] + gridScores[2][2]
    ) / (
      gridCounts[0][2] + gridCounts[1][2] + gridCounts[2][2] || 1
    );
    
    // 对称性分数 - 左右肤色比例差异越小，对称性越高
    const symmetryScore = 1 - Math.min(1, Math.abs(leftSkinRatio - rightSkinRatio) * 3);
    
    // 4. 综合多种特征，计算最终的人脸分数
    // 肤色比例、区域分布、对称性综合评分
    const faceScore = (
      normalizedRegionScore * 0.4 + // 区域分布权重
      centerSkinRatio * 0.3 + // 中心区域肤色权重
      topHalfSkinRatio * 0.2 + // 上半部分肤色权重
      symmetryScore * 0.1 // 对称性权重
    );
    
    // 5. 结合基础人物分数和人脸分数
    // 如果检测到较强的人脸特征，提升总分
    if (faceScore > 0.4) {
      peopleScore = Math.max(peopleScore, faceScore);
    }
    
    // 应用非线性变换，使高分更突出
    peopleScore = Math.pow(peopleScore, 0.8);
    
    return peopleScore;
  }

  // 批量分析多个图像，返回最优帧
  public async findOptimalFrames(
    frames: Array<ImageData | HTMLImageElement | HTMLCanvasElement>,
    count: number = 1,
    preferences: {
      prioritizeStatic?: boolean;
      avoidSubtitles?: boolean;
      preferPeople?: boolean;
      preferFaces?: boolean;    // 新增：优先选择有人脸的帧
      avoidEmptyFrames?: boolean; // 避免空镜头
    } = {},
    options: AnalysisOptions = {}
  ): Promise<{
    frames: Array<{
      index: number;
      scores: ImageAnalysisResult;
    }>;
  }> {
    // 确保初始化完成
    await this.initialize();
    
    if (frames.length === 0) {
      return { frames: [] };
    }
    
    console.log(`开始分析${frames.length}个帧`);
    
    try {
      // 分析每一帧
      const analysisPromises = frames.map((frame, index) => 
        this.analyzeImage(frame, options)
          .then(scores => ({ index, scores }))
          .catch(error => {
            console.error(`分析第${index}帧失败:`, error);
            // 返回默认分数，避免整个批处理失败
            return { 
              index, 
              scores: { 
                staticScore: 0.5, 
                subtitleScore: 0.5, 
                peopleScore: 0.5,
                emptyFrameScore: 0.5
              } 
            };
          })
      );

      // 限制并发分析数量，避免过度消耗资源
      const batchSize = Math.min(3, Math.ceil(frames.length / 5)); // 动态调整批处理大小
      const results = [];
      
      for (let i = 0; i < analysisPromises.length; i += batchSize) {
        const batch = analysisPromises.slice(i, i + batchSize);
        try {
          const batchResults = await Promise.all(batch);
          results.push(...batchResults);
          
          // 添加进度日志
          console.log(`已完成分析: ${Math.min(i + batchSize, frames.length)}/${frames.length} 帧`);
        } catch (error) {
          console.error(`批处理分析失败:`, error);
          // 继续处理其他批次
        }
      }

      // 根据偏好设置对帧进行评分
      const scoredFrames = results.map(({ index, scores }) => {
        let finalScore = 0;
        
        // 避免字幕
        if (preferences.avoidSubtitles) {
          finalScore += (1 - scores.subtitleScore) * 0.3;
        }
        
        // 偏好静态帧
        if (preferences.prioritizeStatic) {
          finalScore += scores.staticScore * 0.3;
        }
        
        // 偏好有人物的帧
        if (preferences.preferPeople) {
          finalScore += scores.peopleScore * 0.25;
        }
        
        // 偏好有人脸的帧 (人脸检测是人物检测的子集，所以复用peopleScore，但给予更高权重)
        if (preferences.preferFaces && scores.peopleScore > 0.6) {
          finalScore += scores.peopleScore * 0.2;
        }
        
        // 避免空镜头
        if (preferences.avoidEmptyFrames) {
          finalScore += (1 - (scores.emptyFrameScore || 0)) * 0.15;
        }
        
        // 如果没有设置偏好，使用平衡评分
        if (!preferences.avoidSubtitles && !preferences.prioritizeStatic && 
            !preferences.preferPeople && !preferences.preferFaces && !preferences.avoidEmptyFrames) {
          finalScore = (
            scores.staticScore * 0.3 + 
            (1 - scores.subtitleScore) * 0.25 + 
            scores.peopleScore * 0.25 + 
            (1 - (scores.emptyFrameScore || 0)) * 0.2
          );
        }
        
        return { index, scores, finalScore };
      });

      // 排序并返回最优的N帧
      scoredFrames.sort((a, b) => b.finalScore - a.finalScore);
      
      // 确保返回的帧数不超过请求的数量和可用的帧数
      const actualCount = Math.min(count, scoredFrames.length);
      
      return {
        frames: scoredFrames.slice(0, actualCount).map(({ index, scores }) => ({ index, scores }))
      };
    } catch (error) {
      console.error('批量分析帧失败:', error);
      
      // 如果分析失败，返回前N帧作为备选
      return {
        frames: frames.slice(0, Math.min(count, frames.length)).map((_, index) => ({
          index,
          scores: { staticScore: 0.5, subtitleScore: 0.5, peopleScore: 0.5, emptyFrameScore: 0.5 }
        }))
      };
    }
  }

  // 生成缩略图（WebP格式，可配置压缩比）
  public async generateThumbnail(
    source: ImageData | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
    } = {}
  ): Promise<{
    url: string;
    width: number;
    height: number;
  }> {
    const { 
      maxWidth = 640,
      maxHeight = 360,
      quality = 0.85,
      format = 'webp'
    } = options;
    
    // 获取canvas
    const canvas = this.getCanvasFromPool();
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error("无法创建Canvas上下文");
    }
    
    // 设置适当的宽高比
    let width, height;
    
    if (source instanceof HTMLImageElement || source instanceof HTMLVideoElement) {
      const aspectRatio = source.width / source.height;
      
      if (aspectRatio > 1) {
        // 横向视频
        width = Math.min(source.width, maxWidth);
        height = width / aspectRatio;
        
        // 确保高度不超过maxHeight
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
      } else {
        // 纵向视频
        height = Math.min(source.height, maxHeight);
        width = height * aspectRatio;
        
        // 确保宽度不超过maxWidth
        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }
      }
      
      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);
      
      // 绘制图像
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    } else if (source instanceof HTMLCanvasElement) {
      const aspectRatio = source.width / source.height;
      
      width = Math.min(source.width, maxWidth);
      height = width / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      
      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);
      
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    } else {
      // ImageData
      canvas.width = source.width;
      canvas.height = source.height;
      ctx.putImageData(source, 0, 0);
    }
    
    // 转换为所需格式
    let mimeType;
    switch(format) {
      case 'webp':
        mimeType = 'image/webp';
        break;
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'png':
      default:
        mimeType = 'image/png';
        break;
    }
    
    // 创建数据URL
    const dataURL = canvas.toDataURL(mimeType, quality);
    
    // 返回Canvas到对象池
    this.returnCanvasToPool(canvas);
    
    return {
      url: dataURL,
      width: canvas.width,
      height: canvas.height
    };
  }

  // 从视频提取帧
  public async extractFramesFromVideo(
    video: HTMLVideoElement,
    options: {
      startTime?: number;
      endTime?: number;
      frameCount?: number;
      interval?: 'uniform' | 'random';
    } = {}
  ): Promise<ImageData[]> {
    const {
      startTime = 0,
      endTime = video.duration,
      frameCount = 10,
      interval = 'uniform'
    } = options;
    
    console.log(`开始从视频提取帧: ${frameCount}帧, 开始时间: ${startTime}秒`);
    
    try {
      // 确保视频已加载元数据
      if (video.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const loadHandler = () => {
            video.removeEventListener('loadeddata', loadHandler);
            resolve();
          };
          
          const errorHandler = (e: Event) => {
            video.removeEventListener('error', errorHandler);
            reject(new Error('视频加载失败'));
          };
          
          // 添加超时
          const timeout = setTimeout(() => {
            video.removeEventListener('loadeddata', loadHandler);
            video.removeEventListener('error', errorHandler);
            reject(new Error('视频加载超时'));
          }, 30000); // 增加到30秒超时
          
          video.addEventListener('loadeddata', loadHandler);
          video.addEventListener('error', errorHandler);
          
          // 如果视频已经加载完成，直接解析
          if (video.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      // 计算时间点
      const validStartTime = Math.max(0, startTime);
      const validEndTime = Math.min(video.duration, endTime);
      
      if (validStartTime >= validEndTime) {
        throw new Error('无效的时间范围');
      }
      
      const frames: ImageData[] = [];
      const canvas = this.getCanvasFromPool();
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // 生成时间点
      const timePoints: number[] = [];
      
      if (interval === 'uniform') {
        // 均匀分布的时间点
        const step = (validEndTime - validStartTime) / (frameCount + 1);
        for (let i = 0; i < frameCount; i++) {
          timePoints.push(validStartTime + step * (i + 1));
        }
      } else {
        // 随机分布的时间点
        for (let i = 0; i < frameCount; i++) {
          const randomTime = validStartTime + Math.random() * (validEndTime - validStartTime);
          timePoints.push(randomTime);
        }
        // 排序时间点
        timePoints.sort((a, b) => a - b);
      }
      
      // 逐个提取帧
      for (let i = 0; i < timePoints.length; i++) {
        const time = timePoints[i];
        
        try {
          // 设置视频时间并等待跳转完成
          await new Promise<void>((resolve, reject) => {
            // 设置更长的超时时间
            const seekTimeout = setTimeout(() => {
              video.removeEventListener('seeked', seeked);
              video.removeEventListener('error', errorHandler);
              reject(new Error(`寻找时间点 ${time} 超时`));
            }, 30000); // 增加到30秒超时
            
            const seeked = () => {
              clearTimeout(seekTimeout);
              video.removeEventListener('seeked', seeked);
              video.removeEventListener('error', errorHandler);
              resolve();
            };
            
            const errorHandler = () => {
              clearTimeout(seekTimeout);
              video.removeEventListener('seeked', seeked);
              video.removeEventListener('error', errorHandler);
              reject(new Error('视频跳转失败'));
            };
            
            video.addEventListener('seeked', seeked);
            video.addEventListener('error', errorHandler);
            
            // 设置当前时间
            video.currentTime = time;
          });
          
          // 绘制视频帧到Canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // 获取图像数据
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          frames.push(imageData);
          
        } catch (error) {
          console.warn(`提取时间点 ${time} 的帧失败: ${error}，尝试继续提取其他帧`);
          // 如果某一帧提取失败，尝试继续提取其他帧，而不是完全失败
          continue;
        }
      }
      
      // 返回Canvas到对象池
      this.returnCanvasToPool(canvas);
      
      // 如果没有成功提取任何帧，但有至少一个时间点，尝试提取一个关键帧
      if (frames.length === 0 && timePoints.length > 0) {
        try {
          // 尝试提取视频中间位置的一帧作为备选
          const middleTime = (validStartTime + validEndTime) / 2;
          video.currentTime = middleTime;
          
          await new Promise<void>((resolve) => {
            const seekTimeout = setTimeout(() => {
              resolve(); // 即使超时也继续尝试获取当前帧
            }, 5000);
            
            const seeked = () => {
              clearTimeout(seekTimeout);
              video.removeEventListener('seeked', seeked);
              resolve();
            };
            
            video.addEventListener('seeked', seeked);
          });
          
          const backupCanvas = this.getCanvasFromPool();
          const backupCtx = backupCanvas.getContext('2d', { willReadFrequently: true });
          
          if (backupCtx) {
            backupCanvas.width = video.videoWidth;
            backupCanvas.height = video.videoHeight;
            backupCtx.drawImage(video, 0, 0, backupCanvas.width, backupCanvas.height);
            const backupImageData = backupCtx.getImageData(0, 0, backupCanvas.width, backupCanvas.height);
            frames.push(backupImageData);
          }
          
          this.returnCanvasToPool(backupCanvas);
        } catch (error) {
          console.error('尝试提取备选帧失败:', error);
        }
      }
      
      return frames;
    } catch (error) {
      console.error('提取视频帧失败:', error);
      throw error;
    }
  }

  // 清理资源
  public dispose(): void {
    try {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      
      // 清除所有待处理任务
      for (const [taskId, task] of this.pendingTasks.entries()) {
        clearTimeout(task.timeout);
        task.reject(new Error('处理器已销毁'));
      }
      
      this.pendingTasks.clear();
      this.resultCache.clear();
      this.canvasPool = [];
      this.offscreenCanvas = null;
      this.isInitialized = false;
      this.workerInitPromise = null;
      this.useWorker = true;
      
      console.log('图像处理器资源已清理');
    } catch (error) {
      console.error('清理图像处理器资源失败:', error);
    }
  }

  // 私有方法: 准备图像数据
  private async prepareImageData(
    source: ImageData | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<ImageData> {
    if (source instanceof ImageData) {
      return source;
    }
    
    const canvas = this.getCanvasFromPool();
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    if (source instanceof HTMLImageElement || source instanceof HTMLVideoElement) {
      canvas.width = source.width;
      canvas.height = source.height;
      ctx.drawImage(source, 0, 0);
    } else if (source instanceof HTMLCanvasElement) {
      canvas.width = source.width;
      canvas.height = source.height;
      ctx.drawImage(source, 0, 0);
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.returnCanvasToPool(canvas);
    
    return imageData;
  }

  // 私有方法: Canvas对象池管理
  private getCanvasFromPool(): HTMLCanvasElement {
    if (this.canvasPool.length > 0) {
      return this.canvasPool.pop()!;
    }
    return document.createElement('canvas');
  }

  private returnCanvasToPool(canvas: HTMLCanvasElement): void {
    // 清空canvas内容
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // 限制对象池大小
    if (this.canvasPool.length < 5) {
      this.canvasPool.push(canvas);
    }
  }

  // 私有方法: 缓存管理
  private generateCacheKey(imageData: ImageData, options: AnalysisOptions): string {
    // 从图像数据生成简单的hash
    const sampleSize = 10;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // 从图像采样一些点
    let hashString = `${width}x${height}_`;
    
    for (let i = 0; i < sampleSize; i++) {
      const x = Math.floor((width / sampleSize) * i);
      const y = Math.floor(height / 2);
      const pixelOffset = (y * width + x) * 4;
      
      if (pixelOffset < data.length - 4) {
        hashString += `${data[pixelOffset]},${data[pixelOffset+1]},${data[pixelOffset+2]}_`;
      }
    }
    
    // 添加选项到hash
    hashString += `opts_${options.sampleRate || ''}_${options.subtitleDetectionStrength || ''}_${options.staticFrameThreshold || ''}`;
    
    return hashString;
  }

  private checkCache(key: string): ImageAnalysisResult | null {
    const entry = this.resultCache.get(key);
    
    if (entry && (Date.now() - entry.timestamp) < this.MAX_CACHE_AGE_MS) {
      return entry.result;
    }
    
    return null;
  }

  private cacheResult(key: string, result: ImageAnalysisResult): void {
    // 如果缓存过大，移除最旧的条目
    if (this.resultCache.size >= this.MAX_CACHE_SIZE) {
      // 找到最旧的键
      let oldestKey: string | null = null;
      let oldestTime = Date.now();
      
      for (const [cacheKey, entry] of this.resultCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = cacheKey;
        }
      }
      
      if (oldestKey) {
        this.resultCache.delete(oldestKey);
      }
    }
    
    this.resultCache.set(key, {
      timestamp: Date.now(),
      result
    });
  }
}

export default ImageProcessor; 