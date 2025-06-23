// 图像处理Web Worker
// 用于在后台线程中进行计算密集型的图像分析

// 告诉TypeScript这是一个Worker上下文
declare const self: Worker;

// 定义消息类型接口
interface WorkerMessage {
  type: 'staticScore' | 'subtitleScore' | 'peopleScore' | 'batchAnalysis' | 'test';
  imageData?: ImageData;
  width?: number;
  height?: number;
  taskId?: string;
  options?: {
    sampleRate?: number;
    subtitleDetectionStrength?: number;
    staticFrameThreshold?: number;
    simplifiedAnalysis?: boolean;
  };
  data?: any;
}

// 定义分析选项接口
interface AnalysisOptions {
  sampleRate?: number;
  subtitleDetectionStrength?: number;
  staticFrameThreshold?: number;
  simplifiedAnalysis?: boolean;
}

// 发送自检消息，确认Worker已加载
self.postMessage({ type: 'workerLoaded', status: 'ready' });

// 接收主线程消息
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const { type, imageData, width, height, options, taskId, data } = e.data;
    
    // 处理测试消息，用于初始化检查
    if (type === 'test') {
      console.log('图像处理工作线程收到测试消息');
      self.postMessage({ 
        type, 
        result: 'ok', 
        taskId 
      });
      return;
    }
    
    // 检查图像数据是否有效
    if (!imageData || !width || !height) {
      self.postMessage({ 
        error: '无效的图像数据', 
        taskId 
      });
      return;
    }
    
    switch (type) {
      case 'staticScore':
        try {
          const staticScore = calculateStaticScore(imageData, options?.sampleRate || 1);
          self.postMessage({ type, score: staticScore, taskId });
        } catch (error) {
          console.error('计算静态分数失败:', error);
          self.postMessage({ 
            type, 
            error: '计算静态分数失败', 
            score: 0.5, // 返回默认值
            taskId 
          });
        }
        break;
        
      case 'subtitleScore':
        try {
          const subtitleScore = calculateSubtitleScore(imageData, width, height, options?.subtitleDetectionStrength || 0.8);
          self.postMessage({ type, score: subtitleScore, taskId });
        } catch (error) {
          console.error('计算字幕分数失败:', error);
          self.postMessage({ 
            type, 
            error: '计算字幕分数失败', 
            score: 0.5, // 返回默认值
            taskId 
          });
        }
        break;
        
      case 'peopleScore':
        try {
          const peopleScore = calculatePeopleScore(imageData, options?.sampleRate || 4);
          self.postMessage({ type, score: peopleScore, taskId });
        } catch (error) {
          console.error('计算人物分数失败:', error);
          self.postMessage({ 
            type, 
            error: '计算人物分数失败', 
            score: 0.5, // 返回默认值
            taskId 
          });
        }
        break;
        
      case 'batchAnalysis':
        try {
          // 进行一次性批量分析，减少消息传递开销
          const results = batchAnalyzeImage(imageData, width, height, options);
          self.postMessage({ 
            type, 
            results,
            taskId
          });
        } catch (error) {
          console.error('批量分析失败:', error);
          // 返回默认结果
          self.postMessage({ 
            type, 
            error: '批量分析失败', 
            results: {
              staticScore: 0.5,
              subtitleScore: 0.5,
              peopleScore: 0.5
            },
            taskId 
          });
        }
        break;
        
      default:
        self.postMessage({ error: '不支持的分析类型', taskId });
    }
  } catch (error) {
    console.error('Worker处理消息失败:', error);
    self.postMessage({ 
      error: '处理消息失败: ' + (error instanceof Error ? error.message : String(error)),
      taskId: e.data?.taskId
    });
  }
};

// 批量分析图像
function batchAnalyzeImage(
  imageData: ImageData, 
  width: number, 
  height: number, 
  options?: AnalysisOptions
) {
  // 获取选项，设置合理的默认值
  const sampleRate = options?.sampleRate || 2;
  const subtitleDetectionStrength = options?.subtitleDetectionStrength || 0.8;
  const simplifiedAnalysis = options?.simplifiedAnalysis || false; // 是否使用简化分析
  
  // 如果开启了简化分析，增加采样率以减少计算量
  const effectiveSampleRate = simplifiedAnalysis ? Math.max(sampleRate, 4) : sampleRate;
  
  try {
    // 创建分析结果对象
    let results: any = {};
    
    // 计算基本分数
    results.staticScore = calculateStaticScore(imageData, effectiveSampleRate);
    results.subtitleScore = calculateSubtitleScore(imageData, width, height, subtitleDetectionStrength);
    results.peopleScore = calculatePeopleScore(imageData, effectiveSampleRate);
    results.emptyFrameScore = detectEmptyFrame(imageData, effectiveSampleRate);
    results.diversityScore = calculateDiversityScore(imageData, effectiveSampleRate);
    
    // 如果不是简化分析，添加更详细的分析结果
    if (!simplifiedAnalysis) {
      results.edgeMap = generateEdgeMap(imageData, width, height, effectiveSampleRate);
      results.colorProfile = analyzeColorProfile(imageData, effectiveSampleRate);
    }
    
    console.log(`已完成图像分析 (${simplifiedAnalysis ? '简化模式' : '完整模式'}), 尺寸: ${width}x${height}`);
    return results;
  } catch (error) {
    console.error('批量分析图像失败:', error);
    // 返回默认结果
    return {
      staticScore: 0.5,
      subtitleScore: 0.5,
      peopleScore: 0.5,
      emptyFrameScore: 0.5,
      diversityScore: 0.5
    };
  }
}

// 新增：计算图像多样性分数 - 优化版本
function calculateDiversityScore(imageData: ImageData, sampleRate: number = 2): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // 增加采样率以提高性能
  const effectiveSampleRate = Math.max(sampleRate, 4); 
  
  // 计算颜色多样性 - 使用颜色量化减少计算量
  const colorBuckets = new Map<number, number>();
  const totalSamples = Math.floor((width * height) / (effectiveSampleRate * effectiveSampleRate));
  
  // 更高效的采样方法
  for (let y = 0; y < height; y += effectiveSampleRate) {
    for (let x = 0; x < width; x += effectiveSampleRate) {
      const idx = (y * width + x) * 4;
      if (idx >= data.length - 3) continue;
      
      // 更粗粒度的颜色量化，从16个级别减少到8个级别
      const r = Math.floor(data[idx] / 32) * 32;
      const g = Math.floor(data[idx + 1] / 32) * 32;
      const b = Math.floor(data[idx + 2] / 32) * 32;
      
      // 将RGB合并为单个整数键值，减少Map开销
      const colorKey = (r << 16) | (g << 8) | b;
      colorBuckets.set(colorKey, (colorBuckets.get(colorKey) || 0) + 1);
    }
  }
  
  // 简化熵计算
  let entropy = 0;
  for (const count of colorBuckets.values()) {
    const probability = count / totalSamples;
    // 使用近似计算减少计算量
    entropy -= probability * Math.log(probability);
  }
  
  // 归一化熵 (使用自然对数代替log2，减少计算)
  const maxPossibleEntropy = Math.log(Math.min(colorBuckets.size, 512));
  const normalizedEntropy = maxPossibleEntropy > 0 ? 
    Math.min(1, entropy / maxPossibleEntropy) : 0;
  
  // 使用更简单的亮度变化计算替代复杂的边缘计算
  const brightnessVariation = calculateSimplifiedBrightnessVariation(imageData, effectiveSampleRate);
  
  // 综合评分 (简化公式)
  const diversityScore = (
    normalizedEntropy * 0.7 + 
    brightnessVariation * 0.3
  );
  
  return Math.max(0, Math.min(1, diversityScore));
}

// 简化的亮度变化计算，性能更好
function calculateSimplifiedBrightnessVariation(imageData: ImageData, sampleRate: number = 4): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // 采样亮度值
  const brightnessValues: number[] = [];
  
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const idx = (y * width + x) * 4;
      if (idx >= data.length - 3) continue;
      
      // 快速亮度计算
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 / 255;
      brightnessValues.push(brightness);
    }
  }
  
  // 如果没有足够的样本，返回默认值
  if (brightnessValues.length < 10) return 0.5;
  
  // 计算简单的标准差
  const avg = brightnessValues.reduce((sum, val) => sum + val, 0) / brightnessValues.length;
  
  // 简化方差计算，仅使用部分样本
  let variance = 0;
  const sampleStep = Math.max(1, Math.floor(brightnessValues.length / 100));
  let sampleCount = 0;
  
  for (let i = 0; i < brightnessValues.length; i += sampleStep) {
    const diff = brightnessValues[i] - avg;
    variance += diff * diff;
    sampleCount++;
  }
  
  variance /= sampleCount;
  
  // 将标准差转换为0-1范围的分数
  return Math.min(1, Math.sqrt(variance) * 4);
}

// 优化版的静态帧评分函数 - 支持采样率参数
function calculateStaticScore(imageData: ImageData, sampleRate: number = 1): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
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
  
  // 3. 内容丰富度分析 - 将图像划分为3x3网格
  const gridSize = 3;
  const gridEdgeDensity: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  const gridSamples: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  
  for (let y = 0; y < height; y += sampleRate * 2) {
    for (let x = 0; x < width; x += sampleRate * 2) {
      // 计算网格位置
      const gridX = Math.min(gridSize - 1, Math.floor(x / width * gridSize));
      const gridY = Math.min(gridSize - 1, Math.floor(y / height * gridSize));
      
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      // 检测该点是否有边缘
      if (x > 0 && y > 0) {
        const r = data[pixelOffset];
        const g = data[pixelOffset + 1];
        const b = data[pixelOffset + 2];
        
        const leftOffset = pixelOffset - 4;
        const topOffset = pixelOffset - (width * 4);
        
        if (leftOffset >= 0 && topOffset >= 0) {
          const currentBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          const leftBrightness = 
            0.299 * data[leftOffset] + 
            0.587 * data[leftOffset + 1] + 
            0.114 * data[leftOffset + 2];
            
          const topBrightness = 
            0.299 * data[topOffset] + 
            0.587 * data[topOffset + 1] + 
            0.114 * data[topOffset + 2];
          
          // 如果与左侧或上方像素有明显差异，认为有边缘
          if (Math.abs(currentBrightness - leftBrightness) > 20 || 
              Math.abs(currentBrightness - topBrightness) > 20) {
            gridEdgeDensity[gridY][gridX]++;
          }
        }
      }
      
      gridSamples[gridY][gridX]++;
    }
  }
  
  // 计算每个网格的边缘密度
  const gridScores = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (gridSamples[y][x] > 0) {
        const score = gridEdgeDensity[y][x] / gridSamples[y][x];
        gridScores.push(score);
      }
    }
  }
  
  // 计算内容丰富度 - 基于网格边缘密度的均值和方差
  if (gridScores.length > 0) {
    // 计算平均边缘密度
    const avgScore = gridScores.reduce((sum, val) => sum + val, 0) / gridScores.length;
    
    // 计算中心区域的边缘密度 (中心区域更重要)
    const centerScore = gridSamples[1][1] > 0 ? 
      gridEdgeDensity[1][1] / gridSamples[1][1] : 0;
    
    // 计算方差 - 内容分布的均匀性
    const variance = gridScores.reduce((sum, val) => sum + Math.pow(val - avgScore, 2), 0) / gridScores.length;
    const uniformity = Math.max(0, 1 - Math.sqrt(variance) / avgScore);
    
    // 内容丰富度综合评分
    features.contentRichness = (avgScore * 0.6 + centerScore * 0.4) * 5; // 缩放到合适范围
    features.uniformityScore = uniformity;
  }
  
  // 4. 综合评分 - 静态帧质量
  // 静态帧的理想特征: 边缘适中、颜色丰富、内容均匀分布
  const staticScore = 
    (1 - features.edgeDensity * 8) * 0.5 +     // 边缘密度适中 (保留原有逻辑)
    features.colorDiversity * 0.2 +            // 颜色多样性高
    features.contentRichness * 0.2 +           // 内容丰富
    features.uniformityScore * 0.1;            // 内容分布均匀
  
  return Math.min(1, Math.max(0, staticScore));
}

// 计算字幕分数
function calculateSubtitleScore(
  imageData: ImageData, 
  width: number, 
  height: number,
  detectionStrength: number = 0.8
): number {
  try {
  const data = imageData.data;
  
    // 增强字幕检测 - 使用多种特征
    
    // 1. 水平线检测 - 字幕通常是水平线
    const horizontalLineScore = detectHorizontalLines(data, width, height);
    
    // 2. 底部区域检测 - 字幕通常在底部
    const bottomAreaScore = analyzeBottomArea(data, width, height);
    
    // 3. 文本区域检测 - 字幕通常有特定的文本特征
    const textRegionScore = detectTextRegions(data, width, height);
    
    // 4. 对比度检测 - 字幕通常与背景有高对比度
    const contrastScore = detectHighContrast(data, width, height);
    
    // 综合评分 - 根据检测强度调整权重
    const subtitleScore = (
      horizontalLineScore * 0.3 + 
      bottomAreaScore * 0.3 + 
      textRegionScore * 0.25 + 
      contrastScore * 0.15
    ) * detectionStrength;
    
    // 返回0-1之间的分数
    return Math.min(1, Math.max(0, subtitleScore));
  } catch (error) {
    console.error('计算字幕分数失败:', error);
    return 0.5; // 返回中间值
  }
}

// 检测水平线 - 字幕通常是水平排列的
function detectHorizontalLines(data: Uint8ClampedArray, width: number, height: number): number {
  // 检查图像下半部分的水平线
  const startY = Math.floor(height * 0.6); // 从60%的高度开始检查
  const sampleRows = 20; // 采样行数
  const step = Math.max(1, Math.floor((height - startY) / sampleRows));
  
  let horizontalLineCount = 0;
  let totalChecks = 0;
  
  // 对每一采样行
  for (let y = startY; y < height; y += step) {
    // 计算该行的水平变化
    let horizontalChanges = 0;
    let prevLuma = -1;
    
    // 采样该行的点
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      
      // 计算亮度
      const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      
      // 检测亮度变化
      if (prevLuma >= 0) {
        const diff = Math.abs(luma - prevLuma);
        if (diff > 30) { // 亮度变化阈值
          horizontalChanges++;
        }
      }
      
      prevLuma = luma;
      totalChecks++;
    }
    
    // 如果水平变化在合理范围内（不太少也不太多），可能是字幕
    if (horizontalChanges > 5 && horizontalChanges < width / 10) {
      horizontalLineCount++;
    }
  }
  
  // 计算得分
  return Math.min(1, horizontalLineCount / (sampleRows * 0.6));
}

// 分析底部区域 - 字幕通常在底部
function analyzeBottomArea(data: Uint8ClampedArray, width: number, height: number): number {
  // 定义底部区域
  const bottomStart = Math.floor(height * 0.7);
  const bottomHeight = height - bottomStart;
  
  // 计算底部区域的特征
  let textLikeRegions = 0;
  let samplesCount = 0;
  
  // 网格采样
  const gridSize = 8;
  const xStep = Math.max(1, Math.floor(width / gridSize));
  const yStep = Math.max(1, Math.floor(bottomHeight / 4));
  
  for (let y = bottomStart; y < height; y += yStep) {
    let hasTextFeature = false;
    let prevColor = -1;
    let colorChanges = 0;
    
    for (let x = 0; x < width; x += xStep) {
      const idx = (y * width + x) * 4;
      
      // 简化的颜色表示
      const color = Math.floor(data[idx] / 32) * 32 + 
                   Math.floor(data[idx + 1] / 32) * 32 + 
                   Math.floor(data[idx + 2] / 32) * 32;
      
      // 检测颜色变化
      if (prevColor >= 0 && prevColor !== color) {
        colorChanges++;
      }
      
      prevColor = color;
    }
    
    // 如果一行中有适量的颜色变化，可能是文本
    if (colorChanges >= 3 && colorChanges <= gridSize * 0.8) {
      hasTextFeature = true;
    }
    
    if (hasTextFeature) {
      textLikeRegions++;
    }
    
    samplesCount++;
  }
  
  // 如果底部区域有足够的文本特征，返回较高的分数
  return Math.min(1, textLikeRegions / (samplesCount * 0.5));
}

// 检测文本区域 - 基于文本的特征
function detectTextRegions(data: Uint8ClampedArray, width: number, height: number): number {
  // 文本通常有规律的边缘和特定的纹理
  
  // 计算图像的边缘密度图
  const edgeDensity = new Float32Array(width * height);
  let maxEdgeDensity = 0;
  
  // 简化的Sobel边缘检测
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // 获取周围像素
      const topIdx = ((y - 1) * width + x) * 4;
      const bottomIdx = ((y + 1) * width + x) * 4;
      const leftIdx = (y * width + (x - 1)) * 4;
      const rightIdx = (y * width + (x + 1)) * 4;
      
      // 计算亮度
      const centerLuma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const topLuma = 0.299 * data[topIdx] + 0.587 * data[topIdx + 1] + 0.114 * data[topIdx + 2];
      const bottomLuma = 0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2];
      const leftLuma = 0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2];
      const rightLuma = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
      
      // 计算梯度
      const dx = rightLuma - leftLuma;
      const dy = bottomLuma - topLuma;
      const gradient = Math.sqrt(dx * dx + dy * dy);
      
      // 存储边缘强度
      edgeDensity[y * width + x] = gradient;
      maxEdgeDensity = Math.max(maxEdgeDensity, gradient);
    }
  }
  
  // 如果没有显著边缘，返回低分数
  if (maxEdgeDensity < 10) {
    return 0.1;
  }
  
  // 归一化边缘密度
  for (let i = 0; i < edgeDensity.length; i++) {
    edgeDensity[i] /= maxEdgeDensity;
  }
  
  // 检测文本区域特征
  const blockSize = 16;
  const xBlocks = Math.floor(width / blockSize);
  const yBlocks = Math.floor(height / blockSize);
  let textRegionCount = 0;
  
  // 分析图像块
  for (let by = 0; by < yBlocks; by++) {
    for (let bx = 0; bx < xBlocks; bx++) {
      let edgeCount = 0;
      let edgeSum = 0;
      
      // 分析块内的边缘
      for (let y = by * blockSize; y < (by + 1) * blockSize && y < height; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize && x < width; x++) {
          const edge = edgeDensity[y * width + x];
          if (edge > 0.2) { // 边缘阈值
            edgeCount++;
          }
          edgeSum += edge;
        }
      }
      
      // 计算平均边缘密度
      const avgEdgeDensity = edgeSum / (blockSize * blockSize);
      
      // 文本区域通常有适中的边缘密度和数量
      if (avgEdgeDensity > 0.15 && avgEdgeDensity < 0.5 && 
          edgeCount > blockSize * blockSize * 0.1 && 
          edgeCount < blockSize * blockSize * 0.5) {
        textRegionCount++;
      }
    }
  }
  
  // 计算得分
  return Math.min(1, textRegionCount / (xBlocks * yBlocks * 0.3));
}

// 检测高对比度区域 - 字幕通常与背景有高对比度
function detectHighContrast(data: Uint8ClampedArray, width: number, height: number): number {
  // 检查图像底部的高对比度区域
  const bottomStart = Math.floor(height * 0.7);
  let highContrastCount = 0;
  let totalSamples = 0;
  
  // 采样步长
  const xStep = Math.max(1, Math.floor(width / 40));
  const yStep = Math.max(1, Math.floor((height - bottomStart) / 10));
  
  for (let y = bottomStart; y < height; y += yStep) {
    for (let x = 0; x < width; x += xStep) {
      const idx = (y * width + x) * 4;
      
      // 计算局部对比度
      let minLuma = 255;
      let maxLuma = 0;
      
      // 检查3x3邻域
      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) {
          const newY = y + ny;
          const newX = x + nx;
          
          if (newY >= 0 && newY < height && newX >= 0 && newX < width) {
            const neighborIdx = (newY * width + newX) * 4;
            const luma = 0.299 * data[neighborIdx] + 0.587 * data[neighborIdx + 1] + 0.114 * data[neighborIdx + 2];
            
            minLuma = Math.min(minLuma, luma);
            maxLuma = Math.max(maxLuma, luma);
          }
        }
      }
      
      // 计算对比度
      const contrast = maxLuma - minLuma;
      
      // 如果对比度高，可能是字幕
      if (contrast > 100) {
        highContrastCount++;
      }
      
      totalSamples++;
    }
  }
  
  // 计算得分
  return Math.min(1, highContrastCount / (totalSamples * 0.2));
}

// 优化版的人物检测评分函数
function calculatePeopleScore(imageData: ImageData, sampleRate: number = 4): number {
  const { data, width, height } = imageData;
  let skinColorPixels = 0;
  let totalPixels = 0;
  
  // 将图像划分为3x3网格，分别计算每个区域的肤色比例
  const gridSize = 3;
  const gridScores: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  const gridCounts: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  
  // 使用更高效的采样方式
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
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
      skinColorPixels++;
        gridScores[gridY][gridX]++;
    }
    
    totalPixels++;
    }
  }
  
  // 计算基础肤色分数
  const skinRatio = skinColorPixels / totalPixels;
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

// 生成边缘图 - 用于高级分析
function generateEdgeMap(imageData: ImageData, width: number, height: number, sampleRate: number = 2): Uint8Array {
  const edgeMap = new Uint8Array(Math.ceil(width / sampleRate) * Math.ceil(height / sampleRate));
  const data = imageData.data;
  
  let mapIndex = 0;
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      // 检测边缘
      let isEdge = false;
      
      // 检查右边像素
      if (x + sampleRate < width) {
        const rightOffset = pixelOffset + (sampleRate * 4);
        if (rightOffset < data.length) {
          const currentBrightness = 
            0.299 * data[pixelOffset] + 
            0.587 * data[pixelOffset + 1] + 
            0.114 * data[pixelOffset + 2];
          
          const rightBrightness = 
            0.299 * data[rightOffset] + 
            0.587 * data[rightOffset + 1] + 
            0.114 * data[rightOffset + 2];
            
          if (Math.abs(currentBrightness - rightBrightness) > 30) {
            isEdge = true;
          }
        }
      }
      
      // 检查下方像素
      if (!isEdge && y + sampleRate < height) {
        const downOffset = pixelOffset + (width * sampleRate * 4);
        if (downOffset < data.length) {
          const currentBrightness = 
            0.299 * data[pixelOffset] + 
            0.587 * data[pixelOffset + 1] + 
            0.114 * data[pixelOffset + 2];
            
          const downBrightness = 
            0.299 * data[downOffset] + 
            0.587 * data[downOffset + 1] + 
            0.114 * data[downOffset + 2];
            
          if (Math.abs(currentBrightness - downBrightness) > 30) {
            isEdge = true;
          }
        }
      }
      
      edgeMap[mapIndex++] = isEdge ? 255 : 0;
    }
  }
  
  return edgeMap;
}

// 分析颜色分布
function analyzeColorProfile(imageData: ImageData, sampleRate: number = 4): {dominantColors: number[], colorVariety: number} {
  const data = imageData.data;
  const colorHistogram: {[key: string]: number} = {};
  let totalSamples = 0;
  
  // 采样计算颜色分布
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    if (i >= data.length - 4) break;
    
    const r = Math.floor(data[i] / 32) * 32;     // 量化为8个区间
    const g = Math.floor(data[i+1] / 32) * 32;
    const b = Math.floor(data[i+2] / 32) * 32;
    
    const colorKey = `${r},${g},${b}`;
    colorHistogram[colorKey] = (colorHistogram[colorKey] || 0) + 1;
    totalSamples++;
  }
  
  // 排序找出主要颜色
  const sortedColors = Object.entries(colorHistogram)
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({
      color,
      percentage: count / totalSamples
    }));
  
  // 提取前5个主要颜色的百分比
  const dominantColors = sortedColors
    .slice(0, 5)
    .map(entry => entry.percentage);
    
  // 计算颜色多样性 (熵)
  let entropy = 0;
  for (const color of Object.values(colorHistogram)) {
    const p = color / totalSamples;
    entropy -= p * Math.log2(p);
  }
  
  // 标准化熵值到0-1范围
  const normalizedEntropy = Math.min(1, entropy / 3);
  
  return {
    dominantColors,
    colorVariety: normalizedEntropy
  };
}

// 检测空镜头、纯色背景和转场
function detectEmptyFrame(imageData: ImageData, sampleRate: number = 2): number {
  const { data, width, height } = imageData;
  
  // 分析特征
  const features = {
    colorDiversity: 0,       // 颜色多样性
    dominantColorRatio: 0,   // 主色占比
    edgeDensity: 0,          // 边缘密度
    contentDistribution: 0,  // 内容分布均匀性
    brightnessDistribution: 0, // 亮度分布
    blurScore: 0,            // 模糊度
    gradientScore: 0         // 渐变特征
  };
  
  // 1. 颜色分析
  const colorHistogram: {[key: string]: number} = {};
  let totalSamples = 0;
  
  // 采样计算颜色分布
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      const r = Math.floor(data[pixelOffset] / 16) * 16;     // 量化为16个区间
      const g = Math.floor(data[pixelOffset + 1] / 16) * 16;
      const b = Math.floor(data[pixelOffset + 2] / 16) * 16;
      
      const colorKey = `${r},${g},${b}`;
      colorHistogram[colorKey] = (colorHistogram[colorKey] || 0) + 1;
      totalSamples++;
    }
  }
  
  // 排序找出主要颜色
  const sortedColors = Object.entries(colorHistogram)
    .sort((a, b) => b[1] - a[1]);
  
  // 计算主色占比
  if (sortedColors.length > 0) {
    features.dominantColorRatio = sortedColors[0][1] / totalSamples;
  }
  
  // 计算颜色多样性 (熵)
  let entropy = 0;
  for (const color of Object.values(colorHistogram)) {
    const p = color / totalSamples;
    entropy -= p * Math.log2(p);
  }
  
  // 标准化熵值到0-1范围 (值越低表示颜色多样性越低)
  features.colorDiversity = Math.min(1, entropy / 4);
  
  // 2. 边缘密度分析
  let edgeCount = 0;
  
  for (let y = 0; y < height; y += sampleRate) {
    const rowOffset = y * width * 4;
    let lastBrightness = -1;
    
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = rowOffset + (x * 4);
      if (pixelOffset >= data.length - 4) continue;
      
      const r = data[pixelOffset];
      const g = data[pixelOffset + 1];
      const b = data[pixelOffset + 2];
      
      // 计算亮度
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // 检测水平边缘
      if (lastBrightness >= 0) {
        if (Math.abs(brightness - lastBrightness) > 20) {
          edgeCount++;
        }
      }
      
      lastBrightness = brightness;
    }
  }
  
  // 计算边缘密度 (值越低表示边缘越少)
  features.edgeDensity = Math.min(1, edgeCount / (totalSamples * 0.1));
  
  // 3. 内容分布分析 - 将图像划分为3x3网格
  const gridSize = 3;
  const gridContent: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  const gridSamples: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      // 计算网格位置
      const gridX = Math.min(gridSize - 1, Math.floor(x / width * gridSize));
      const gridY = Math.min(gridSize - 1, Math.floor(y / height * gridSize));
      
      // 检测该点是否有内容 (简化为边缘检测)
      if (x > 0 && y > 0) {
        const r = data[pixelOffset];
        const g = data[pixelOffset + 1];
        const b = data[pixelOffset + 2];
        
        const leftOffset = pixelOffset - 4;
        const topOffset = pixelOffset - (width * 4);
        
        if (leftOffset >= 0 && topOffset >= 0) {
          const currentBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          const leftBrightness = 
            0.299 * data[leftOffset] + 
            0.587 * data[leftOffset + 1] + 
            0.114 * data[leftOffset + 2];
            
          const topBrightness = 
            0.299 * data[topOffset] + 
            0.587 * data[topOffset + 1] + 
            0.114 * data[topOffset + 2];
          
          // 如果与左侧或上方像素有明显差异，认为有内容
          if (Math.abs(currentBrightness - leftBrightness) > 20 || 
              Math.abs(currentBrightness - topBrightness) > 20) {
            gridContent[gridY][gridX]++;
          }
        }
      }
      
      gridSamples[gridY][gridX]++;
    }
  }
  
  // 计算内容分布均匀性
  let contentVariance = 0;
  const gridContentRatios = [];
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (gridSamples[y][x] > 0) {
        const ratio = gridContent[y][x] / gridSamples[y][x];
        gridContentRatios.push(ratio);
      }
    }
  }
  
  // 计算内容分布的变异系数
  if (gridContentRatios.length > 0) {
    const avg = gridContentRatios.reduce((sum, val) => sum + val, 0) / gridContentRatios.length;
    if (avg > 0) {
      const variance = gridContentRatios.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / gridContentRatios.length;
      const stdDev = Math.sqrt(variance);
      features.contentDistribution = Math.min(1, stdDev / avg);
    }
  }
  
  // 4. 亮度分布分析
  const brightnessHistogram = new Array(10).fill(0);
  
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    if (i >= data.length - 4) break;
    
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    const binIndex = Math.min(9, Math.floor(brightness / 25.6)); // 0-255 -> 0-9
    brightnessHistogram[binIndex]++;
  }
  
  // 标准化亮度直方图
  const totalBrightnessSamples = brightnessHistogram.reduce((sum, val) => sum + val, 0);
  const normalizedBrightnessHistogram = brightnessHistogram.map(count => count / totalBrightnessSamples);
  
  // 计算亮度分布的均匀性 - 使用熵
  let brightnessEntropy = 0;
  for (const p of normalizedBrightnessHistogram) {
    if (p > 0) {
      brightnessEntropy -= p * Math.log2(p);
    }
  }
  
  // 标准化亮度熵 (值越低表示亮度分布越不均匀)
  features.brightnessDistribution = Math.min(1, brightnessEntropy / Math.log2(10));
  
  // 5. 模糊度检测 - 使用拉普拉斯算子的简化版本
  let sharpnessScore = 0;
  let sharpnessCount = 0;
  
  for (let y = 1; y < height - 1; y += sampleRate) {
    for (let x = 1; x < width - 1; x += sampleRate) {
      const centerOffset = (y * width + x) * 4;
      if (centerOffset >= data.length - 4) continue;
      
      const leftOffset = ((y) * width + (x - 1)) * 4;
      const rightOffset = ((y) * width + (x + 1)) * 4;
      const topOffset = ((y - 1) * width + (x)) * 4;
      const bottomOffset = ((y + 1) * width + (x)) * 4;
      
      if (leftOffset < 0 || rightOffset >= data.length || 
          topOffset < 0 || bottomOffset >= data.length) continue;
      
      // 计算中心像素亮度
      const centerBrightness = 
        0.299 * data[centerOffset] + 
        0.587 * data[centerOffset + 1] + 
        0.114 * data[centerOffset + 2];
      
      // 计算周围像素亮度
      const leftBrightness = 
        0.299 * data[leftOffset] + 
        0.587 * data[leftOffset + 1] + 
        0.114 * data[leftOffset + 2];
        
      const rightBrightness = 
        0.299 * data[rightOffset] + 
        0.587 * data[rightOffset + 1] + 
        0.114 * data[rightOffset + 2];
        
      const topBrightness = 
        0.299 * data[topOffset] + 
        0.587 * data[topOffset + 1] + 
        0.114 * data[topOffset + 2];
        
      const bottomBrightness = 
        0.299 * data[bottomOffset] + 
        0.587 * data[bottomOffset + 1] + 
        0.114 * data[bottomOffset + 2];
      
      // 简化的拉普拉斯算子
      const laplacian = Math.abs(4 * centerBrightness - leftBrightness - rightBrightness - topBrightness - bottomBrightness);
      sharpnessScore += laplacian;
      sharpnessCount++;
    }
  }
  
  // 计算平均锐度 (值越低表示越模糊)
  if (sharpnessCount > 0) {
    const avgSharpness = sharpnessScore / sharpnessCount;
    features.blurScore = Math.min(1, avgSharpness / 50);
  }
  
  // 6. 渐变检测 - 检查亮度是否线性变化
  let gradientScore = 0;
  
  // 水平方向渐变检测
  for (let y = 0; y < height; y += sampleRate * 2) {
    const brightnessSamples = [];
    
    for (let x = 0; x < width; x += sampleRate * 2) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      const r = data[pixelOffset];
      const g = data[pixelOffset + 1];
      const b = data[pixelOffset + 2];
      
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnessSamples.push(brightness);
    }
    
    // 检测线性变化
    if (brightnessSamples.length > 5) {
      let linearityScore = 0;
      
      // 计算一阶差分
      const diffs = [];
      for (let i = 1; i < brightnessSamples.length; i++) {
        diffs.push(brightnessSamples[i] - brightnessSamples[i-1]);
      }
      
      // 计算差分的标准差 (值越小表示越线性)
      const avgDiff = diffs.reduce((sum, val) => sum + val, 0) / diffs.length;
      const diffVariance = diffs.reduce((sum, val) => sum + Math.pow(val - avgDiff, 2), 0) / diffs.length;
      const diffStdDev = Math.sqrt(diffVariance);
      
      // 标准化线性度分数
      if (Math.abs(avgDiff) > 0.5) { // 有明显的亮度变化
        linearityScore = Math.max(0, 1 - (diffStdDev / Math.abs(avgDiff) / 0.5));
        gradientScore = Math.max(gradientScore, linearityScore);
      }
    }
  }
  
  features.gradientScore = gradientScore;
  
  // 7. 综合评分 - 空镜头可能性
  // 权重可以根据实际效果调整
  const emptyFrameScore = 
    (1 - features.colorDiversity) * 0.25 +      // 颜色多样性低
    features.dominantColorRatio * 0.25 +        // 主色占比高
    (1 - features.edgeDensity) * 0.2 +          // 边缘密度低
    features.contentDistribution * 0.1 +        // 内容分布不均匀
    (1 - features.brightnessDistribution) * 0.1 + // 亮度分布不均匀
    (1 - features.blurScore) * 0.05 +           // 模糊度高
    features.gradientScore * 0.05;              // 渐变特征明显
  
  return Math.min(1, Math.max(0, emptyFrameScore));
}

// 声明类型，使TypeScript在Web Worker中正常工作
export {}; 