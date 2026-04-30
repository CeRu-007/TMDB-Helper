// 图像处理Web Worker
// 用于在后台线程中进行计算密集型的图像分析

// 告诉TypeScript这是一个Worker上下文
declare const self: Worker;

// 导入 logger（如果可用）
// 注意：Worker 环境中可能无法使用完整的 logger，这里使用 console 作为回退
const workerLogger = {
  info: (context: string, message: string, data?: any) => {
    // Worker 中直接使用 console
    console.log(`[${context}] ${message}`, data || '');
  },
  debug: (context: string, message: string, data?: any) => {
    console.log(`[${context}] ${message}`, data || '');
  },
  warn: (context: string, message: string, data?: any) => {
    console.warn(`[${context}] ${message}`, data || '');
  },
  error: (context: string, message: string, error?: any) => {
    console.error(`[${context}] ${message}`, error || '');
  }
};

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
  data?: unknown;
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
    const { type, imageData, width, height, options, taskId } = e.data;
    
    // 处理测试消息，用于初始化检查
    if (type === 'test') {
      
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
          
          // 返回默认结果
          self.postMessage({ 
            type, 
            error: '批量分析失败', 
            results: {
              staticScore: 0.5,
              subtitleScore: 0.5,
              peopleScore: 0.5,
              motionBlurScore: 0.5,
              atmosphereScore: 0.5
            },
            taskId 
          });
        }
        break;
        
      default:
        self.postMessage({ error: '不支持的分析类型', taskId });
    }
  } catch (error) {
    
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
  const sampleRate = options?.sampleRate || 2;
  const subtitleDetectionStrength = options?.subtitleDetectionStrength || 0.8;
  const simplifiedAnalysis = options?.simplifiedAnalysis || false;
  const effectiveSampleRate = simplifiedAnalysis ? Math.max(sampleRate, 4) : sampleRate;
  
  try {
    let results: Record<string, number | boolean | Uint8Array | any> = {};

    results.staticScore = calculateStaticScore(imageData, effectiveSampleRate);
    results.subtitleScore = calculateSubtitleScore(imageData, width, height, subtitleDetectionStrength);
    results.peopleScore = calculatePeopleScore(imageData, effectiveSampleRate);
    results.emptyFrameScore = detectEmptyFrame(imageData, effectiveSampleRate);
    results.diversityScore = calculateDiversityScore(imageData, effectiveSampleRate);
    results.motionBlurScore = calculateMotionBlurScore(imageData, effectiveSampleRate);
    results.atmosphereScore = calculateAtmosphereScore(imageData, effectiveSampleRate);

    if (!simplifiedAnalysis) {
      results.edgeMap = generateEdgeMap(imageData, width, height, effectiveSampleRate);
      results.colorProfile = analyzeColorProfile(imageData, effectiveSampleRate);
    }

    workerLogger.debug('ImageProcessingWorker', `已完成图像分析`, {
      mode: simplifiedAnalysis ? '简化模式' : '完整模式',
      size: `${width}x${height}`
    });
    return results;
  } catch (error) {
    workerLogger.error('ImageProcessingWorker', '批量分析失败', error);
    return {
      staticScore: 0.5,
      subtitleScore: 0.5,
      peopleScore: 0.5,
      emptyFrameScore: 0.5,
      diversityScore: 0.5,
      motionBlurScore: 0.5,
      atmosphereScore: 0.5
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
      const r = Math.floor(data[idx]! / 32) * 32;
      const g = Math.floor(data[idx + 1]! / 32) * 32;
      const b = Math.floor(data[idx + 2]! / 32) * 32;

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
      const brightness = (data[idx]! + data[idx + 1]! + data[idx + 2]!) / 3 / 255;
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
    const diff = ((brightnessValues[i] ?? 0) ?? 0) - avg;
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
  
  // 使用2D采样而非1D，更好地捕获图像特征
  for (let y = 0; y < height; y += sampleRate) {
    const rowOffset = y * width * 4;
    let lastBrightness = -1;
    
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = rowOffset + (x * 4);
      if (pixelOffset >= data.length - 4) continue;

      const r = data[pixelOffset]!!;
      const g = data[pixelOffset + 1]!!;
      const b = data[pixelOffset + 2]!!;

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

    const r = Math.floor(data[i]! / 32) * 32;     // 量化为8个区间
    const g = Math.floor(data[i + 1]! / 32) * 32;
    const b = Math.floor(data[i + 2]! / 32) * 32;

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
        const r = data[pixelOffset]!;
        const g = data[pixelOffset + 1]!;
        const b = data[pixelOffset + 2]!;
        
        const leftOffset = pixelOffset - 4;
        const topOffset = pixelOffset - (width * 4);
        
        if (leftOffset >= 0 && topOffset >= 0) {
          const currentBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          const leftBrightness = 
            0.299 * data[leftOffset]! + 
            0.587 * data[leftOffset + 1]! + 
            0.114 * data[leftOffset + 2];
            
          const topBrightness = 
            0.299 * data[topOffset]! + 
            0.587 * data[topOffset + 1]! + 
            0.114 * data[topOffset + 2];
          
          // 如果与左侧或上方像素有明显差异，认为有边缘
          if (Math.abs(currentBrightness - leftBrightness) > 20 ||
              Math.abs(currentBrightness - topBrightness) > 20) {
            gridEdgeDensity[gridY]![gridX]!++;
          }
        }
      }

      gridSamples[gridY]![gridX]!++;
    }
  }

  // 计算每个网格的边缘密度
  const gridScores = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (gridSamples[y]![x]! > 0) {
        const score = gridEdgeDensity[y]![x]! / gridSamples[y]![x]!;
        gridScores.push(score);
      }
    }
  }

  // 计算内容丰富度 - 基于网格边缘密度的均值和方差
  if (gridScores.length > 0) {
    // 计算平均边缘密度
    const avgScore = gridScores.reduce((sum, val) => sum + val, 0) / gridScores.length;

    // 计算中心区域的边缘密度 (中心区域更重要)
    const centerScore = gridSamples[1]![1]! > 0 ?
      gridEdgeDensity[1]![1]! / gridSamples[1]![1]! : 0;
    
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
    Math.max(0, 1 - features.edgeDensity * 5) * 0.4 +
    features.colorDiversity * 0.25 +
    features.contentRichness * 0.2 +
    features.uniformityScore * 0.15;
  
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
    const bottomStart = Math.floor(height * 0.82);
    const sampleStep = 6;
    let subtitleRows = 0;
    let totalRowsChecked = 0;

    for (let y = bottomStart; y < height; y += sampleStep) {
      let transitions = 0;
      let prevLuma = -1;

      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4;
        if (idx >= data.length - 3) continue;
        const luma = 0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!;
        if (prevLuma >= 0 && Math.abs(luma - prevLuma) > 45) {
          transitions++;
        }
        prevLuma = luma;
      }

      totalRowsChecked++;
      if (transitions > 2 && transitions < width / sampleStep * 0.35) {
        subtitleRows++;
      }
    }

    let topSubtitleRows = 0;
    for (let y = 0; y < Math.floor(height * 0.12); y += sampleStep) {
      let transitions = 0;
      let prevLuma = -1;
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4;
        if (idx >= data.length - 3) continue;
        const luma = 0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!;
        if (prevLuma >= 0 && Math.abs(luma - prevLuma) > 45) {
          transitions++;
        }
        prevLuma = luma;
      }
      if (transitions > 2 && transitions < width / sampleStep * 0.35) {
        topSubtitleRows++;
      }
    }

    const bottomRatio = totalRowsChecked > 0 ? subtitleRows / totalRowsChecked : 0;
    const topRatio = topSubtitleRows / Math.max(1, Math.ceil(height * 0.12 / sampleStep));
    return Math.min(1, (Math.max(bottomRatio, topRatio) * 4)) * detectionStrength;
  } catch (error) {
    return 0.5;
  }
}

function calculatePeopleScore(imageData: ImageData, sampleRate: number = 4): number {
  const { data, width, height } = imageData;
  let skinColorPixels = 0;
  let animeCharPixels = 0;
  let totalPixels = 0;
  
  const gridSize = 3;
  const gridScores: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  const gridAnimeScores: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  const gridCounts: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      const r = data[pixelOffset]!;
      const g = data[pixelOffset + 1]!;
      const b = data[pixelOffset + 2]!;
      
      const gridX = Math.min(gridSize - 1, Math.floor(x / width * gridSize));
      const gridY = Math.min(gridSize - 1, Math.floor(y / height * gridSize));
      gridCounts[gridY]![gridX]!++;
      
      const isSkinRGB = (
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        r - g > 15 &&
        r - b > 15
      );
      
      const yColor = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const isSkinYCbCr = (
        yColor > 80 &&
        cb > 85 && cb < 135 &&
        cr > 135 && cr < 180
      );
      
      if (isSkinRGB || isSkinYCbCr) {
        skinColorPixels++;
        gridScores[gridY]![gridX]!++;
      }

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
      const isAnimeSkin = (
        yColor > 140 && yColor < 250 &&
        saturation < 0.25 &&
        r > 180 && g > 140 && b > 120 &&
        Math.abs(r - g) < 50 && Math.abs(r - b) < 70
      );
      const isAnimeHair = saturation > 0.4 && maxC > 100;
      const isAnimeFeature = isAnimeSkin || isAnimeHair;
      
      if (isAnimeFeature) {
        animeCharPixels++;
        gridAnimeScores[gridY]![gridX]!++;
      }
    
    totalPixels++;
    }
  }
  
  const skinRatio = skinColorPixels / totalPixels;
  const animeRatio = animeCharPixels / totalPixels;
  let peopleScore = Math.min(1, Math.max(skinRatio * 5, animeRatio * 3));
  
  // 人脸特征检测 - 基于肤色区域分布
  // 1. 中心区域权重更高（人脸通常在中心）
  const centerWeight = 1.5;
  const centerX = 1, centerY = 1; // 3x3网格的中心
  
  // 2. 计算加权的区域肤色分数
  let weightedRegionScore = 0;
  let weightedAnimeRegionScore = 0;
  let totalWeight = 0;
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const weight = 1 / (1 + distance) * (distance < 1 ? centerWeight : 1);
      
      const regionRatio = gridCounts[y]![x]! > 0 ? gridScores[y]![x]! / gridCounts[y]![x]! : 0;
      const animeRegionRatio = gridCounts[y]![x]! > 0 ? gridAnimeScores[y]![x]! / gridCounts[y]![x]! : 0;

      weightedRegionScore += regionRatio * weight;
      weightedAnimeRegionScore += animeRegionRatio * weight;
      totalWeight += weight;
    }
  }

  const normalizedRegionScore = totalWeight > 0 ? weightedRegionScore / totalWeight : 0;
  const normalizedAnimeRegionScore = totalWeight > 0 ? weightedAnimeRegionScore / totalWeight : 0;

  const topHalfSkinRatio = (
    gridScores[0]![0]! + gridScores[0]![1]! + gridScores[0]![2]! +
    gridScores[1]![0]! + gridScores[1]![1]! + gridScores[1]![2]!
  ) / (
    gridCounts[0]![0]! + gridCounts[0]![1]! + gridCounts[0]![2]! +
    gridCounts[1]![0]! + gridCounts[1]![1]! + gridCounts[1]![2]! || 1
  );
  
  const topHalfAnimeRatio = (
    gridAnimeScores[0]![0]! + gridAnimeScores[0]![1]! + gridAnimeScores[0]![2]! +
    gridAnimeScores[1]![0]! + gridAnimeScores[1]![1]! + gridAnimeScores[1]![2]!
  ) / (
    gridCounts[0]![0]! + gridCounts[0]![1]! + gridCounts[0]![2]! +
    gridCounts[1]![0]! + gridCounts[1]![1]! + gridCounts[1]![2]! || 1
  );
  
  const centerSkinRatio = gridCounts[1]![1]! > 0 ? gridScores[1]![1]! / gridCounts[1]![1]! : 0;
  const centerAnimeRatio = gridCounts[1]![1]! > 0 ? gridAnimeScores[1]![1]! / gridCounts[1]![1]! : 0;

  const leftSkinRatio = (
    gridScores[0]![0]! + gridScores[1]![0]! + gridScores[2]![0]!
  ) / (
    gridCounts[0]![0]! + gridCounts[1]![0]! + gridCounts[2]![0]! || 1
  );

  const rightSkinRatio = (
    gridScores[0]![2]! + gridScores[1]![2]! + gridScores[2]![2]!
  ) / (
    gridCounts[0]![2]! + gridCounts[1]![2]! + gridCounts[2]![2]! || 1
  );
  
  const symmetryScore = 1 - Math.min(1, Math.abs(leftSkinRatio - rightSkinRatio) * 3);
  
  const faceScore = (
    Math.max(normalizedRegionScore, normalizedAnimeRegionScore) * 0.4 +
    Math.max(centerSkinRatio, centerAnimeRatio) * 0.3 +
    Math.max(topHalfSkinRatio, topHalfAnimeRatio) * 0.2 +
    symmetryScore * 0.1
  );
  
  if (faceScore > 0.4) {
    peopleScore = Math.max(peopleScore, faceScore);
  }
  
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
            0.299 * data[pixelOffset]! + 
            0.587 * data[pixelOffset + 1]! + 
            0.114 * data[pixelOffset + 2]!;
          
          const rightBrightness = 
            0.299 * data[rightOffset]! + 
            0.587 * data[rightOffset + 1]! + 
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
            0.299 * data[pixelOffset]! + 
            0.587 * data[pixelOffset + 1]! + 
            0.114 * data[pixelOffset + 2]!;
            
          const downBrightness = 
            0.299 * data[downOffset] + 
            0.587 * data[downOffset + 1] + 
            0.114 * data[downOffset + 2];
            
          if (Math.abs(currentBrightness - downBrightness) > 30) {
            isEdge = true;
          }
        }
      }
      
      edgeMap[mapIndex++]! = isEdge ? 255 : 0;
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

    const r = Math.floor(data[i]! / 32) * 32;     // 量化为8个区间
    const g = Math.floor(data[i + 1]! / 32) * 32;
    const b = Math.floor(data[i + 2]! / 32) * 32;

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

      const r = Math.floor(data[pixelOffset]! / 16) * 16;     // 量化为16个区间
      const g = Math.floor(data[pixelOffset + 1]! / 16) * 16;
      const b = Math.floor(data[pixelOffset + 2]! / 16) * 16;

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
      
      const r = data[pixelOffset]!;
      const g = data[pixelOffset + 1]!;
      const b = data[pixelOffset + 2]!;
      
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
        const r = data[pixelOffset]!;
        const g = data[pixelOffset + 1]!;
        const b = data[pixelOffset + 2]!;
        
        const leftOffset = pixelOffset - 4;
        const topOffset = pixelOffset - (width * 4);
        
        if (leftOffset >= 0 && topOffset >= 0) {
          const currentBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          const leftBrightness = 
            0.299 * data[leftOffset]! + 
            0.587 * data[leftOffset + 1]! + 
            0.114 * data[leftOffset + 2];
            
          const topBrightness = 
            0.299 * data[topOffset]! + 
            0.587 * data[topOffset + 1]! + 
            0.114 * data[topOffset + 2];
          
          // 如果与左侧或上方像素有明显差异，认为有内容
          if (Math.abs(currentBrightness - leftBrightness) > 20 || 
              Math.abs(currentBrightness - topBrightness) > 20) {
            if (gridContent[gridY] && gridContent[gridY]![gridX] !== undefined) {
              gridContent[gridY]![gridX]!++;
            }
          }
        }
      }
      
      gridSamples[gridY]![gridX]!++;
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
    
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    
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
        0.299 * data[centerOffset]! + 
        0.587 * data[centerOffset + 1]! + 
        0.114 * data[centerOffset + 2]!;
      
      // 计算周围像素亮度
      const leftBrightness = 
        0.299 * data[leftOffset]! + 
        0.587 * data[leftOffset + 1]! + 
        0.114 * data[leftOffset + 2];
        
      const rightBrightness = 
        0.299 * data[rightOffset]! + 
        0.587 * data[rightOffset + 1]! + 
        0.114 * data[rightOffset + 2];
        
      const topBrightness = 
        0.299 * data[topOffset]! + 
        0.587 * data[topOffset + 1]! + 
        0.114 * data[topOffset + 2];
        
      const bottomBrightness = 
        0.299 * data[bottomOffset]! + 
        0.587 * data[bottomOffset + 1]! + 
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
      
      const r = data[pixelOffset]!;
      const g = data[pixelOffset + 1]!;
      const b = data[pixelOffset + 2]!;
      
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

function calculateMotionBlurScore(imageData: ImageData, sampleRate: number = 2): number {
  const { data, width, height } = imageData;
  let laplacianVariance = 0;
  let laplacianMean = 0;
  let count = 0;
  const laplacianValues: number[] = [];

  for (let y = 1; y < height - 1; y += sampleRate) {
    for (let x = 1; x < width - 1; x += sampleRate) {
      const center = (y * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;
      const top = ((y - 1) * width + x) * 4;
      const bottom = ((y + 1) * width + x) * 4;

      if (center >= data.length - 4 || left < 0 || right >= data.length || top < 0 || bottom >= data.length) continue;

      const cb = 0.299 * data[center]! + 0.587 * data[center + 1]! + 0.114 * data[center + 2]!;
      const lb = 0.299 * data[left]! + 0.587 * data[left + 1]! + 0.114 * data[left + 2]!;
      const rb = 0.299 * data[right]! + 0.587 * data[right + 1]! + 0.114 * data[right + 2]!;
      const tb = 0.299 * data[top]! + 0.587 * data[top + 1]! + 0.114 * data[top + 2]!;
      const bb = 0.299 * data[bottom]! + 0.587 * data[bottom + 1]! + 0.114 * data[bottom + 2]!;

      const laplacian = Math.abs(4 * cb - lb - rb - tb - bb);
      laplacianValues.push(laplacian);
      laplacianMean += laplacian;
      count++;
    }
  }

  if (count === 0) return 0.5;

  laplacianMean /= count;

  for (const val of laplacianValues) {
    laplacianVariance += (val - laplacianMean) * (val - laplacianMean);
  }
  laplacianVariance /= count;

  const sharpness = laplacianVariance;
  const blurScore = 1 - Math.min(1, sharpness / 2000);

  return Math.max(0, Math.min(1, blurScore));
}

function calculateAtmosphereScore(imageData: ImageData, sampleRate: number = 4): number {
  const { data, width, height } = imageData;

  let colorRichness = 0;
  let contrastScore = 0;
  let compositionScore = 0;
  let visualWeight = 0;

  const effectiveRate = Math.max(sampleRate, 3);

  const colorBuckets = new Map<number, number>();
  let totalSamples = 0;
  let minLuma = 255;
  let maxLuma = 0;
  let lumaSum = 0;

  const gridWeights = [
    [0.5, 0.8, 0.5],
    [0.8, 1.5, 0.8],
    [0.5, 0.8, 0.5]
  ];

  let weightedContent = 0;
  let totalWeight = 0;

  for (let y = 0; y < height; y += effectiveRate) {
    for (let x = 0; x < width; x += effectiveRate) {
      const idx = (y * width + x) * 4;
      if (idx >= data.length - 3) continue;

      const r = data[idx]!;
      const g = data[idx + 1]!;
      const b = data[idx + 2]!;

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      minLuma = Math.min(minLuma, luma);
      maxLuma = Math.max(maxLuma, luma);
      lumaSum += luma;

      const cr = Math.floor(r / 24) * 24;
      const cg = Math.floor(g / 24) * 24;
      const cb = Math.floor(b / 24) * 24;
      const colorKey = (cr << 16) | (cg << 8) | cb;
      colorBuckets.set(colorKey, (colorBuckets.get(colorKey) || 0) + 1);
      totalSamples++;

      const gridX = Math.min(2, Math.floor(x / width * 3));
      const gridY = Math.min(2, Math.floor(y / height * 3));
      const weight = gridWeights[gridY]![gridX]!;
      totalWeight += weight;

      const saturation = Math.max(r, g, b) - Math.min(r, g, b);
      if (saturation > 30 || luma > 30) {
        weightedContent += weight;
      }
    }
  }

  if (totalSamples === 0) return 0.5;

  let entropy = 0;
  for (const count of colorBuckets.values()) {
    const p = count / totalSamples;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  colorRichness = Math.min(1, entropy / 5);

  contrastScore = Math.min(1, (maxLuma - minLuma) / 200);

  compositionScore = totalWeight > 0 ? Math.min(1, weightedContent / totalWeight) : 0;

  const avgLuma = lumaSum / totalSamples;
  const idealLuma = 128;
  const lumaDistance = Math.abs(avgLuma - idealLuma) / idealLuma;
  visualWeight = Math.max(0, 1 - lumaDistance * 0.5);

  const atmosphereScore = (
    colorRichness * 0.3 +
    contrastScore * 0.25 +
    compositionScore * 0.25 +
    visualWeight * 0.2
  );

  return Math.max(0, Math.min(1, atmosphereScore));
}

export {}; 